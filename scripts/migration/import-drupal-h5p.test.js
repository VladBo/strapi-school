"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const AdmZip = require("adm-zip");

const {
  executeH5pImport,
  planH5pImports,
  validatePackageEntry,
} = require("./import-drupal-h5p");

function createPackage(root, filename = "lesson.h5p") {
  const packagePath = path.join(root, filename);
  const zip = new AdmZip();
  zip.addFile(
    "h5p.json",
    Buffer.from(
      JSON.stringify({
        title: "Lesson",
        mainLibrary: "H5P.CoursePresentation",
        preloadedDependencies: [
          {
            machineName: "H5P.CoursePresentation",
            majorVersion: "1",
            minorVersion: "22",
          },
        ],
      }),
    ),
  );
  zip.addFile("content/content.json", Buffer.from('{"slides":[]}'));
  zip.writeZip(packagePath);
  return packagePath;
}

function source(overrides = {}) {
  return {
    nid: 88,
    title: "Lesson",
    library: "H5P.CoursePresentation 1.22",
    package: "h5p/lesson.h5p",
    published: 1,
    ...overrides,
  };
}

function placeholder(overrides = {}) {
  const record = {
    h5pContent: null,
    legacyNid: 88,
    migrationStatus: "package-ready",
    ...overrides,
  };
  return {
    documentId: `document-${record.legacyNid}`,
    ...record,
    ...overrides,
  };
}

