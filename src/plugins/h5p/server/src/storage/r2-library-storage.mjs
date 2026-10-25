import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
import { isDeepStrictEqual } from 'node:util';

import { normalizeObjectKey } from './object-store.mjs';

const require = createRequire(import.meta.url);
const { H5pError, InstalledLibrary, LibraryName } = require('@lumieducation/h5p-server');

const LIBRARY_METADATA_FILE = 'library.json';
const STORAGE_METADATA_FILE = '_storage.json';

function h5pError(errorId, replacements = {}, httpStatusCode = 500, cause) {
  return new H5pError(errorId, replacements, httpStatusCode, cause?.message);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function specificationMetadata(metadata) {
  const { restricted: _restricted, ...specification } = metadata;
  return specification;
}

function isInternalFile(filename) {
  return filename === STORAGE_METADATA_FILE;
}

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

function sameLibrary(left, right) {
  return (
    left?.machineName === right?.machineName &&
    Number(left?.majorVersion) === Number(right?.majorVersion) &&
    Number(left?.minorVersion) === Number(right?.minorVersion)
  );
}

export function createR2LibraryStorage({ store, cache = new Map() }) {
  if (!store) throw new TypeError('An object store is required');

  const ubername = (library) => LibraryName.toUberName(library);

  function fileKey(library, filename) {
    try {
      return normalizeObjectKey(ubername(library), filename);
    } catch (error) {
      throw h5pError(
        'storage-file-implementations:illegal-relative-filename',
        { filename },
        400,
        error,
      );
    }
  }

  function invalidate(library) {
    cache.delete(ubername(library));
  }

  async function readJsonFile(library, filename, fallback) {
    try {
      const result = await store.get(fileKey(library, filename));
      return JSON.parse(await streamToString(result.stream));
    } catch (error) {
      if (error?.code === 'OBJECT_NOT_FOUND' && fallback !== undefined) return cloneJson(fallback);
      throw error;
    }
  }

  async function writeJsonFile(library, filename, value) {
    await store.put(fileKey(library, filename), Readable.from([JSON.stringify(value)]), {
      contentType: 'application/json',
    });
  }

  async function isInstalled(library) {
    return store.exists(fileKey(library, LIBRARY_METADATA_FILE));
  }

  async function addLibrary(libraryMetadata, restricted = false) {
    const libraryName = new LibraryName(
      libraryMetadata.machineName,
      libraryMetadata.majorVersion,
      libraryMetadata.minorVersion,
    );
    if (await isInstalled(libraryName)) {
      throw h5pError('storage-file-implementations:install-library-already-installed', {
        libraryName: ubername(libraryName),
      });
    }

    try {
      await writeJsonFile(libraryName, LIBRARY_METADATA_FILE, specificationMetadata(libraryMetadata));
      await writeJsonFile(libraryName, STORAGE_METADATA_FILE, { restricted: Boolean(restricted) });
      invalidate(libraryName);
      return await getLibrary(libraryName);
    } catch (error) {
      await store.deletePrefix(ubername(libraryName));
      throw error;
    }
  }

  async function addFile(library, filename, readStream) {
    if (!(await isInstalled(library))) {
      throw h5pError(
        'storage-file-implementations:add-library-file-not-installed',
        { filename, libraryName: ubername(library) },
        500,
      );
    }
    if (isInternalFile(filename) || filename === LIBRARY_METADATA_FILE) {
      throw h5pError('storage-file-implementations:illegal-relative-filename', { filename }, 400);
    }
    await store.put(fileKey(library, filename), readStream);
    return true;
  }

  async function fileExists(library, filename) {
    if (isInternalFile(filename)) return false;
    return store.exists(fileKey(library, filename));
  }

  async function getFileStream(library, filename) {
    if (isInternalFile(filename)) {
      throw h5pError('library-file-missing', { filename, library: ubername(library) }, 404);
    }
    try {
      return (await store.get(fileKey(library, filename))).stream;
    } catch (error) {
      if (error?.code === 'OBJECT_NOT_FOUND') {
        throw h5pError('library-file-missing', { filename, library: ubername(library) }, 404, error);
      }
      throw error;
    }
  }

  async function getFileStats(library, filename) {
    if (isInternalFile(filename)) {
      throw h5pError('library-file-missing', { filename, library: ubername(library) }, 404);
    }
    try {
      const result = await store.head(fileKey(library, filename));
      return { birthtime: result.lastModified ?? new Date(0), size: result.size ?? 0 };
    } catch (error) {
      if (error?.code === 'OBJECT_NOT_FOUND') {
        throw h5pError('library-file-missing', { filename, library: ubername(library) }, 404, error);
      }
      throw error;
    }
  }

  async function getFileAsString(library, filename) {
    return streamToString(await getFileStream(library, filename));
  }

  async function getFileAsJson(library, filename) {
    return JSON.parse(await getFileAsString(library, filename));
  }

  async function getLibrary(library) {
    const key = ubername(library);
    const cached = cache.get(key);
    if (cached) return InstalledLibrary.fromMetadata(cloneJson(cached));
    if (!(await isInstalled(library))) {
      throw h5pError(
        'storage-file-implementations:get-library-metadata-not-installed',
        { libraryName: key },
        404,
      );
    }

    const specification = await readJsonFile(library, LIBRARY_METADATA_FILE);
    const storageMetadata = await readJsonFile(library, STORAGE_METADATA_FILE, { restricted: false });
    const combined = { ...specification, ...storageMetadata };
    cache.set(key, cloneJson(combined));
    return InstalledLibrary.fromMetadata(cloneJson(combined));
  }

  async function updateAdditionalMetadata(library, additionalMetadata) {
    if (!(await isInstalled(library))) {
      throw h5pError(
        'storage-file-implementations:get-library-metadata-not-installed',
        { libraryName: ubername(library) },
        404,
      );
    }
    const current = await readJsonFile(library, STORAGE_METADATA_FILE, { restricted: false });
    const updated = { ...current, ...additionalMetadata };
    if (isDeepStrictEqual(current, updated)) return false;
    try {
      await writeJsonFile(library, STORAGE_METADATA_FILE, updated);
      invalidate(library);
      return true;
    } catch (error) {
      throw h5pError(
        'storage-file-implementations:error-updating-metadata',
        { library: ubername(library), error: error.message },
        500,
        error,
      );
    }
  }

  async function updateLibrary(libraryMetadata) {
    const library = new LibraryName(
      libraryMetadata.machineName,
      libraryMetadata.majorVersion,
      libraryMetadata.minorVersion,
    );
    if (!(await isInstalled(library))) {
      throw h5pError(
        'storage-file-implementations:update-library-library-missing',
        { libraryName: ubername(library) },
        404,
      );
    }
    await writeJsonFile(library, LIBRARY_METADATA_FILE, specificationMetadata(libraryMetadata));
    invalidate(library);
    return getLibrary(library);
  }

  async function listFiles(library) {
    const prefix = `${ubername(library)}/`;
    return (await store.list(prefix))
      .map(({ key }) => key.slice(prefix.length))
      .filter((filename) => filename && !isInternalFile(filename))
      .sort();
  }

  async function clearFiles(library) {
    if (!(await isInstalled(library))) {
      throw h5pError('storage-file-implementations:clear-library-not-found', {
        libraryName: ubername(library),
      });
    }
    const prefix = `${ubername(library)}/`;
    const objects = await store.list(prefix);
    await Promise.all(
      objects
        .map(({ key }) => key.slice(prefix.length))
        .filter((filename) => filename !== LIBRARY_METADATA_FILE && filename !== STORAGE_METADATA_FILE)
        .map((filename) => store.delete(fileKey(library, filename))),
    );
  }

  async function deleteLibrary(library) {
    if (!(await isInstalled(library))) {
      throw h5pError(
        'storage-file-implementations:remove-library-library-missing',
        { libraryName: ubername(library) },
        404,
      );
    }
    await store.deletePrefix(ubername(library));
    invalidate(library);
  }

  async function getInstalledLibraryNames(machineName) {
    const installed = new Map();
    for (const { key } of await store.list('')) {
      const match = key.match(/^([\w.]+-\d+\.\d+)\/library\.json$/i);
      if (!match) continue;
      const library = LibraryName.fromUberName(match[1]);
      if (!machineName || library.machineName === machineName) installed.set(match[1], library);
    }
    return [...installed.entries()]
      .sort(([left], [right]) => left.localeCompare(right, 'en', { numeric: true }))
      .map(([, library]) => library);
  }

  async function getLanguages(library) {
    const prefix = `${ubername(library)}/language/`;
    return (await store.list(prefix))
      .map(({ key }) => key.slice(prefix.length).match(/^([^/]+)\.json$/)?.[1])
      .filter(Boolean)
      .sort();
  }

  async function listAddons() {
    const libraries = await Promise.all((await getInstalledLibraryNames()).map(getLibrary));
    return libraries.filter((library) => library.addTo !== undefined);
  }

  async function getAllDependentsCount() {
    const libraries = await Promise.all((await getInstalledLibraryNames()).map(getLibrary));
    const metadataByName = new Map(
      libraries.map((library) => [ubername(library), cloneJson(library)]),
    );

    for (const library of metadataByName.values()) {
      for (const editorDependency of library.editorDependencies ?? []) {
        const dependency = metadataByName.get(ubername(editorDependency));
        if (!dependency?.preloadedDependencies) continue;
        dependency.preloadedDependencies = dependency.preloadedDependencies.filter(
          (candidate) => !sameLibrary(candidate, library),
        );
      }
    }

    const counts = {};
    for (const library of metadataByName.values()) {
      const dependencies = [
        ...(library.preloadedDependencies ?? []),
        ...(library.editorDependencies ?? []),
        ...(library.dynamicDependencies ?? []),
      ];
      for (const dependency of dependencies) {
        const key = ubername(dependency);
        counts[key] = (counts[key] ?? 0) + 1;
      }
    }
    return counts;
  }

  async function getDependentsCount(library) {
    return (await getAllDependentsCount())[ubername(library)] ?? 0;
  }

  return {
    addFile,
    addLibrary,
    clearFiles,
    deleteLibrary,
    fileExists,
    getAllDependentsCount,
    getDependentsCount,
    getFileAsJson,
    getFileAsString,
    getFileStats,
    getFileStream,
    getInstalledLibraryNames,
    getLanguages,
    getLibrary,
    isInstalled,
    listAddons,
    listFiles,
    updateAdditionalMetadata,
    updateLibrary,
  };
}
