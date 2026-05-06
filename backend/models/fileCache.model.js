const mongoose = require("mongoose");

const fileCacheSchema = new mongoose.Schema({

  owner: { type: String, required: true },
  repo: { type: String, required: true },
  commitSha: { type: String, required: true },
  path: { type: String, required: true },

  explanation: {
    type: String,
    required: true,
    maxlength: 10000
  }

}, { timestamps: true });

// Unique cache per file per commit
fileCacheSchema.index(
  { owner: 1, repo: 1, commitSha: 1, path: 1 },
  { unique: true }
);

// TTL index (7 days)
fileCacheSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 7 }
);

// Text search (future feature)
fileCacheSchema.index({ explanation: "text" });

module.exports =
  mongoose.models.FileCache ||
  mongoose.model("FileCache", fileCacheSchema);