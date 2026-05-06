import { useEffect } from "react";

export default function Toast({ toasts, onRemove }) {
  useEffect(() => {
    if (!toasts.length) return;
    const id = toasts[toasts.length - 1].id;
    const timer = setTimeout(() => onRemove(id), 4000);
    return () => clearTimeout(timer);
  }, [toasts, onRemove]);

  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`toast ${t.type === "error" ? "toast-error" : "toast-success"}`}
          onClick={() => onRemove(t.id)}
          style={{ cursor: "pointer" }}
          title="Click to dismiss"
        >
          <span className="toast-icon">
            {t.type === "error" ? "❌" : "✅"}
          </span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
