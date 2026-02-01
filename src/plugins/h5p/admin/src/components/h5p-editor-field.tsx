import { Box, Field, Flex } from "@strapi/design-system";
import { useField } from "@strapi/strapi/admin";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useIntl } from "react-intl";
import { H5PEditorUI } from "@lumieducation/h5p-react";
import type { IEditorModel, IContentMetadata } from "@lumieducation/h5p-server";
import type { H5PEditorFieldProps, H5PContent } from "../types";
import { parseH5PContent } from "../utils/h5p-content";

/**
 * Hook that intercepts Strapi's Save button to trigger H5P save first.
 */
function useH5PSaveIntercept(
  editorRef: React.RefObject<H5PEditorUI | null>,
  hasInteractedRef: React.MutableRefObject<boolean>,
  isSavingRef: React.MutableRefObject<boolean>,
) {
  useEffect(() => {
    const handleSaveClick = async (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const saveButton = target.closest<HTMLButtonElement>("button[data-strapi-save]") ||
        target.closest<HTMLButtonElement>("button");
      if (!saveButton) return;

      // Match by data attribute first, fall back to text content
      const isSave = saveButton.hasAttribute("data-strapi-save") ||
        saveButton.textContent?.trim() === "Save";
      if (!isSave) return;

      if (!hasInteractedRef.current || !editorRef.current || isSavingRef.current) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      isSavingRef.current = true;

      try {
        await editorRef.current.save();

        // Let React propagate the field value update
        await new Promise(resolve => setTimeout(resolve, 150));

        // Re-click Save without interception
        hasInteractedRef.current = false;
        isSavingRef.current = false;
        saveButton.click();
      } catch {
        isSavingRef.current = false;
      }
    };

    document.addEventListener("click", handleSaveClick, true);
    return () => document.removeEventListener("click", handleSaveClick, true);
  }, [editorRef, hasInteractedRef, isSavingRef]);
}

const H5PEditorField = (props: H5PEditorFieldProps) => {
  const {
    intlLabel,
    label,
    name,
    required,
    hint,
    labelAction,
  } = props;
  const { formatMessage } = useIntl();
  const editorRef = useRef<H5PEditorUI>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isSavingRef = useRef(false);

  const field = useField(name);
  const { onChange, value } = field;

  const hasInteractedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const fieldValueRef = useRef(value);
  onChangeRef.current = onChange;
  fieldValueRef.current = value;

  // Parse the initial content on first render only.
  const initialContentRef = useRef<H5PContent | null>(null);
  if (initialContentRef.current === null) {
    initialContentRef.current = parseH5PContent(value);
  }

  const contentId = useMemo(() => {
    const content = initialContentRef.current;
    if (content?.library && content?.params) {
      return "stored";
    }
    return "new";
  }, []);

  const loadContentCallback = useCallback(
    async (_contentId: string): Promise<IEditorModel & {
      library?: string;
      metadata?: IContentMetadata;
      params?: Record<string, unknown>;
    }> => {
      const content = initialContentRef.current || {};

      const response = await fetch("/api/h5p/editor-model/new");
      if (!response.ok) throw new Error(`Failed to load editor: ${response.status}`);
      const editorModel = await response.json();

      if (content.library && content.params) {
        editorModel.library = content.library;
        const params = content.params as Record<string, unknown>;
        if (params.params) {
          editorModel.params = params.params;
          editorModel.metadata = params.metadata || content.metadata || {};
        } else {
          editorModel.params = content.params;
          editorModel.metadata = content.metadata || {};
        }
      }

      return editorModel;
    },
    []
  );

  const saveContentCallback = useCallback(
    async (
      _contentId: string,
      requestBody: { library: string; params: Record<string, unknown> }
    ): Promise<{ contentId: string; metadata: IContentMetadata }> => {
      const updatedContent: H5PContent = {
        library: requestBody.library,
        params: requestBody.params,
        metadata: (requestBody.params?.metadata as Record<string, unknown>) || {},
      };

      const newValue = JSON.stringify(updatedContent);

      // Update initialContentRef so if editor reloads it gets the latest
      initialContentRef.current = updatedContent;

      onChangeRef.current(name, newValue);

      return {
        contentId: "stored",
        metadata: (requestBody.params?.metadata || {}) as IContentMetadata,
      };
    },
    [name]
  );

  /**
   * Mark form as dirty when user interacts with the H5P editor iframe.
   */
  const handleH5PInteraction = useCallback(() => {
    if (hasInteractedRef.current) return;

    hasInteractedRef.current = true;

    const currentValue = fieldValueRef.current || "{}";
    const valueStr = typeof currentValue === "string" ? currentValue : JSON.stringify(currentValue);

    try {
      const content = JSON.parse(valueStr);
      content.__dirty = Date.now();
      onChangeRef.current(name, JSON.stringify(content));
    } catch {
      // Value isn't valid JSON; write a minimal dirty marker
      onChangeRef.current(name, JSON.stringify({ __dirty: Date.now() }));
    }
  }, [name]);

  /**
   * Attach interaction listeners to the H5P iframe.
   */
  const attachIframeListeners = useCallback((retries = 0) => {
    const iframe = containerRef.current?.querySelector("iframe");
    if (!iframe) {
      if (retries < 5) {
        setTimeout(() => attachIframeListeners(retries + 1), 500);
      }
      return;
    }

    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc || !iframeDoc.body) {
        if (retries < 10) {
          setTimeout(() => attachIframeListeners(retries + 1), 500);
        }
        return;
      }

      iframeDoc.addEventListener("mousedown", handleH5PInteraction, true);
      iframeDoc.addEventListener("input", handleH5PInteraction, true);
      iframeDoc.addEventListener("change", handleH5PInteraction, true);
    } catch {
      // Cross-origin fallback
      iframe.addEventListener("mousedown", handleH5PInteraction);
      window.addEventListener("blur", () => {
        if (document.activeElement === iframe) {
          handleH5PInteraction();
        }
      });
    }
  }, [handleH5PInteraction]);

  const handleLoaded = useCallback(
    (_contentId: string, _ubername: string) => {
      attachIframeListeners();
    },
    [attachIframeListeners]
  );

  const handleSaved = useCallback(
    (_contentId: string, _metadata: IContentMetadata) => {
      isSavingRef.current = false;
    },
    []
  );

  const handleSaveError = useCallback(
    (_errorMessage: string) => {
      isSavingRef.current = false;
    },
    []
  );

  useH5PSaveIntercept(editorRef, hasInteractedRef, isSavingRef);

  const displayLabel = label || (intlLabel ? formatMessage(intlLabel) : name);

  return (
    <Field.Root name={name} id={name} error={field.error} hint={hint} required={required}>
      <Flex
        direction="column"
        alignItems="stretch"
        gap={1}
        ref={containerRef}
      >
        <Field.Label action={labelAction}>{displayLabel}</Field.Label>

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
          <H5PEditorUI
            ref={editorRef}
            contentId={contentId}
            loadContentCallback={loadContentCallback}
            saveContentCallback={saveContentCallback}
            onLoaded={handleLoaded}
            onSaved={handleSaved}
            onSaveError={handleSaveError}
          />
        </Box>

        <Field.Hint />
        <Field.Error />
      </Flex>
    </Field.Root>
  );
};

H5PEditorField.displayName = "H5PEditorField";

export default H5PEditorField;
