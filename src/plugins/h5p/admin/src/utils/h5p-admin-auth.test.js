const assert = require('node:assert/strict');
const test = require('node:test');

test('adds the current admin bearer token only to private H5P XHR requests', async () => {
  const { installH5PAdminXhrAuth } = await import('./h5p-admin-auth.mjs');

  class FakeXMLHttpRequest {
    headers = {};
    open(_method, url) {
      this.url = url;
    }
    send() {}
    setRequestHeader(name, value) {
      this.headers[name] = value;
    }
  }

  const restore = installH5PAdminXhrAuth({
    XMLHttpRequestClass: FakeXMLHttpRequest,
    getToken: () => 'admin-token',
    origin: 'http://localhost:1337',
  });

  const privateRequest = new FakeXMLHttpRequest();
  privateRequest.open('POST', '/h5p/ajax?action=files');
  privateRequest.send();
  assert.equal(privateRequest.headers.Authorization, 'Bearer admin-token');

  const publicRequest = new FakeXMLHttpRequest();
  publicRequest.open('GET', '/api/h5p/content/42/image.png');
  publicRequest.send();
  assert.equal(publicRequest.headers.Authorization, undefined);

  restore();
});

test('reads the Strapi admin token from its cookie when localStorage is empty', async () => {
  const { readStoredAdminToken } = await import('./h5p-admin-auth.mjs');
  const storage = { getItem: () => null };

  assert.equal(
    readStoredAdminToken(storage, 'other=value; jwtToken=header.payload.signature; path=/'),
    'header.payload.signature',
  );
});

test('adds the current admin bearer token to same-origin private H5P fetch requests only', async () => {
  const { installH5PAdminFetchAuth } = await import('./h5p-admin-auth.mjs');
  const calls = [];
  const fetchTarget = {
    fetch(input, init) {
      calls.push({ input, init, receiver: this });
      return Promise.resolve(new Response('ok'));
    },
  };
  const originalFetch = fetchTarget.fetch;

  const restore = installH5PAdminFetchAuth({
    fetchTarget,
    getToken: () => 'admin-token',
    origin: 'https://strapi.example.com',
  });

  await fetchTarget.fetch('/h5p/ajax?action=content-hub-metadata-cache');
  await fetchTarget.fetch('/api/h5p/ajax?action=content-hub-metadata-cache');
  await fetchTarget.fetch('https://h5p.org/content-types');

  assert.equal(new Headers(calls[0].init.headers).get('Authorization'), 'Bearer admin-token');
  assert.equal(new Headers(calls[1].init?.headers).has('Authorization'), false);
  assert.equal(new Headers(calls[2].init?.headers).has('Authorization'), false);
  assert.equal(calls[0].receiver, fetchTarget);

  restore();
  assert.equal(fetchTarget.fetch, originalFetch);
});

test('preserves an explicit authorization header on a private H5P fetch request', async () => {
  const { installH5PAdminFetchAuth } = await import('./h5p-admin-auth.mjs');
  let receivedInit;
  const fetchTarget = {
    fetch(_input, init) {
      receivedInit = init;
      return Promise.resolve(new Response('ok'));
    },
  };
  const restore = installH5PAdminFetchAuth({
    fetchTarget,
    getToken: () => 'admin-token',
    origin: 'https://strapi.example.com',
  });

  await fetchTarget.fetch('/h5p/ajax', {
    headers: { Authorization: 'Bearer caller-token', Accept: 'application/json' },
  });

  assert.equal(new Headers(receivedInit.headers).get('Authorization'), 'Bearer caller-token');
  assert.equal(new Headers(receivedInit.headers).get('Accept'), 'application/json');
  restore();
});
