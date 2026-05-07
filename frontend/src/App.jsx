import { useState, useCallback, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import "./index.css";

import { loadRepo, getFile, getFolder, fetchRawFile, sendChatMessage } from "./api/repoApi";
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

  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);

  // ----------------------------------------
  // RESIZABLE PANES
  // ----------------------------------------
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [explanationWidth, setExplanationWidth] = useState(380);
  const [chatHeight, setChatHeight] = useState(250);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  
  const draggingTarget = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (draggingTarget.current === "sidebar") {
        setSidebarWidth(Math.max(200, Math.min(e.clientX, window.innerWidth - 400)));
      } else if (draggingTarget.current === "explanation") {
        setExplanationWidth(Math.max(200, Math.min(window.innerWidth - e.clientX, window.innerWidth - sidebarWidth - 200)));
      } else if (draggingTarget.current === "chat") {
        // Assume bottom of the window is roughly e.clientY
        setChatHeight(Math.max(100, Math.min(window.innerHeight - e.clientY, window.innerHeight * 0.8)));
      }
    };
    const handleMouseUp = () => {
      draggingTarget.current = null;
      document.body.style.cursor = "default";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [sidebarWidth]);

  // ----------------------------------------
  // TABS STATE
  // ----------------------------------------
  const [codeTabs, setCodeTabs] = useState([]);
  const [activeCodeTabId, setActiveCodeTabId] = useState(null);

  const [explanationTabs, setExplanationTabs] = useState([]);
  const [activeExplanationTabId, setActiveExplanationTabId] = useState(null);

  const [toasts, setToasts] = useState([]);
  const inputRef = useRef(null);

  // ----------------------------------------
  // CHAT STATE (Global)
  // ----------------------------------------
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

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
        type: "repo",
        title: res.repo,
        icon: "🏗️",
        content: res.summary,
        cached: res.cached,
        loading: false,
      };

      setExplanationTabs([summaryTab]);
      setActiveExplanationTabId("repo-summary");

      setCodeTabs([]);
      setActiveCodeTabId(null);
      setSelectedFile(null);
      setSelectedFolder(null);
    } catch (err) {
      addToast(err.message || "Failed to load repository", "error");
    } finally {
      setRepoLoading(false);
    }
  };

  const closeCodeTab = (id, e) => {
    e.stopPropagation();
    setCodeTabs(prev => {
      const next = prev.filter(t => t.id !== id);
      if (activeCodeTabId === id) {
        setActiveCodeTabId(next.length ? next[next.length - 1].id : null);
      }
      return next;
    });
  };

  const closeExplanationTab = (id, e) => {
    e.stopPropagation();
    setExplanationTabs(prev => {
      const next = prev.filter(t => t.id !== id);
      if (activeExplanationTabId === id) {
        setActiveExplanationTabId(next.length ? next[next.length - 1].id : null);
      }
      return next;
    });
  };

  // ----------------------------------------
  // FILE CLICK — open code tab
  // ----------------------------------------
  const handleFileClick = async (path) => {
    setSelectedFile(path);
    setSelectedFolder(null);

    const id = `code-${path}`;
    if (!codeTabs.find(t => t.id === id)) {
      setCodeTabs(prev => [...prev, {
        id,
        title: path.split("/").pop(),
        fullPath: path,
        code: null,
        loading: true,
      }]);
    }
    setActiveCodeTabId(id);

    try {
      const raw = await fetchRawFile(data.owner, data.repo, data.commitSha, path);
      setCodeTabs(prev => prev.map(t =>
        t.id === id ? { ...t, code: raw, loading: false } : t
      ));
    } catch (err) {
      setCodeTabs(prev => prev.filter(t => t.id !== id));
      addToast(`Could not open file: ${err.message}`, "error");
    }
  };

  const handleFolderClick = (path) => {
    setSelectedFolder(path);
    setSelectedFile(null);
  };

  // ----------------------------------------
  // EXPLAIN FILE
  // ----------------------------------------
  const explainFile = async () => {
    if (!selectedFile) return;

    const id = `explain-${selectedFile}`;
    if (!explanationTabs.find(t => t.id === id)) {
      setExplanationTabs(prev => [...prev, {
        id,
        type: "file",
        title: `💡 ${selectedFile.split("/").pop()}`,
        content: "",
        cached: false,
        loading: true,
      }]);
    }
    setActiveExplanationTabId(id);

    try {
      const res = await getFile(data.owner, data.repo, selectedFile);
      setExplanationTabs(prev => prev.map(t =>
        t.id === id ? { ...t, content: res.explanation, cached: res.cached, loading: false } : t
      ));

      // Update code tab if it is the same file
      const codeId = `code-${selectedFile}`;
      setCodeTabs(prev => prev.map(t =>
        t.id === codeId && !t.code ? { ...t, code: res.content, loading: false } : t
      ));
    } catch (err) {
      setExplanationTabs(prev => prev.filter(t => t.id !== id));
      addToast(`Failed to explain file: ${err.message}`, "error");
    }
  };

  // ----------------------------------------
  // EXPLAIN FOLDER
  // ----------------------------------------
  const explainFolder = async () => {
    if (!selectedFolder) return;

    const folderName = selectedFolder.split("/").pop();
    const id = `explain-folder-${selectedFolder}`;
    
    if (!explanationTabs.find(t => t.id === id)) {
      setExplanationTabs(prev => [...prev, {
        id,
        type: "folder",
        title: `💡 ${folderName}/`,
        content: "",
        cached: false,
        loading: true,
      }]);
    }
    setActiveExplanationTabId(id);

    try {
      const res = await getFolder(data.owner, data.repo, selectedFolder);
      setExplanationTabs(prev => prev.map(t =>
        t.id === id ? { ...t, content: res.explanation, cached: res.cached, loading: false } : t
      ));
    } catch (err) {
      setExplanationTabs(prev => prev.filter(t => t.id !== id));
      addToast(`Failed to explain folder: ${err.message}`, "error");
    }
  };

  const handleCodeChange = useCallback((tabId, newValue) => {
    setCodeTabs(prev => prev.map(t => t.id === tabId ? { ...t, code: newValue } : t));
  }, []);

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const context = activeCodeTab ? activeCodeTab.fullPath : (selectedFolder || data.repo);
    const userMessage = chatInput;

    setChatInput("");

    const newHistory = [
      ...chatHistory,
      { role: "user", text: userMessage, context }
    ];
    setChatHistory(newHistory);
    
    try {
      const res = await sendChatMessage(data.owner, data.repo, context, newHistory);
      setChatHistory(prev => [
        ...prev,
        { role: "ai", text: res.response }
      ]);
    } catch (err) {
      setChatHistory(prev => [
        ...prev,
        { role: "ai", text: `Error: ${err.message}` }
      ]);
    }
  };

  const arch = data?.architecture || {};
  const activeCodeTab = codeTabs.find(t => t.id === activeCodeTabId) || null;
  const activeExplanationTab = explanationTabs.find(t => t.id === activeExplanationTabId) || null;

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
        <button className="topbar-btn" onClick={handleLoad} disabled={repoLoading || !repoUrl.trim()}>
          {repoLoading ? "Loading…" : "🚀 Analyze"}
        </button>
      </header>

      {data && (
        <div className="repo-meta-bar">
          <span className="repo-meta-name">{data.owner} / {data.repo}</span>
          <span className="dot">·</span>
          <span className="repo-meta-sha" title="Latest commit SHA">{data.commitSha?.slice(0, 7)}</span>
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
      <div className="main-layout" style={{ position: "relative" }}>

        {/* ── SIDEBAR ── */}
        {data && (
          <>
            <aside className="sidebar" style={{ width: sidebarWidth, flexShrink: 0, maxWidth: "none", minWidth: 200 }}>
              <div className="sidebar-header">
                <span>Explorer</span>
                <span style={{ fontSize: 11 }}>{data.repo}</span>
              </div>
              <div className="sidebar-tree">
                <FileTree tree={data.tree} onFileClick={handleFileClick} onFolderClick={handleFolderClick} selectedFile={selectedFile} selectedFolder={selectedFolder} />
              </div>
              <div className="sidebar-action-btns">
                <button className="action-btn primary" onClick={explainFile} disabled={!selectedFile}>💡 Explain File</button>
                <button className="action-btn" onClick={explainFolder} disabled={!selectedFolder}>💡 Explain Folder</button>
              </div>
            </aside>
            <div 
              className="split-divider" 
              onMouseDown={() => { draggingTarget.current = "sidebar"; document.body.style.cursor = "col-resize"; }}
            />
          </>
        )}

        {/* ── CONTENT AREA ── */}
        <div className="content-area split-view" style={{ flex: 1, minWidth: 300, display: "flex", flexDirection: "row" }}>
          {repoLoading ? (
            <LoadingSpinner text="Fetching and analyzing repository…" />
          ) : !data ? (
            <div className="landing">
              <div className="landing-icon">🔭</div>
              <h1 className="landing-title">Repo Explorer</h1>
              <p className="landing-sub">Paste any public GitHub repository URL above to explore its structure, get AI-powered explanations for files and folders, and understand the architecture at a glance.</p>
            </div>
          ) : (
            <>
              {/* ── CODE VIEWER + CHAT PANE ── */}
              <div className="center-pane" style={{ flex: 1, minWidth: 300, display: "flex", flexDirection: "column" }}>
                {/* Code Tabs */}
                {codeTabs.length > 0 && (
                  <div className="tab-bar">
                    {codeTabs.map(tab => (
                      <div key={tab.id} className={`tab ${activeCodeTabId === tab.id ? "tab-active" : ""}`} onClick={() => setActiveCodeTabId(tab.id)}>
                        <span className="tab-icon">{tab.loading ? "⏳" : "📄"}</span>
                        <span className="tab-title">{tab.title}</span>
                        <span className="tab-close" onClick={e => closeCodeTab(tab.id, e)}>✕</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {activeCodeTab ? (
                  <CodePanel tab={activeCodeTab} onCodeChange={handleCodeChange} />
                ) : (
                  <div className="code-panel-empty" style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: "var(--text-muted)" }}>Select a file to view its code</span>
                  </div>
                )}

                {/* ── GLOBAL CHAT ── */}
                {!isChatCollapsed && (
                  <div 
                    className="split-divider-horizontal" 
                    onMouseDown={() => { draggingTarget.current = "chat"; document.body.style.cursor = "row-resize"; }}
                    style={{ height: "4px", background: "var(--border-default)", cursor: "row-resize", flexShrink: 0, zIndex: 10 }}
                  />
                )}
                <div className="chat-container" style={{
                  height: isChatCollapsed ? "40px" : chatHeight, 
                  borderTop: "1px solid var(--border-default)", 
                  background: "var(--bg-secondary)", 
                  display: "flex", 
                  flexDirection: "column",
                  flexShrink: 0
                }}>
                  {/* Chat Header */}
                  <div 
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px", background: "var(--bg-tertiary)", borderBottom: isChatCollapsed ? "none" : "1px solid var(--border-default)", cursor: "pointer", flexShrink: 0 }} 
                    onClick={() => setIsChatCollapsed(!isChatCollapsed)}
                  >
                    <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)" }}>💬 AI Assistant</span>
                    <button style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "10px" }}>
                      {isChatCollapsed ? "▲ Expand" : "▼ Collapse"}
                    </button>
                  </div>

                  {!isChatCollapsed && (
                    <>
                      {/* Chat History */}
                      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
                        {chatHistory.length === 0 ? (
                          <div style={{ color: "var(--text-muted)", textAlign: "center", marginTop: "20px" }}>
                            Start a conversation. The AI has context of the current file/folder.
                          </div>
                        ) : (
                          chatHistory.map((msg, i) => (
                            <div key={i} style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                              <div style={{
                                background: msg.role === "user" ? "var(--accent-blue-dim)" : "var(--bg-tertiary)",
                                color: msg.role === "user" ? "var(--accent-blue)" : "var(--text-primary)",
                                padding: "8px 12px", borderRadius: "8px", maxWidth: "95%", lineHeight: 1.5,
                                border: msg.role === "user" ? "1px solid var(--border-accent)" : "1px solid var(--border-default)",
                                overflowX: "auto"
                              }}>
                                {msg.role === "user" ? (
                                  msg.text
                                ) : (
                                  <div className="markdown-chat" style={{ fontSize: "13px", background: "transparent", color: "inherit", padding: 0 }}>
                                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                                  </div>
                                )}
                              </div>
                              {msg.role === "user" && msg.context && (
                                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginRight: "4px" }}>
                                  Context: {msg.context}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Chat Input */}
                      <form onSubmit={handleChatSubmit} style={{ padding: "12px", borderTop: "1px solid var(--border-default)", display: "flex", gap: "8px", flexShrink: 0 }}>
                        <input type="text" className="topbar-input" style={{ flex: 1, padding: "10px 14px", fontSize: "13px" }}
                          placeholder={`Ask a question about ${activeCodeTab ? activeCodeTab.title : selectedFolder || "the repository"}...`}
                          value={chatInput} onChange={(e) => setChatInput(e.target.value)} />
                        <button type="submit" className="topbar-btn" disabled={!chatInput.trim()}>Ask AI</button>
                      </form>
                    </>
                  )}
                </div>
              </div>

              <div 
                className="split-divider" 
                onMouseDown={() => { draggingTarget.current = "explanation"; document.body.style.cursor = "col-resize"; }}
              />

              {/* ── EXPLANATION PANE ── */}
              <div className="right-panel" style={{ width: explanationWidth, flexShrink: 0, flex: "none" }}>
                {/* Explanation Tabs */}
                {explanationTabs.length > 0 && (
                  <div className="tab-bar">
                    {explanationTabs.map(tab => (
                      <div key={tab.id} className={`tab tab-explain ${activeExplanationTabId === tab.id ? "tab-active" : ""}`} onClick={() => setActiveExplanationTabId(tab.id)}>
                        <span className="tab-icon">{tab.loading ? "⏳" : "💡"}</span>
                        <span className="tab-title">{tab.title}</span>
                        <span className="tab-close" onClick={e => closeExplanationTab(tab.id, e)}>✕</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeExplanationTab ? (
                  <ExplanationPanel tab={activeExplanationTab} />
                ) : (
                  <div className="code-panel-empty" style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: "var(--text-muted)" }}>Select "Explain File" or "Explain Folder"</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default App;