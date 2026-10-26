export async function runStorageHealthCheck({ checkDatabase, checkObjectStore }) {
  if (typeof checkDatabase !== 'function' || typeof checkObjectStore !== 'function') {
    throw new TypeError('Database and object storage health checks are required');
  }

  const [database, objectStorage] = await Promise.allSettled([
    checkDatabase(),
    checkObjectStore(),
  ]);
  const result = {
    status: database.status === 'fulfilled' && objectStorage.status === 'fulfilled' ? 'ok' : 'error',
    checks: {
      database: database.status === 'fulfilled' ? 'ok' : 'error',
      objectStorage: objectStorage.status === 'fulfilled' ? 'ok' : 'error',
    },
  };

  if (result.status === 'error') {
    const error = new Error('Storage health check failed');
    error.status = 503;
    error.result = result;
    throw error;
  }
  return result;
}
