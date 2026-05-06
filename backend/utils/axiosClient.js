const axios = require("axios");

const axiosClient = axios.create({
  baseURL: "", // optional (not needed for GitHub)
  timeout: 30000, // 30s — large repos (e.g. nodejs/node) need more time
  headers: {
    "User-Agent": "repo-explorer",
    ...(process.env.GITHUB_TOKEN && {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
    })
  }
});

// -------------------------
// REQUEST INTERCEPTOR
// -------------------------
axiosClient.interceptors.request.use(
  (config) => {

    // Optional logging
    console.log(`[HTTP] ${config.method.toUpperCase()} ${config.url}`);

    return config;
  },
  (error) => Promise.reject(error)
);

// -------------------------
// RESPONSE INTERCEPTOR (Retry once)
// -------------------------
axiosClient.interceptors.response.use(
  (response) => response,

  async (error) => {

    const config = error.config;

    // Retry only once
    if (!config || config.__retry) {
      return Promise.reject(error);
    }

    config.__retry = true;

    console.warn("Retrying request:", config.url);

    return axiosClient(config);
  }
);

module.exports = axiosClient;