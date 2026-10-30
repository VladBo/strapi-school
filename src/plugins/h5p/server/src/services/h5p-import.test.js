"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const helper = import("./h5p-import.mjs");

function packageResult(overrides = {}) {
  return {
    installedLibraries: [{ type: "new" }],
    metadata: {
      mainLibrary: "H5P.CoursePresentation",
      preloadedDependencies: [
        {
          machineName: "H5P.CoursePresentation",
          majorVersion: 1,
          minorVersion: 22,
        },
      ],
      title: "Lesson",
    },
    parameters: { slides: [] },
    ...overrides,
  };
}

test("uploads a package before saving it with the derived main library", async () => {
  const { importPackageWithEditor } = await helper;
  const calls = [];
  const user = { id: "migration", name: "Migration" };
  const editor = {
    async uploadPackage(packagePath, actualUser) {
      calls.push(["upload", packagePath, actualUser]);
      return packageResult();
    },
    async saveOrUpdateContent(
      contentId,
      parameters,
      metadata,
      library,
      actualUser,
    ) {
      calls.push([
        "save",
        contentId,
        parameters,
        metadata,
        library,
        actualUser,
      ]);
      return "501";
    },
  };

  const result = await importPackageWithEditor(
    editor,
    "/tmp/lesson.h5p",
    user,
  );

  assert.deepEqual(calls, [
    ["upload", "/tmp/lesson.h5p", user],
    [
      "save",
      undefined,
      { slides: [] },
      packageResult().metadata,
      "H5P.CoursePresentation 1.22",
      user,
    ],
  ]);
  assert.deepEqual(result, {
    id: "501",
    installedLibraries: [{ type: "new" }],
    library: "H5P.CoursePresentation 1.22",
    metadata: packageResult().metadata,
    parameters: { slides: [] },
  });
});

test("rejects an incomplete uploaded package without saving content", async () => {
  const { importPackageWithEditor } = await helper;
  let saves = 0;
  const editor = {
    async uploadPackage() {
      return packageResult({ parameters: undefined });
    },
    async saveOrUpdateContent() {
      saves += 1;
      return "unexpected";
    },
  };

  await assert.rejects(
    () => importPackageWithEditor(editor, "/tmp/broken.h5p", {}),
    /content parameters are missing/i,
  );
  assert.equal(saves, 0);
});

test("rejects metadata without a resolvable main library", async () => {
  const { importPackageWithEditor } = await helper;
  let saves = 0;
  const editor = {
    async uploadPackage() {
      return packageResult({
        metadata: { mainLibrary: "H5P.CoursePresentation", title: "Lesson" },
      });
    },
    async saveOrUpdateContent() {
      saves += 1;
      return "unexpected";
    },
  };

  await assert.rejects(
    () => importPackageWithEditor(editor, "/tmp/broken.h5p", {}),
    /main library is missing/i,
  );
  assert.equal(saves, 0);
});

test("uses a 96 MiB package limit by default and accepts an explicit override", async () => {
  const { resolveMaxTotalSize } = await helper;

  assert.equal(resolveMaxTotalSize(), 96 * 1024 * 1024);
  assert.equal(resolveMaxTotalSize(128 * 1024 * 1024), 128 * 1024 * 1024);
  assert.equal(resolveMaxTotalSize(-1), 96 * 1024 * 1024);
});

test("uses a 64 MiB per-file limit by default and accepts an explicit override", async () => {
  const { resolveMaxFileSize } = await helper;

  assert.equal(resolveMaxFileSize(), 64 * 1024 * 1024);
  assert.equal(resolveMaxFileSize(80 * 1024 * 1024), 80 * 1024 * 1024);
  assert.equal(resolveMaxFileSize(0), 64 * 1024 * 1024);
});
