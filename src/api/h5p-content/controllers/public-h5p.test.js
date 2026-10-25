"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const helper = import("./public-h5p.ts");

test("reduces a single public H5P payload to its content ID", async () => {
  const { sanitizePublicH5pResponse } = await helper;
  const response = {
    data: {
      documentId: "lesson",
      h5pContent: {
        contentId: 501,
        library: "H5P.CoursePresentation 1.22",
        metadata: { title: "Lesson" },
        params: { very: "large" },
      },
      title: "Lesson",
    },
    meta: {},
  };

  assert.deepEqual(sanitizePublicH5pResponse(response), {
    data: {
      documentId: "lesson",
      h5pContent: { contentId: "501" },
      title: "Lesson",
    },
    meta: {},
  });
});

test("sanitizes list responses and JSON-string payloads without mutating input", async () => {
  const { sanitizePublicH5pResponse } = await helper;
  const response = {
    data: [
      {
        documentId: "lesson",
        h5pContent: JSON.stringify({ contentId: "502", params: { huge: true } }),
      },
      { documentId: "placeholder", h5pContent: null },
    ],
  };

  const sanitized = sanitizePublicH5pResponse(response);

  assert.deepEqual(sanitized.data, [
    { documentId: "lesson", h5pContent: { contentId: "502" } },
    { documentId: "placeholder", h5pContent: null },
  ]);
  assert.equal(typeof response.data[0].h5pContent, "string");
});
