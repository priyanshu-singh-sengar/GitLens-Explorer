const repoService = require("./repo.service");
const { findFileUsage } = require("../../utils/findUsage");
const { resolveImportPath } = require("../../utils/importResolver");
const RepoCache = require("../../models/repoCache.model");

const FolderCache = require("../../models/folderCache.model");
const aiService = require("../ai/ai.service");

// -------------------------
// LOAD REPO
// -------------------------
exports.loadRepo = async (req, res) => {
  try {
    const { repoUrl } = req.body;

    const data = await repoService.fetchRepo(repoUrl);

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// -------------------------
// GET FILE + EXPLANATION
// -------------------------
exports.getFile = async (req, res) => {
  try {
    const { owner, repo, path } = req.query;

    if (!owner || !repo || !path) {
      return res.status(400).json({
        error: "owner, repo and path are required"
      });
    }

    const commitSha = await repoService.getLatestCommitSha(owner, repo);

    const content = await repoService.fetchFile(
      owner,
      repo,
      commitSha,   // ✅ correct position
      path         // ✅ correct position
    );

    const result = await repoService.explainFile(
      owner,
      repo,
      commitSha,
      path
    );

    res.json({
      owner,
      repo,
      path,
      content,
      explanation: result.explanation,
      cached: result.cached
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// -------------------------
// FIND FILE USAGE
// -------------------------
exports.getFileUsage = (req, res) => {
  try {
    const { file } = req.query;

    if (!global.dependencyGraph) {
      return res.status(400).json({
        error: "Dependency graph not built yet"
      });
    }

    const usage = findFileUsage(global.dependencyGraph, file);

    res.json({
      file,
      usedBy: usage
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// -------------------------
// RESOLVE IMPORT PATH
// -------------------------
exports.resolveImport = async (req, res) => {
  try {
    const { file, importPath } = req.query;

    const repoCache = await RepoCache.findOne({}, { tree: 1 });

    if (!repoCache) {
      return res.status(404).json({
        error: "Repo not loaded"
      });
    }

    const resolved = resolveImportPath(
      file,
      importPath,
      repoCache.tree
    );

    res.json({
      file,
      importPath,
      resolved
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// -------------------------
// RESOLVE SYMBOL (NEW)
// -------------------------
exports.resolveSymbol = (req, res) => {
  try {
    const { symbol } = req.query;

    if (!global.symbolIndex) {
      return res.status(400).json({
        error: "Symbol index not built yet"
      });
    }

    const result = global.symbolIndex[symbol];

    if (!result) {
      return res.status(404).json({
        error: "Symbol not found"
      });
    }

    res.json({
      symbol,
      file: result.file,
      line: result.line
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// -------------------------
// FOLDER EXPLANATION (WITH CACHE)
// -------------------------

exports.getFolderExplanation = async (req, res) => {
  try {
    const { owner, repo, path } = req.query;

    if (!owner || !repo || !path) {
      return res.status(400).json({
        success: false,
        message: "owner, repo, path required"
      });
    }

    // -------------------------
    // GET REPO CACHE (for commitSha + tree)
    // -------------------------
    const repoCache = await RepoCache.findOne({ owner, repo });

    if (!repoCache) {
      return res.status(404).json({
        success: false,
        message: "Repo not loaded"
      });
    }

    const { commitSha, tree } = repoCache;

    // -------------------------
    // CHECK FOLDER CACHE
    // -------------------------
    const cached = await FolderCache.findOne({
      owner,
      repo,
      commitSha,
      path
    });

    if (cached) {
      console.log("📦 Serving folder from cache");

      return res.json({
        success: true,
        explanation: cached.explanation,
        cached: true
      });
    }

    // -------------------------
    // COLLECT FILES INSIDE FOLDER
    // -------------------------
    const collectedFiles = [];

    function traverse(node, currentPath = "") {
      for (const key in node) {
        const newPath = currentPath ? `${currentPath}/${key}` : key;

        if (node[key].__isFile) {
          if (newPath.startsWith(path)) {
            collectedFiles.push(newPath);
          }
        }

        if (node[key].children) {
          traverse(node[key].children, newPath);
        }
      }
    }

    traverse(tree);

    if (collectedFiles.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No files found in folder"
      });
    }

    // -------------------------
    // LIMIT FILES (VERY IMPORTANT)
    // -------------------------
    const limitedFiles = collectedFiles.slice(0, 10);

    // -------------------------
    // BUILD PROMPT
    // -------------------------
    const prompt = `
Folder: ${path}

Files inside:
${limitedFiles.join("\n")}

Explain:
1. What this folder is responsible for
2. What kind of logic is inside
3. How it fits in the overall project
`;

    // -------------------------
    // CALL AI
    // -------------------------
    const explanation = await aiService.explainCode(path, prompt);

    // -------------------------
    // SAVE TO CACHE
    // -------------------------
    await FolderCache.findOneAndUpdate(
      { owner, repo, commitSha, path },
      {
        owner,
        repo,
        commitSha,
        path,
        explanation
      },
      { upsert: true, new: true }
    );

    console.log("💾 Folder explanation cached");

    return res.json({
      success: true,
      explanation,
      cached: false
    });

  } catch (err) {
    console.error("❌ Folder explanation failed:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// -------------------------
// CHAT WITH AI
// -------------------------
exports.chatWithAI = async (req, res) => {
  try {
    const { owner, repo, path, chatHistory } = req.body;

    if (!owner || !repo || !chatHistory) {
      return res.status(400).json({ error: "owner, repo, and chatHistory are required" });
    }

    let fileContent = null;
    
    // Try to get file content if it's a specific file
    if (path && path.includes(".")) {
      try {
        const commitSha = await repoService.getLatestCommitSha(owner, repo);
        fileContent = await repoService.fetchFile(owner, repo, commitSha, path);
      } catch (e) {
        console.log("Could not fetch file content for chat:", e.message);
      }
    }

    const response = await aiService.chatWithAI(owner, repo, path, chatHistory, fileContent);
    
    res.json({ response });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};