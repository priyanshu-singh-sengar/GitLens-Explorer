import { useState, useCallback, useRef } from "react";
import "./index.css";

import { loadRepo, getFile, getFolder, fetchRawFile } from "./api/repoApi";
import FileTree from "./components/FileTree";
import ExplanationPanel from "./components/ExplanationPanel";
import CodePanel from "./components/CodePanel";
import LoadingSpinner from "./components/LoadingSpinner";
import Toast from "./components/Toast";
import ArchBadge from "./components/ArchBadge";

let toastCounter = 0;

function App() {
  const [repoUrl, setRepoUrl] = useState("");
  const [data, setData] = useState(null);
  const [repoLoading, setRepoLoading] = useState(false);

  // All open tabs: code tabs + explanation tabs + repo-summary
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);

  const [toasts, setToasts] = useState([]);
  const inputRef = useRef(null);

  // ----------------------------------------
  // TOAST
  // ----------------------------------------
  const addToast = useCallback((message, type = "error") => {
    const id = ++toastCounter;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ----------------------------------------
  // LOAD REPO
  // ----------------------------------------
  const handleLoad = async () => {
    if (!repoUrl.trim()) return;
    setRepoLoading(true);
    try {
      const res = await loadRepo(repoUrl.trim());
      setData(res);
      const summaryTab = {
        id: "repo-summary",
        kind: "explanation",   // "code" | "explanation"
        title: res.repo,
        icon: "🏗️",
        content: res.summary,
        cached: res.cached,
        loading: false,
      };
      setTabs([summaryTab]);
      setActiveTab("repo-summary");
      setSelectedFile(null);
      setSelectedFolder(null);
    } catch (err) {
      addToast(err.message || "Failed to load repository", "error");
    } finally {
      setRepoLoading(false);
    }
  };

  // ----------------------------------------
  // CLOSE TAB
  // ----------------------------------------
  const closeTab = useCallback((id, e) => {
    e?.stopPropagation();
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id);
      // if we closed the active tab, activate the nearest one
      setActiveTab(old => {
        if (old !== id) return old;
        return next.length ? next[next.length - 1].id : null;
      });
      return next;
    });
  }, []);

  // ----------------------------------------
  // FILE CLICK — open code only (no AI)
  // ----------------------------------------
  const handleFileClick = async (path) => {
    setSelectedFile(path);
    setSelectedFolder(null);

    const id = `code-${path}`;
    const existing = tabs.find(t => t.id === id);
    if (existing) { setActiveTab(id); return; }

    // Open loading tab immediately
    const loadingTab = {
      id,
      kind: "code",
      title: path.split("/").pop(),
      fullPath: path,
      icon: "📄",
      code: null,
      edited: false,
      loading: true,
    };
    setTabs(prev => [...prev, loadingTab]);
    setActiveTab(id);

    try {
      const raw = await fetchRawFile(data.owner, data.repo, data.commitSha, path);
      setTabs(prev => prev.map(t =>
        t.id === id ? { ...t, code: raw, loading: false } : t
      ));
    } catch (err) {
      setTabs(prev => prev.filter(t => t.id !== id));
      addToast(`Could not open file: ${err.message}`, "error");
    }
  };

  // ----------------------------------------
  // FOLDER CLICK
  // ----------------------------------------
  const handleFolderClick = (path) => {
    setSelectedFolder(path);
    setSelectedFile(null);
  };

  // ----------------------------------------
  // EXPLAIN FILE — opens a separate explanation tab
  // ----------------------------------------
  const explainFile = async () => {
    if (!selectedFile) return;

    const id = `explain-${selectedFile}`;
    const existing = tabs.find(t => t.id === id);
    if (existing) { setActiveTab(id); return; }

    const loadingTab = {
      id,
      kind: "explanation",
      title: `💡 ${selectedFile.split("/").pop()}`,
      icon: "💡",
      content: "",
      cached: false,
      loading: true,
    };
    setTabs(prev => [...prev, loadingTab]);
    setActiveTab(id);

    try {
      const res = await getFile(data.owner, data.repo, selectedFile);
      setTabs(prev => prev.map(t =>
        t.id === id
          ? { ...t, content: res.explanation, cached: res.cached, loading: false }
          : t
      ));
      // Also update the code tab if already open
      const codeId = `code-${selectedFile}`;
      setTabs(prev => prev.map(t =>
        t.id === codeId && !t.code ? { ...t, code: res.content, loading: false } : t
      ));
    } catch (err) {
      setTabs(prev => prev.filter(t => t.id !== id));
      addToast(`Failed to explain file: ${err.message}`, "error");
    }
  };

  // ----------------------------------------
  // EXPLAIN FOLDER — opens a separate explanation tab
  // ----------------------------------------
  const explainFolder = async () => {
    if (!selectedFolder) return;

    const id = `explain-folder-${selectedFolder}`;
    const existing = tabs.find(t => t.id === id);
    if (existing) { setActiveTab(id); return; }

    const folderName = selectedFolder.split("/").pop();
    const loadingTab = {
      id,
      kind: "explanation",
      title: `💡 ${folderName}/`,
      icon: "💡",
      content: "",
      cached: false,
      loading: true,
    };
    setTabs(prev => [...prev, loadingTab]);
    setActiveTab(id);

    try {
      const res = await getFolder(data.owner, data.repo, selectedFolder);
      setTabs(prev => prev.map(t =>
        t.id === id
          ? { ...t, content: res.explanation, cached: res.cached, loading: false }
          : t
      ));
    } catch (err) {
      setTabs(prev => prev.filter(t => t.id !== id));
      addToast(`Failed to explain folder: ${err.message}`, "error");
    }
  };

  // ----------------------------------------
  // MONACO EDIT TRACKING
  // ----------------------------------------
  const handleCodeChange = useCallback((tabId, newValue) => {
    setTabs(prev => prev.map(t =>
      t.id === tabId ? { ...t, code: newValue, edited: true } : t
    ));
  }, []);

  // ----------------------------------------
  // DERIVED
  // ----------------------------------------
  const arch = data?.architecture || {};
  const activeTabData = tabs.find(t => t.id === activeTab) || null;

  // ----------------------------------------
  // RENDER
  // ----------------------------------------
  return (
    <div className="app-shell">

      {/* ── TOPBAR ── */}
      <header className="topbar">
        <div className="topbar-logo">
          <span className="logo-icon">🔭</span>
          <span>Repo<span className="logo-accent">Explorer</span></span>
        </div>
        <div className="topbar-input-wrapper">
          <span className="topbar-input-icon">🔗</span>
          <input
            ref={inputRef}
            className="topbar-input"
            value={repoUrl}
            onChange={e => setRepoUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLoad()}
            placeholder="https://github.com/owner/repo"
            spellCheck={false}
          />
        </div>
        <button
          className="topbar-btn"
          onClick={handleLoad}
          disabled={repoLoading || !repoUrl.trim()}
        >
          {repoLoading ? (
            <>
              <span style={{
                width: 12, height: 12,
                border: "2px solid #ffffff60", borderTopColor: "#fff",
                borderRadius: "50%", display: "inline-block",
                animation: "spin 0.7s linear infinite"
              }} />
              Loading…
            </>
          ) : <>🚀 Analyze</>}
        </button>
      </header>

      {/* ── REPO META BAR ── */}
      {data && (
        <div className="repo-meta-bar">
          <span className="repo-meta-name">{data.owner} / {data.repo}</span>
          <span className="dot">·</span>
          <span className="repo-meta-sha" title="Latest commit SHA">
            {data.commitSha?.slice(0, 7)}
          </span>
          <span className="dot">·</span>
          <ArchBadge category="entryPoints" files={arch.entryPoints} onFileClick={handleFileClick} />
          <ArchBadge category="core" files={arch.core} onFileClick={handleFileClick} />
          <ArchBadge category="tests" files={arch.tests} onFileClick={handleFileClick} />
          <ArchBadge category="configs" files={arch.configs} onFileClick={handleFileClick} />
          <ArchBadge category="helpers" files={arch.helpers} onFileClick={handleFileClick} />
          <ArchBadge category="adapters" files={arch.adapters} onFileClick={handleFileClick} />
          {data.cached && <span className="badge badge-cached">⚡ Cached</span>}
        </div>
      )}

      {/* ── MAIN LAYOUT ── */}
      <div className="main-layout">

        {/* ── SIDEBAR ── */}
        {data && (
          <aside className="sidebar">
            <div className="sidebar-header">
              <span>Explorer</span>
              <span style={{ fontSize: 11 }}>{data.repo}</span>
            </div>
            <div className="sidebar-tree">
              <FileTree
                tree={data.tree}
                onFileClick={handleFileClick}
                onFolderClick={handleFolderClick}
                selectedFile={selectedFile}
                selectedFolder={selectedFolder}
              />
            </div>
            <div className="sidebar-action-btns">
              <button
                className="action-btn primary"
                onClick={explainFile}
                disabled={!selectedFile}
                title={selectedFile ? `Explain ${selectedFile}` : "Select a file first"}
              >
                💡 Explain File
              </button>
              <button
                className="action-btn"
                onClick={explainFolder}
                disabled={!selectedFolder}
                title={selectedFolder ? `Explain ${selectedFolder}` : "Select a folder first"}
              >
                💡 Explain Folder
              </button>
            </div>
            {(selectedFile || selectedFolder) && (
              <div className="selected-info-bar">
                {selectedFile
                  ? <><span>📄</span> {selectedFile}</>
                  : <><span>📂</span> {selectedFolder}</>
                }
              </div>
            )}
          </aside>
        )}

        {/* ── CONTENT AREA ── */}
        <div className="content-area">
          {repoLoading ? (
            <LoadingSpinner text="Fetching and analyzing repository… (large repos may take up to 60s on first load — instant from cache after)" />
          ) : !data ? (
            <div className="landing">
              <div className="landing-icon">🔭</div>
              <h1 className="landing-title">Repo Explorer</h1>
              <p className="landing-sub">
                Paste any public GitHub repository URL above to explore its structure,
                get AI-powered explanations for files and folders, and understand the architecture at a glance.
              </p>
              <div className="landing-hint">
                <span>Press</span><kbd>Enter</kbd>
                <span>or click</span><kbd>🚀 Analyze</kbd>
                <span>to get started</span>
              </div>
            </div>
          ) : (
            <>
              {/* ── TAB BAR ── */}
              {tabs.length > 0 && (
                <div className="tab-bar">
                  {tabs.map(tab => (
                    <div
                      key={tab.id}
                      className={`tab ${activeTab === tab.id ? "tab-active" : ""} ${tab.kind === "explanation" ? "tab-explain" : ""}`}
                      onClick={() => setActiveTab(tab.id)}
                      title={tab.fullPath || tab.title}
                    >
                      <span className="tab-icon">
                        {tab.loading ? "⏳" : tab.icon}
                      </span>
                      <span className="tab-title">
                        {tab.title}
                        {tab.edited && (
                          <span style={{ color: "var(--accent-orange)", marginLeft: 4 }}>●</span>
                        )}
                      </span>
                      {/* ALL tabs are closeable */}
                      <span
                        className="tab-close"
                        onClick={e => closeTab(tab.id, e)}
                        title="Close tab"
                      >
                        ✕
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* ── TAB CONTENT ── */}
              {activeTabData ? (
                activeTabData.kind === "code" ? (
                  <CodePanel
                    tab={activeTabData}
                    onCodeChange={handleCodeChange}
                  />
                ) : (
                  <ExplanationPanel tab={activeTabData} />
                )
              ) : (
                <div className="landing" style={{ marginTop: 0 }}>
                  <div className="landing-icon" style={{ fontSize: 40 }}>👈</div>
                  <p className="landing-sub">
                    Click a file to open it, or use <strong>💡 Explain File / Folder</strong> for AI explanations.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default App;