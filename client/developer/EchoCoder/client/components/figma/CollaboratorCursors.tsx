import { useEffect, useState } from "react";
import {
  collaborationService,
  type Collaborator,
} from "@/services/CollaborationService";

interface CollaboratorCursorsProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  zoom: number;
  pan: { x: number; y: number };
}

export default function CollaboratorCursors({
  canvasRef,
  zoom,
  pan,
}: CollaboratorCursorsProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [cursorPositions, setCursorPositions] = useState<
    Map<string, { x: number; y: number }>
  >(new Map());

  useEffect(() => {
    const handleCollaboratorsUpdated = (collaborators: Collaborator[]) => {
      setCollaborators(collaborators);
    };

    const handleCursorUpdate = (data: any) => {
      setCursorPositions((prev) =>
        new Map(prev).set(data.userId, { x: data.x, y: data.y }),
      );
    };

    collaborationService.on(
      "collaborators-updated",
      handleCollaboratorsUpdated,
    );
    collaborationService.on("cursor-update", handleCursorUpdate);

    // Get initial collaborators
    const initial = collaborationService.getCollaborators();
    setCollaborators(initial);

    return () => {
      collaborationService.off(
        "collaborators-updated",
        handleCollaboratorsUpdated,
      );
      collaborationService.off("cursor-update", handleCursorUpdate);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {collaborators.map((collaborator) => {
        const position = cursorPositions.get(collaborator.userId);
        if (!position || !collaborator.isOnline) return null;

        const x = (position.x + pan.x) * zoom;
        const y = (position.y + pan.y) * zoom;

        return (
          <div
            key={collaborator.userId}
            className="absolute flex flex-col items-start pointer-events-none"
            style={{
              left: `${x}px`,
              top: `${y}px`,
              transform: "translate(-4px, -4px)",
            }}
          >
            {/* Cursor */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              className="drop-shadow-md"
              style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
            >
              <path d="M0 0L4 10L6 4L10 6L0 0Z" fill={collaborator.color} />
              <path d="M0 0L4 10L6 4L10 6L0 0Z" fill="white" opacity="0.3" />
            </svg>

            {/* Label */}
            <div
              className="mt-1 px-2 py-0.5 rounded text-xs font-semibold text-white whitespace-nowrap"
              style={{ backgroundColor: collaborator.color }}
            >
              {collaborator.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}
