/**
 * File Share Panel Component
 *
 * Native file sharing with version control and collaboration
 * All text is i18n-ready with translation keys
 */

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  Download,
  FileText,
  Image as ImageIcon,
  File,
  MoreVertical,
  Share2,
  Trash2,
  History,
  Eye,
  Edit,
  Lock,
  Unlock,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/glass";

interface SharedFile {
  id: string;
  name: string;
  nameKey?: string; // i18n key
  type: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  sharedWith: string[];
  permissions: "read" | "write" | "admin";
  version: number;
  versions?: number;
}

export default function FileSharePanel() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<SharedFile | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const response = await fetch("/api/collaboration/files");
      const data = await response.json();

      if (data.success) {
        setFiles(data.data || []);
      }
    } catch (error: any) {
      toast({
        title: t("common.error") || "Error",
        description: error.message || "Failed to load files",
        variant: "destructive",
      });
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/collaboration/files/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setFiles((prev) => [data.data, ...prev]);
        toast({
          title: t("file.share.upload.success") || "File Uploaded",
          description:
            t("file.share.upload.success.description") ||
            "File has been uploaded successfully",
        });
      }
    } catch (error: any) {
      toast({
        title: t("common.error") || "Error",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileId: string) => {
    try {
      const file = files.find((f) => f.id === fileId);
      if (!file) return;

      const response = await fetch(
        `/api/collaboration/files/${fileId}/download`,
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: t("common.error") || "Error",
        description: error.message || "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (fileId: string) => {
    if (
      !confirm(
        t("file.share.delete.confirm") ||
          "Are you sure you want to delete this file?",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/collaboration/files/${fileId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.success) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        toast({
          title: t("file.share.delete.success") || "File Deleted",
          description:
            t("file.share.delete.success.description") ||
            "File has been deleted",
        });
      }
    } catch (error: any) {
      toast({
        title: t("common.error") || "Error",
        description: error.message || "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="w-5 h-5" />;
    if (type.includes("pdf")) return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Share2 className="w-8 h-8 text-primary" />
              {t("file.share.title") || "File Sharing"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("file.share.description") || "Share and collaborate on files"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />
            <Button
              onClick={() => document.getElementById("file-upload")?.click()}
              disabled={uploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {t("file.share.upload") || "Upload File"}
            </Button>
          </div>
        </div>

        {/* Files Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t("file.share.recent") || "Recent Files"}</CardTitle>
            <CardDescription>
              {files.length} {t("file.share.file.count") || "file(s)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("file.share.name") || "Name"}</TableHead>
                  <TableHead>{t("file.share.type") || "Type"}</TableHead>
                  <TableHead>{t("file.share.size") || "Size"}</TableHead>
                  <TableHead>
                    {t("file.share.uploaded.by") || "Uploaded By"}
                  </TableHead>
                  <TableHead>
                    {t("file.share.uploaded.at") || "Uploaded At"}
                  </TableHead>
                  <TableHead>{t("file.share.version") || "Version"}</TableHead>
                  <TableHead>
                    {t("file.share.permissions") || "Permissions"}
                  </TableHead>
                  <TableHead>{t("common.actions") || "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="flex items-center gap-2">
                      {getFileIcon(file.type)}
                      <span className="font-medium">{file.name}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {file.type.split("/")[1] || file.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatFileSize(file.size)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {file.uploadedBy}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(file.uploadedAt), "PPp")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">v{file.version}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          file.permissions === "admin" ? "default" : "secondary"
                        }
                      >
                        {t(`file.share.permission.${file.permissions}`) ||
                          file.permissions}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownload(file.id)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedFile(file)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {file.permissions === "admin" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(file.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
