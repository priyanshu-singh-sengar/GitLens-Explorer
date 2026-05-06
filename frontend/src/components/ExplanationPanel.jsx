import ReactMarkdown from "react-markdown";
import LoadingSpinner from "./LoadingSpinner";

export default function ExplanationPanel({ tab }) {
  if (!tab) return null;

  if (tab.loading) {
    return (
      <div className="explanation-panel">
        <LoadingSpinner text={`Analyzing ${tab.title}…`} />
      </div>
    );
  }

  const text = tab.explanation || tab.content;

  return (
    <div className="explanation-panel">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 20 }}>
          {tab.type === "repo" ? "🏗️" : tab.type === "folder" ? "📂" : "💡"}
        </span>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
          {tab.type === "file" ? "AI Explanation" : tab.title}
        </h2>
        {tab.cached && (
          <span className="badge badge-cached">⚡ Cached</span>
        )}
      </div>
      <ReactMarkdown>{text || "_No explanation available._"}</ReactMarkdown>
    </div>
  );
}
