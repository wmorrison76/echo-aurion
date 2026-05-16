import React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2,
  X,
  AlertCircle,
  RefreshCw,
  Layout as LayoutIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  PANEL_METADATA,
  PANEL_REGISTRY,
  type PanelKey,
} from "@/lib/panel-registry";

interface PanelSystemEnhancementsPanelProps {
  onClose?: () => void;
  onMinimize?: () => void;
}

interface PanelStatus {
  key: PanelKey;
  registered: boolean;
  metadata: boolean;
  loadable: boolean;
  error?: string;
}

export default function PanelSystemDashboard(
  _props: PanelSystemEnhancementsPanelProps,
) {
  const [panelStatuses, setPanelStatuses] = React.useState<PanelStatus[]>([]);
  const [isVerifying, setIsVerifying] = React.useState(false);

  const verifyPanels = React.useCallback(async () => {
    setIsVerifying(true);
    try {
      const statuses: PanelStatus[] = [];
      const allKeys = Object.keys(PANEL_REGISTRY) as PanelKey[];

      for (const key of allKeys) {
        const status: PanelStatus = {
          key,
          registered: Object.prototype.hasOwnProperty.call(PANEL_REGISTRY, key),
          metadata: Object.prototype.hasOwnProperty.call(PANEL_METADATA, key),
          loadable: false,
        };

        try {
          const loader = (PANEL_REGISTRY as any)[key];
          status.loadable = typeof loader === "function";
        } catch (err) {
          status.loadable = false;
          status.error = err instanceof Error ? err.message : "Unknown error";
        }

        statuses.push(status);
      }

      setPanelStatuses(statuses);
    } finally {
      setIsVerifying(false);
    }
  }, []);

  React.useEffect(() => {
    void verifyPanels();
  }, [verifyPanels]);

  const verifiedCount = panelStatuses.filter(
    (s) => s.registered && s.metadata && s.loadable,
  ).length;
  const allVerified =
    panelStatuses.length > 0 && verifiedCount === panelStatuses.length;

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <div className="border-b border-border/30 p-4 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Panel System Verification
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Verify all modules are properly integrated into the panel system
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={verifyPanels}
            disabled={isVerifying}
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-2", isVerifying && "animate-spin")}
            />
            {isVerifying ? "Verifying..." : "Verify All"}
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Total Panels
                  </p>
                  <p className="text-2xl font-bold">{panelStatuses.length}</p>
                </div>
                <LayoutIcon className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Verified</p>
                  <p className="text-2xl font-bold text-green-600">
                    {verifiedCount}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Issues</p>
                  <p className="text-2xl font-bold text-red-600">
                    {Math.max(0, panelStatuses.length - verifiedCount)}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <p className="text-2xl font-bold">
                    {allVerified ? "All Good" : "Issues"}
                  </p>
                </div>
                {allVerified ? (
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                ) : (
                  <AlertCircle className="h-8 w-8 text-amber-500" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Panel Registration Status</CardTitle>
            <CardDescription>
              All registered panels and their integration status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Panel Key</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Metadata</TableHead>
                  <TableHead>Loadable</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {panelStatuses.map((s) => {
                  const meta = (PANEL_METADATA as any)[s.key];
                  const ok = s.registered && s.metadata && s.loadable;
                  return (
                    <TableRow key={s.key}>
                      <TableCell className="font-mono text-sm">
                        {s.key}
                      </TableCell>
                      <TableCell className="font-medium">
                        {meta?.label || "N/A"}
                      </TableCell>
                      <TableCell>
                        {s.registered ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <X className="h-5 w-5 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        {s.metadata ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <X className="h-5 w-5 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        {s.loadable ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <X className="h-5 w-5 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ok ? "default" : "destructive"}>
                          {ok ? "Verified" : "Issue"}
                        </Badge>
                        {s.error ? (
                          <p className="text-xs text-red-600 mt-1">{s.error}</p>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
