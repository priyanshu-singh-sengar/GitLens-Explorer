const path = require("path");

function resolveImportPath(currentFile, importPath, tree) {

  // Ignore external packages
  if (!importPath.startsWith(".")) {
    return null;
  }

  const currentDir = path.dirname(currentFile);

  let resolvedPath = path.normalize(
    path.join(currentDir, importPath)
  );

  const possiblePaths = [
    resolvedPath,
    resolvedPath + ".js",
    resolvedPath + ".ts",
    path.join(resolvedPath, "index.js"),
    path.join(resolvedPath, "index.ts")
  ];

  for (const p of possiblePaths) {
    if (fileExistsInTree(p, tree)) {
      return p.replace(/\\/g, "/");
    }
  }

  return null;
}

function fileExistsInTree(filePath, tree) {

  const parts = filePath.split("/");
  let current = tree;

  for (const part of parts) {
    if (!current[part]) return false;
    current = current[part];
  }

  return current === null;
}

module.exports = { resolveImportPath };