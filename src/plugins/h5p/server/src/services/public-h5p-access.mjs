const PUBLIC_AJAX_ACTIONS = new Set([
  "content-type-cache",
  "content-hub-metadata-cache",
  "libraries",
]);

export function assertPublicAjaxAction(action) {
  const value = Array.isArray(action) ? action[0] : action;
  if (typeof value === "string" && PUBLIC_AJAX_ACTIONS.has(value)) {
    return value;
  }

  const error = new Error("Unsupported public H5P Ajax action");
  error.status = 400;
  throw error;
}
