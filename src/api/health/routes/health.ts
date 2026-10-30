export default {
  routes: [
    {
      method: "GET",
      path: "/health/storage",
      handler: "health.storage",
      config: { auth: false },
    },
  ],
};
