import { Box, Button, Flex, Typography } from "@strapi/design-system";
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ForwardedRef, MutableRefObject } from "react";
import { useIntl, type MessageDescriptor } from "react-intl";

interface H5PContent {
  contentId?: string;
  library?: string;
  [key: string]: unknown;
}

interface H5PEditorFieldProps {
  attribute: {
    type: string;
    [key: string]: unknown;
  };
  intlLabel?: MessageDescriptor;
  name: string;
  onChange: (event: { target: { name: string; value: string; type: string } }) => void;
  required?: boolean;
  value?: string | H5PContent;
  description?: MessageDescriptor;
  error?: string;
}

interface H5PMessageData {
  type?: string;
  data?: {
    contentId?: string;
    library?: string;
    error?: string;
  };
  error?: string;
}

const H5PEditorField = forwardRef<HTMLDivElement, H5PEditorFieldProps>(
  (props, ref: ForwardedRef<HTMLDivElement>) => {
    const {
      attribute,
      intlLabel,
      name,
      onChange,
      required,
      value,
      description,
      error,
    } = props;
    const { formatMessage } = useIntl();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
    const [saveError, setSaveError] = useState<string | null>(null);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const pendingSaveRef = useRef<{
      resolve: () => void;
      reject: (error: Error) => void;
      timeoutId: number;
    } | null>(null);

    // Memoize the parsed content to avoid creating new object references on every render
    const currentContent = useMemo((): H5PContent => {
      if (!value) return {};
      if (typeof value === "string") {
        try {
          return JSON.parse(value) as H5PContent;
        } catch {
          return {};
        }
      }
      return value;
    }, [value]);

    const contentId = currentContent.contentId || "new";
    const editorUrl = `/api/h5p/editor-page/${contentId}`;

    // Store refs to avoid stale closures in the event handler
    const onChangeRef = useRef(onChange);
    const nameRef = useRef(name);
    const attributeTypeRef = useRef(attribute.type);
    const currentContentRef = useRef(currentContent);

    // Keep refs updated
    useEffect(() => {
      onChangeRef.current = onChange;
      nameRef.current = name;
      attributeTypeRef.current = attribute.type;
      currentContentRef.current = currentContent;
    });

    const requestIframeSave = useCallback(() => {
      return new Promise<void>((resolve, reject) => {
        const iframeWindow = iframeRef.current?.contentWindow;
        if (!iframeWindow) {
          reject(new Error("H5P iframe not available"));
          return;
        }
        if (pendingSaveRef.current) {
          reject(new Error("H5P save already in progress"));
          return;
        }

        const timeoutId = window.setTimeout(() => {
          pendingSaveRef.current = null;
          reject(new Error("H5P save timed out"));
        }, 10000);

        pendingSaveRef.current = { resolve, reject, timeoutId };
        iframeWindow.postMessage({ type: "h5p-save-content" }, window.location.origin);
      });
    }, []);

    const handleSaveClick = useCallback(async () => {
      setSaving(true);
      setSaveStatus("idle");
      setSaveError(null);
      try {
        await requestIframeSave();
        setSaveStatus("saved");
      } catch (err) {
        setSaveStatus("error");
        setSaveError(err instanceof Error ? err.message : "Save failed");
        console.error("[H5P Editor] Save failed:", err);
      } finally {
        setSaving(false);
      }
    }, [requestIframeSave]);

    useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
          return;
        }

        const messageData = event.data as H5PMessageData;
        if (!messageData || typeof messageData.type !== "string") {
          return;
        }

        const { type, data } = messageData;

        switch (type) {
          case "h5p-editor-loaded":
            setLoading(false);
            break;
          case "h5p-content-saved":
            if (data) {
              onChangeRef.current({
                target: {
                  name: nameRef.current,
                  value: JSON.stringify({
                    contentId: data.contentId,
                    library: data.library,
                    ...currentContentRef.current,
                  }),
                  type: attributeTypeRef.current,
                },
              });
            }
            if (pendingSaveRef.current) {
              window.clearTimeout(pendingSaveRef.current.timeoutId);
              pendingSaveRef.current.resolve();
              pendingSaveRef.current = null;
            }
            break;
          case "h5p-editor-error":
            console.error("[H5P Editor] Error:", data?.error || messageData.error);
            if (pendingSaveRef.current) {
              window.clearTimeout(pendingSaveRef.current.timeoutId);
              pendingSaveRef.current.reject(
                new Error(data?.error || messageData.error || "Save failed"),
              );
              pendingSaveRef.current = null;
            }
            break;
        }
      };

      window.addEventListener("message", handleMessage);
      return () => {
        window.removeEventListener("message", handleMessage);
      };
    }, []);

    // Determine if H5P content has been saved (has a contentId)
    const hasContent = Boolean(currentContent.contentId);

    return (
      <Flex
        ref={(node: HTMLDivElement | null) => {
          containerRef.current = node;
          if (typeof ref === "function") {
            ref(node);
          } else if (ref) {
            (ref as MutableRefObject<HTMLDivElement | null>).current = node;
          }
        }}
        direction="column"
        gap={2}
        style={{ width: "100%", maxWidth: "100%" }}
      >
        <Flex justifyContent="space-between" alignItems="center">
          {intlLabel ? (
            <Typography variant="pi" fontWeight="bold">
              {formatMessage(intlLabel)}
              {required ? <Typography textColor="danger600">*</Typography> : null}
            </Typography>
          ) : null}
          <Flex gap={2} alignItems="center">
            {saveStatus === "saved" ? (
              <Typography variant="pi" textColor="success600">
                ✓ H5P content saved
              </Typography>
            ) : null}
            {saveStatus === "error" ? (
              <Typography variant="pi" textColor="danger600">
                ✗ {saveError || "Save failed"}
              </Typography>
            ) : null}
            {hasContent ? (
              <Typography variant="pi" textColor="neutral600">
                Content ID: {currentContent.contentId}
              </Typography>
            ) : null}
            <Button
              variant="secondary"
              size="S"
              onClick={handleSaveClick}
              disabled={saving || loading}
              loading={saving}
            >
              {saving ? "Saving..." : "Save H5P Content"}
            </Button>
          </Flex>
        </Flex>
        <Box
          padding={0}
          background="neutral0"
          borderColor="neutral200"
          hasRadius
          style={{
            minHeight: "700px",
            overflow: "hidden",
            position: "relative",
            width: "100%",
            maxWidth: "100%",
          }}
        >
          {loading ? (
            <Flex
              justifyContent="center"
              alignItems="center"
              padding={4}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(255, 255, 255, 0.9)",
                zIndex: 10,
              }}
            >
              <Typography>Loading H5P Editor...</Typography>
            </Flex>
          ) : null}
          <iframe
            ref={iframeRef}
            src={editorUrl}
            style={{
              width: "100%",
              height: "700px",
              border: "none",
              borderRadius: "4px",
              display: "block",
            }}
            title="H5P Editor"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
          />
        </Box>
        {error ? (
          <Typography variant="pi" textColor="danger600">
            {error}
          </Typography>
        ) : null}
        {description ? (
          <Typography variant="pi" textColor="neutral600">
            {formatMessage(description)}
          </Typography>
        ) : null}
      </Flex>
    );
  }
);

H5PEditorField.displayName = "H5PEditorField";

export default H5PEditorField;
