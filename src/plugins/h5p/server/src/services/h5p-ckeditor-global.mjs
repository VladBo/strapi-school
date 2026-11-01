const upstreamVersionGuard = /globalThis\.CKEDITOR_VERSION(?=\s*=)/g;
const isolatedVersionGuard = /globalThis\.H5P_CKEDITOR_VERSION(?=\s*=)/;

export function isolateH5PCkeditorGlobal(source) {
  if (isolatedVersionGuard.test(source)) return source;
  if (!source.match(upstreamVersionGuard)) {
    throw new Error("H5P CKEditor asset is missing the expected version guard");
  }

  return source.replace(upstreamVersionGuard, "globalThis.H5P_CKEDITOR_VERSION");
}
