import { randomInt } from 'node:crypto';
import { createRequire } from 'node:module';
import { Readable } from 'node:stream';

import { normalizeObjectKey } from './object-store.mjs';

const require = createRequire(import.meta.url);
const { H5pError } = require('@lumieducation/h5p-server');

function h5pError(errorId, replacements = {}, httpStatusCode = 500, cause) {
  return new H5pError(errorId, replacements, httpStatusCode, cause?.message);
}

function safeKey(contentId, filename) {
  try {
    const rawId = String(contentId);
    if (rawId.includes('/')) throw new TypeError('Content IDs must be a single path segment');
    const id = normalizeObjectKey(rawId);
    return filename === undefined ? id : normalizeObjectKey(id, filename);
  } catch (error) {
    throw h5pError(
      'storage-file-implementations:illegal-relative-filename',
      { filename: filename ?? String(contentId) },
      400,
      error,
    );
  }
}

async function streamToJson(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function sameLibrary(left, right) {
  return (
    left?.machineName === right.machineName &&
    Number(left?.majorVersion) === Number(right.majorVersion) &&
    Number(left?.minorVersion) === Number(right.minorVersion)
  );
}

function hasDependency(metadata, library) {
  return ['preloadedDependencies', 'editorDependencies', 'dynamicDependencies'].some((field) =>
    metadata[field]?.some((dependency) => sameLibrary(dependency, library)),
  );
}

function defaultContentId() {
  return String(randomInt(1, 0x100000000));
}

export function createR2ContentStorage({ store, createContentId = defaultContentId }) {
  if (!store) throw new TypeError('An object store is required');

  async function generateContentId() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const id = String(await createContentId());
      const numericId = Number(id);
      if (
        Number.isInteger(numericId) &&
        numericId >= 0 &&
        numericId <= 0xffffffff &&
        !(await store.exists(`${safeKey(id)}/h5p.json`))
      ) {
        return id;
      }
    }
    throw h5pError('storage-file-implementations:error-generating-content-id');
  }

  async function contentExists(contentId) {
    return store.exists(`${safeKey(contentId)}/h5p.json`);
  }

  async function addContent(metadata, content, user, requestedId) {
    const id = requestedId === undefined || requestedId === null ? await generateContentId() : String(requestedId);
    const contentPrefix = safeKey(id);
    try {
      await store.put(`${contentPrefix}/h5p.json`, Readable.from([JSON.stringify(metadata)]), {
        contentType: 'application/json',
      });
      await store.put(`${contentPrefix}/content.json`, Readable.from([JSON.stringify(content)]), {
        contentType: 'application/json',
      });
    } catch (error) {
      await store.deletePrefix(contentPrefix);
      throw h5pError('storage-file-implementations:error-creating-content', {}, 500, error);
    }
    return id;
  }

  async function addFile(contentId, filename, readStream) {
    if (!(await contentExists(contentId))) {
      throw h5pError(
        'storage-file-implementations:add-file-content-not-found',
        { filename, id: contentId },
        404,
      );
    }
    await store.put(safeKey(contentId, filename), readStream);
  }

  async function deleteContent(contentId) {
    if (!(await contentExists(contentId))) {
      throw h5pError('storage-file-implementations:delete-content-not-found', {}, 404);
    }
    await store.deletePrefix(safeKey(contentId));
  }

  async function fileExists(contentId, filename) {
    if (contentId === undefined || contentId === null) return false;
    return store.exists(safeKey(contentId, filename));
  }

  async function deleteFile(contentId, filename) {
    if (!(await fileExists(contentId, filename))) {
      throw h5pError(
        'storage-file-implementations:delete-content-file-not-found',
        { filename },
        404,
      );
    }
    await store.delete(safeKey(contentId, filename));
  }

  async function getFileStats(contentId, filename) {
    try {
      const result = await store.head(safeKey(contentId, filename));
      return {
        birthtime: result.lastModified ?? new Date(0),
        size: result.size ?? 0,
      };
    } catch (error) {
      if (error?.code === 'OBJECT_NOT_FOUND') {
        throw h5pError('content-file-missing', { filename, contentId }, 404, error);
      }
      throw error;
    }
  }

  async function getFileStream(contentId, filename, user, rangeStart, rangeEnd) {
    try {
      const result = await store.get(
        safeKey(contentId, filename),
        rangeStart === undefined ? undefined : { start: rangeStart, end: rangeEnd },
      );
      return result.stream;
    } catch (error) {
      if (error?.code === 'OBJECT_NOT_FOUND') {
        throw h5pError('content-file-missing', { filename, contentId }, 404, error);
      }
      throw error;
    }
  }

  async function getMetadata(contentId, user) {
    return streamToJson(await getFileStream(contentId, 'h5p.json', user));
  }

  async function getParameters(contentId, user) {
    return streamToJson(await getFileStream(contentId, 'content.json', user));
  }

  async function listContent() {
    const objects = await store.list('');
    return objects
      .map(({ key }) => key.match(/^([^/]+)\/h5p\.json$/)?.[1])
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right, 'en', { numeric: true }));
  }

  async function listFiles(contentId) {
    const prefix = `${safeKey(contentId)}/`;
    const objects = await store.list(prefix);
    return objects
      .map(({ key }) => key.slice(prefix.length))
      .filter((filename) => filename && filename !== 'h5p.json' && filename !== 'content.json')
      .sort();
  }

  async function getUsage(library) {
    let asDependency = 0;
    let asMainLibrary = 0;
    for (const contentId of await listContent()) {
      const metadata = await getMetadata(contentId);
      if (!hasDependency(metadata, library)) continue;
      if (metadata.mainLibrary === library.machineName) asMainLibrary += 1;
      else asDependency += 1;
    }
    return { asDependency, asMainLibrary };
  }

  function sanitizeFilename(filename) {
    const cleaned = filename.replace(/[^A-Za-z0-9\-._!()/]/g, '');
    if (cleaned && !cleaned.endsWith('/')) return cleaned;
    return `${cleaned}file`;
  }

  return {
    addContent,
    addFile,
    contentExists,
    deleteContent,
    deleteFile,
    fileExists,
    getFileStats,
    getFileStream,
    getMetadata,
    getParameters,
    getUsage,
    listContent,
    listFiles,
    sanitizeFilename,
  };
}
