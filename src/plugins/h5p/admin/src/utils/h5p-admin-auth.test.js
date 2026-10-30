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
