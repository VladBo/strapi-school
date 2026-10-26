const assert = require('node:assert/strict');
const test = require('node:test');

async function loadRoutes() {
  const [admin, contentApi] = await Promise.all([
    import('./admin.mjs'),
    import('./content-api.mjs'),
  ]);
  return { admin: admin.default, contentApi: contentApi.default };
}

function routeKey(route) {
  return `${route.method} ${route.path}`;
}

test('public H5P routes expose only read-only playback and asset endpoints', async () => {
  const { contentApi } = await loadRoutes();
  const allowed = new Set([
    'GET /ajax',
    'GET /params/:contentId',
    'GET /libraries/:ubername/:file*',
    'GET /content/:contentId/:file*',
    'GET /core/:type/:file*',
    'GET /editor/:type/:file*',
    'GET /play/:contentId',
  ]);

  assert.equal(contentApi.type, 'content-api');
  assert.ok(contentApi.routes.length > 0);
  for (const route of contentApi.routes) {
    assert.equal(route.method, 'GET');
    assert.equal(route.config.auth, false);
    assert.ok(allowed.has(routeKey(route)), `unexpected public route: ${routeKey(route)}`);
  }
  assert.deepEqual(new Set(contentApi.routes.map(routeKey)), allowed);
});

test('all editor, mutation, cache, library-management, and CRUD routes require admin auth', async () => {
  const { admin } = await loadRoutes();
  const keys = new Set(admin.routes.map(routeKey));
  const required = [
    'GET /contents',
    'GET /contents/:id',
    'POST /contents',
    'PUT /contents/:id',
    'DELETE /contents/:id',
    'POST /ajax',
    'POST /save',
    'POST /libraries/install',
    'POST /content-type-cache',
    'POST /content-hub-metadata-cache',
    'GET /editor-model/:contentId',
    'GET /editor/:type/:file*',
  ];

  assert.equal(admin.type, 'admin');
  for (const route of admin.routes) {
    assert.ok(
      route.config.policies.includes('admin::isAuthenticatedAdmin'),
      `missing admin auth: ${routeKey(route)}`,
    );
  }
  for (const key of required) assert.ok(keys.has(key), `missing admin route: ${key}`);
});

test('admin and public route sets keep separate playback and editor boundaries', async () => {
  const { admin, contentApi } = await loadRoutes();
  const publicKeys = new Set(contentApi.routes.map(routeKey));
  const adminKeys = new Set(admin.routes.map(routeKey));

  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    assert.ok([...publicKeys].every((key) => !key.startsWith(`${method} `)));
  }
  assert.equal(publicKeys.has('GET /editor-model/:contentId'), false);
  assert.equal(publicKeys.has('GET /editor/:type/:file*'), true);
  assert.equal(adminKeys.has('GET /libraries/:ubername/:file*'), true);
  assert.equal(adminKeys.has('GET /content/:contentId/:file*'), true);
});

test('public Ajax rejects editor and mutation actions before dispatch', async () => {
  const { contentApi } = await loadRoutes();
  const ajaxRoute = contentApi.routes.find((route) => routeKey(route) === 'GET /ajax');
  assert.equal(ajaxRoute.handler, 'controller.getPublicAjax');

  const { assertPublicAjaxAction } = await import('../services/public-h5p-access.mjs');
  for (const action of ['content-type-cache', 'content-hub-metadata-cache', 'libraries']) {
    assert.equal(assertPublicAjaxAction(action), action);
  }
  for (const action of ['library-install', 'library-upload', 'files', 'filter', 'get-content']) {
    assert.throws(() => assertPublicAjaxAction(action), (error) => {
      assert.equal(error.status, 400);
      return true;
    });
  }
});
