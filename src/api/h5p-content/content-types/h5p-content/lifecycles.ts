/**
 * H5P Content Lifecycle Hooks
 *
 * These hooks process the h5pContent field before saving to Strapi.
 * When the H5P editor updates content, it stores the full content data
 * (params, metadata, library) in the field. This lifecycle hook:
 * 1. Saves the H5P content to the file system via H5P service
 * 2. Updates the field with the resulting contentId
 * 3. Cleans up temporary data (_pendingSave flag)
 */

interface H5PContentData {
  contentId?: string;
  library?: string;
  params?: Record<string, unknown>;
  metadata?: {
    title?: string;
    [key: string]: unknown;
  };
  _pendingSave?: boolean;
}

interface LifecycleEvent {
  params: {
    data?: {
      h5pContent?: H5PContentData | string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

async function processH5PContent(event: LifecycleEvent) {
  const { data } = event.params;
  if (!data?.h5pContent) return;

  // Parse if string
  let h5pContent: H5PContentData;
  if (typeof data.h5pContent === "string") {
    try {
      h5pContent = JSON.parse(data.h5pContent);
    } catch {
      return;
    }
  } else {
    h5pContent = data.h5pContent;
  }

  // Check if we have pending content to save
  const hasPendingData = h5pContent._pendingSave ||
    (h5pContent.params && h5pContent.library);

  if (!hasPendingData) return;

  // Get the H5P service
  const h5pService = strapi.plugin("h5p")?.service("service");
  if (!h5pService) {
    strapi.log.error("[H5P Lifecycle] H5P service not available");
    return;
  }

  try {
    // Save the H5P content to file system
    const result = await h5pService.saveContent({
      contentId: h5pContent.contentId,
      library: h5pContent.library,
      params: h5pContent.params,
      metadata: h5pContent.metadata,
    });

    if (result?.id) {
      // Keep full content (params, metadata, library) in the DB field
      // so the editor can restore it without relying on filesystem storage
      data.h5pContent = JSON.stringify({
        contentId: result.id,
        library: h5pContent.library,
        params: h5pContent.params,
        metadata: h5pContent.metadata,
      });

      strapi.log.info(`[H5P Lifecycle] Content saved with ID: ${result.id}`);
    }
  } catch (error) {
    strapi.log.error("[H5P Lifecycle] Failed to save H5P content:", error);
    throw error;
  }
}

export default {
  async beforeCreate(event: LifecycleEvent) {
    await processH5PContent(event);
  },

  async beforeUpdate(event: LifecycleEvent) {
    await processH5PContent(event);
  },
};
