function buildTree(files) {
  const root = {};

  if (!Array.isArray(files)) return root;

  files.forEach((file) => {

    if (!file || !file.path) return;

    const parts = file.path.split("/");
    let current = root;

    // Safety: if current ever becomes undefined/null, abort this file
    if (!current) return;

    for (let index = 0; index < parts.length; index++) {
      const part = parts[index];
      const isLastPart = index === parts.length - 1;
      const isFile = isLastPart && file.type === "blob";

      if (!current[part]) {
        // Create the node fresh
        current[part] = isFile
          ? { __isFile: true }
          : { children: {} };
      } else if (!isFile && current[part].__isFile) {
        // Node was previously registered as a file but we now need
        // to traverse INTO it as a folder (e.g. features/ vs features/WEB_FEATURES.yml)
        // Upgrade it to a folder node with children
        current[part] = { children: {} };
      } else if (!isFile && !current[part].children) {
        // Node exists but has no children object — add one defensively
        current[part].children = {};
      }

      if (!isFile) {
        const next = current[part].children;
        if (!next || typeof next !== "object") {
          // Something went wrong structurally — abort this file path
          break;
        }
        current = next;
      }
    }

  });

  return root;
}


module.exports = buildTree;