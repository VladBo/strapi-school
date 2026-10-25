# Strapi Plugin H5P

Create and manage interactive H5P content directly in your Strapi CMS.

## Features

- **H5P Editor Integration** - Full H5P editor embedded in Strapi admin panel
- **Content Type Selector** - Browse and select from 40+ H5P content types
- **Content Management** - Create, edit, and manage H5P content as Strapi entries
- **API Endpoints** - Serve H5P content via REST API for frontend consumption
- **Library Management** - Install and manage H5P libraries from the H5P Hub

## Requirements

- Strapi v5.0.0 or higher
- Node.js >= 18.0.0

## Installation

```bash
npm install strapi-plugin-h5p
# or
yarn add strapi-plugin-h5p
```

## Configuration

### 1. Enable the plugin

Create or update `config/plugins.ts`:

```typescript
export default () => ({
  h5p: {
    enabled: true,
    config: {
      // H5P library storage path (relative to public folder)
      librariesPath: "h5p/libraries",
      // H5P content storage path (relative to public folder)
      contentPath: "h5p/content",
      // H5P temporary files path (relative to public folder)
      temporaryFilesPath: "h5p/temp-files",
    },
  },
});
```

### 2. Add the H5P middleware

Update `config/middlewares.ts` to include the H5P middleware and CSP settings:

```typescript
export default [
  "strapi::logger",
  "strapi::errors",
  {
    name: "strapi::security",
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          "style-src": ["'self'", "'unsafe-inline'"],
          "frame-src": ["'self'"],
          "img-src": ["'self'", "data:", "blob:", "https://h5p.org", "https://*.h5p.org"],
          "connect-src": ["'self'", "https://h5p.org", "https://*.h5p.org"],
        },
      },
    },
  },
  "strapi::cors",
  "strapi::poweredBy",
  "strapi::query",
  "strapi::body",
  "strapi::session",
  "strapi::favicon",
  "strapi::public",
  "plugin::h5p.h5p",
];
```

### 3. Create H5P Content Type

Create `src/api/h5p-content/content-types/h5p-content/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "h5p_contents",
  "info": {
    "singularName": "h5p-content",
    "pluralName": "h5p-contents",
    "displayName": "H5P Content",
    "description": "Interactive H5P content"
  },
  "options": {
    "draftAndPublish": true
  },
  "attributes": {
    "title": {
      "type": "string",
      "required": true
    },
    "h5pContent": {
      "type": "json",
      "customField": "plugin::h5p.h5p-editor"
    }
  }
}
```

Create the routes file `src/api/h5p-content/routes/h5p-content.ts`:

```typescript
import { factories } from "@strapi/strapi";
export default factories.createCoreRouter("api::h5p-content.h5p-content");
```

Create the controller `src/api/h5p-content/controllers/h5p-content.ts`:

```typescript
import { factories } from "@strapi/strapi";
export default factories.createCoreController("api::h5p-content.h5p-content");
```

### 4. Download H5P Core Files

Download and extract H5P core and editor files to your public folder:

```bash
# Create directories
mkdir -p public/h5p/{libraries,content,temp-files}

# Download H5P core (from h5p.org or use the h5p-cli)
# You can also upload .h5p files through the admin panel
```

### 5. Rebuild and Start

```bash
npm run build
npm run develop
```

## Usage

### In Strapi Admin

1. Go to **Content Manager** > **H5P Content**
2. Click **Create new entry**
3. Enter a title
4. In the H5P Editor field, select a content type (Multiple Choice, Drag and Drop, etc.)
5. Fill in the content details
6. Save and publish

### API Endpoints

The plugin provides the following API endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/h5p/libraries` | GET | List installed H5P libraries |
| `/api/h5p/contents` | GET | List all H5P content |
| `/api/h5p/contents/:id` | GET | Get specific H5P content |
| `/api/h5p/play/:contentId` | GET | Render H5P player HTML |
| `/api/h5p/ajax` | GET/POST | H5P AJAX endpoint for editor |

### Frontend Integration

To display H5P content in your frontend, you can use the [h5p-standalone](https://github.com/nicxll/h5p-standalone) library:

```javascript
import { H5P } from "h5p-standalone";

const el = document.getElementById("h5p-container");
const h5pContent = await fetch("/api/h5p-contents/1").then(r => r.json());

new H5P(el, {
  h5pJsonPath: `/api/h5p/content/${h5pContent.data.h5pContent.contentId}`,
  frameJs: "/h5p/core/js/h5p.js",
  frameCss: "/h5p/core/styles/h5p.css",
});
```

## H5P Content Types

The plugin supports all standard H5P content types, including:

- Multiple Choice
- True/False Question
- Fill in the Blanks
- Drag and Drop
- Drag the Words
- Mark the Words
- Interactive Video
- Course Presentation
- Question Set
- And many more...

## Troubleshooting

### "Content type list outdated" warning

This warning appears when Strapi cannot connect to h5p.org to check for updates. Your existing content types will still work. To update, ensure your server can reach h5p.org.

### H5P Editor not loading

1. Check browser console for errors
2. Verify CSP settings in `config/middlewares.ts`
3. Ensure H5P core files are in `public/h5p/`

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

- [GitHub Issues](https://github.com/strapi-community/strapi-plugin-h5p/issues)
- [Strapi Community Forum](https://forum.strapi.io/)
