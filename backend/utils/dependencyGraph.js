const { extractImports } = require("./importParser");
const { resolveImportPath } = require("./importResolver");

function buildDependencyGraph(tree) {

  const graph = {};

  function walk(node, path = "") {

    for (const key in node) {

      const fullPath = path ? `${path}/${key}` : key;

      if (node[key] === null) {

        if (
          fullPath.endsWith(".js") ||
          fullPath.endsWith(".ts")
        ) {
          graph[fullPath] = [];
        }

      } else {
        walk(node[key], fullPath);
      }
    }
  }

  walk(tree);

  return graph;
}

function addDependencies(graph, filePath, code, tree) {

  const imports = extractImports(code);

  const resolved = imports
    .map((imp) =>
      resolveImportPath(filePath, imp, tree)
    )
    .filter(Boolean);

  graph[filePath] = resolved;
}

module.exports = {
  buildDependencyGraph,
  addDependencies
};