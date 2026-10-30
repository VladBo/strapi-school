import type { H5PContent } from "../types";

export function parseH5PContent(value: unknown): H5PContent {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as H5PContent;
    } catch (error) {
      console.error("[H5P] Failed to parse H5P content JSON:", error);
      return {};
    }
  }
  return value as H5PContent;
}
