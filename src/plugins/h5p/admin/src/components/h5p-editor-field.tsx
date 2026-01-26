import { Box, Flex, Typography } from "@strapi/design-system";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import type { ForwardedRef } from "react";
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
    const iframeRef = useRef<HTMLIFrameElement | null>(null);

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
            break;
          case "h5p-editor-error":
            console.error("[H5P Editor] Error:", data?.error);
            break;
        }
      };

      window.addEventListener("message", handleMessage);
      return () => {
        window.removeEventListener("message", handleMessage);
      };
    }, []);

    return (
      <Flex
        ref={ref}
        direction="column"
        gap={2}
        style={{ width: "100%", maxWidth: "100%" }}
      >
        {intlLabel ? (
          <Typography variant="pi" fontWeight="bold">
            {formatMessage(intlLabel)}
            {required ? <Typography textColor="danger600">*</Typography> : null}
          </Typography>
        ) : null}
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
