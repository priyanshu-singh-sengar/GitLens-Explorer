import { useState } from "react";

function FileTree({
  tree,
  onFileClick,
  onFolderClick,
  parentPath = "",
  selectedFile,
  selectedFolder,
  depth = 0
}) {
  const [openFolders, setOpenFolders] = useState({});

  if (!tree || typeof tree !== "object") return null;

  const toggleFolder = (path) => {
    setOpenFolders(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const entries = Object.entries(tree).sort(([, a], [, b]) => {
    // folders first, then files
    const aIsFile = a?.__isFile ? 1 : 0;
    const bIsFile = b?.__isFile ? 1 : 0;
    return aIsFile - bIsFile;
  });

  return (
    <div>
      {entries.map(([name, node]) => {
        if (!node) return null;

        const fullPath = parentPath ? `${parentPath}/${name}` : name;

        // FILE
        if (node.__isFile) {
          const ext = name.split(".").pop();
          const icon = getFileIcon(ext, name);
          return (
            <div
              key={fullPath}
              className={`tree-item ${selectedFile === fullPath ? "selected-file" : ""}`}
              style={{ paddingLeft: `${12 + depth * 12}px` }}
              onClick={() => onFileClick(fullPath)}
              title={fullPath}
            >
              <span className="tree-item-icon">{icon}</span>
              <span className="tree-item-name">{name}</span>
            </div>
          );
        }

        // FOLDER
        const isOpen = openFolders[fullPath];
        return (
          <div key={fullPath}>
            <div
              className={`tree-item ${selectedFolder === fullPath ? "selected-folder" : ""}`}
              style={{ paddingLeft: `${12 + depth * 12}px` }}
              onClick={() => {
                toggleFolder(fullPath);
                onFolderClick(fullPath);
              }}
              title={fullPath}
            >
              <span className="tree-arrow">{isOpen ? "▼" : "▶"}</span>
              <span className="tree-item-icon">{isOpen ? "📂" : "📁"}</span>
              <span className="tree-item-name">{name}</span>
            </div>

            {isOpen && node.children && (
              <div className="tree-children">
                <FileTree
                  key={fullPath}
                  tree={node.children}
                  onFileClick={onFileClick}
                  onFolderClick={onFolderClick}
                  parentPath={fullPath}
                  selectedFile={selectedFile}
                  selectedFolder={selectedFolder}
                  depth={depth + 1}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function getFileIcon(ext, name) {
  const lower = name.toLowerCase();
  if (lower === "package.json") return "📦";
  if (lower === "readme.md" || lower === "readme") return "📖";
  if (lower === ".env" || lower.startsWith(".env")) return "🔐";
  if (lower === "dockerfile") return "🐳";
  if ([".gitignore", ".git"].includes(lower)) return "🔧";

  const map = {
    js: "🟨", jsx: "⚛️", ts: "🔷", tsx: "⚛️",
    json: "📋", md: "📝", css: "🎨", scss: "🎨",
    html: "🌐", py: "🐍", go: "🐹", rs: "🦀",
    java: "☕", rb: "💎", php: "🐘", sh: "💻",
    yml: "⚙️", yaml: "⚙️", toml: "⚙️", env: "🔐",
    svg: "🖼️", png: "🖼️", jpg: "🖼️", gif: "🖼️",
    lock: "🔒", sql: "🗄️", graphql: "🔮", vue: "💚",
  };
  return map[ext] || "📄";
}

export default FileTree;