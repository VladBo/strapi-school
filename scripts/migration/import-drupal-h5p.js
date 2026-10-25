"use strict";

const fs = require("node:fs");
const path = require("node:path");
const AdmZip = require("adm-zip");

function packageLibrary(metadata) {
  const dependencies = [
    ...(metadata.preloadedDependencies || []),
    ...(metadata.dynamicDependencies || []),
    ...(metadata.editorDependencies || []),
  ];
  const main = dependencies.find(
    (dependency) => dependency.machineName === metadata.mainLibrary,
  );
  if (!metadata.mainLibrary || !main) {
    throw new Error("Invalid H5P package: main library version is missing");
  }
  return `${metadata.mainLibrary} ${main.majorVersion}.${main.minorVersion}`;
}

function validatePackageEntry(entry, exportRoot) {
  const legacyNid = Number(entry.nid);
  if (!Number.isInteger(legacyNid) || legacyNid <= 0) {
    throw new Error(`Invalid H5P source legacyNid: ${entry.nid}`);
  }
  if (!entry.package || path.extname(entry.package).toLowerCase() !== ".h5p") {
    throw new Error(`Invalid H5P package path for legacyNid ${legacyNid}`);
  }

  const resolvedRoot = path.resolve(exportRoot);
  const packagePath = path.resolve(resolvedRoot, entry.package);
  const relativePath = path.relative(resolvedRoot, packagePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`H5P package escapes export root for legacyNid ${legacyNid}`);
  }
  if (!fs.existsSync(packagePath) || !fs.statSync(packagePath).isFile()) {
    throw new Error(`H5P package does not exist: ${packagePath}`);
  }

  let metadata;
  try {
    const zip = new AdmZip(packagePath);
    const metadataEntry = zip.getEntry("h5p.json");
    const contentEntry = zip.getEntry("content/content.json");
    if (!metadataEntry || !contentEntry) {
      throw new Error("required files are missing");
    }
    metadata = JSON.parse(metadataEntry.getData().toString("utf8"));
    JSON.parse(contentEntry.getData().toString("utf8"));
  } catch (error) {
    throw new Error(
      `Invalid H5P package for legacyNid ${legacyNid}: ${error.message}`,
    );
  }

  const library = packageLibrary(metadata);
  if (entry.library && entry.library !== library) {
    throw new Error(
      `H5P library mismatch for legacyNid ${legacyNid}: expected ${entry.library}, package declares ${library}`,
    );
  }

  return {
    filename: path.basename(packagePath),
    legacyNid,
    library,
    packagePath,
    shouldPublish: Boolean(Number(entry.published)),
    title: entry.title || metadata.title || `Drupal H5P ${legacyNid}`,
  };
}

function uniqueRecordsByDocument(records) {
  const byDocument = new Map();
  for (const record of records) {
    const key = record.documentId || `row:${record.id}`;
    const current = byDocument.get(key);
    if (!current || (!current.h5pContent && record.h5pContent)) {
      byDocument.set(key, record);
    }
  }
  return [...byDocument.values()];
}

function planH5pImports(entries, records) {
  const sourceByNid = new Map();
  for (const entry of entries) {
    const legacyNid = Number(entry.legacyNid ?? entry.nid);
    if (sourceByNid.has(legacyNid)) {
      throw new Error(`Duplicate source legacyNid ${legacyNid}`);
    }
    sourceByNid.set(legacyNid, { ...entry, legacyNid });
  }

  const targetByNid = new Map();
  for (const record of uniqueRecordsByDocument(records)) {
    const legacyNid = Number(record.legacyNid);
    if (targetByNid.has(legacyNid)) {
      throw new Error(`Duplicate target legacyNid ${legacyNid}`);
    }
    targetByNid.set(legacyNid, record);
  }

  return [...sourceByNid.values()].map((entry) => {
    const record = targetByNid.get(entry.legacyNid);
    if (!record) {
      throw new Error(`No placeholder for legacyNid ${entry.legacyNid}`);
    }
    const contentId = record.h5pContent?.contentId;
    if (record.migrationStatus === "imported" && contentId) {
      return { ...entry, action: "skip", contentId: String(contentId), record };
    }
    if (record.migrationStatus === "imported") {
      throw new Error(
        `Imported placeholder ${entry.legacyNid} has no stored content ID`,
      );
    }
    return { ...entry, action: "import", record };
  });
}

