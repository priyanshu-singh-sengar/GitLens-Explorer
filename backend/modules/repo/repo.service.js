const githubService = require("../../services/github.service");
const buildTree = require("../../utils/repoParser");
const filterRepoFiles = require("../../utils/repoFilter");
const analyzeRepo = require("../../utils/repoAnalyzer");
const axios = require("../../utils/axiosClient");
const aiService = require("../ai/ai.service");
const architectureService = require("./architecture.service");

const RepoCache = require("../../models/repoCache.model");
const FileCache = require("../../models/fileCache.model");

const { addDependencies } = require("../../utils/dependencyGraph");

global.dependencyGraph = global.dependencyGraph || {};

// -------------------------
// FETCH REPO
// -------------------------
async function fetchRepo(repoUrl) {

  const cleanedUrl = repoUrl
    .trim()
    .replace(/\.git$/, "")
    .replace(/\/$/, "");

  const parts = cleanedUrl.split("/");

  if (parts.length < 5) {
    throw new Error("Invalid GitHub repository URL");
  }

  const owner = parts[3];
  const repo = parts[4];

  const commitSha = await getLatestCommitSha(owner, repo);

  const cachedRepo = await RepoCache.findOne({ owner, repo });

  // -------------------------
  // CACHE CHECK
  // -------------------------
  if (
    cachedRepo &&
    cachedRepo.commitSha === commitSha &&
    cachedRepo.summary &&
    cachedRepo.summary !== "Summary unavailable"
  ) {
    console.log("⚡ Serving repo from cache");

    return {
      owner,
      repo,
      commitSha,
      tree: cachedRepo.tree,              // ✅ FULL TREE
      importantFiles: cachedRepo.importantFiles,
      architecture: cachedRepo.architecture,
      summary: cachedRepo.summary,
      cached: true
    };
  }

  console.log("🔥 Analyzing repo...");

  // -------------------------
  // FETCH FULL TREE FROM GITHUB
  // -------------------------
  const rawTree = await githubService.getRepoTree(owner, repo);

  // -------------------------
  // BUILD FULL TREE (FOR UI)
  // -------------------------
  const parsedTree = buildTree(rawTree);
  console.log("✅ Tree built");
  console.log("📦 Sample tree keys:", Object.keys(parsedTree).slice(0, 10));

  // -------------------------
  // FILTER ONLY FOR AI
  // -------------------------
  const filteredTree = rawTree; // TEMP (prevents crashes)

  // IMPORTANT FILES FOR AI
  const importantFiles = analyzeRepo(filteredTree);

  // ARCHITECTURE FROM FULL TREE
  let architecture = {};

  try {
    architecture = architectureService.detectArchitecture(parsedTree);
  } catch (err) {
    console.error("❌ Architecture detection failed:");
    console.error(err.stack || err.message);
    architecture = {};
  }

  let summary = "Summary unavailable";

  console.log("🚀 Calling AI summarizeRepo...");

  try {
    const aiSummary = await aiService.summarizeRepo(repo, importantFiles);

    console.log("✅ AI RESPONSE RECEIVED");

    if (aiSummary && typeof aiSummary === "string") {
      summary = aiSummary;
    }

  } catch (err) {
    console.log("❌ AI failed:", err.message);
  }

  // -------------------------
  // CACHE SAVE (safe serialization to prevent Mongoose Mixed-type stack overflow)
  // -------------------------
  try {
    const safeTree = JSON.parse(JSON.stringify(parsedTree)); // native C++ — not recursive in JS

    await RepoCache.findOneAndUpdate(
      { owner, repo },
      {
        owner,
        repo,
        commitSha,
        tree: safeTree,
        importantFiles,
        architecture,
        summary
      },
      { upsert: true, returnDocument: "after" }
    );

  } catch (saveErr) {
    console.error("❌ Cache save failed (tree too large?):", saveErr.message);
    // Non-fatal — response still returns correctly below
  }

  return {
    owner,
    repo,
    commitSha,
    tree: parsedTree,               // ✅ SEND FULL TREE
    importantFiles,                 // ✅ SEND FOR AI
    architecture,
    summary,
    cached: false
  };
}

// -------------------------
// FETCH FILE
// -------------------------
async function fetchFile(owner, repo, commitSha, path) {

  try {
    const fileUrl =
      `https://raw.githubusercontent.com/${owner}/${repo}/${commitSha}/${path}`;

    console.log("Fetching:", fileUrl);

    const response = await axios.get(fileUrl);

    return response.data;

  } catch (err) {
    throw new Error(`File not found: ${path}`);
  }
}

// -------------------------
// GET COMMIT SHA
// -------------------------
async function getLatestCommitSha(owner, repo) {

  const repoInfo = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}`
  );

  const branch = repoInfo.data.default_branch;

  const commit = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/commits/${branch}`
  );

  return commit.data.sha;
}

// -------------------------
// EXPLAIN FILE
// -------------------------
async function explainFile(owner, repo, commitSha, path) {

  path = path.trim();

  // -------------------------
  // CACHE CHECK
  // -------------------------
  const cached = await FileCache.findOne({
    owner,
    repo,
    commitSha,
    path
  });

  if (cached) {
    return {
      explanation: cached.explanation,
      cached: true
    };
  }

  // -------------------------
  // FETCH FILE
  // -------------------------
  const code = await fetchFile(owner, repo, commitSha, path);

  if (!code || typeof code !== "string") {
    throw new Error("Invalid file content");
  }

  // -------------------------
  // AUTO LOAD REPO IF NEEDED
  // -------------------------
  let repoCache = await RepoCache.findOne({ owner, repo });

  if (!repoCache) {

    console.log("Repo not cached → auto loading...");

    const repoUrl = `https://github.com/${owner}/${repo}`;

    await fetchRepo(repoUrl);

    repoCache = await RepoCache.findOne({ owner, repo });

    if (!repoCache) {
      throw new Error("Failed to load repository");
    }
  }

  // -------------------------
  // DEPENDENCY GRAPH
  // -------------------------
  addDependencies(
    global.dependencyGraph,
    path,
    code,
    repoCache.tree
  );

  // -------------------------
  // AI EXPLANATION
  // -------------------------
  let explanation = "Explanation unavailable";

  try {
    const aiExplanation = await aiService.explainCode(path, code);

    if (aiExplanation && typeof aiExplanation === "string") {
      explanation = aiExplanation;
    }

  } catch (err) {
    console.log("AI explanation failed");
  }

  // -------------------------
  // CACHE SAVE
  // -------------------------
  await FileCache.findOneAndUpdate(
    { owner, repo, commitSha, path },
    { explanation },
    { upsert: true, returnDocument: "after" }
  );

  return {
    explanation,
    cached: false
  };
}

module.exports = {
  fetchRepo,
  fetchFile,
  explainFile,
  getLatestCommitSha
};