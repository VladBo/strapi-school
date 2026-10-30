type HealthCheckDependencies = {
  checkDatabase: () => Promise<unknown>;
  checkObjectStore: () => Promise<unknown>;
};

type StorageHealthResult = {
  status: "ok" | "error";
  checks: {
    database: "ok" | "error";
    objectStorage: "ok" | "error";
  };
};

class StorageHealthError extends Error {
  status = 503;
  result: StorageHealthResult;

  constructor(result: StorageHealthResult) {
    super("Storage health check failed");
    this.result = result;
  }
}

export async function runStorageHealthCheck({
  checkDatabase,
  checkObjectStore,
}: HealthCheckDependencies): Promise<StorageHealthResult> {
  if (
    typeof checkDatabase !== "function" ||
    typeof checkObjectStore !== "function"
  ) {
    throw new TypeError(
      "Database and object storage health checks are required",
    );
  }

  const [database, objectStorage] = await Promise.allSettled([
    checkDatabase(),
    checkObjectStore(),
  ]);
  const result: StorageHealthResult = {
    status:
      database.status === "fulfilled" && objectStorage.status === "fulfilled"
        ? "ok"
        : "error",
    checks: {
      database: database.status === "fulfilled" ? "ok" : "error",
      objectStorage: objectStorage.status === "fulfilled" ? "ok" : "error",
    },
  };

  if (result.status === "error") {
    throw new StorageHealthError(result);
  }
  return result;
}