test("validates a readable H5P archive and derives its main library", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "h5p-import-"));
  fs.mkdirSync(path.join(root, "h5p"));
  const packagePath = createPackage(path.join(root, "h5p"));

  try {
    assert.deepEqual(validatePackageEntry(source(), root), {
      filename: "lesson.h5p",
      legacyNid: 88,
      library: "H5P.CoursePresentation 1.22",
      packagePath,
      shouldPublish: true,
      title: "Lesson",
    });
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("rejects missing and malformed H5P archives", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "h5p-import-"));
  fs.mkdirSync(path.join(root, "h5p"));
  fs.writeFileSync(path.join(root, "h5p", "lesson.h5p"), "not-a-zip");

  try {
    assert.throws(
      () => validatePackageEntry(source({ package: "h5p/missing.h5p" }), root),
      /package does not exist/i,
    );
    assert.throws(
      () => validatePackageEntry(source(), root),
      /invalid H5P package/i,
    );
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("rejects a package whose declared library differs from its archive", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "h5p-import-"));
  fs.mkdirSync(path.join(root, "h5p"));
  createPackage(path.join(root, "h5p"));

  try {
    assert.throws(
      () =>
        validatePackageEntry(
          source({ library: "H5P.InteractiveBook 1.2" }),
          root,
        ),
      /library mismatch/i,
    );
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("plans imports and preserves source publication intent", () => {
  const entries = [
    { ...source(), shouldPublish: true },
    {
      ...source({ nid: 96, published: 0 }),
      legacyNid: 96,
      shouldPublish: false,
    },
  ];
  const records = [placeholder(), placeholder({ legacyNid: 96 })];

  assert.deepEqual(
    planH5pImports(entries, records).map(
      ({ action, legacyNid, shouldPublish }) => ({
        action,
        legacyNid,
        shouldPublish,
      }),
    ),
    [
      { action: "import", legacyNid: 88, shouldPublish: true },
      { action: "import", legacyNid: 96, shouldPublish: false },
    ],
  );
});

test("skips a previously imported record with a stored content ID", () => {
  const [planned] = planH5pImports(
    [{ ...source(), shouldPublish: true }],
    [
      placeholder({
        h5pContent: { contentId: "501" },
        migrationStatus: "imported",
      }),
    ],
  );

  assert.equal(planned.action, "skip");
  assert.equal(planned.contentId, "501");
});

test("rejects missing placeholders and duplicate source or target NIDs", () => {
  const entry = { ...source(), shouldPublish: true };

  assert.throws(() => planH5pImports([entry], []), /no placeholder/i);
  assert.throws(
    () => planH5pImports([entry, entry], [placeholder()]),
    /duplicate source legacyNid 88/i,
  );
  assert.throws(
    () =>
      planH5pImports(
        [entry],
        [placeholder(), placeholder({ documentId: "duplicate-document-88" })],
      ),
    /duplicate target legacyNid 88/i,
  );
});

function importPlan(overrides = {}) {
  return {
    action: "import",
    filename: "lesson.h5p",
    legacyNid: 88,
    library: "H5P.CoursePresentation 1.22",
    packagePath: "/packages/lesson.h5p",
    record: placeholder(),
    shouldPublish: true,
    title: "Lesson",
    ...overrides,
  };
}

test("dry-run reports planned work without importing or updating", async () => {
  let imports = 0;
  let updates = 0;

  const report = await executeH5pImport([importPlan()], {
    apply: false,
    async importPackage() {
      imports += 1;
    },
    async updateDocument() {
      updates += 1;
    },
  });

  assert.equal(imports, 0);
  assert.equal(updates, 0);
  assert.equal(report.items[0].status, "planned");
  assert.deepEqual(report.summary, {
    errors: 0,
    imported: 0,
    planned: 1,
    skipped: 0,
  });
});

test("apply imports content and stores the normalized H5P payload", async () => {
  const updates = [];
  const result = {
    id: 501,
    installedLibraries: [{ type: "new", uberName: "H5P.Test-1.0" }],
    library: "H5P.CoursePresentation 1.22",
    metadata: { title: "Lesson" },
    parameters: { slides: [] },
  };

  const report = await executeH5pImport([importPlan()], {
    apply: true,
    async importPackage(packagePath) {
      assert.equal(packagePath, "/packages/lesson.h5p");
      return result;
    },
    async updateDocument(documentId, data) {
      updates.push({ data, documentId });
    },
  });

  assert.deepEqual(updates, [
    {
      documentId: "document-88",
      data: {
        h5pContent: {
          contentId: "501",
          library: result.library,
          metadata: result.metadata,
          params: result.parameters,
        },
        migrationStatus: "imported",
      },
    },
  ]);
  assert.equal(report.items[0].status, "imported");
  assert.equal(report.items[0].contentId, "501");
  assert.equal(report.items[0].installedLibraries.length, 1);
});

test("skips completed records and continues after an item import failure", async () => {
  const imported = [];
  const report = await executeH5pImport(
    [
      importPlan({ legacyNid: 88 }),
      importPlan({ legacyNid: 89, packagePath: "/packages/second.h5p" }),
      importPlan({ action: "skip", contentId: "777", legacyNid: 90 }),
    ],
    {
      apply: true,
      async importPackage(packagePath) {
        imported.push(packagePath);
        if (packagePath.endsWith("lesson.h5p")) throw new Error("bad package");
        return {
          id: "502",
          installedLibraries: [],
          library: "H5P.CoursePresentation 1.22",
          metadata: { title: "Second" },
          parameters: { slides: [] },
        };
      },
      async updateDocument() {},
    },
  );

  assert.deepEqual(imported, [
    "/packages/lesson.h5p",
    "/packages/second.h5p",
  ]);
  assert.deepEqual(
    report.items.map(({ legacyNid, status }) => ({ legacyNid, status })),
    [
      { legacyNid: 88, status: "error" },
      { legacyNid: 89, status: "imported" },
      { legacyNid: 90, status: "skipped" },
    ],
  );
});

test("reports an orphan content ID when storage succeeds but update fails", async () => {
  const report = await executeH5pImport([importPlan()], {
    apply: true,
    async importPackage() {
      return {
        id: 503,
        installedLibraries: [],
        library: "H5P.CoursePresentation 1.22",
        metadata: { title: "Lesson" },
        parameters: { slides: [] },
      };
    },
    async updateDocument() {
      throw new Error("database unavailable");
    },
  });

  assert.equal(report.items[0].status, "error");
  assert.equal(report.items[0].orphanContentId, "503");
  assert.match(report.items[0].error, /database unavailable/);
});
