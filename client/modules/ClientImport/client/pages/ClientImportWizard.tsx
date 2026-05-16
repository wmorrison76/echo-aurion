import React, { useEffect, useState, useCallback } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  FileCheck,
  Map,
  Filter,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ClientImportPanelProps {
  onClose?: () => void;
  onMinimize?: () => void;
}

type SystemField = {
  id: string;
  label: string;
  required?: boolean;
  type?: string;
  labelKey?: string;
};

type ValidateResponse = {
  sessionId: string;
  totals: { total: number; valid: number; error: number; duplicate: number };
  validationResults: Array<{
    id: string;
    rowNumber: number;
    data: Record<string, any>;
    mappedData?: Record<string, any>;
    status: "pending" | "valid" | "error" | "duplicate" | "imported";
    errors?: string[];
    duplicateOf?: string;
    duplicateId?: string;
  }>;
};

type ImportResultApi = {
  id: string;
  fileName: string;
  fileType: "csv" | "excel";
  totalRows: number;
  successful: number;
  failed: number;
  duplicates: number;
  skipped: number;
  errors: Array<{ row: number; errors: string[] }>;
};

function getAuthHeaders(includeJson: boolean): Record<string, string> {
  const headers: Record<string, string> = {};
  if (typeof window === "undefined") return headers;

  const token = localStorage.getItem("auth_token");
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const orgRaw = localStorage.getItem("auth_org");
  if (orgRaw) {
    try {
      const parsed = JSON.parse(orgRaw);
      const id = String(parsed?.id || "").trim();
      if (id) headers["X-Org-ID"] = id;
    } catch {
      // ignore
    }
  }

  if (includeJson) headers["Content-Type"] = "application/json";
  return headers;
}

