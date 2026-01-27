export const editorTemplate = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>H5P Editor</title>
<style>
  html, body, .h5p-editor-wrapper, .h5p-create, .h5p-editor {
    width: 100%;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  body {
    overflow-x: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .h5p-editor {
    min-height: 400px;
  }
  .h5p-create {
    min-height: 700px;
  }
  .h5p-create iframe.h5p-editor-iframe {
    display: block;
    width: 100%;
    min-height: 700px;
    height: 100vh;
    border: none;
  }
</style>
__STYLES__
<script>
  // CRITICAL: Set H5PIntegration IMMEDIATELY before H5P scripts load
  // Must be defined on window object before any H5P library scripts execute
  console.log('[H5P] Setting window.H5PIntegration...');
  const integration = __INTEGRATION_JSON__;
  integration.loadedJs = integration.loadedJs || [];
  integration.loadedCss = integration.loadedCss || [];
  window.H5PIntegration = integration;
  Object.defineProperty(window, 'H5PIntegration', {
    value: window.H5PIntegration,
    writable: false,
    configurable: false,
    enumerable: true
  });
  console.log('[H5P] H5PIntegration configured:', {
    exists: typeof window.H5PIntegration !== 'undefined',
    hasEditor: window.H5PIntegration && typeof window.H5PIntegration.editor !== 'undefined',
    editorHasContentHub: window.H5PIntegration?.editor?.enableContentHub
  });
  window.__H5P_EDITOR_CONFIG__ = {
    saveEndpoint: '__SAVE_ENDPOINT__',
    paramsEndpoint: '__PARAMS_ENDPOINT__'
  };
</script>
__SCRIPTS__
</head>
<body>
<div class="h5p-create">
  <div class="h5p-editor"></div>
</div>
<script>
var ns = H5PEditor;
(function ($) {
  function postMessage(message) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, window.location.origin);
    }
  }

  H5PEditor.init = function () {
    H5PEditor.$ = H5P.jQuery;
    H5PEditor.basePath = H5PIntegration.editor.libraryUrl;
    H5PEditor.fileIcon = H5PIntegration.editor.fileIcon;
    H5PEditor.ajaxPath = H5PIntegration.editor.ajaxPath;
    H5PEditor.filesPath = H5PIntegration.editor.filesPath;
    H5PEditor.apiVersion = H5PIntegration.editor.apiVersion;
    H5PEditor.contentLanguage = H5PIntegration.editor.language;
    H5PEditor.copyrightSemantics = H5PIntegration.editor.copyrightSemantics;
    H5PEditor.metadataSemantics = H5PIntegration.editor.metadataSemantics;
    H5PEditor.assets = H5PIntegration.editor.assets;
    H5PEditor.baseUrl = '';

    if (H5PIntegration.editor.nodeVersionId !== undefined) {
      H5PEditor.contentId = H5PIntegration.editor.nodeVersionId;
    }

    var $editor = $('.h5p-editor');
    var h5peditor;

    function createEditor(library, params) {
      h5peditor = new ns.Editor(library, params, $editor[0]);
      postMessage({ type: 'h5p-editor-loaded' });
    }

    if (H5PEditor.contentId) {
      $.ajax({
        type: 'GET',
        url: window.__H5P_EDITOR_CONFIG__.paramsEndpoint + '/' + H5PEditor.contentId + window.location.search,
        success: function (res) {
          createEditor(res.library, JSON.stringify(res.params));
        },
        error: function () {
          createEditor(undefined, undefined);
        }
      });
    } else {
      createEditor(undefined, undefined);
    }

    function saveContent() {
      if (!h5peditor) {
        return;
      }
      h5peditor.getContent(function (content) {
        var payload = {
          library: content.library,
          params: JSON.parse(content.params),
          metadata: content.metadata || {}
        };
        $.ajax({
          data: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
          type: 'POST',
          url: window.__H5P_EDITOR_CONFIG__.saveEndpoint
        }).then(function (result) {
          var parsed = typeof result === 'string' ? JSON.parse(result) : result;
          var contentId = parsed && (parsed.id || parsed.contentId);
          if (contentId) {
            postMessage({
              type: 'h5p-content-saved',
              data: { contentId: contentId, library: content.library }
            });
          }
        }).catch(function (error) {
          postMessage({
            type: 'h5p-editor-error',
            data: { error: (error && error.message) || 'Save failed' }
          });
        });
      });
    }

    function handleMessage(event) {
      if (event.origin !== window.location.origin) {
        return;
      }
      if (!event.data || typeof event.data.type !== 'string') {
        return;
      }
      if (event.data.type === 'h5p-save-content') {
        saveContent();
      }
    }

    window.addEventListener('message', handleMessage);
  };

  H5PEditor.getAjaxUrl = function (action, parameters) {
    var url = H5PIntegration.editor.ajaxPath + action;
    if (parameters !== undefined) {
      for (var property in parameters) {
        if (parameters.hasOwnProperty(property)) {
          url += '&' + property + '=' + parameters[property];
        }
      }
    }
    url += window.location.search.split('?').join('&');
    return url;
  };

  H5PEditor.enableContentHub = H5PIntegration.editor.enableContentHub || false;
  $(document).ready(H5PEditor.init);
})(H5P.jQuery);
</script>
</body>
</html>`;
