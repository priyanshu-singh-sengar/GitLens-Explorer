const parser = require("@babel/parser");

function extractSymbols(filePath, code) {

  const symbols = [];

  try {

    const ast = parser.parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript"]
    });

    const body = ast.program.body;

    for (const node of body) {

      // function declarations
      if (node.type === "FunctionDeclaration") {

        symbols.push({
          name: node.id.name,
          file: filePath,
          line: node.loc?.start.line || null
        });

      }

      // class declarations
      if (node.type === "ClassDeclaration") {

        symbols.push({
          name: node.id.name,
          file: filePath,
          line: node.loc?.start.line || null
        });

      }

      // variable functions
      if (node.type === "VariableDeclaration") {

        for (const decl of node.declarations) {

          if (
            decl.init &&
            (
              decl.init.type === "ArrowFunctionExpression" ||
              decl.init.type === "FunctionExpression"
            )
          ) {

            symbols.push({
              name: decl.id.name,
              file: filePath,
              line: decl.loc?.start.line || null
            });

          }

        }

      }

    }

  } catch (err) {

    // ignore parsing errors

  }

  return symbols;

}

module.exports = { extractSymbols };
