const assert = require('node:assert/strict');
const test = require('node:test');

async function loadHealthCheck() {
  return import('./health-check.mjs');
}

test('passes only after both database and object storage reads succeed', async () => {
  const { runStorageHealthCheck } = await loadHealthCheck();
  const calls = [];

  const result = await runStorageHealthCheck({
    checkDatabase: async () => calls.push('database'),
    checkObjectStore: async () => calls.push('objectStorage'),
  });

  assert.deepEqual(calls.sort(), ['database', 'objectStorage']);
  assert.deepEqual(result, {
    status: 'ok',
    checks: { database: 'ok', objectStorage: 'ok' },
  });
});

test('fails without leaking error details when either dependency read fails', async () => {
  const { runStorageHealthCheck } = await loadHealthCheck();

  for (const failingDependency of ['database', 'objectStorage']) {
    await assert.rejects(
      runStorageHealthCheck({
        checkDatabase: async () => {
          if (failingDependency === 'database') throw new Error('postgresql://secret');
        },
        checkObjectStore: async () => {
          if (failingDependency === 'objectStorage') throw new Error('secret access key');
        },
      }),
      (error) => {
        assert.equal(error.status, 503);
        assert.equal(error.result.status, 'error');
        assert.equal(error.result.checks[failingDependency], 'error');
        assert.doesNotMatch(JSON.stringify(error.result), /secret|postgresql/i);
        return true;
      },
    );
  }
});
