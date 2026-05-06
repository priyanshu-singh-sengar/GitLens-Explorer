const mongoose = require("mongoose");

const repoCacheSchema = new mongoose.Schema({

  owner: {
    type: String,
    required: true,
    index: true
  },

  repo: {
    type: String,
    required: true,
    index: true
  },

  commitSha: {
    type: String,
    required: true,
    index: true
  },

  // FULL TREE (for UI)
  tree: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  // IMPORTANT FILES (for AI)
  importantFiles: {
    type: Array,
    default: []
  },

  architecture: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  summary: {
    type: String,
    default: "Summary unavailable"
  }

}, {
  timestamps: true
});

// -------------------------
// UNIQUE INDEX (CRITICAL)
// -------------------------
repoCacheSchema.index(
  { owner: 1, repo: 1 },
  { unique: true }
);

// -------------------------
// TTL INDEX (7 DAYS)
// -------------------------
repoCacheSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 7 }
);

// -------------------------
// EXPORT SAFE
// -------------------------
module.exports =
  mongoose.models.RepoCache ||
  mongoose.model("RepoCache", repoCacheSchema);