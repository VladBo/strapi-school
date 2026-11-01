const assert = require("node:assert/strict");
const test = require("node:test");

test("backfills and publishes a published-only H5P document", async () => {
  const { default: app } = await import("./index.ts");
  const publishedOnly = {
    documentId: "python-quiz",
    title: "Програмування мовою Python",
    legacyPath: null,
    legacyNid: 123,
    slug: null,
  };
  const updates = [];
  const publishes = [];
  const errors = [];
  const strapi = {
    documents: () => ({
      findMany: async ({ status }) =>
        status === "draft" ? [] : [publishedOnly],
      update: async (params) => updates.push(params),
      publish: async (params) => publishes.push(params),
    }),
    log: {
      info() {},
      error(error) {
        errors.push(error);
      },
    },
  };

  await app.bootstrap({ strapi });
  await new Promise(setImmediate);
  await new Promise(setImmediate);

  assert.deepEqual(errors, []);
  assert.deepEqual(updates, [
    {
      documentId: "python-quiz",
      data: { slug: "prohramuvannya-movoyu-python" },
    },
  ]);
  assert.deepEqual(publishes, [{ documentId: "python-quiz" }]);
});

test("does not treat another version of the same document as a slug collision", async () => {
  const { default: app } = await import("./index.ts");
  const draft = {
    documentId: "same-document",
    title: "Title",
    legacyPath: null,
    legacyNid: 123,
    slug: null,
  };
  const published = { ...draft, slug: "title" };
  const updates = [];
  const strapi = {
    documents: () => ({
      findMany: async ({ status }) =>
        status === "draft" ? [draft] : [published],
      update: async (params) => updates.push(params),
      publish: async () => {},
    }),
    log: { info() {}, error(error) { throw error; } },
  };

  await app.bootstrap({ strapi });
  await new Promise(setImmediate);
  await new Promise(setImmediate);

  assert.deepEqual(updates, [
    { documentId: "same-document", data: { slug: "title" } },
  ]);
});
