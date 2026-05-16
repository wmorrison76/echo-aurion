import { useState } from "react";
import { useRecipeDeployment } from "@/hooks/use-recipe-deployment";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowLeft, Check, Clock, Zap } from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DeploymentWithDetails } from "@/hooks/use-recipe-deployment";

interface DeploymentDetailsPanelProps {
  deployment: DeploymentWithDetails;
  onBack: () => void;
}

const confirmationStatusColors = {
  pending: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  received: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  confirmed:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  applied: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const statusIcons = {
  pending: <Clock className="h-4 w-4" />,
  received: <Zap className="h-4 w-4" />,
  confirmed: <Check className="h-4 w-4" />,
  applied: <Check className="h-4 w-4" />,
  rejected: <AlertCircle className="h-4 w-4" />,
  failed: <AlertCircle className="h-4 w-4" />,
};

export default function DeploymentDetailsPanel({
  deployment,
  onBack,
}: DeploymentDetailsPanelProps) {
  const { updateStoreConfirmation, loading } = useRecipeDeployment();
  const [processingOutletId, setProcessingOutletId] = useState<string | null>(
    null,
  );

  const handleConfirmStore = async (outletId: string) => {
    setProcessingOutletId(outletId);
    try {
      await updateStoreConfirmation(deployment.id, outletId, "applied");
    } finally {
      setProcessingOutletId(null);
    }
  };

  const packets = deployment.deployment_packets || [];
  const confirmations = deployment.store_deployment_confirmations || [];

  // Group confirmations by status
  const pendingConfirmations = confirmations.filter(
    (c) => c.status === "pending",
  );
  const receivedConfirmations = confirmations.filter(
    (c) => c.status === "received",
  );
  const confirmedConfirmations = confirmations.filter(
    (c) => c.status === "confirmed",
  );
  const appliedConfirmations = confirmations.filter(
    (c) => c.status === "applied",
  );
  const failedConfirmations = confirmations.filter(
    (c) => c.status === "failed" || c.status === "rejected",
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">
            {deployment.deployment_name}
          </h2>
          {deployment.description && (
            <p className="text-sm text-muted-foreground">
              {deployment.description}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge className="capitalize">{deployment.status}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Type</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-semibold capitalize">
              {deployment.deployment_type.replace(/_/g, " ")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Priority</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="capitalize">
              {deployment.priority}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Created</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold">
              {format(new Date(deployment.created_at), "MMM d, yyyy")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="packets" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="packets">Recipes ({packets.length})</TabsTrigger>
          <TabsTrigger value="confirmations">
            Stores ({confirmations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="packets" className="space-y-4">
          {packets.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No recipes in this deployment
              </CardContent>
            </Card>
          ) : (
            packets.map((packet) => (
              <Card key={packet.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {packet.recipe_name}
                  </CardTitle>
                  <CardDescription>
                    Recipe ID: {packet.recipe_id}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {packet.changes_summary &&
                    Object.keys(packet.changes_summary).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold">Changes:</p>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {Object.entries(packet.changes_summary).map(
                            ([key, value]) => (
                              <li key={key} className="list-disc list-inside">
                                {key}: {String(value)}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                  <div className="text-xs text-muted-foreground">
                    Version: {packet.previous_recipe_version_hash}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="confirmations" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Pending</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {pendingConfirmations.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Applied</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {appliedConfirmations.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Failed</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">
                  {failedConfirmations.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Completion Rate</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {confirmations.length > 0
                    ? Math.round(
                        (appliedConfirmations.length / confirmations.length) *
                          100,
                      )
                    : 0}
                  %
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="applied" className="w-full">
            <TabsList className="grid w-full grid-cols-4 text-xs">
              <TabsTrigger value="applied">Applied</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="other">Other</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
            </TabsList>

            <TabsContent value="applied" className="space-y-2">
              {appliedConfirmations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No stores have applied yet
                </p>
              ) : (
                appliedConfirmations.map((confirmation) => (
                  <StoreConfirmationCard
                    key={confirmation.id}
                    confirmation={confirmation}
                    isProcessing={processingOutletId === confirmation.outlet_id}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="pending" className="space-y-2">
              {pendingConfirmations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pending confirmations
                </p>
              ) : (
                pendingConfirmations.map((confirmation) => (
                  <StoreConfirmationCard
                    key={confirmation.id}
                    confirmation={confirmation}
                    isProcessing={processingOutletId === confirmation.outlet_id}
                    onApply={() => handleConfirmStore(confirmation.outlet_id)}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="other" className="space-y-2">
              {[...receivedConfirmations, ...confirmedConfirmations].length ===
              0 ? (
                <p className="text-sm text-muted-foreground">
                  No other confirmations
                </p>
              ) : (
                [...receivedConfirmations, ...confirmedConfirmations].map(
                  (confirmation) => (
                    <StoreConfirmationCard
                      key={confirmation.id}
                      confirmation={confirmation}
                      isProcessing={
                        processingOutletId === confirmation.outlet_id
                      }
                      onApply={() => handleConfirmStore(confirmation.outlet_id)}
                    />
                  ),
                )
              )}
            </TabsContent>

            <TabsContent value="failed" className="space-y-2">
              {failedConfirmations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No failures</p>
              ) : (
                failedConfirmations.map((confirmation) => (
                  <StoreConfirmationCard
                    key={confirmation.id}
                    confirmation={confirmation}
                    isProcessing={processingOutletId === confirmation.outlet_id}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface StoreConfirmationCardProps {
  confirmation: any;
  isProcessing: boolean;
  onApply?: () => void;
}

function StoreConfirmationCard({
  confirmation,
  isProcessing,
  onApply,
}: StoreConfirmationCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between pt-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {statusIcons[confirmation.status as keyof typeof statusIcons]}
            <p className="font-semibold">
              Outlet {confirmation.outlet_id.slice(0, 8)}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {confirmation.location_id
              ? `Location: ${confirmation.location_id}`
              : "No specific location"}
          </p>
          {confirmation.applied_at && (
            <p className="text-xs text-green-600">
              Applied: {format(new Date(confirmation.applied_at), "PPP p")}
            </p>
          )}
          {confirmation.failure_reason && (
            <p className="text-xs text-red-600">
              Failure: {confirmation.failure_reason}
            </p>
          )}
          {confirmation.rejection_reason && (
            <p className="text-xs text-red-600">
              Rejected: {confirmation.rejection_reason}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge
            className={
              confirmationStatusColors[
                confirmation.status as keyof typeof confirmationStatusColors
              ]
            }
          >
            {confirmation.status}
          </Badge>
          {onApply && confirmation.status !== "applied" && (
            <Button size="sm" onClick={onApply} disabled={isProcessing}>
              {isProcessing ? "..." : "Apply"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
