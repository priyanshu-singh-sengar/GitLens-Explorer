const rateLimit = require("express-rate-limit");

/*
  General API limiter
*/
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // max 200 requests per IP
  message: {
    success: false,
    message: "Too many requests, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false
});

/*
  Strict limiter for AI-heavy endpoints
*/
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // max 50 AI calls
  message: {
    success: false,
    message: "Too many AI requests, slow down."
  }
});

module.exports = {
  apiLimiter,
  aiLimiter
};