export default function ClientImportWizard({
  onClose,
}: ClientImportPanelProps) {
  const { toast } = useToast();

  const [step, setStep] = useState<
    "upload" | "map" | "validate" | "import" | "complete"
  >("upload");
  const [systemFields, setSystemFields] = useState<SystemField[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<"csv" | "excel">("csv");
  const [rowCount, setRowCount] = useState<number>(0);
  const [previewRows, setPreviewRows] = useState<Array<Record<string, any>>>(
    [],
  );
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [validationResults, setValidationResults] = useState<
    ValidateResponse["validationResults"]
  >([]);
  const [validationTotals, setValidationTotals] = useState<
    ValidateResponse["totals"] | null
  >(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResultApi | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/client-import/fields", {
          headers: getAuthHeaders(false),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(json?.error || `Request failed: ${res.status}`);
        const fields = Array.isArray(json?.data)
          ? (json.data as SystemField[])
          : [];
        if (!cancelled) setSystemFields(fields);
      } catch (err) {
        if (!cancelled) {
          toast({
            title: "Import setup error",
            description:
              err instanceof Error
                ? err.message
                : "Unable to load import fields",
            variant: "destructive",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const handleReset = () => {
    setSessionId(null);
    setFile(null);
    setFileType("csv");
    setRowCount(0);
    setPreviewRows([]);
    setHeaders([]);
    setFieldMapping({});
    setValidationResults([]);
    setValidationTotals(null);
    setImportProgress(0);
    setImportResult(null);
    setUpdateExisting(false);
    setStep("upload");
  };

  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      setIsProcessing(true);
      setFile(selectedFile);
      setFileType(
        selectedFile.name.endsWith(".xlsx") ||
          selectedFile.name.endsWith(".xls")
          ? "excel"
          : "csv",
      );

      try {
        const form = new FormData();
        form.append("file", selectedFile);
        const res = await fetch("/api/client-import/parse", {
          method: "POST",
          headers: getAuthHeaders(false),
          body: form,
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(json?.error || `Parse failed: ${res.status}`);

        const data = json?.data || {};
        const sid = String(data.sessionId || "").trim();
        if (!sid) throw new Error("Server did not return a sessionId");

        setSessionId(sid);
        setHeaders(Array.isArray(data.headers) ? data.headers : []);
        setPreviewRows(Array.isArray(data.rows) ? data.rows : []);
        setFieldMapping(
          data.fieldMapping && typeof data.fieldMapping === "object"
            ? data.fieldMapping
            : {},
        );
        setRowCount(typeof data.rowCount === "number" ? data.rowCount : 0);
        setStep("map");
      } catch (error) {
        toast({
          title: "File parsing error",
          description:
            error instanceof Error ? error.message : "Failed to parse file",
          variant: "destructive",
        });
        handleReset();
      } finally {
        setIsProcessing(false);
      }
    },
    [toast],
  );

  const handleValidate = async () => {
    if (!sessionId) return;
    setIsProcessing(true);
    setStep("validate");
    try {
      const res = await fetch("/api/client-import/validate", {
        method: "POST",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ sessionId, fieldMapping }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.error || `Validate failed: ${res.status}`);

      const data = (json?.data || {}) as ValidateResponse;
      setValidationResults(
        Array.isArray(data.validationResults) ? data.validationResults : [],
      );
      setValidationTotals(data.totals || null);
    } catch (error) {
      toast({
        title: "Validation error",
        description:
          error instanceof Error ? error.message : "Failed to validate data",
        variant: "destructive",
      });
      setStep("map");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!sessionId) return;
    setIsProcessing(true);
    setStep("import");
    setImportProgress(10);

    try {
      const res = await fetch("/api/client-import/import", {
        method: "POST",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ sessionId, options: { updateExisting } }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.error || `Import failed: ${res.status}`);
      setImportProgress(100);
      setImportResult(json?.data as ImportResultApi);
      setStep("complete");
      toast({
        title: "Import complete",
        description: `Successfully imported ${Number(json?.data?.successful || 0)} clients`,
      });
    } catch (error) {
      toast({
        title: "Import failed",
        description:
          error instanceof Error ? error.message : "Failed to import clients",
        variant: "destructive",
      });
      setStep("validate");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFieldMappingChange = (csvColumn: string, systemField: string) => {
    setFieldMapping((prev) => ({
      ...prev,
      [csvColumn]: systemField === "ignore" ? "" : systemField,
    }));
  };

  const getMappedField = (csvColumn: string): string =>
    fieldMapping[csvColumn] || "";

  const unmappedHeaders = headers.filter(
    (h) => !fieldMapping[h] || fieldMapping[h] === "",
  );
  const requiredFieldsMapped = systemFields
    .filter((f) => f.required)
    .every((f) => Object.values(fieldMapping).includes(f.id));

  const nameFieldKey = Object.keys(fieldMapping).find(
    (key) => fieldMapping[key] === "name",
  );
  const emailFieldKey = Object.keys(fieldMapping).find(
    (key) => fieldMapping[key] === "email",
  );

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <div className="border-b border-border/30 p-4 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Client Data Import
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Import existing clients from CSV or Excel files
            </p>
          </div>
          {step !== "upload" && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Start Over
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {(["upload", "map", "validate", "import", "complete"] as const).map(
            (s, index) => (
              <React.Fragment key={s}>
                <div
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                    step === s
                      ? "bg-primary text-primary-foreground"
                      : [
                            "upload",
                            "map",
                            "validate",
                            "import",
                            "complete",
                          ].indexOf(step) > index
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {[
                      "upload",
                      "map",
                      "validate",
                      "import",
                      "complete",
                    ].indexOf(step) > index ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                    <span className="text-sm font-medium capitalize">{s}</span>
                  </div>
                </div>
                {index < 4 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                )}
              </React.Fragment>
            ),
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {step === "upload" && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Upload Client Data</CardTitle>
              <CardDescription>
                Upload a CSV or Excel file containing client information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-colors">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-sm font-medium text-primary hover:underline">
                    Click to upload
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {" "}
                    or drag and drop
                  </span>
                </Label>
                <p className="text-xs text-muted-foreground mt-2">
                  CSV or Excel files up to 10MB
                </p>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) void handleFileSelect(selectedFile);
                  }}
                  className="hidden"
                  disabled={isProcessing}
                />
              </div>

              {file && (
                <Alert>
                  <FileCheck className="h-4 w-4" />
                  <AlertTitle>File Selected</AlertTitle>
                  <AlertDescription>
                    {file.name} ({(file.size / 1024).toFixed(2)} KB) •{" "}
                    {fileType.toUpperCase()}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {step === "map" && (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle>Map Fields</CardTitle>
              <CardDescription>
                Map columns to system fields. Required fields are marked with *
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {unmappedHeaders.length > 0 && (
                <Alert>
                  <Map className="h-4 w-4" />
                  <AlertTitle>Unmapped Columns</AlertTitle>
                  <AlertDescription>
                    {unmappedHeaders.length} column(s) are not mapped and will
                    be ignored.
                  </AlertDescription>
                </Alert>
              )}

              <Alert>
                <Filter className="h-4 w-4" />
                <AlertTitle>Preview</AlertTitle>
                <AlertDescription>
                  Showing first {Math.min(100, rowCount)} rows for preview.
                  Total rows detected:{" "}
                  <span className="font-medium">
                    {rowCount.toLocaleString()}
                  </span>
                  .
                </AlertDescription>
              </Alert>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CSV Column</TableHead>
                    <TableHead>Sample Value</TableHead>
                    <TableHead>Map To</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {headers.map((header) => {
                    const mappedField = getMappedField(header);
                    const fieldInfo = systemFields.find(
                      (f) => f.id === mappedField,
                    );
                    const sampleValue = previewRows?.[0]?.[header] ?? "";
                    return (
                      <TableRow key={header}>
                        <TableCell className="font-medium">{header}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {String(sampleValue)}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={mappedField || "ignore"}
                            onValueChange={(value) =>
                              handleFieldMappingChange(header, value)
                            }
                          >
                            <SelectTrigger className="w-56">
                              <SelectValue placeholder="Select field..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ignore">-- Ignore --</SelectItem>
                              {systemFields.map((field) => (
                                <SelectItem key={field.id} value={field.id}>
                                  {field.label}
                                  {field.required ? " *" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {mappedField ? (
                            <Badge
                              variant={
                                fieldInfo?.required ? "default" : "secondary"
                              }
                            >
                              {fieldInfo?.required ? "Required" : "Optional"}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Not Mapped</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {!requiredFieldsMapped && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Missing required mappings</AlertTitle>
                  <AlertDescription>
                    Map all required fields before validating (typically Name
                    and Email).
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isProcessing}
                >
                  Back
                </Button>
                <Button
                  onClick={handleValidate}
                  disabled={isProcessing || !requiredFieldsMapped}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      Validate Data <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "validate" && (
          <Card className="max-w-6xl mx-auto">
            <CardHeader>
              <CardTitle>Validation Results</CardTitle>
              <CardDescription>
                Review duplicates and errors before importing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Total</p>
                    <p className="text-2xl font-bold">
                      {validationTotals?.total ?? validationResults.length}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Valid</p>
                    <p className="text-2xl font-bold text-green-600">
                      {validationTotals?.valid ?? 0}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Errors</p>
                    <p className="text-2xl font-bold text-red-600">
                      {validationTotals?.error ?? 0}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">
                      Duplicates
                    </p>
                    <p className="text-2xl font-bold text-amber-600">
                      {validationTotals?.duplicate ?? 0}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Alert>
                <UserPlus className="h-4 w-4" />
                <AlertTitle>Duplicate handling</AlertTitle>
                <AlertDescription className="flex items-center justify-between gap-3">
                  <span>
                    Duplicate rows match an existing client (same org + email).
                  </span>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={updateExisting}
                      onCheckedChange={(v) => setUpdateExisting(Boolean(v))}
                    />
                    Update existing clients
                  </label>
                </AlertDescription>
              </Alert>

              <div className="border rounded-lg">
                <div className="max-h-96 overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Errors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationResults.map((row) => {
                        const name = nameFieldKey
                          ? String(row.data?.[nameFieldKey] || "")
                          : "";
                        const email = emailFieldKey
                          ? String(row.data?.[emailFieldKey] || "")
                          : "";
                        return (
                          <TableRow
                            key={row.id}
                            className={cn(
                              row.status === "error" &&
                                "bg-red-50 dark:bg-red-950/20",
                              row.status === "duplicate" &&
                                "bg-amber-50 dark:bg-amber-950/20",
                            )}
                          >
                            <TableCell>{row.rowNumber}</TableCell>
                            <TableCell className="font-medium">
                              {name}
                            </TableCell>
                            <TableCell>{email}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  row.status === "valid"
                                    ? "default"
                                    : row.status === "error"
                                      ? "destructive"
                                      : "secondary"
                                }
                              >
                                {row.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {row.errors?.length ? (
                                <div className="text-xs text-red-600 space-y-1">
                                  {row.errors.slice(0, 3).map((err, i) => (
                                    <div key={i}>{err}</div>
                                  ))}
                                </div>
                              ) : null}
                              {row.status === "duplicate" ? (
                                <div className="text-xs text-amber-700 mt-1">
                                  Duplicate of existing client
                                </div>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep("map")}
                  disabled={isProcessing}
                >
                  Back
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={
                    isProcessing || (validationTotals?.valid ?? 0) === 0
                  }
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      Import <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "import" && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Importing Clients</CardTitle>
              <CardDescription>
                Please wait while we import your client data…
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={importProgress} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">
                {Math.round(importProgress)}% complete
              </p>
            </CardContent>
          </Card>
        )}

        {step === "complete" && importResult && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
                Import Complete
              </CardTitle>
              <CardDescription>Import summary and results</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">
                      Successfully Imported
                    </p>
                    <p className="text-3xl font-bold text-green-600">
                      {importResult.successful}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Failed</p>
                    <p className="text-3xl font-bold text-red-600">
                      {importResult.failed}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {importResult.errors?.length ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Import Errors</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      {importResult.errors.slice(0, 5).map((error, index) => (
                        <li key={index} className="text-sm">
                          Row {error.row}: {error.errors.join(", ")}
                        </li>
                      ))}
                      {importResult.errors.length > 5 ? (
                        <li className="text-sm">
                          …and {importResult.errors.length - 5} more
                        </li>
                      ) : null}
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleReset}>
                  Import Another File
                </Button>
                <Button onClick={onClose}>Done</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
