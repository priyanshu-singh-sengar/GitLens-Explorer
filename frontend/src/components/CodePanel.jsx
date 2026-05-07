import Editor from "@monaco-editor/react";
import LoadingSpinner from "./LoadingSpinner";

function getLanguage(filename) {
  const ext = (filename || "").split(".").pop().toLowerCase();
  const map = {
    js: "javascript", jsx: "javascript",
    ts: "typescript", tsx: "typescript",
    py: "python",     rb: "ruby",
    go: "go",         rs: "rust",
    java: "java",     cpp: "cpp",
    c: "c",           cs: "csharp",
    php: "php",       html: "html",
    css: "css",       scss: "scss",
    json: "json",     md: "markdown",
    yaml: "yaml",     yml: "yaml",
    sh: "shell",      bash: "shell",
    toml: "toml",     xml: "xml",
    sql: "sql",       graphql: "graphql",
    vue: "html",      svelte: "html",
  };
  return map[ext] || "plaintext";
}

export default function CodePanel({ tab, onCodeChange }) {
  if (!tab) return null;

  if (tab.loading) {
    return (
      <div className="code-panel" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LoadingSpinner text="Fetching file…" />
      </div>
    );
  }

  const language = getLanguage(tab.title);
  const lines = (tab.code || "").split("\n").length;

  return (
    <div className="code-panel" style={{ flex: 1 }}>
      {/* Header */}
      <div className="code-panel-header">
        <span className="code-panel-filename">📄 {tab.title}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            fontSize: 11,
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-default)",
            borderRadius: 4,
            padding: "1px 7px",
            color: "var(--accent-purple)",
            fontFamily: "var(--font-mono)",
          }}>
            {language}
          </span>
          <span className="code-panel-lines">{lines} lines</span>
        </div>
      </div>

      {/* Monaco Editor */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <Editor
          height="100%"
          language={language}
          value={tab.code || ""}
          onChange={(value) => onCodeChange && onCodeChange(tab.id, value)}
          theme="vs-dark"
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontLigatures: true,
            lineNumbers: "on",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "off",
            tabSize: 2,
            automaticLayout: true,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            renderLineHighlight: "all",
            bracketPairColorization: { enabled: true },
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>
    </div>
  );
}
