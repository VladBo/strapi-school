import path from "node:path";
import fs from "fs-extra";
import type { H5PUser, H5PConfigState } from "./types";

export const getErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : "Internal Server Error";

export const resolveUser = (user?: H5PUser | null): H5PUser =>
  user || {
    id: "anonymous",
    name: "Anonymous",
    email: "anonymous@example.com",
    type: "local",
  };

export const getMimeType = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".js":
      return "application/javascript";
    case ".css":
      return "text/css";
    case ".json":
      return "application/json";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    case ".woff":
      return "font/woff";
    case ".woff2":
      return "font/woff2";
    case ".ttf":
      return "font/ttf";
    case ".eot":
      return "application/vnd.ms-fontobject";
    case ".otf":
      return "font/otf";
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".ogg":
      return "audio/ogg";
    case ".mp3":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    default:
      return "application/octet-stream";
  }
};

export function safeJsonParse(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export const buildLibrary = (input?: {
  machineName?: string;
  majorVersion?: number;
  minorVersion?: number;
}): string | undefined => {
  if (!input?.machineName) return undefined;
  if (
    typeof input.majorVersion !== "number" ||
    typeof input.minorVersion !== "number"
  ) {
    return undefined;
  }
  return `${input.machineName} ${input.majorVersion}.${input.minorVersion}`;
};

const getString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const getLibraryFromObject = (value: unknown): string | undefined =>
  buildLibrary(value as Parameters<typeof buildLibrary>[0]);

const getNestedLibrary = (value: unknown): string | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  return (
    getString(record.library) ||
    getString(record.mainLibrary) ||
    getNestedLibrary(record.params)
  );
};

export const resolveLibrary = (
  payload: Record<string, unknown> | undefined,
): string | undefined => {
  if (!payload) return undefined;
  return (
    getString(payload.library) ||
    getString(payload.mainLibrary) ||
    getLibraryFromObject(payload.library) ||
    getLibraryFromObject(payload.mainLibrary) ||
    getString(payload.ubername) ||
    getString(payload.libraryName) ||
    getNestedLibrary(safeJsonParse(payload.params))
  );
};

export const normalizeLibrary = (value?: string): string | undefined => {
  if (!value) return value;
  const match = /^([\w.]+)-(\d+\.\d+)$/.exec(value);
  if (match) {
    return `${match[1]} ${match[2]}`;
  }
  return value;
};

export const createSlug = (title: string) =>
  title
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/(^-|-$)/g, "");

export const getFileStreamResponse = (
  filePath: string,
): { stream: NodeJS.ReadableStream; mimeType: string } => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const mimeType = getMimeType(filePath);
  const stream = fs.createReadStream(filePath);
  return { stream, mimeType };
};

export const getMainLibraryVersion = (metadata: {
  mainLibrary?: string;
  preloadedDependencies?: any[];
}) => {
  if (!metadata?.mainLibrary) {
    return undefined;
  }
  const dependency = metadata.preloadedDependencies?.find(
    (d: any) => d.machineName === metadata.mainLibrary,
  );
  const major = dependency?.majorVersion ?? 1;
  const minor = dependency?.minorVersion ?? 0;
  return `${metadata.mainLibrary} ${major}.${minor}`;
};

export const getConfigOrThrow = (state: {
  h5pConfig: H5PConfigState | null;
}) => {
  if (!state.h5pConfig) {
    throw new Error("H5P config not initialized");
  }
  return state.h5pConfig;
};
