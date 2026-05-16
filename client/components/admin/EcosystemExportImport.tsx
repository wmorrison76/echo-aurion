/**
 * Ecosystem Control Panel - Phase 5: Export/Import
 * Multi-format support for CSV, JSON, Excel with validation
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Button,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Progress,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/button';
import {
  Download,
  Upload,
  FileJson,
  FileText,
  Table,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ExportOptions {
  format: 'csv' | 'json' | 'excel';
  includeHeaders: boolean;
  dateFormat: 'iso' | 'locale' | 'unix';
  delimiter?: string;
  fields?: string[];
}

interface ImportResult {
  success: number;
  failed: number;
  skipped: number;
  errors: Array<{
    row: number;
    field: string;
    error: string;
  }>;
}

interface EcosystemExportImportProps {
  totalRecords?: number;
  selectedRecords?: number;
  fields?: string[];
  onExport?: (options: ExportOptions) => Promise<Blob>;
  onImport?: (file: File, options: any) => Promise<ImportResult>;
}

const EXPORT_FORMATS = [
  {
    id: 'csv',
    label: 'CSV',
    icon: FileText,
    description: 'Comma-separated values, universal compatibility',
  },
  {
    id: 'json',
    label: 'JSON',
    icon: FileJson,
    description: 'JavaScript Object Notation, complete data structure',
  },
  {
    id: 'excel',
    label: 'Excel',
    icon: Table,
    description: 'Microsoft Excel spreadsheet with formatting',
  },
];

const DATE_FORMATS = [
  { id: 'iso', label: 'ISO 8601', example: '2024-01-15' },
  { id: 'locale', label: 'Locale', example: '1/15/2024' },
  { id: 'unix', label: 'Unix Timestamp', example: '1705276800' },
];

export const EcosystemExportImport: React.FC<EcosystemExportImportProps> = ({
  totalRecords = 0,
  selectedRecords = 0,
  fields = [],
  onExport,
  onImport,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'excel'>('csv');
  const [dateFormat, setDateFormat] = useState<'iso' | 'locale' | 'unix'>('iso');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [selectedFields, setSelectedFields] = useState<string[]>(fields);
  const [isExporting, setIsExporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showImportResults, setShowImportResults] = useState(false);

  // Handle export
  const handleExport = useCallback(async () => {
    if (!onExport) return;

    setIsExporting(true);

    try {
      const options: ExportOptions = {
        format: exportFormat,
        dateFormat: dateFormat as any,
        includeHeaders,
        fields: selectedFields.length > 0 ? selectedFields : undefined,
      };

      const blob = await onExport(options);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_${new Date().toISOString().split('T')[0]}.${exportFormat === 'excel' ? 'xlsx' : exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Export successful',
        description: `${selectedRecords || totalRecords} records exported as ${exportFormat.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Failed to export data',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  }, [onExport, exportFormat, dateFormat, includeHeaders, selectedFields, selectedRecords, totalRecords, toast]);

  // Handle file select
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportResult(null);
    }
  }, []);

  // Handle import
  const handleImport = useCallback(async () => {
    if (!importFile || !onImport) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setImportProgress(prev => {
          const next = prev + Math.random() * 30;
          return next > 90 ? 90 : next;
        });
      }, 500);

      const result = await onImport(importFile, {
        format: importFile.name.split('.').pop(),
      });

      clearInterval(progressInterval);
      setImportProgress(100);
      setImportResult(result);
      setShowImportResults(true);

      toast({
        title: 'Import complete',
        description: `${result.success} records imported successfully`,
        variant: result.failed > 0 ? 'default' : 'default',
      });

      setImportFile(null);
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Failed to import file',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  }, [importFile, onImport, toast]);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="export" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-2">
            <Upload className="h-4 w-4" />
            Import
          </TabsTrigger>
        </TabsList>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4 mt-4">
          {/* Format Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Export Format</CardTitle>
              <CardDescription>
                Choose how to export your data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {EXPORT_FORMATS.map(fmt => {
                  const Icon = fmt.icon;
                  return (
                    <button
                      key={fmt.id}
                      onClick={() => setExportFormat(fmt.id as any)}
                      className={cn(
                        'p-4 rounded-lg border-2 transition-colors text-left',
                        exportFormat === fmt.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <Icon className="h-8 w-8 mb-2 text-gray-600" />
                      <p className="font-medium text-gray-900">{fmt.label}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {fmt.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Export Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date Format */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Date Format
                </label>
                <Select value={dateFormat} onValueChange={(val: any) => setDateFormat(val)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_FORMATS.map(fmt => (
                      <SelectItem key={fmt.id} value={fmt.id}>
                        {fmt.label} ({fmt.example})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Include Headers */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="headers"
                  checked={includeHeaders}
                  onChange={e => setIncludeHeaders(e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <label htmlFor="headers" className="text-sm font-medium text-gray-700">
                  Include column headers
                </label>
              </div>

              {/* Field Selection */}
              {fields.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Fields to Export (leave empty for all)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {fields.map(field => (
                      <label key={field} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!selectedFields.length || selectedFields.includes(field)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedFields(prev => [...prev, field]);
                            } else {
                              setSelectedFields(prev =>
                                prev.filter(f => f !== field)
                              );
                            }
                          }}
                          className="h-4 w-4 rounded"
                        />
                        <span className="text-sm text-gray-700">{field}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Export Stats */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
                <p className="font-medium">
                  Exporting {selectedRecords || totalRecords} record(s) as{' '}
                  {exportFormat.toUpperCase()}
                </p>
              </div>

              {/* Export Button */}
              <Button
                onClick={handleExport}
                disabled={isExporting || (!selectedRecords && !totalRecords)}
                className="w-full gap-2"
              >
                {isExporting && <Loader2 className="h-4 w-4 animate-spin" />}
                <Download className="h-4 w-4" />
                Export Data
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Import Data</CardTitle>
              <CardDescription>
                Upload a file to import employee data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Input */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className={cn(
                    'w-full p-8 border-2 border-dashed rounded-lg transition-colors',
                    importFile
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                  )}
                >
                  {importFile ? (
                    <div className="text-center">
                      <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="font-medium text-gray-900">
                        {importFile.name}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {(importFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="font-medium text-gray-900">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        CSV, JSON, or Excel files up to 50MB
                      </p>
                    </div>
                  )}
                </button>
              </div>

              {/* Import Progress */}
              {isImporting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Importing...
                    </span>
                    <span className="text-sm text-gray-600">
                      {Math.round(importProgress)}%
                    </span>
                  </div>
                  <Progress value={importProgress} className="h-2" />
                </div>
              )}

              {/* Import Button */}
              <Button
                onClick={handleImport}
                disabled={!importFile || isImporting}
                className="w-full gap-2"
              >
                {isImporting && <Loader2 className="h-4 w-4 animate-spin" />}
                <Upload className="h-4 w-4" />
                Import Data
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Results Dialog */}
      <Dialog open={showImportResults} onOpenChange={setShowImportResults}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Results</DialogTitle>
            <DialogDescription>
              Summary of imported data
            </DialogDescription>
          </DialogHeader>

          {importResult && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded border border-green-200 bg-green-50 text-center">
                  <p className="text-2xl font-bold text-green-700">
                    {importResult.success}
                  </p>
                  <p className="text-xs text-green-600 mt-1">Successful</p>
                </div>
                <div className="p-3 rounded border border-red-200 bg-red-50 text-center">
                  <p className="text-2xl font-bold text-red-700">
                    {importResult.failed}
                  </p>
                  <p className="text-xs text-red-600 mt-1">Failed</p>
                </div>
                <div className="p-3 rounded border border-yellow-200 bg-yellow-50 text-center">
                  <p className="text-2xl font-bold text-yellow-700">
                    {importResult.skipped}
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">Skipped</p>
                </div>
              </div>

              {/* Errors */}
              {importResult.errors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm font-medium text-red-900 mb-2">
                    Errors ({importResult.errors.length})
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {importResult.errors.slice(0, 10).map((err, idx) => (
                      <p key={idx} className="text-xs text-red-800">
                        Row {err.row}: {err.field} - {err.error}
                      </p>
                    ))}
                    {importResult.errors.length > 10 && (
                      <p className="text-xs text-red-700 font-medium">
                        ... and {importResult.errors.length - 10} more errors
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowImportResults(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EcosystemExportImport;
