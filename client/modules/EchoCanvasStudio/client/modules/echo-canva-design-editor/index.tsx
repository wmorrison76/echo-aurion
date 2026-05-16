import React, { Suspense } from "react";
import Editor from "../../pages/Editor";

interface EchoCanvaDesignEditorProps {
  onClose?: () => void;
  isPanel?: boolean;
  panelProps?: Record<string, any>;
  initialImage?: string;
  onSave?: (imageData: any) => void;
}

/**
 * EchoCanva Design Editor Module
 * Wrapper component that adapts the full-featured design editor
 * to work as a standalone panel in Echo Recipe Pro or as a full page.
 */
export default function EchoCanvaDesignEditor({
  onClose,
  isPanel = false,
  panelProps = {},
  initialImage,
  onSave,
}: EchoCanvaDesignEditorProps) {
  const containerStyle = isPanel
    ? {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column" as const,
        overflow: "hidden",
        backgroundColor: "#0a0a0a",
      }
    : {
        width: "100%",
        height: "100%",
      };

  return (
    <div style={containerStyle}>
      <Suspense
        fallback={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "#666",
            }}
          >
            Loading Design Editor...
          </div>
        }
      >
        <Editor initialImage={initialImage} onSave={onSave} onClose={onClose} />
      </Suspense>
    </div>
  );
}

// Module metadata for Echo Recipe Pro integration
export const ECHO_CANVA_DESIGN_EDITOR_MODULE = {
  name: "echo-canva-design-editor",
  displayName: "EchoCanva Design Editor",
  description: "Professional image and design editor with AI assistance",
  icon: "🎨",
  version: "1.0.0",
  category: "Designer",
};
