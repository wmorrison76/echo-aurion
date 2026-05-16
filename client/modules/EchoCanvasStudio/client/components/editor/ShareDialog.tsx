import React, { useState } from "react";
import { Copy, Link2, Trash2, Plus } from "lucide-react";
interface ShareLink {
  linkId: string;
  permission: "view" | "comment" | "edit";
  token: string;
  expiresAt: number | null;
  createdAt: number;
}
interface ShareDialogProps {
  designId: string;
  onClose: () => void;
  onCreateLink: (
    permission: "view" | "comment" | "edit",
    expiresAt: number | null,
  ) => Promise<ShareLink>;
  onRevokeLink: (token: string) => Promise<void>;
  existingLinks: ShareLink[];
}
const PERMISSION_LABELS = {
  view: "👁️ View only",
  comment: "💬 Can comment",
  edit: "✏️ Can edit",
};
const EXPIRATION_OPTIONS = [
  { label: "No expiration", value: null },
  { label: "24 hours", value: 24 * 60 * 60 * 1000 },
  { label: "7 days", value: 7 * 24 * 60 * 60 * 1000 },
  { label: "30 days", value: 30 * 24 * 60 * 60 * 1000 },
];
export default function ShareDialog({
  designId,
  onClose,
  onCreateLink,
  onRevokeLink,
  existingLinks,
}: ShareDialogProps) {
  const [selectedPermission, setSelectedPermission] = useState<
    "view" | "comment" | "edit"
  >("view");
  const [selectedExpiration, setSelectedExpiration] = useState<number | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const handleCreateLink = async () => {
    setIsCreating(true);
    try {
      const expiresAt = selectedExpiration
        ? Date.now() + selectedExpiration
        : null;
      await onCreateLink(selectedPermission, expiresAt);
    } catch (error) {
      console.error("Failed to create link:", error);
    } finally {
      setIsCreating(false);
    }
  };
  const handleCopyLink = (token: string) => {
    const link = `${window.location.origin}/designs/${designId}?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };
  const formatExpiration = (expiresAt: number | null): string => {
    if (!expiresAt) return "Never";
    const now = Date.now();
    const diff = expiresAt - now;
    if (diff < 0) return "Expired";
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m`;
    if (diff < 24 * 60 * 60 * 1000)
      return `${Math.floor(diff / (60 * 60 * 1000))}h`;
    return `${Math.floor(diff / (24 * 60 * 60 * 1000))}d`;
  };
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      {" "}
      <div
        style={{
          background: "#0a0a0a",
          border: "1px solid #333",
          borderRadius: "12px",
          padding: "32px",
          maxWidth: "500px",
          width: "90%",
          color: "#ccc",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {" "}
        <h3
          style={{
            color: "#c8a97e",
            marginBottom: "24px",
            fontSize: "16px",
            fontWeight: "bold",
          }}
        >
          {" "}
          Share Design{" "}
        </h3>{" "}
        <div style={{ marginBottom: "24px" }}>
          {" "}
          <label
            style={{
              color: "#c8a97e",
              fontSize: "12px",
              fontWeight: "bold",
              display: "block",
              marginBottom: "8px",
            }}
          >
            {" "}
            Permission Level{" "}
          </label>{" "}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "8px",
            }}
          >
            {" "}
            {(["view", "comment", "edit"] as const).map((perm) => (
              <button
                key={perm}
                onClick={() => setSelectedPermission(perm)}
                style={{
                  padding: "8px",
                  background:
                    selectedPermission === perm
                      ? "rgba(200, 169, 126, 0.1)"
                      : "transparent",
                  border: `1px solid ${selectedPermission === perm ? "#c8a97e" : "#444"}`,
                  borderRadius: "6px",
                  color: selectedPermission === perm ? "#c8a97e" : "#999",
                  fontSize: "11px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {" "}
                {PERMISSION_LABELS[perm]}{" "}
              </button>
            ))}{" "}
          </div>{" "}
        </div>{" "}
        <div style={{ marginBottom: "24px" }}>
          {" "}
          <label
            style={{
              color: "#c8a97e",
              fontSize: "12px",
              fontWeight: "bold",
              display: "block",
              marginBottom: "8px",
            }}
          >
            {" "}
            Expiration{" "}
          </label>{" "}
          <select
            value={selectedExpiration || "null"}
            onChange={(e) =>
              setSelectedExpiration(
                e.target.value === "null" ? null : parseInt(e.target.value),
              )
            }
            style={{
              width: "100%",
              padding: "8px",
              background: "#0b0f1a",
              border: "1px solid #444",
              borderRadius: "6px",
              color: "#c8a97e",
              fontSize: "12px",
            }}
          >
            {" "}
            {EXPIRATION_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.value || "null"}>
                {" "}
                {opt.label}{" "}
              </option>
            ))}{" "}
          </select>{" "}
        </div>{" "}
        <button
          onClick={handleCreateLink}
          disabled={isCreating}
          style={{
            width: "100%",
            padding: "10px",
            background: "#c8a97e",
            color: "#000",
            border: "none",
            borderRadius: "6px",
            fontWeight: "bold",
            cursor: isCreating ? "not-allowed" : "pointer",
            opacity: isCreating ? 0.6 : 1,
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          {" "}
          <Plus size={14} /> Create Link{" "}
        </button>{" "}
        <div style={{ marginBottom: "24px" }}>
          {" "}
          <h4
            style={{
              color: "#c8a97e",
              fontSize: "12px",
              fontWeight: "bold",
              marginBottom: "12px",
            }}
          >
            {" "}
            Active Links ({existingLinks.length}){" "}
          </h4>{" "}
          {existingLinks.length > 0 ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {" "}
              {existingLinks.map((link) => (
                <div
                  key={link.token}
                  style={{
                    background: "#0b0f1a",
                    border: "1px solid #333",
                    borderRadius: "6px",
                    padding: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}
                >
                  {" "}
                  <div style={{ flex: 1 }}>
                    {" "}
                    <div style={{ fontSize: "11px", color: "#999" }}>
                      {" "}
                      {PERMISSION_LABELS[link.permission]}{" "}
                    </div>{" "}
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#666",
                        marginTop: "4px",
                      }}
                    >
                      {" "}
                      Expires: {formatExpiration(link.expiresAt)}{" "}
                    </div>{" "}
                  </div>{" "}
                  <button
                    onClick={() => handleCopyLink(link.token)}
                    style={{
                      padding: "6px 8px",
                      background:
                        copiedToken === link.token ? "#c8a97e" : "transparent",
                      border: `1px solid ${copiedToken === link.token ? "#c8a97e" : "#444"}`,
                      borderRadius: "4px",
                      color: copiedToken === link.token ? "#000" : "#999",
                      fontSize: "10px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {" "}
                    <Copy size={12} />{" "}
                    {copiedToken === link.token ? "Copied" : "Copy"}{" "}
                  </button>{" "}
                  <button
                    onClick={() => onRevokeLink(link.token)}
                    style={{
                      padding: "6px 8px",
                      background: "transparent",
                      border: "1px solid #ff6b6b",
                      borderRadius: "4px",
                      color: "#ff6b6b",
                      fontSize: "10px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {" "}
                    <Trash2 size={12} /> Revoke{" "}
                  </button>{" "}
                </div>
              ))}{" "}
            </div>
          ) : (
            <div
              style={{
                fontSize: "11px",
                color: "#666",
                textAlign: "center",
                padding: "12px",
              }}
            >
              {" "}
              No active links{" "}
            </div>
          )}{" "}
        </div>{" "}
        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "10px",
            background: "transparent",
            border: "1px solid #444",
            borderRadius: "6px",
            color: "#999",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {" "}
          Close{" "}
        </button>{" "}
      </div>{" "}
    </div>
  );
}
