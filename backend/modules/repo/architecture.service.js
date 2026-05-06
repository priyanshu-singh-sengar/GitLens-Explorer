function detectArchitecture(tree) {

  const architecture = {
    entryPoints: [],
    core: [],
    adapters: [],
    helpers: [],
    tests: [],
    configs: []
  };

  // Iterative traversal using an explicit stack — prevents stack overflow on large repos
  const stack = [{ node: tree, currentPath: "" }];

  while (stack.length > 0) {

    const { node, currentPath } = stack.pop();

    if (!node || typeof node !== "object") continue;

    for (const key in node) {

      const fullPath = currentPath ? `${currentPath}/${key}` : key;
      const value = node[key];

      // -----------------------
      // FILE
      // -----------------------
      if (value && value.__isFile) {

        const lower = fullPath.toLowerCase();

        // TEST FILES
        if (
          lower.startsWith("test") ||
          lower.startsWith("tests") ||
          lower.includes("/test/") ||
          lower.includes(".spec.") ||
          lower.includes(".test.")
        ) {
          architecture.tests.push(fullPath);
          continue;
        }

        // ENTRY POINTS
        if (
          key === "index.js" ||
          key === "main.js" ||
          key === "app.js" ||
          key === "server.js"
        ) {
          architecture.entryPoints.push(fullPath);
        }

        // CORE
        if (
          lower.includes("/core/") ||
          lower.includes("/src/") ||
          lower.includes("/services/") ||
          lower.includes("/controllers/") ||
          lower.includes("/lib/")
        ) {
          architecture.core.push(fullPath);
        }

        // ADAPTERS
        if (lower.includes("adapter")) {
          architecture.adapters.push(fullPath);
        }

        // HELPERS
        if (
          lower.includes("helper") ||
          lower.includes("utils") ||
          lower.includes("util")
        ) {
          architecture.helpers.push(fullPath);
        }

        // CONFIG FILES
        if (
          key.endsWith(".config.js") ||
          key.endsWith(".config.cjs") ||
          key.endsWith(".config.ts") ||
          key === "package.json" ||
          key === "tsconfig.json" ||
          key === "webpack.config.js" ||
          key === "rollup.config.js" ||
          key === "vite.config.js" ||
          key === ".eslintrc" ||
          key === ".prettierrc"
        ) {
          architecture.configs.push(fullPath);
        }

      }

      // -----------------------
      // FOLDER — push children onto the stack
      // -----------------------
      else if (value && value.children) {
        stack.push({ node: value.children, currentPath: fullPath });
      }

    }

  }

  return architecture;
}

module.exports = { detectArchitecture };