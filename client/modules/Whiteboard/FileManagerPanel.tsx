/** * Phase 14: File Manager Panel * UI for managing files in whiteboard */ import React, {
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  File,
  Trash2,
  Download,
  Share2,
  Lock,
  Globe,
  Upload,
  Search,
  Grid,
  List as ListIcon,
  MoreVertical,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
import {
  WhiteboardFile,
  FileManagerState,
  FileSearchOptions,
} from "./types/FileManagementTypes";
import { cn } from "@/lib/glass";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
interface FileManagerPanelProps {
  boardId: string;
  sessionId: string;
  onFileSelected?: (file: WhiteboardFile) => void;
  onFileDeleted?: (fileId: string) => void;
  onFileShared?: (fileId: string) => void;
  className?: string;
}
interface FileWithPreview extends WhiteboardFile {
  preview?: string;
}
export const FileManagerPanel: React.FC<FileManagerPanelProps> = ({
  boardId,
  sessionId,
  onFileSelected,
  onFileDeleted,
  onFileShared,
  className,
}) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedFile, setSelectedFile] = useState<WhiteboardFile | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string>("");
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    averageFileSize: 0,
  }); // Load files on mount useEffect(() => { loadFiles(); }, [boardId]); const loadFiles = useCallback(async () => { setIsLoading(true); try { const response = await fetch( `/api/whiteboard-files?boardId=${boardId}&limit=100`, ); const data = await response.json(); if (data.success) { setFiles(data.files || []); // Calculate stats const totalSize = (data.files || []).reduce( (sum: number, f: WhiteboardFile) => sum + f.fileSize, 0, ); setStats({ totalFiles: data.total || 0, totalSize, averageFileSize: totalSize / Math.max(data.total || 1, 1), }); } } catch (error) { console.error("Load files error:", error); } finally { setIsLoading(false); } }, [boardId]); const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { setUploadError(""); const file = e.target.files?.[0]; if (!file) return; const formData = new FormData(); formData.append("file", file); formData.append("boardId", boardId); formData.append("sessionId", sessionId); formData.append("accessLevel","private"); try { setUploadProgress(0); const xhr = new XMLHttpRequest(); xhr.upload.addEventListener("progress", (event) => { if (event.lengthComputable) { const percentComplete = (event.loaded / event.total) * 100; setUploadProgress(Math.round(percentComplete)); } }); xhr.addEventListener("load", () => { if (xhr.status === 200) { const response = JSON.parse(xhr.responseText); if (response.success) { setFiles((prev) => [response.file, ...prev]); setUploadProgress(0); setShowUploadDialog(false); } } else { setUploadError("Upload failed"); } }); xhr.addEventListener("error", () => { setUploadError("Upload error"); }); xhr.open("POST","/api/whiteboard-files/upload"); xhr.send(formData); } catch (error) { setUploadError(error instanceof Error ? error.message :"Upload failed"); } }; const handleDeleteFile = async (fileId: string) => { if (!window.confirm("Delete this file permanently?")) return; try { const response = await fetch(`/api/whiteboard-files/${fileId}`, { method:"DELETE", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ soft: true }), }); if (response.ok) { setFiles((prev) => prev.filter((f) => f.id !== fileId)); onFileDeleted?.(fileId); } } catch (error) { console.error("Delete error:", error); } }; const handleChangeAccess = async (fileId: string, accessLevel: string) => { try { const response = await fetch(`/api/whiteboard-files/${fileId}/access`, { method:"PATCH", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ accessLevel }), }); if (response.ok) { setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, accessLevel } : f)), ); } } catch (error) { console.error("Change access error:", error); } }; const handleShareFile = async (fileId: string) => { try { const response = await fetch(`/api/whiteboard-files/${fileId}/share`, { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ userIds: [], accessType:"view" }), }); if (response.ok) { onFileShared?.(fileId); } } catch (error) { console.error("Share error:", error); } }; const filteredFiles = files.filter((f) => f.fileName.toLowerCase().includes(searchTerm.toLowerCase()), ); const formatFileSize = (bytes: number): string => { if (bytes === 0) return"0 B"; const k = 1024; const sizes = ["B","KB","MB","GB"]; const i = Math.floor(Math.log(bytes) / Math.log(k)); return Math.round((bytes / Math.pow(k, i)) * 100) / 100 +"" + sizes[i]; }; const formatDate = (timestamp: number): string => { return new Date(timestamp).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric", }); }; return ( <div className={cn("flex flex-col gap-4 rounded-lg bg-slate-50 p-4 dark:bg-surface", className, )} > {/* Header */} <div className="flex items-center justify-between"> <h3 className="text-lg font-semibold">Files</h3> <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}> <DialogTrigger asChild> <Button size="sm" className="gap-2"> <Upload className="h-4 w-4" /> Upload </Button> </DialogTrigger> <DialogContent> <DialogHeader> <DialogTitle>Upload File</DialogTitle> <DialogDescription> Drag and drop or click to select a file </DialogDescription> </DialogHeader> <div className="flex flex-col gap-4"> <div className="rounded-lg border-2 border-dashed border-slate-300 p-8 text-center dark:border-slate-600"> <input type="file" onChange={handleFileUpload} className="hidden" id="file-upload" /> <label htmlFor="file-upload" className="cursor-pointer text-sm font-medium text-muted-foreground" > Click to upload or drag and drop </label> </div> {uploadProgress > 0 && uploadProgress < 100 && ( <div className="w-full"> <div className="mb-2 flex justify-between text-xs"> <span>Uploading...</span> <span>{uploadProgress}%</span> </div> <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"> <div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} /> </div> </div> )} {uploadError && ( <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"> <AlertCircle className="h-4 w-4" /> {uploadError} </div> )} </div> </DialogContent> </Dialog> </div> {/* Statistics */} <div className="grid grid-cols-3 gap-2 text-xs"> <div className="rounded bg-background p-2 dark:bg-slate-800"> <div className="font-medium text-muted-foreground"> Files </div> <div className="text-lg font-bold">{stats.totalFiles}</div> </div> <div className="rounded bg-background p-2 dark:bg-slate-800"> <div className="font-medium text-muted-foreground"> Total </div> <div className="text-lg font-bold"> {formatFileSize(stats.totalSize)} </div> </div> <div className="rounded bg-background p-2 dark:bg-slate-800"> <div className="font-medium text-muted-foreground"> Avg </div> <div className="text-lg font-bold"> {formatFileSize(stats.averageFileSize)} </div> </div> </div> {/* Search and Controls */} <div className="flex gap-2"> <div className="relative flex-1"> <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /> <Input placeholder="Search files..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" /> </div> <Button variant="ghost" size="sm" onClick={() => setViewMode(viewMode ==="grid" ?"list" :"grid")} > {viewMode ==="grid" ? ( <ListIcon className="h-4 w-4" /> ) : ( <Grid className="h-4 w-4" /> )} </Button> </div> {/* Files List/Grid */} <div className="flex-1 overflow-y-auto"> {isLoading ? ( <div className="flex items-center justify-center py-8"> <div className="text-sm text-muted-foreground">Loading files...</div> </div> ) : filteredFiles.length === 0 ? ( <div className="flex items-center justify-center py-8"> <div className="text-center"> <File className="mx-auto mb-2 h-8 w-8 text-slate-300" /> <div className="text-sm text-muted-foreground">No files yet</div> </div> </div> ) : viewMode ==="grid" ? ( <div className="grid grid-cols-2 gap-2"> {filteredFiles.map((file) => ( <FileCard key={file.id} file={file} onSelect={() => { setSelectedFile(file); onFileSelected?.(file); }} onDelete={() => handleDeleteFile(file.id)} onShare={() => handleShareFile(file.id)} onChangeAccess={(level) => handleChangeAccess(file.id, level)} /> ))} </div> ) : ( <div className="space-y-2"> {filteredFiles.map((file) => ( <FileListItem key={file.id} file={file} onSelect={() => { setSelectedFile(file); onFileSelected?.(file); }} onDelete={() => handleDeleteFile(file.id)} onShare={() => handleShareFile(file.id)} onChangeAccess={(level) => handleChangeAccess(file.id, level)} /> ))} </div> )} </div> </div> );
}; /** * File Card Component (Grid View) */
interface FileCardProps {
  file: WhiteboardFile;
  onSelect: () => void;
  onDelete: () => void;
  onShare: () => void;
  onChangeAccess: (level: string) => void;
}
const FileCard: React.FC<FileCardProps> = ({
  file,
  onSelect,
  onDelete,
  onShare,
  onChangeAccess,
}) => {
  const formatSize = (bytes: number) => {
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + "" + sizes[i];
  };
  return (
    <div
      onClick={onSelect}
      className="group cursor-pointer rounded-lg border border-slate-200 bg-background p-3 transition-all hover:border-primary hover:shadow-md dark:border-border dark:bg-slate-800"
    >
      {" "}
      <div className="mb-2 flex items-start justify-between">
        {" "}
        <File className="h-6 w-6 text-slate-400" />{" "}
        <DropdownMenu>
          {" "}
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            {" "}
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              {" "}
              <MoreVertical className="h-4 w-4" />{" "}
            </Button>{" "}
          </DropdownMenuTrigger>{" "}
          <DropdownMenuContent align="end">
            {" "}
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
            >
              {" "}
              <Share2 className="mr-2 h-4 w-4" /> Share{" "}
            </DropdownMenuItem>{" "}
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onChangeAccess(
                  file.accessLevel === "private" ? "public" : "private",
                );
              }}
            >
              {" "}
              {file.accessLevel === "private" ? (
                <>
                  {" "}
                  <Globe className="mr-2 h-4 w-4" /> Make Public{" "}
                </>
              ) : (
                <>
                  {" "}
                  <Lock className="mr-2 h-4 w-4" /> Make Private{" "}
                </>
              )}{" "}
            </DropdownMenuItem>{" "}
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-red-600"
            >
              {" "}
              <Trash2 className="mr-2 h-4 w-4" /> Delete{" "}
            </DropdownMenuItem>{" "}
          </DropdownMenuContent>{" "}
        </DropdownMenu>{" "}
      </div>{" "}
      <div className="mb-2 truncate text-sm font-medium text-foreground">
        {" "}
        {file.fileName}{" "}
      </div>{" "}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {" "}
        <span>{formatSize(file.fileSize)}</span>{" "}
        {file.accessLevel === "public" ? (
          <Globe className="h-3 w-3" />
        ) : (
          <Lock className="h-3 w-3" />
        )}{" "}
      </div>{" "}
    </div>
  );
}; /** * File List Item Component (List View) */
const FileListItem: React.FC<FileCardProps> = ({
  file,
  onSelect,
  onDelete,
  onShare,
  onChangeAccess,
}) => {
  const formatSize = (bytes: number) => {
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + "" + sizes[i];
  };
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };
  return (
    <div
      onClick={onSelect}
      className="group flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-background p-3 transition-all hover:border-primary hover:shadow-md dark:border-border dark:bg-slate-800"
    >
      {" "}
      <File className="h-5 w-5 text-slate-400" />{" "}
      <div className="flex-1 min-w-0">
        {" "}
        <div className="truncate text-sm font-medium text-foreground">
          {" "}
          {file.fileName}{" "}
        </div>{" "}
        <div className="text-xs text-muted-foreground">
          {" "}
          {formatSize(file.fileSize)} • {formatDate(file.uploadedAt)}{" "}
        </div>{" "}
      </div>{" "}
      {file.accessLevel === "public" ? (
        <Globe className="h-4 w-4 text-muted-foreground" />
      ) : (
        <Lock className="h-4 w-4 text-muted-foreground" />
      )}{" "}
      <DropdownMenu>
        {" "}
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          {" "}
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            {" "}
            <MoreVertical className="h-4 w-4" />{" "}
          </Button>{" "}
        </DropdownMenuTrigger>{" "}
        <DropdownMenuContent align="end">
          {" "}
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
          >
            {" "}
            <Share2 className="mr-2 h-4 w-4" /> Share{" "}
          </DropdownMenuItem>{" "}
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onChangeAccess(
                file.accessLevel === "private" ? "public" : "private",
              );
            }}
          >
            {" "}
            {file.accessLevel === "private" ? (
              <>
                {" "}
                <Globe className="mr-2 h-4 w-4" /> Make Public{" "}
              </>
            ) : (
              <>
                {" "}
                <Lock className="mr-2 h-4 w-4" /> Make Private{" "}
              </>
            )}{" "}
          </DropdownMenuItem>{" "}
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-red-600"
          >
            {" "}
            <Trash2 className="mr-2 h-4 w-4" /> Delete{" "}
          </DropdownMenuItem>{" "}
        </DropdownMenuContent>{" "}
      </DropdownMenu>{" "}
    </div>
  );
};
export default FileManagerPanel;
