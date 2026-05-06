function extractImports(code) {

  const imports = [];

  // import something from "module"
  const importFromRegex =
    /import\s+.*?\s+from\s+["'](.*?)["']/g;

  // import "module"
  const importOnlyRegex =
    /import\s+["'](.*?)["']/g;

  // require("module")
  const requireRegex =
    /require\(["'](.*?)["']\)/g;

  // dynamic import("module")
  const dynamicImportRegex =
    /import\(["'](.*?)["']\)/g;

  let match;

  while ((match = importFromRegex.exec(code)) !== null) {

    imports.push(match[1].trim());

  }

  while ((match = importOnlyRegex.exec(code)) !== null) {

    imports.push(match[1].trim());

  }

  while ((match = requireRegex.exec(code)) !== null) {

    imports.push(match[1].trim());

  }

  while ((match = dynamicImportRegex.exec(code)) !== null) {

    imports.push(match[1].trim());

  }

  return imports;

}

module.exports = { extractImports };