/**
 * Phase 7.4 - TraceViewer with System-Wide Proof View (Investor Mode)
 *
 * Provides a deterministic proof surface showing how the system behaves.
 * NOT a dashboard - this is a proof and audit view.
 *
 * Features:
 * - Single business action selection
 * - Full causality chain (upstream and downstream)
 * - Role eligibility and enforcement display
 * - Downstream effects and deltas
 * - All views are trace-backed (no synthetic data)
 */

import React from "react";
import { PanelFrame } from "@/components/echo/PanelFrame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  BusinessAction,
  ProofViewResponse,
  ProofViewQuery,
} from "@shared/types/trace-proof";

type TraceRecord = {
  id: string;
  timestamp: string;
  source: string;
  entityType: string;
  entityId: string;
  summary: string;
  chain: Array<{
    id: string;
    label: string;
    entityType: string;
    entityId: string;
  }>;
  sourceRef?: string | null;
};

const formatTime = (value: string) =>
  new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

export default function TraceViewerPanel() {
  const [entity, setEntity] = React.useState("INV-00412");
  const [source, setSource] = React.useState("");
  const [sourceRef, setSourceRef] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [records, setRecords] = React.useState<TraceRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [demoMode, setDemoMode] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Phase 7.4: Proof view state
  const [selectedActionId, setSelectedActionId] = React.useState<string | null>(
    null,
  );
  const [proofView, setProofView] = React.useState<ProofViewResponse | null>(
    null,
  );
  const [isLoadingProof, setIsLoadingProof] = React.useState(false);
  const [proofError, setProofError] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<"timeline" | "proof">(
    "timeline",
  );

  const handleQuery = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (entity) params.set("entity", entity);
      if (source) params.set("source", source);
      if (sourceRef) params.set("sourceRef", sourceRef);
      if (search) params.set("q", search);
      const response = await fetch(`/api/trace-ledger?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`TraceLedger query failed (${response.status})`);
      }
      const payload = (await response.json()) as {
        records?: TraceRecord[];
        sourceRef?: string;
      };
      const fetchedRecords = payload.records ?? [];

      // If sourceRef query was used, reconstruct causality chain
      if (sourceRef && fetchedRecords.length > 0) {
        // Sort by timestamp to show causality flow
        fetchedRecords.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );

        // Build chain from sourceRef-linked records
        const chain: Array<{
          id: string;
          label: string;
          entityType: string;
          entityId: string;
        }> = [];
        fetchedRecords.forEach((record) => {
          chain.push({
            id: record.id,
            label: record.entityType,
            entityType: record.entityType,
            entityId: record.entityId,
          });
        });

        // Update records with reconstructed chain
        fetchedRecords.forEach((record) => {
          if (!record.chain || record.chain.length === 0) {
            record.chain = chain;
          }
        });
      }

      setRecords(fetchedRecords);
    } catch (err) {
      setError(err instanceof Error ? err.message : "TraceLedger query failed");
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [entity, source, sourceRef, search]);

  // Phase 7.4: Load proof view for selected action
  const loadProofView = React.useCallback(async (actionId: string) => {
    setIsLoadingProof(true);
    setProofError(null);
    try {
      const params = new URLSearchParams();
      params.set("actionId", actionId);
      params.set("includeUpstream", "true");
      params.set("includeDownstream", "true");
      params.set("includeRoleInfo", "true");
      params.set("includeEffects", "true");

      const response = await fetch(`/api/trace-proof?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Proof view query failed (${response.status})`);
      }
      const proof = (await response.json()) as ProofViewResponse;
      setProofView(proof);
      setViewMode("proof");
    } catch (err) {
      setProofError(
        err instanceof Error ? err.message : "Failed to load proof view",
      );
    } finally {
      setIsLoadingProof(false);
    }
  }, []);

  React.useEffect(() => {
    if (demoMode) {
      // Demo mode: use sample data
      setRecords([
        {
          id: "trace-001",
          timestamp: new Date().toISOString(),
          source: "Investor Demo",
          entityType: "Invoice",
          entityId: "INV-00412",
          summary: "Invoice captured from vendor delivery batch.",
          chain: [
            {
              id: "inv",
              label: "Invoice",
              entityType: "Invoice",
              entityId: "INV-00412",
            },
            {
              id: "stg",
              label: "Storage",
              entityType: "Storage",
              entityId: "STO-77A",
            },
            {
              id: "rec",
              label: "Recipe",
              entityType: "Recipe",
              entityId: "REC-LOBSTER",
            },
            {
              id: "plt",
              label: "Plate",
              entityType: "Plate",
              entityId: "PLT-LOBSTER-2",
            },
          ],
        },
      ]);
      setError(null);
      return;
    }
    handleQuery();
  }, [demoMode, handleQuery]);

  return (
    <PanelFrame
      title="TraceViewer"
      subtitle="System-Wide Proof View (Investor Mode)"
      status="Phase 7.4"
      chrome
      className="h-full w-full"
    >
      <div className="h-full w-full overflow-y-auto bg-background text-foreground">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">TraceViewer</h1>
              <p className="text-sm text-muted-foreground">
                Deterministic proof surface for system behavior audit
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={demoMode ? "secondary" : "outline"}>
                {demoMode ? "Investor Demo Mode" : "Live Query"}
              </Badge>
              <Button
                variant={viewMode === "proof" ? "default" : "outline"}
                onClick={() =>
                  setViewMode(viewMode === "timeline" ? "proof" : "timeline")
                }
                disabled={!selectedActionId && viewMode === "proof"}
              >
                {viewMode === "proof" ? "Timeline View" : "Proof View"}
              </Button>
              <Button
                variant={demoMode ? "outline" : "secondary"}
                onClick={() => setDemoMode((prev) => !prev)}
              >
                {demoMode ? "Exit Demo" : "Investor Demo Mode"}
              </Button>
            </div>
          </div>

          {/* Query Panel */}
          {viewMode === "timeline" && (
            <Card className="bg-background/80">
              <CardHeader>
                <CardTitle className="text-lg">TraceLedger Query</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Entity / ID
                  </label>
                  <Input
                    value={entity}
                    onChange={(event) => setEntity(event.target.value)}
                    placeholder="INV-00412"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Source
                  </label>
                  <Input
                    value={source}
                    onChange={(event) => setSource(event.target.value)}
                    placeholder="Inventory Ingest"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Source Ref (Causality Chain)
                  </label>
                  <Input
                    value={sourceRef}
                    onChange={(event) => setSourceRef(event.target.value)}
                    placeholder="trace-id-123 (reconstructs full chain)"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Search
                  </label>
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="lobster"
                  />
                </div>
                <div className="md:col-span-3 flex flex-wrap items-center gap-2">
                  <Button
                    onClick={handleQuery}
                    disabled={demoMode || isLoading}
                  >
                    {isLoading ? "Querying..." : "Run Query"}
                  </Button>
                  {demoMode ? (
                    <span className="text-xs text-muted-foreground">
                      Demo mode loads investor-flow sample data.
                    </span>
                  ) : null}
                </div>
                {error ? (
                  <div className="md:col-span-3 text-xs text-red-500">
                    {error}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* Timeline View */}
          {viewMode === "timeline" && (
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <Card className="bg-background/80">
                <CardHeader>
                  <CardTitle className="text-lg">Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {records.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No TraceLedger records found.
                    </div>
                  ) : (
                    records.map((record) => (
                      <div
                        key={record.id}
                        className={cn(
                          "rounded-lg border p-3 cursor-pointer transition-colors",
                          selectedActionId === record.id
                            ? "border-primary bg-primary/5"
                            : "border-border/60 bg-muted/20 hover:bg-muted/30",
                        )}
                        onClick={() => {
                          setSelectedActionId(record.id);
                          loadProofView(record.id);
                        }}
                      >
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatTime(record.timestamp)}</span>
                          <Badge variant="outline">{record.source}</Badge>
                        </div>
                        <div className="mt-2 text-sm font-semibold">
                          {record.entityType} • {record.entityId}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {record.summary}
                        </div>
                        {selectedActionId === record.id && (
                          <div className="mt-2 text-xs text-primary">
                            Click to view proof view →
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="bg-background/80">
                <CardHeader>
                  <CardTitle className="text-lg">
                    Linked Chain (Causality Reconstruction)
                  </CardTitle>
                  {sourceRef && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Reconstructed from sourceRef: {sourceRef}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {records.length > 0 && records[0]?.chain ? (
                    records[0].chain.map((link, index) => {
                      // Find corresponding record for this chain link
                      const record = records.find(
                        (r) =>
                          r.entityId === link.entityId &&
                          r.entityType === link.entityType,
                      );
                      return (
                        <div
                          key={link.id}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 text-sm",
                            index === 0 && "border-primary/40",
                            record?.sourceRef &&
                              "border-blue-500/40 bg-blue-500/5",
                          )}
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold">{link.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {link.entityType} • {link.entityId}
                            </div>
                            {record?.sourceRef && (
                              <div className="text-xs text-blue-600 mt-1">
                                sourceRef: {record.sourceRef}
                              </div>
                            )}
                          </div>
                          {index < records[0].chain.length - 1 && (
                            <div className="text-muted-foreground">→</div>
                          )}
                        </div>
                      );
                    })
                  ) : records.length > 0 ? (
                    // If we have records but no chain, show them as a chain
                    records.map((record, index) => (
                      <div
                        key={record.id}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 text-sm",
                          index === 0 && "border-primary/40",
                          record.sourceRef &&
                            "border-blue-500/40 bg-blue-500/5",
                        )}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold">
                            {record.entityType}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {record.entityId}
                          </div>
                          {record.sourceRef && (
                            <div className="text-xs text-blue-600 mt-1">
                              sourceRef: {record.sourceRef}
                            </div>
                          )}
                        </div>
                        {index < records.length - 1 && (
                          <div className="text-muted-foreground">→</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Chain view loads after query or demo mode. Use sourceRef
                      to reconstruct full causality chain.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Proof View */}
          {viewMode === "proof" && (
            <ProofView
              proofView={proofView}
              isLoading={isLoadingProof}
              error={proofError}
              selectedActionId={selectedActionId}
              onBack={() => {
                setViewMode("timeline");
                setSelectedActionId(null);
                setProofView(null);
              }}
            />
          )}
        </div>
      </div>
    </PanelFrame>
  );
}

/**
 * Proof View Component
 * Displays the complete causality reconstruction
 */
function ProofView({
  proofView,
  isLoading,
  error,
  selectedActionId,
  onBack,
}: {
  proofView: ProofViewResponse | null;
  isLoading: boolean;
  error: string | null;
  selectedActionId: string | null;
  onBack: () => void;
}) {
  if (isLoading) {
    return (
      <Card className="bg-background/80">
        <CardContent className="p-12 text-center">
          <div className="text-sm text-muted-foreground">
            Reconstructing causality chain...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-background/80">
        <CardContent className="p-12">
          <div className="text-sm text-red-500 mb-4">{error}</div>
          <Button onClick={onBack} variant="outline">
            Back to Timeline
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!proofView || !selectedActionId) {
    return (
      <Card className="bg-background/80">
        <CardContent className="p-12 text-center">
          <div className="text-sm text-muted-foreground mb-4">
            Select an action from the timeline to view its proof.
          </div>
          <Button onClick={onBack} variant="outline">
            Back to Timeline
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { rootAction, causalityChain, roleEnforcement, downstreamEffects } =
    proofView;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            Proof View: {rootAction.entityType} {rootAction.entityId}
          </h2>
          <p className="text-sm text-muted-foreground">
            Complete causality reconstruction •{" "}
            {formatTime(rootAction.timestamp)}
          </p>
        </div>
        <Button onClick={onBack} variant="outline">
          Back to Timeline
        </Button>
      </div>

      {/* Root Action */}
      <Card className="bg-background/80">
        <CardHeader>
          <CardTitle className="text-lg">Root Action</CardTitle>
        </CardHeader>
        <CardContent>
          <BusinessActionCard action={rootAction} isRoot />
        </CardContent>
      </Card>

      {/* Causality Chain */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Upstream */}
        <Card className="bg-background/80">
          <CardHeader>
            <CardTitle className="text-lg">Upstream Causality</CardTitle>
            <p className="text-xs text-muted-foreground">
              Actions that led to this action
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {causalityChain.upstream.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No upstream actions found.
              </div>
            ) : (
              causalityChain.upstream.map((action) => (
                <BusinessActionCard key={action.id} action={action} />
              ))
            )}
          </CardContent>
        </Card>

        {/* Downstream */}
        <Card className="bg-background/80">
          <CardHeader>
            <CardTitle className="text-lg">Downstream Causality</CardTitle>
            <p className="text-xs text-muted-foreground">
              Actions caused by this action
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {causalityChain.downstream.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No downstream actions found.
              </div>
            ) : (
              causalityChain.downstream.map((action) => (
                <BusinessActionCard key={action.id} action={action} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Role Eligibility & Enforcement */}
      <Card className="bg-background/80">
        <CardHeader>
          <CardTitle className="text-lg">
            Role Eligibility & Enforcement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RoleEnforcementCard eligibility={rootAction.roleEligibility} />
        </CardContent>
      </Card>

      {/* Downstream Effects & Deltas */}
      {downstreamEffects.length > 0 && (
        <Card className="bg-background/80">
          <CardHeader>
            <CardTitle className="text-lg">
              Downstream Effects & Deltas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EffectsCard effects={downstreamEffects.flat()} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Business Action Card
 */
function BusinessActionCard({
  action,
  isRoot = false,
}: {
  action: BusinessAction;
  isRoot?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        isRoot ? "border-primary bg-primary/5" : "border-border/60 bg-muted/20",
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-sm font-semibold">
            {action.entityType} • {action.entityId}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {formatTime(action.timestamp)}
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">{action.actionType}</Badge>
          <Badge variant="secondary">{action.source}</Badge>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">{action.summary}</div>
    </div>
  );
}

/**
 * Role Enforcement Card
 */
function RoleEnforcementCard({
  eligibility,
}: {
  eligibility: BusinessAction["roleEligibility"];
}) {
  return (
    <div className="space-y-4">
      {/* Required Roles & Permissions */}
      <div>
        <div className="text-sm font-semibold mb-2">Required Access</div>
        <div className="flex flex-wrap gap-2">
          {eligibility.requiredRoles.map((role) => (
            <Badge key={role} variant="outline">
              {role}
            </Badge>
          ))}
          {eligibility.requiredPermissions.map((perm) => (
            <Badge key={perm} variant="secondary">
              {perm}
            </Badge>
          ))}
        </div>
      </div>

      {/* Actual Actor */}
      {eligibility.actualActor && (
        <div>
          <div className="text-sm font-semibold mb-2">Actual Actor</div>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="text-sm font-medium">
              {eligibility.actualActor.userName}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Roles: {eligibility.actualActor.roles.join(", ")}
            </div>
            <div className="text-xs text-muted-foreground">
              Permissions: {eligibility.actualActor.permissions.join(", ")}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatTime(eligibility.actualActor.timestamp)}
            </div>
          </div>
        </div>
      )}

      {/* Enforcement Result */}
      <div>
        <div className="text-sm font-semibold mb-2">Enforcement Result</div>
        <div
          className={cn(
            "rounded-lg border p-3",
            eligibility.enforcementResult.allowed
              ? "border-green-500/40 bg-green-500/5"
              : "border-red-500/40 bg-red-500/5",
          )}
        >
          <div className="flex items-center gap-2">
            <Badge
              variant={
                eligibility.enforcementResult.allowed
                  ? "default"
                  : "destructive"
              }
            >
              {eligibility.enforcementResult.allowed ? "Allowed" : "Denied"}
            </Badge>
            {eligibility.enforcementResult.reason && (
              <span className="text-xs text-muted-foreground">
                {eligibility.enforcementResult.reason}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Checked at: {formatTime(eligibility.enforcementResult.checkedAt)}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Effects Card
 */
function EffectsCard({ effects }: { effects: BusinessAction["effects"] }) {
  if (effects.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No downstream effects recorded.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {effects.map((effect, index) => (
        <div
          key={index}
          className="rounded-lg border border-border/60 bg-muted/20 p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm font-semibold">
                {effect.entityType} • {effect.entityId}
              </div>
              <div className="text-xs text-muted-foreground">
                {effect.system}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {formatTime(effect.timestamp)}
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {Object.entries(effect.delta).map(([key, change]) => (
              <div key={key} className="text-xs">
                <div className="font-medium text-muted-foreground">{key}</div>
                <div className="flex gap-2 mt-1">
                  <span className="text-red-600">
                    {String(change.before ?? "null")}
                  </span>
                  <span>→</span>
                  <span className="text-green-600">
                    {String(change.after ?? "null")}
                  </span>
                  <Badge variant="outline" className="ml-2">
                    {change.changeType}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