function reportItem(item) {
  return {
    documentId: item.record?.documentId,
    filename: item.filename,
    legacyNid: item.legacyNid,
    library: item.library,
    shouldPublish: item.shouldPublish,
    title: item.title,
  };
}

function summarize(items) {
  return {
    errors: items.filter((item) => item.status === "error").length,
    imported: items.filter((item) => item.status === "imported").length,
    planned: items.filter((item) => item.status === "planned").length,
    skipped: items.filter((item) => item.status === "skipped").length,
  };
}

async function executeH5pImport(
  plan,
  { apply, importPackage, updateDocument },
) {
  const items = [];

  for (const item of plan) {
    const base = reportItem(item);
    if (item.action === "skip") {
      items.push({ ...base, contentId: item.contentId, status: "skipped" });
      continue;
    }
    if (!apply) {
      items.push({ ...base, status: "planned" });
      continue;
    }

    let imported;
    try {
      imported = await importPackage(item.packagePath);
      await updateDocument(item.record.documentId, {
        h5pContent: {
          contentId: String(imported.id),
          library: imported.library,
          metadata: imported.metadata,
          params: imported.parameters,
        },
        migrationStatus: "imported",
      });
      items.push({
        ...base,
        contentId: String(imported.id),
        installedLibraries: imported.installedLibraries || [],
        status: "imported",
      });
    } catch (error) {
      items.push({
        ...base,
        error: error.message || String(error),
        ...(imported?.id === undefined
          ? {}
          : { orphanContentId: String(imported.id) }),
        status: "error",
      });
    }
  }

  return {
    finishedAt: new Date().toISOString(),
    items,
    mode: apply ? "apply" : "dry-run",
    summary: summarize(items),
  };
}

async function createApplication() {
  const { createStrapi, compileStrapi } = require("@strapi/strapi");
  return createStrapi(await compileStrapi()).load();
}

async function main() {
  const exportRoot = path.resolve(process.argv[2] || "");
  const apply = process.argv.includes("--apply");
  if (!process.argv[2]) {
    throw new Error(
      "Usage: node scripts/migration/import-drupal-h5p.js <editor-export-directory> [--apply]",
    );
  }
  const inputPath = path.join(exportRoot, "migration-input.json");
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Migration input not found: ${inputPath}`);
  }
  const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const entries = input.h5p.map((entry) => validatePackageEntry(entry, exportRoot));

  const app = await createApplication();
  app.log.level = "error";
  try {
    const records = await app.db
      .query("api::h5p-content.h5p-content")
      .findMany({ where: { legacyNid: { $notNull: true } } });
    const plan = planH5pImports(entries, records);
    const h5pService = app.plugin("h5p").service("service");
    const report = await executeH5pImport(plan, {
      apply,
      importPackage: (packagePath) =>
        h5pService.importPackage(packagePath, {
          email: "migration@localhost",
          id: "drupal-migration",
          name: "Drupal migration",
          type: "local",
        }),
      updateDocument: (documentId, data) =>
        app.documents("api::h5p-content.h5p-content").update({
          data,
          documentId,
        }),
    });
    if (apply) {
      const reportPath = path.resolve(
        process.env.H5P_IMPORT_REPORT ||
          path.join(exportRoot, "h5p-import-report.json"),
      );
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    }
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await app.destroy();
  }
}

module.exports = {
  executeH5pImport,
  planH5pImports,
  validatePackageEntry,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}
