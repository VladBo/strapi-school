type AssetUrlConfig = {
  publicBaseUrl: string;
  rootPath: string;
};

function rewriteUploadUrl(value: string, { publicBaseUrl, rootPath }: AssetUrlConfig) {
  if (!value.startsWith('/uploads/')) return value;

  const suffix = value.slice('/uploads/'.length);
  const path = suffix.split(/[?#]/, 1)[0];
  if (!path || path.split('/').some((segment) => segment === '..')) return value;

  return `${publicBaseUrl.replace(/\/+$/, '')}/${rootPath}/${suffix}`;
}

export function rewriteUrls(
  value: unknown,
  config: AssetUrlConfig,
  seen = new WeakSet<object>(),
): void {
  if (!value || typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) rewriteUrls(item, config, seen);
    return;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return;

  for (const [key, child] of Object.entries(value)) {
    if (key === 'url' && typeof child === 'string') {
      (value as Record<string, unknown>)[key] = rewriteUploadUrl(child, config);
    } else {
      rewriteUrls(child, config, seen);
    }
  }
}
