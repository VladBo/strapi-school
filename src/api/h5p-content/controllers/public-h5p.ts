function publicContent(value: unknown) {
  if (value === null || value === undefined) return value;
  let content = value;
  if (typeof content === "string") {
    try {
      content = JSON.parse(content);
    } catch {
      return null;
    }
  }
  if (
    !content ||
    typeof content !== "object" ||
    !("contentId" in content) ||
    content.contentId === undefined ||
    content.contentId === null
  ) {
    return null;
  }
  return { contentId: String(content.contentId) };
}

function sanitizeEntity(entity: unknown): unknown {
  if (!entity || typeof entity !== "object") return entity;
  const result = { ...(entity as Record<string, unknown>) };
  if (Object.prototype.hasOwnProperty.call(result, "h5pContent")) {
    result.h5pContent = publicContent(result.h5pContent);
  }
  if (result.attributes && typeof result.attributes === "object") {
    result.attributes = sanitizeEntity(result.attributes);
  }
  return result;
}

export function sanitizePublicH5pResponse(response: unknown): unknown {
  if (
    !response ||
    typeof response !== "object" ||
    !("data" in response)
  ) {
    return response;
  }
  const typedResponse = response as Record<string, unknown>;
  return {
    ...typedResponse,
    data: Array.isArray(typedResponse.data)
      ? typedResponse.data.map(sanitizeEntity)
      : sanitizeEntity(typedResponse.data),
  };
}
