import assert from "node:assert/strict";
import test from "node:test";
import { ContentTypeCache, fsImplementations } from "@lumieducation/h5p-server";
import { seedContentTypeCache } from "./h5p-content-type-cache.mjs";

test("seeds an empty cache so a cold read does not wait for the H5P Hub", async () => {
  const storage = new fsImplementations.InMemoryStorage();
  assert.equal(await seedContentTypeCache(storage), true);

  const cache = new ContentTypeCache(
    { contentTypeCacheRefreshInterval: 24 * 60 * 60 * 1000 },
    storage,
  );
  cache.downloadContentTypesFromHub = async () => {
    throw new Error("A cold cache read must not contact the H5P Hub");
  };

  assert.deepEqual(await cache.get(), []);
  assert.equal(await cache.isOutdated(), true);
});

test("preserves an existing H5P Hub cache", async () => {
  const storage = new fsImplementations.InMemoryStorage();
  const existing = [{ machineName: "H5P.Example" }];
  await storage.save("contentTypeCache", existing);

  assert.equal(await seedContentTypeCache(storage), false);
  assert.deepEqual(await storage.load("contentTypeCache"), existing);
});
