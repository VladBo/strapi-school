function getMainLibraryVersion(metadata) {
  if (!metadata?.mainLibrary) return undefined;
  const dependency = metadata.preloadedDependencies?.find(
    (item) => item.machineName === metadata.mainLibrary,
  );
  if (!dependency) return undefined;
  return `${metadata.mainLibrary} ${dependency.majorVersion}.${dependency.minorVersion}`;
}

const DEFAULT_MAX_TOTAL_SIZE = 96 * 1024 * 1024;
const DEFAULT_MAX_FILE_SIZE = 64 * 1024 * 1024;

export function resolveMaxFileSize(value) {
  return Number.isInteger(value) && value > 0
    ? value
    : DEFAULT_MAX_FILE_SIZE;
}

export function resolveMaxTotalSize(value) {
  return Number.isInteger(value) && value > 0
    ? value
    : DEFAULT_MAX_TOTAL_SIZE;
}

export async function importPackageWithEditor(editor, packagePath, user) {
  const { installedLibraries, metadata, parameters } =
    await editor.uploadPackage(packagePath, user);
  if (parameters === undefined || parameters === null) {
    throw new Error("H5P package content parameters are missing");
  }
  const library = getMainLibraryVersion(metadata);
  if (!library) {
    throw new Error("H5P package main library is missing");
  }

  const id = await editor.saveOrUpdateContent(
    undefined,
    parameters,
    metadata,
    library,
    user,
  );
  return { id, installedLibraries, library, metadata, parameters };
}
