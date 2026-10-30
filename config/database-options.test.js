const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

function envFrom(values) {
  const lookup = (name, fallback) => values[name] ?? fallback;
  lookup.bool = (name, fallback) => {
    const value = values[name];
    if (value === undefined) return fallback;
    return String(value).toLowerCase() === 'true';
  };
  lookup.int = (name, fallback) => Number(values[name] ?? fallback);
  return lookup;
}

test('uses Neon pooled runtime connections with conservative sleep-friendly defaults', async () => {
  const { buildPostgresConnection } = await import('./database-options.mjs');
  const connection = buildPostgresConnection(
    envFrom({
      DATABASE_URL: 'postgresql://pooled.example.test/neondb',
      NODE_ENV: 'production',
    }),
  );

  assert.equal(connection.connection.connectionString, 'postgresql://pooled.example.test/neondb');
  assert.deepEqual(connection.pool, { max: 5, min: 0 });
  assert.deepEqual(connection.connection.ssl, { rejectUnauthorized: true });
});

test('allows explicit TLS and pool overrides without using the backup direct URL at runtime', async () => {
  const { buildPostgresConnection } = await import('./database-options.mjs');
  const connection = buildPostgresConnection(
    envFrom({
      DATABASE_DIRECT_URL: 'postgresql://direct.example.test/neondb',
      DATABASE_POOL_MAX: '3',
      DATABASE_POOL_MIN: '1',
      DATABASE_SSL: 'false',
      DATABASE_URL: 'postgresql://pooled.example.test/neondb',
      NODE_ENV: 'production',
    }),
  );

  assert.equal(connection.connection.connectionString, 'postgresql://pooled.example.test/neondb');
  assert.equal(connection.connection.ssl, false);
  assert.deepEqual(connection.pool, { max: 3, min: 1 });
});

test('documents the direct URL as backup-only configuration', () => {
  const documentation = fs.readFileSync(
    path.join(__dirname, '..', 'docs/operations/render-neon-r2-deployment.md'),
    'utf8',
  );

  assert.match(documentation, /NEON_DIRECT_DATABASE_URL/);
  assert.match(documentation, /backup/i);
});
