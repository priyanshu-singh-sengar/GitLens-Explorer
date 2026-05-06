const { resolveImportPath } = require("../utils/importResolver");

describe("Utils", () => {

  it("should resolve import path", () => {

    const tree = [
      { path: "src/utils/helper.js" }
    ];

    const result = resolveImportPath(
      "src/index.js",
      "./utils/helper",
      tree
    );

    expect(result).toBeDefined();
  });

});