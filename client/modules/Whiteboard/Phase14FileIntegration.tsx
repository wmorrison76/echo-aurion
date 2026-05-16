/** * Phase 14: File Management Integration with Phase 13 Collaboration * Real-time file sharing and synchronization */ import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import { WhiteboardFile } from "./types/FileManagementTypes";
import { realtimeCollaborationManager } from "./RealtimeCollaborationManager";
import RealtimeSyncEngine from "./RealtimeSyncEngine";
interface Phase14FileIntegrationProps {
  sessionId: string;
  userId: string;
  syncEngine: RealtimeSyncEngine | null;
  onRemoteFileAdded?: (file: WhiteboardFile) => void;
  onRemoteFileDeleted?: (fileId: string) => void;
  onRemoteFileShared?: (fileId: string, sharedWith: string[]) => void;
}
interface FileOperationMessage {
  type: "file-uploaded" | "file-deleted" | "file-shared" | "file-accessed";
  fileId: string;
  fileName: string;
  userId: string;
  timestamp: number;
  data?: any;
}
export const Phase14FileIntegration: React.FC<Phase14FileIntegrationProps> = ({
  sessionId,
  userId,
  syncEngine,
  onRemoteFileAdded,
  onRemoteFileDeleted,
  onRemoteFileShared,
}) => {
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const [fileOperationLog, setFileOperationLog] = useState<
    FileOperationMessage[]
  >([]); // Initialize file operation synchronization useEffect(() => { if (!syncEngine) return; // Subscribe to file-related messages from collaboration manager const unsubscribe = realtimeCollaborationManager.subscribe( sessionId, (msg: any) => { if (msg.userId === userId) return; // Ignore own messages if (msg.type ==="file-operation") { handleRemoteFileOperation(msg.payload); } }, ); unsubscribeRef.current = unsubscribe; return () => { unsubscribe?.(); }; }, [sessionId, userId, syncEngine]); /** * Handle remote file operations */ const handleRemoteFileOperation = (operation: FileOperationMessage): void => { // Add to log setFileOperationLog((prev) => [...prev, operation]); // Route to appropriate handler switch (operation.type) { case"file-uploaded": onRemoteFileAdded?.(operation.data); break; case"file-deleted": onRemoteFileDeleted?.(operation.fileId); break; case"file-shared": onRemoteFileShared?.( operation.fileId, operation.data?.sharedWith || [], ); break; case"file-accessed": // Just log access for analytics break; } }; /** * Broadcast file upload to other users */ const broadcastFileUpload = (file: WhiteboardFile): void => { const message: FileOperationMessage = { type:"file-uploaded", fileId: file.id, fileName: file.fileName, userId, timestamp: Date.now(), data: file, }; realtimeCollaborationManager.broadcastMessage( sessionId, { type:"file-operation", userId, sessionId, timestamp: Date.now(), payload: message, }, undefined, ); // Record in sync engine syncEngine?.addLocalChange({ type:"insert", elementId: file.id, elementType:"file", userId, timestamp: Date.now(), newValue: file, }); }; /** * Broadcast file deletion to other users */ const broadcastFileDelete = (fileId: string, fileName: string): void => { const message: FileOperationMessage = { type:"file-deleted", fileId, fileName, userId, timestamp: Date.now(), }; realtimeCollaborationManager.broadcastMessage( sessionId, { type:"file-operation", userId, sessionId, timestamp: Date.now(), payload: message, }, undefined, ); // Record in sync engine syncEngine?.addLocalChange({ type:"delete", elementId: fileId, elementType:"file", userId, timestamp: Date.now(), newValue: null, }); }; /** * Broadcast file sharing to other users */ const broadcastFileShare = ( fileId: string, fileName: string, sharedWith: string[], ): void => { const message: FileOperationMessage = { type:"file-shared", fileId, fileName, userId, timestamp: Date.now(), data: { sharedWith }, }; realtimeCollaborationManager.broadcastMessage( sessionId, { type:"file-operation", userId, sessionId, timestamp: Date.now(), payload: message, }, undefined, ); }; /** * Log file access for analytics */ const logFileAccess = (fileId: string, fileName: string): void => { const message: FileOperationMessage = { type:"file-accessed", fileId, fileName, userId, timestamp: Date.now(), }; setFileOperationLog((prev) => [...prev, message]); }; return { broadcastFileUpload, broadcastFileDelete, broadcastFileShare, logFileAccess, fileOperationLog, };
}; /** * Hook for file operation integration */
export const useFileOperationSync = (sessionId: string, userId: string) => {
  const [operations, setOperations] = useState<FileOperationMessage[]>([]);
  useEffect(() => {
    const unsubscribe = realtimeCollaborationManager.subscribe(
      sessionId,
      (msg: any) => {
        if (msg.userId === userId) return;
        if (msg.type === "file-operation") {
          setOperations((prev) => [...prev, msg.payload]);
        }
      },
    );
    return () => unsubscribe();
  }, [sessionId, userId]);
  const broadcast = (
    operationType: FileOperationMessage["type"],
    fileId: string,
    fileName: string,
    data?: any,
  ) => {
    const message: FileOperationMessage = {
      type: operationType,
      fileId,
      fileName,
      userId,
      timestamp: Date.now(),
      data,
    };
    realtimeCollaborationManager.broadcastMessage(
      sessionId,
      {
        type: "file-operation",
        userId,
        sessionId,
        timestamp: Date.now(),
        payload: message,
      },
      undefined,
    );
  };
  return { operations, broadcast };
};
export default Phase14FileIntegration;
