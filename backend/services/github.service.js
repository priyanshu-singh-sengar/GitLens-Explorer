const axios = require("../utils/axiosClient");

exports.getRepoTree = async (owner, repo) => {

  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "repo-explorer"
  };

  // optional GitHub token support
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {

    // Get repo info
    const repoInfo = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}`,
      { headers }
    );

    const branch = repoInfo.data.default_branch;

    // Fetch entire repo tree
    const treeResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      { headers }
    );

    return treeResponse.data.tree;

  } catch (err) {

    if (err.response && err.response.status === 404) {
      throw new Error("Repository not found");
    }

    throw new Error("Failed to fetch repository tree");

  }

};