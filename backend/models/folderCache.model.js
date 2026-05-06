const mongoose = require("mongoose");

const folderCacheSchema = new mongoose.Schema({

  owner: String,
  repo: String,
  commitSha: String,
  path: String,
  explanation: String

}, { timestamps: true });

folderCacheSchema.index(
  { owner: 1, repo: 1, commitSha: 1, path: 1 },
  { unique: true }
);

module.exports = mongoose.model("FolderCache", folderCacheSchema);