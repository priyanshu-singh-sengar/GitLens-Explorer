import { useState, useEffect, useRef } from "react";

const LABELS = {
  entryPoints: { icon: "⚡", label: "Entry Points", badgeClass: "badge-blue" },
  core:        { icon: "🧠", label: "Core Files",   badgeClass: "badge-purple" },
  tests:       { icon: "🧪", label: "Tests",        badgeClass: "badge-green" },
  configs:     { icon: "⚙️", label: "Configs",      badgeClass: "badge-orange" },
  helpers:     { icon: "🔧", label: "Helpers",      badgeClass: "badge-orange" },
  adapters:    { icon: "🔌", label: "Adapters",     badgeClass: "badge-blue" },
};

export default function ArchBadge({ category, files, onFileClick }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const meta = LABELS[category] || { icon: "📁", label: category, badgeClass: "badge-blue" };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!files || files.length === 0) return null;

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <span
        className={`badge ${meta.badgeClass}`}
        onClick={() => setOpen(o => !o)}
        style={{ cursor: "pointer", userSelect: "none" }}
        title={`Click to see ${files.length} ${meta.label.toLowerCase()}`}
      >
        {meta.icon} {files.length} {meta.label}
        <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.7 }}>
          {open ? "▲" : "▼"}
        </span>
      </span>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0,
          zIndex: 500,
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-md)",
          minWidth: 280,
          maxWidth: 420,
          maxHeight: 280,
          overflowY: "auto",
          animation: "fadeIn 0.15s ease",
        }}>
          {/* Header */}
          <div style={{
            padding: "8px 12px",
            borderBottom: "1px solid var(--border-subtle)",
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.7px",
            color: "var(--text-muted)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <span>{meta.icon} {meta.label}</span>
            <span>{files.length} file{files.length !== 1 ? "s" : ""}</span>
          </div>

          {/* File list */}
          {files.map((filePath, i) => {
            const name = filePath.split("/").pop();
            const dir = filePath.includes("/")
              ? filePath.substring(0, filePath.lastIndexOf("/"))
              : "";

            return (
              <div
                key={i}
                onClick={() => {
                  onFileClick(filePath);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "7px 12px",
                  cursor: "pointer",
                  borderBottom: "1px solid var(--border-subtle)",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  color: "var(--text-primary)",
                }}>
                  📄 {name}
                </span>
                {dir && (
                  <span style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginTop: 1,
                  }}>
                    {dir}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
