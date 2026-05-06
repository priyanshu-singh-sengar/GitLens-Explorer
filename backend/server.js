require("dotenv").config();

const express = require("express");
const cors = require("cors");

const repoRoutes = require("./modules/repo/repo.routes");
const connectDB = require("./config/db");

const errorHandler = require("./middlewares/errorHandler");
const notFound = require("./middlewares/notFound");

const { apiLimiter } = require("./middlewares/rateLimiter");
const logger = require("./middlewares/logger");
const requestId = require("./middlewares/requestId");
const timeout = require("./middlewares/timeout");

const app = express();

app.use(cors());
app.use(express.json());

// order matters
app.use(requestId);
app.use(logger);
app.use(timeout(120000)); // 120s — first load of large repos (tree fetch + AI) can take a while

// rate limiter
app.use("/api", apiLimiter);

// routes
app.use("/api/v1/repo", repoRoutes);

// errors
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

let server;

async function startServer() {
  await connectDB();

  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// IMPORTANT
if (process.env.NODE_ENV !== "test") {
  startServer();
}

// EXPORT ONLY APP (FIXES SUPERTEST)
module.exports = app;

// optional export for manual shutdown
module.exports.server = server;