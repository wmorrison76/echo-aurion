import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
} from "lucide-react";
export interface LayerNode {
  id: string;
  name: string;
  type: "group" | "layer";
  visible: boolean;
  locked: boolean;
  opacity: number;
  children?: LayerNode[];
  parentId?: string;
}
interface LayerGroupPanelProps {
  layers: LayerNode[];
  selectedLayer: string | null;
  onLayerSelect: (id: string) => void;
  onLayerToggleVisibility: (id: string) => void;
  onLayerToggleLock: (id: string) => void;
  onLayerDelete: (id: string) => void;
  onGroupCreate?: (name: string) => void;
  onLayerMove?: (layerId: string, newParentId: string | null) => void;
}
export default function LayerGroupPanel({
  layers,
  selectedLayer,
  onLayerSelect,
  onLayerToggleVisibility,
  onLayerToggleLock,
  onLayerDelete,
  onGroupCreate,
  onLayerMove,
}: LayerGroupPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [newGroupName, setNewGroupName] = useState("");
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);
  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };
  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      onGroupCreate?.(newGroupName);
      setNewGroupName("");
      setShowNewGroupInput(false);
    }
  };
  const renderLayerNode = (node: LayerNode, depth: number = 0) => {
    const isExpanded = expandedGroups.has(node.id);
    const isSelected = selectedLayer === node.id;
    return (
      <div key={node.id}>
        {" "}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 12px",
            marginLeft: `${depth * 16}px`,
            backgroundColor: isSelected
              ? "rgba(0, 240, 255, 0.1)"
              : "transparent",
            borderLeft: isSelected
              ? "2px solid #c8a97e"
              : "2px solid transparent",
            cursor: "pointer",
            borderBottom: "1px solid #222",
            transition: "all 0.2s",
          }}
          onClick={() => onLayerSelect(node.id)}
        >
          {" "}
          {/* Expand/Collapse */}{" "}
          {node.type === "group" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleGroup(node.id);
              }}
              style={{
                background: "none",
                border: "none",
                padding: "0",
                cursor: "pointer",
                color: "#666",
                display: "flex",
                alignItems: "center",
              }}
            >
              {" "}
              {isExpanded ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronRight size={12} />
              )}{" "}
            </button>
          )}{" "}
          {node.type === "layer" && <div style={{ width: "12px" }} />}{" "}
          {/* Icon */}{" "}
          {node.type === "group" ? (
            isExpanded ? (
              <FolderOpen size={12} color="#c8a97e" />
            ) : (
              <Folder size={12} color="#c8a97e" />
            )
          ) : (
            <div
              style={{
                width: "12px",
                height: "12px",
                backgroundColor: "#666",
                borderRadius: "2px",
              }}
            />
          )}{" "}
          {/* Name */}{" "}
          <span
            style={{
              flex: 1,
              fontSize: "11px",
              color: "#c8a97e",
              fontWeight: "bold",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {" "}
            {node.name}{" "}
          </span>{" "}
          {/* Visibility Toggle */}{" "}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLayerToggleVisibility(node.id);
            }}
            style={{
              background: "none",
              border: "none",
              padding: "2px 4px",
              cursor: "pointer",
              color: node.visible ? "#c8a97e" : "#555",
              fontSize: "11px",
            }}
          >
            {" "}
            {node.visible ? "👁" : "👁‍🗨"}{" "}
          </button>{" "}
          {/* Lock Toggle */}{" "}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLayerToggleLock(node.id);
            }}
            style={{
              background: "none",
              border: "none",
              padding: "2px 4px",
              cursor: "pointer",
              color: node.locked ? "#c8a97e" : "#555",
              fontSize: "11px",
            }}
          >
            {" "}
            {node.locked ? "🔒" : "🔓"}{" "}
          </button>{" "}
          {/* Delete */}{" "}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLayerDelete(node.id);
            }}
            style={{
              background: "none",
              border: "none",
              padding: "2px 4px",
              cursor: "pointer",
              color: "#ff6666",
              fontSize: "11px",
            }}
          >
            {" "}
            ×{" "}
          </button>{" "}
        </div>{" "}
        {/* Children */}{" "}
        {node.type === "group" && isExpanded && node.children && (
          <>{node.children.map((child) => renderLayerNode(child, depth + 1))}</>
        )}{" "}
      </div>
    );
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "#0a0a0a",
        borderRadius: "8px",
        border: "1px solid #333",
        overflow: "hidden",
      }}
    >
      {" "}
      {/* Header */}{" "}
      <div
        style={{
          padding: "12px",
          borderBottom: "1px solid #333",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {" "}
        <h3
          style={{
            color: "#c8a97e",
            fontSize: "12px",
            fontWeight: "bold",
            margin: 0,
          }}
        >
          {" "}
          Layer Groups{" "}
        </h3>{" "}
        <button
          onClick={() => setShowNewGroupInput(true)}
          title="New group"
          style={{
            background: "none",
            border: "none",
            color: "#c8a97e",
            cursor: "pointer",
            padding: "0 4px",
          }}
        >
          {" "}
          <Plus size={14} />{" "}
        </button>{" "}
      </div>{" "}
      {/* New Group Input */}{" "}
      {showNewGroupInput && (
        <div
          style={{
            padding: "8px 12px",
            borderBottom: "1px solid #333",
            display: "flex",
            gap: "4px",
          }}
        >
          {" "}
          <input
            autoFocus
            type="text"
            placeholder="Group name..."
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") handleCreateGroup();
            }}
            style={{
              flex: 1,
              padding: "4px 6px",
              backgroundColor: "#0b0f1a",
              color: "#c8a97e",
              border: "1px solid #333",
              borderRadius: "2px",
              fontSize: "10px",
            }}
          />{" "}
          <button
            onClick={handleCreateGroup}
            style={{
              padding: "4px 8px",
              backgroundColor: "#c8a97e",
              color: "#000",
              border: "none",
              borderRadius: "2px",
              cursor: "pointer",
              fontSize: "10px",
              fontWeight: "bold",
            }}
          >
            {" "}
            Create{" "}
          </button>{" "}
          <button
            onClick={() => setShowNewGroupInput(false)}
            style={{
              padding: "4px 8px",
              backgroundColor: "#0b0f1a",
              color: "#666",
              border: "1px solid #333",
              borderRadius: "2px",
              cursor: "pointer",
              fontSize: "10px",
            }}
          >
            {" "}
            Cancel{" "}
          </button>{" "}
        </div>
      )}{" "}
      {/* Layers Tree */}{" "}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {" "}
        {layers.length === 0 ? (
          <div
            style={{
              padding: "24px 12px",
              color: "#666",
              fontSize: "11px",
              textAlign: "center",
            }}
          >
            {" "}
            No layers{" "}
          </div>
        ) : (
          <div>{layers.map((node) => renderLayerNode(node))}</div>
        )}{" "}
      </div>{" "}
    </div>
  );
}
