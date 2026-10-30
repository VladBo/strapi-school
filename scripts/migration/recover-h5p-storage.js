"use strict";

const fs = require("node:fs");
const path = require("node:path");

function stableJson(value) {
  if (Array.isArray(value)) return value.map(stableJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableJson(value[key])]),
    );
  }
  return value;
}

function payloadFingerprint(payload) {
  return JSON.stringify(
    stableJson({
      library: payload.library,
      metadata: payload.metadata,
      params: payload.params,
    }),
  );
}

function planH5pRecovery(records, existingContentIds) {
  const recoveries = new Map();

  for (const record of records) {
    const payload = record.h5pContent;
    if (!payload?.contentId || !payload.library || !payload.params) continue;

    const oldContentId = String(payload.contentId);
    if (existingContentIds.has(oldContentId)) continue;

    const fingerprint = payloadFingerprint(payload);
    const existing = recoveries.get(oldContentId);
    if (existing && existing.fingerprint !== fingerprint) {
      throw new Error(
        `H5P content ID ${oldContentId} points to different payloads`,
      );
    }

    if (existing) {
      existing.documentIds.add(record.documentId);
      continue;
    }

    recoveries.set(oldContentId, {
      documentIds: new Set([record.documentId]),
      fingerprint,
      oldContentId,
      payload,
      title: record.title,
    });
  }

  return [...recoveries.values()].map(
    ({ documentIds, fingerprint: _fingerprint, ...recovery }) => ({
      ...recovery,
      documentIds: [...documentIds].sort(),
    }),
  );
}

module.exports = { planH5pRecovery };

async function createApplication() {
  const { createStrapi, compileStrapi } = require("@strapi/strapi");
  return createStrapi(await compileStrapi()).load();
}

function findStoredContentIds(contentRoot) {
  if (!fs.existsSync(contentRoot)) return new Set();

  return new Set(
    fs
      .readdirSync(contentRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .filter((entry) =>
        ["content.json", "h5p.json"].every((file) =>
          fs.existsSync(path.join(contentRoot, entry.name, file)),
        ),
      )
      .map((entry) => entry.name),
  );
}

async function main() {
  const apply = process.argv.includes("--apply");
  require("dotenv").config({ path: path.resolve(".env") });
  const { Client } = require("pg");
  const client = new Client({
    database: process.env.DATABASE_NAME,
    host: process.env.DATABASE_HOST,
    password: process.env.DATABASE_PASSWORD,
    port: Number(process.env.DATABASE_PORT),
    user: process.env.DATABASE_USERNAME,
  });
  await client.connect();

  let app;
  try {
    const { rows } = await client.query(`
      select
        document_id as "documentId",
        h_5_p_content as "h5pContent",
        title
      from h5p_contents
      where h_5_p_content is not null
      order by document_id, published_at nulls first
    `);
    const contentRoot = path.resolve("public/h5p/content");
    const recoveries = planH5pRecovery(rows, findStoredContentIds(contentRoot));
    console.log(
      JSON.stringify(
        {
          mode: apply ? "apply" : "dry-run",
          recoveries: recoveries.map(
            ({ documentIds, oldContentId, title }) => ({
              documentIds,
              oldContentId,
              title,
            }),
          ),
        },
        null,
        2,
      ),
    );

    if (!apply || recoveries.length === 0) return;

    app = await createApplication();
    app.log.level = "error";
    const h5pService = app.plugin("h5p").service("service");

    for (const recovery of recoveries) {
      const payload = { ...recovery.payload };
      delete payload.contentId;
      const { id: newContentId } = await h5pService.saveContent(payload);
      await h5pService.getContentParams(String(newContentId));

      const update = await client.query(
        `
          update h5p_contents
          set
            h_5_p_content = jsonb_set(
              h_5_p_content,
              '{contentId}',
              to_jsonb($1::text),
              true
            ),
            updated_at = now()
          where h_5_p_content->>'contentId' = $2
        `,
        [String(newContentId), recovery.oldContentId],
      );
      if (update.rowCount === 0) {
        throw new Error(
          `No database rows referenced H5P content ID ${recovery.oldContentId}`,
        );
      }

      console.log(
        JSON.stringify({
          newContentId: String(newContentId),
          oldContentId: recovery.oldContentId,
          rowsUpdated: update.rowCount,
          title: recovery.title,
        }),
      );
    }
  } finally {
    if (app) await app.destroy();
    await client.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
