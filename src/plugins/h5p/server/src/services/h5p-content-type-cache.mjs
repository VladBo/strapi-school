/**
 * Seed a usable empty cache before the editor handles requests. H5P's cache
 * fetches the Hub synchronously from get() when no value exists, which makes
 * the first editor request wait on an external service after every cold start.
 */
export async function seedContentTypeCache(storage) {
  const existingCache = await storage.load("contentTypeCache");
  if (existingCache !== undefined && existingCache !== null) return false;

  await storage.save("contentTypeCache", []);
  // Keep the cache marked outdated so H5P still offers a refresh and the
  // background update can populate the Hub catalog without blocking the UI.
  await storage.save("contentTypeCacheUpdate", 0);
  return true;
}
