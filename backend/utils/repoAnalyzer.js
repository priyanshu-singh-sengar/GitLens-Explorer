function analyzeRepo(rawTree) {

  const important = [];

  // rawTree is the flat array from GitHub API — iterate directly, no recursion needed
  if (!Array.isArray(rawTree)) return important;

  const knownImportantFiles = [
    "README.md",
    "package.json",
    "tsconfig.json",
    "requirements.txt",
    "Dockerfile",
    "go.mod",
    "Cargo.toml"
  ];

  const sourceFolders = [
    "src",
    "lib",
    "app",
    "server",
    "backend",
    "frontend"
  ];

  const fallbackFiles = [];

  for (const file of rawTree) {

    if (!file || !file.path) continue;

    const name = file.path.split("/").pop();

    if (file.type === "blob") {

      if (knownImportantFiles.includes(name)) {
        important.push({ name: file.path, type: "file" });
      }

      if (name.endsWith(".js") || name.endsWith(".ts")) {
        fallbackFiles.push(file.path);
      }

    } else if (file.type === "tree") {

      if (sourceFolders.includes(name)) {
        important.push({ name: file.path, type: "folder" });
      }

    }

  }

  // fallback if nothing detected
  if (important.length === 0) {
    fallbackFiles.slice(0, 5).forEach(file => {
      important.push({ name: file, type: "file" });
    });
  }

  return important;

}

module.exports = analyzeRepo;