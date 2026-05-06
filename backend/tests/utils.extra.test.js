const { findFileUsage } = require("../utils/findUsage");
const { addDependencies } = require("../utils/dependencyGraph");
const buildTree = require("../utils/repoParser");

describe("Utils Extra", () => {

  it("should build dependency graph", () => {

    const graph = {};

    addDependencies(
      graph,
      "file.js",
      `import x from './a'\nrequire('./b')`,
      []
    );

    expect(graph["file.js"]).toBeDefined();
  });

  it("should find file usage", () => {

    const graph = {
      "a.js": ["b.js"],
      "b.js": []
    };

    const result = findFileUsage(graph, "b.js");

    expect(result).toContain("a.js");
  });

  it("should build repo tree", () => {

    const tree = buildTree([
      { path: "src/index.js" },
      { path: "src/utils/helper.js" }
    ]);

    expect(tree).toBeDefined();
  });

});