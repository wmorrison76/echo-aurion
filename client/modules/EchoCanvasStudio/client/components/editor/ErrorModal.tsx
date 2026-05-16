import { AlertCircle, X } from "lucide-react";
interface ErrorModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onClose: () => void;
  onRetry?: () => void;
}
export default function ErrorModal({
  isOpen,
  title = "Error",
  message,
  onClose,
  onRetry,
}: ErrorModalProps) {
  if (!isOpen) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      {" "}
      <div
        style={{
          backgroundColor: "#0b0f1a",
          borderRadius: "12px",
          padding: "32px",
          maxWidth: "480px",
          width: "90%",
          boxShadow:
            "0 20px 60px rgba(0, 0, 0, 0.8), 0 0 1px rgba(200, 169, 126, 0.2)",
          border: "1px solid rgba(200, 169, 126, 0.15)",
          animation: "slideIn 0.3s cubic-bezier(0.32, 0, 0.67, 0)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {" "}
        {/* Header */}{" "}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          {" "}
          <div
            style={{
              flexShrink: 0,
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "rgba(255, 100, 100, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(255, 100, 100, 0.2)",
            }}
          >
            {" "}
            <AlertCircle size={24} style={{ color: "#ff6464" }} />{" "}
          </div>{" "}
          <div style={{ flex: 1, minWidth: 0 }}>
            {" "}
            <h2
              style={{
                color: "#c8a97e",
                fontSize: "18px",
                fontWeight: "600",
                margin: "0 0 8px 0",
              }}
            >
              {" "}
              {title}{" "}
            </h2>{" "}
            <button
              onClick={onClose}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "none",
                border: "none",
                color: "#666",
                cursor: "pointer",
                padding: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#c8a97e")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#666")}
            >
              {" "}
              <X size={20} />{" "}
            </button>{" "}
          </div>{" "}
        </div>{" "}
        {/* Message */}{" "}
        <p
          style={{
            color: "#aaa",
            fontSize: "14px",
            lineHeight: "1.6",
            margin: "0 0 24px 0",
            wordBreak: "break-word",
            fontFamily: "monospace",
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid rgba(255, 100, 100, 0.1)",
            maxHeight: "200px",
            overflowY: "auto",
          }}
        >
          {" "}
          {message}{" "}
        </p>{" "}
        {/* Actions */}{" "}
        <div
          style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}
        >
          {" "}
          {onRetry && (
            <button
              onClick={onRetry}
              style={{
                padding: "10px 20px",
                borderRadius: "6px",
                backgroundColor: "rgba(200, 169, 126, 0.1)",
                border: "1px solid rgba(200, 169, 126, 0.3)",
                color: "#c8a97e",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(200, 169, 126, 0.2)";
                e.currentTarget.style.borderColor = "rgba(200, 169, 126, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(200, 169, 126, 0.1)";
                e.currentTarget.style.borderColor = "rgba(200, 169, 126, 0.3)";
              }}
            >
              {" "}
              Retry{" "}
            </button>
          )}{" "}
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              borderRadius: "6px",
              backgroundColor: "rgba(200, 169, 126, 0.2)",
              border: "1px solid rgba(200, 169, 126, 0.5)",
              color: "#c8a97e",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(200, 169, 126, 0.3)";
              e.currentTarget.style.borderColor = "rgba(200, 169, 126, 0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(200, 169, 126, 0.2)";
              e.currentTarget.style.borderColor = "rgba(200, 169, 126, 0.5)";
            }}
          >
            {" "}
            OK{" "}
          </button>{" "}
        </div>{" "}
      </div>{" "}
      <style>{` @keyframes slideIn { from { opacity: 0; transform: scale(0.95) translateY(-20px); } to { opacity: 1; transform: scale(1) translateY(0); } } `}</style>{" "}
    </div>
  );
}
