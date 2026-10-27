function sslOptions(env) {
  const enabled = env.bool(
    'DATABASE_SSL',
    String(env('NODE_ENV', 'development')).toLowerCase() === 'production',
  );
  if (!enabled) return false;
  return {
    ...(env('DATABASE_SSL_KEY', undefined)
      ? { key: env('DATABASE_SSL_KEY', undefined) }
      : {}),
    ...(env('DATABASE_SSL_CERT', undefined)
      ? { cert: env('DATABASE_SSL_CERT', undefined) }
      : {}),
    ...(env('DATABASE_SSL_CA', undefined)
      ? { ca: env('DATABASE_SSL_CA', undefined) }
      : {}),
    rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
  };
}

function buildPostgresConnection(env) {
  return {
    connection: {
      connectionString: env('DATABASE_URL'),
      host: env('DATABASE_HOST', 'localhost'),
      port: env.int('DATABASE_PORT', 5432),
      database: env('DATABASE_NAME', 'strapi'),
      user: env('DATABASE_USERNAME', 'strapi'),
      password: env('DATABASE_PASSWORD', 'strapi'),
      schema: env('DATABASE_SCHEMA', 'public'),
      ssl: sslOptions(env),
    },
    pool: {
      min: env.int('DATABASE_POOL_MIN', 0),
      max: env.int('DATABASE_POOL_MAX', 5),
    },
  };
}

module.exports = { buildPostgresConnection };
