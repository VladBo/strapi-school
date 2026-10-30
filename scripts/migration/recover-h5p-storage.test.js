"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { planH5pRecovery } = require("./recover-h5p-storage");

test("plans one recovery for each missing content ID with a complete payload", () => {
  const records = [
    {
      documentId: "published-and-draft",
      title: "Recover me",
      h5pContent: {
        contentId: "101",
        library: "H5P.MultiChoice 1.16",
        params: { params: { question: "One" } },
        metadata: { title: "One" },
      },
    },
    {
      documentId: "published-and-draft",
      title: "Recover me",
      h5pContent: {
        contentId: "101",
        library: "H5P.MultiChoice 1.16",
        params: { params: { question: "One" } },
        metadata: { title: "One" },
      },
    },
    {
      documentId: "already-present",
      title: "Keep me",
      h5pContent: {
        contentId: "202",
        library: "H5P.MultiChoice 1.16",
        params: { params: { question: "Two" } },
        metadata: { title: "Two" },
      },
    },
    {
      documentId: "placeholder",
      title: "No payload",
      h5pContent: null,
    },
  ];

  assert.deepEqual(planH5pRecovery(records, new Set(["202"])), [
    {
      oldContentId: "101",
      documentIds: ["published-and-draft"],
      title: "Recover me",
      payload: records[0].h5pContent,
    },
  ]);
});

test("rejects a content ID that points to different payloads", () => {
  const records = [
    {
      documentId: "conflict",
      title: "Conflict",
      h5pContent: {
        contentId: "303",
        library: "H5P.MultiChoice 1.16",
        params: { params: { question: "Draft" } },
        metadata: { title: "Draft" },
      },
    },
    {
      documentId: "conflict",
      title: "Conflict",
      h5pContent: {
        contentId: "303",
        library: "H5P.MultiChoice 1.16",
        params: { params: { question: "Published" } },
        metadata: { title: "Published" },
      },
    },
  ];

  assert.throws(
    () => planH5pRecovery(records, new Set()),
    /different payloads/,
  );
});
