const requiresAdminAuth = Symbol("requiresH5PAdminAuth");

export function readStoredAdminToken(storage, cookie = "") {
  const rawToken = storage?.getItem?.("jwtToken");
  if (rawToken) {
    try {
      const parsed = JSON.parse(rawToken);
      if (typeof parsed === "string" && parsed) return parsed;
    } catch {
      return rawToken;
    }
    return rawToken;
  }

  const tokenCookie = String(cookie)
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("jwtToken="));
  if (!tokenCookie) return undefined;

  const value = tokenCookie.slice("jwtToken=".length);
  try {
    return decodeURIComponent(value) || undefined;
  } catch {
    return value || undefined;
  }
}

export function installH5PAdminXhrAuth({
  XMLHttpRequestClass,
  getToken,
  origin,
}) {
  const prototype = XMLHttpRequestClass?.prototype;
  if (!prototype || typeof getToken !== "function" || !origin) {
    return () => {};
  }

  const originalOpen = prototype.open;
  const originalSend = prototype.send;

  function open(method, url, ...rest) {
    try {
      const target = new URL(String(url), origin);
      this[requiresAdminAuth] =
        target.origin === origin &&
        (target.pathname === "/h5p" || target.pathname.startsWith("/h5p/"));
    } catch {
      this[requiresAdminAuth] = false;
    }
    return originalOpen.call(this, method, url, ...rest);
  }

  function send(body) {
    if (this[requiresAdminAuth]) {
      const token = getToken();
      if (token) this.setRequestHeader("Authorization", `Bearer ${token}`);
    }
    return originalSend.call(this, body);
  }

  prototype.open = open;
  prototype.send = send;

  return () => {
    if (prototype.open === open) prototype.open = originalOpen;
    if (prototype.send === send) prototype.send = originalSend;
  };
}
