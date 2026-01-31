import { Box, Field, Flex } from "@strapi/design-system";
import { useField } from "@strapi/strapi/admin";
import { forwardRef, useCallback, useEffect, useMemo, useRef } from "react";
import type { ForwardedRef } from "react";
import { useIntl, type MessageDescriptor } from "react-intl";
import { H5PEditorUI } from "@lumieducation/h5p-react";
import type { IEditorModel, IContentMetadata } from "@lumieducation/h5p-server";

interface H5PContent {
  contentId?: string;
  library?: string;
  params?: Record<string, unknown>;
  metadata?: {
    title?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface H5PEditorFieldProps {
  attribute: {
    type: string;
    customField?: string;
    [key: string]: unknown;
  };
  intlLabel?: MessageDescriptor;
  label?: string;
  name: string;
  required?: boolean;
  description?: MessageDescriptor;
  hint?: string;
  disabled?: boolean;
  contentTypeUID?: string;
  labelAction?: React.ReactNode;
}

function parseH5PContent(value: unknown): H5PContent {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as H5PContent;
    } catch {
      return {};
    }
  }
  return value as H5PContent;
}

const H5PEditorField = forwardRef<HTMLDivElement, H5PEditorFieldProps>(
  (props, ref: ForwardedRef<HTMLDivElement>) => {
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
    // This is what the H5P editor loads from. We capture it once
    // so that subsequent onChange calls (which update `value`) don't
    // cause the editor to reload.
    const initialContentRef = useRef<H5PContent | null>(null);
    if (initialContentRef.current === null) {
      initialContentRef.current = parseH5PContent(value);
    }

    // Use "new" for fresh content, or a stable non-"new" value when we have
    // saved content. The h5p-webcomponents editor only loads library/params from
    // the model when contentId !== "new".
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
        params?: any;
      }> => {
        const content = initialContentRef.current || {};
        console.log("[H5P Field] loadContentCallback, field has:", {
          library: content.library,
          hasParams: !!content.params,
        });

        // Fetch base editor model (scripts, styles, integration)
        const response = await fetch(`/api/h5p/editor-model/new`);
        if (!response.ok) throw new Error(`Failed to load editor: ${response.status}`);
        const editorModel = await response.json();

        // If we have saved content in the Strapi field, merge it in.
        // H5P save returns requestBody.params as { params: {...}, metadata: {...} }
        // The web component's ns.Editor expects params to be the inner content params
        // and metadata separately, because it wraps them: JSON.stringify({ metadata, params })
        if (content.library && content.params) {
          console.log("[H5P Field] Restoring saved content:", content.library);
          editorModel.library = content.library;
          // content.params has shape { params: {actual content}, metadata: {title, ...} }
          if (content.params.params) {
            editorModel.params = content.params.params;
            editorModel.metadata = content.params.metadata || content.metadata || {};
          } else {
            // Flat params (legacy or already unwrapped)
            editorModel.params = content.params;
            editorModel.metadata = content.metadata || {};
          }
          console.log("[H5P Field] Restored params keys:", Object.keys(editorModel.params));
        } else {
          console.log("[H5P Field] New editor (no saved content in field)");
        }

        return editorModel;
      },
      []
    );

    /**
     * Save content callback - called by H5PEditorUI.save()
     * Updates the Strapi field value with H5P content JSON.
     */
    const saveContentCallback = useCallback(
      async (
        _contentId: string,
        requestBody: { library: string; params: any }
      ): Promise<{ contentId: string; metadata: IContentMetadata }> => {
        console.log("[H5P Field] saveContentCallback:", { library: requestBody.library });

        const updatedContent: H5PContent = {
          library: requestBody.library,
          params: requestBody.params,
          metadata: requestBody.params?.metadata || {},
        };

        const newValue = JSON.stringify(updatedContent);
        console.log("[H5P Field] Updating field, length:", newValue.length);

        // Update initialContentRef so if editor reloads it gets the latest
        initialContentRef.current = updatedContent;

        onChangeRef.current(name, newValue);

        return {
          contentId: "stored",
          metadata: requestBody.params?.metadata || {},
        };
      },
      [name]
    );

    /**
     * Mark form as dirty when user interacts with the H5P editor iframe.
     */
    const handleH5PInteraction = useCallback(() => {
      if (hasInteractedRef.current) return;

      console.log("[H5P Field] User interaction detected - marking form dirty");
      hasInteractedRef.current = true;

      const currentValue = fieldValueRef.current || "{}";
      const valueStr = typeof currentValue === "string" ? currentValue : JSON.stringify(currentValue);

      try {
        const content = JSON.parse(valueStr);
        content.__dirty = Date.now();
        onChangeRef.current(name, JSON.stringify(content));
      } catch {
        onChangeRef.current(name, valueStr + " ");
      }
    }, [name]);

    /**
     * Attach interaction listeners to the H5P iframe.
     */
    const attachIframeListeners = useCallback((retries = 0) => {
      const iframe = containerRef.current?.querySelector('iframe');
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

        iframeDoc.addEventListener('mousedown', handleH5PInteraction, true);
        iframeDoc.addEventListener('input', handleH5PInteraction, true);
        iframeDoc.addEventListener('change', handleH5PInteraction, true);
        console.log("[H5P Field] Iframe listeners attached");
      } catch {
        // Cross-origin fallback
        iframe.addEventListener('mousedown', handleH5PInteraction);
        window.addEventListener('blur', () => {
          if (document.activeElement === iframe) {
            handleH5PInteraction();
          }
        });
        console.log("[H5P Field] Using fallback blur listener");
      }
    }, [handleH5PInteraction]);

    const handleLoaded = useCallback(
      (_contentId: string, ubername: string) => {
        console.log("[H5P Field] Editor loaded, ubername:", ubername);
        attachIframeListeners();
      },
      [attachIframeListeners]
    );

    const handleSaved = useCallback(
      (_contentId: string, metadata: IContentMetadata) => {
        console.log("[H5P Field] H5P save complete:", metadata.title);
        isSavingRef.current = false;
      },
      []
    );

    const handleSaveError = useCallback(
      (errorMessage: string) => {
        console.error("[H5P Field] Save error:", errorMessage);
        isSavingRef.current = false;
      },
      []
    );

    /**
     * Intercept Strapi's Save button click to save H5P content first,
     * then let Strapi's normal save proceed.
     */
    useEffect(() => {
      const handleSaveClick = async (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        const saveButton = target.closest('button');
        if (!saveButton) return;

        const buttonText = saveButton.textContent?.trim();
        if (buttonText !== 'Save') return;

        if (!hasInteractedRef.current || !editorRef.current || isSavingRef.current) return;

        console.log("[H5P Field] Save button intercepted - saving H5P content first");

        event.preventDefault();
        event.stopImmediatePropagation();
        isSavingRef.current = true;

        try {
          await editorRef.current.save();
          console.log("[H5P Field] H5P content saved, triggering Strapi save");

          // Let React propagate the field value update
          await new Promise(resolve => setTimeout(resolve, 150));

          // Re-click Save without interception
          hasInteractedRef.current = false;
          isSavingRef.current = false;
          saveButton.click();
        } catch (error) {
          console.error("[H5P Field] Error during H5P save:", error);
          isSavingRef.current = false;
        }
      };

      document.addEventListener('click', handleSaveClick, true);
      return () => document.removeEventListener('click', handleSaveClick, true);
    }, []);

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
  }
);

H5PEditorField.displayName = "H5PEditorField";

export default H5PEditorField;
