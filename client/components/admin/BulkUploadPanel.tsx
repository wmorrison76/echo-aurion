/**
 * Bulk Upload Panel
 * Handles file upload (CSV/Excel), validation, progress tracking, and results display
 * Supports 5,000 employee batches with real-time feedback
 */

import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileUp, CheckCircle, AlertCircle, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface UploadResult {
  id: string;
  status: 'success' | 'error' | 'warning';
  row_number: number;
  employee_number?: string;
  first_name?: string;
  last_name?: string;
  message: string;
}

interface BulkUploadPanelProps {
  onUpload?: (file: File) => Promise<{
    success: boolean;
    job_id: string;
    total_records: number;
    results: UploadResult[];
  }>;
  onDownloadTemplate?: () => void;
  isLoading?: boolean;
}

const BulkUploadPanel: React.FC<BulkUploadPanelProps> = ({
  onUpload,
  onDownloadTemplate,
  isLoading = false,
}) => {
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [jobStatus, setJobStatus] = useState<'idle' | 'processing' | 'complete' | 'error'>(
    'idle'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // Drop handler
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, []);

  // File select handler
  const handleFileSelect = useCallback((selectedFile: File) => {
    const validTypes = ['text/csv', 'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(csv|xlsx|xls)$/i)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a CSV or Excel file',
        variant: 'destructive',
      });
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'File must be less than 50MB',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);
    setJobStatus('idle');
    setResults([]);
  }, [toast]);

  // Handle file input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFileSelect(e.target.files[0]);
    }
  }, [handleFileSelect]);

  // Upload file
  const handleUpload = useCallback(async () => {
    if (!file || !onUpload) return;

    setIsUploading(true);
    setJobStatus('processing');
    setUploadProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const next = prev + Math.random() * 30;
          return next > 90 ? 90 : next;
        });
      }, 500);

      const response = await onUpload(file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.success) {
        setResults(response.results || []);
        setShowResults(true);
        setJobStatus('complete');

        const successCount = (response.results || []).filter(
          (r) => r.status === 'success'
        ).length;
        const errorCount = (response.results || []).filter(
          (r) => r.status === 'error'
        ).length;

        toast({
          title: 'Upload complete',
          description: `Successfully imported ${successCount} employees${
            errorCount > 0 ? `, ${errorCount} errors` : ''
          }`,
          variant: errorCount > 0 ? 'default' : 'default',
        });
      } else {
        setJobStatus('error');
        toast({
          title: 'Upload failed',
          description: 'Failed to process file',
          variant: 'destructive',
        });
      }
    } catch (error) {
      setJobStatus('error');
      toast({
        title: 'Upload error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [file, onUpload, toast]);

  // Reset form
  const handleReset = useCallback(() => {
    setFile(null);
    setUploadProgress(0);
    setResults([]);
    setShowResults(false);
    setJobStatus('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Count statistics
  const stats = {
    total: results.length,
    success: results.filter((r) => r.status === 'success').length,
    error: results.filter((r) => r.status === 'error').length,
    warning: results.filter((r) => r.status === 'warning').length,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Upload Area */}
      {jobStatus === 'idle' && (
        <div className="space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleInputChange}
              className="hidden"
            />

            <div className="flex flex-col items-center gap-3">
              <div className={cn('p-3 rounded-full', dragActive ? 'bg-blue-100' : 'bg-gray-200')}>
                <Upload className={cn('h-6 w-6', dragActive ? 'text-blue-600' : 'text-gray-600')} />
              </div>

              <div>
                <p className="font-medium text-gray-900">
                  {dragActive ? 'Drop file here' : 'Drag and drop your file here'}
                </p>
                <p className="text-sm text-gray-600">or</p>
              </div>

              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="gap-2"
              >
                <FileUp className="h-4 w-4" />
                Select File
              </Button>

              <p className="text-xs text-gray-500">
                CSV or Excel (.csv, .xlsx, .xls) up to 50MB
              </p>
            </div>
          </div>

          {/* File Info */}
          {file && (
            <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FileUp className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-600">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Template Download & Upload Actions */}
          <div className="flex items-center gap-3">
            {onDownloadTemplate && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={onDownloadTemplate}
                disabled={isLoading}
              >
                <Download className="h-4 w-4" />
                Download Template
              </Button>
            )}

            <Button
              onClick={handleUpload}
              disabled={!file || isUploading || isLoading}
              className="gap-2 ml-auto"
            >
              <Upload className="h-4 w-4" />
              {isUploading ? 'Uploading...' : 'Upload File'}
            </Button>
          </div>
        </div>
      )}

      {/* Progress */}
      {jobStatus === 'processing' && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-900">Processing file...</p>
              <p className="text-sm text-gray-600">{Math.round(uploadProgress)}%</p>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
          <p className="text-xs text-gray-600 text-center">
            This may take a few moments depending on file size
          </p>
        </div>
      )}

      {/* Results Dialog */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-4xl max-h-96">
          <DialogHeader>
            <DialogTitle>Upload Results</DialogTitle>
            <DialogDescription>
              Review the results of your bulk upload
            </DialogDescription>
          </DialogHeader>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-3 my-4">
            <div className="border rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-600">Total Records</p>
            </div>
            <div className="border rounded-lg p-3 text-center bg-green-50 border-green-200">
              <p className="text-2xl font-bold text-green-700">{stats.success}</p>
              <p className="text-xs text-green-600">Successful</p>
            </div>
            <div className="border rounded-lg p-3 text-center bg-yellow-50 border-yellow-200">
              <p className="text-2xl font-bold text-yellow-700">{stats.warning}</p>
              <p className="text-xs text-yellow-600">Warnings</p>
            </div>
            <div className="border rounded-lg p-3 text-center bg-red-50 border-red-200">
              <p className="text-2xl font-bold text-red-700">{stats.error}</p>
              <p className="text-xs text-red-600">Errors</p>
            </div>
          </div>

          {/* Results Table */}
          <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
            <Table className="text-xs">
              <TableHeader className="sticky top-0">
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => (
                  <TableRow
                    key={result.id}
                    className={cn(
                      result.status === 'error' && 'bg-red-50',
                      result.status === 'warning' && 'bg-yellow-50',
                      result.status === 'success' && 'bg-green-50'
                    )}
                  >
                    <TableCell className="font-mono text-gray-600">
                      {result.row_number}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          result.status === 'success' && 'bg-green-100 text-green-800',
                          result.status === 'warning' && 'bg-yellow-100 text-yellow-800',
                          result.status === 'error' && 'bg-red-100 text-red-800'
                        )}
                      >
                        {result.status === 'success' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {result.status === 'error' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {result.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {result.first_name && result.last_name
                        ? `${result.first_name} ${result.last_name}`
                        : result.employee_number || '-'}
                    </TableCell>
                    <TableCell className="text-gray-600">{result.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-4">
            <Button
              variant="outline"
              onClick={handleReset}
              className="flex-1"
            >
              Upload Another File
            </Button>
            <Button
              variant="default"
              onClick={() => setShowResults(false)}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BulkUploadPanel;
