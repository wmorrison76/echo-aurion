import { useState, useEffect } from "react";
import { useRecipeDeployment } from "@/hooks/use-recipe-deployment";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, Package, Zap } from "lucide-react";
import { format } from "date-fns";
import DeploymentCreateDialog from "@/components/deployment/DeploymentCreateDialog";
import DeploymentDetailsPanel from "@/components/deployment/DeploymentDetailsPanel";

interface RecipeDeploymentPanelProps {
  isEnabled?: boolean;
  onClose?: () => void;
}

const statusColors = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_progress:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  completed:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const statusIcons = {
  draft: <Package className="h-4 w-4" />,
  scheduled: <Clock className="h-4 w-4" />,
  in_progress: <Zap className="h-4 w-4" />,
  completed: <CheckCircle2 className="h-4 w-4" />,
  failed: <AlertCircle className="h-4 w-4" />,
  cancelled: <AlertCircle className="h-4 w-4" />,
};

export default function RecipeDeploymentPanel({
  isEnabled = true,
  onClose,
}: RecipeDeploymentPanelProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const {
    loading,
    deployments,
    selectedDeployment,
    fetchDeployments,
    setSelectedDeployment,
  } = useRecipeDeployment();

  useEffect(() => {
    if (isEnabled) {
      fetchDeployments();
    }
  }, [isEnabled, fetchDeployments]);

  if (!isEnabled) {
    return null;
  }

  // Show deployment details if one is selected
  if (selectedDeployment) {
    return (
      <DeploymentDetailsPanel
        deployment={selectedDeployment}
        onBack={() => setSelectedDeployment(null)}
      />
    );
  }

  // Group deployments by status
  const draftDeployments = deployments.filter((d) => d.status === "draft");
  const activeDeployments = deployments.filter(
    (d) => d.status === "in_progress" || d.status === "scheduled",
  );
  const completedDeployments = deployments.filter(
    (d) =>
      d.status === "completed" ||
      d.status === "failed" ||
      d.status === "cancelled",
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">
            Recipe Deployments
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage recipe deployments across your stores
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Package className="h-4 w-4" />
          New Deployment
        </Button>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">
            Active ({activeDeployments.length})
          </TabsTrigger>
          <TabsTrigger value="draft">
            Drafts ({draftDeployments.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedDeployments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeDeployments.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No active deployments
              </CardContent>
            </Card>
          ) : (
            activeDeployments.map((deployment) => (
              <DeploymentCard
                key={deployment.id}
                deployment={deployment}
                onClick={() => setSelectedDeployment(deployment)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="draft" className="space-y-4">
          {draftDeployments.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No draft deployments
              </CardContent>
            </Card>
          ) : (
            draftDeployments.map((deployment) => (
              <DeploymentCard
                key={deployment.id}
                deployment={deployment}
                onClick={() => setSelectedDeployment(deployment)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedDeployments.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No completed deployments
              </CardContent>
            </Card>
          ) : (
            completedDeployments.map((deployment) => (
              <DeploymentCard
                key={deployment.id}
                deployment={deployment}
                onClick={() => setSelectedDeployment(deployment)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      <DeploymentCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          setShowCreateDialog(false);
          fetchDeployments();
        }}
      />
    </div>
  );
}

interface DeploymentCardProps {
  deployment: any;
  onClick: () => void;
}

function DeploymentCard({ deployment, onClick }: DeploymentCardProps) {
  const confirmationCount =
    deployment.store_deployment_confirmations?.length || 0;
  const confirmedCount =
    deployment.store_deployment_confirmations?.filter(
      (c: any) => c.status === "applied",
    ).length || 0;

  return (
    <Card
      className="cursor-pointer transition hover:shadow-md dark:hover:shadow-[#c8a97e]-500/20"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              {statusIcons[deployment.status as keyof typeof statusIcons]}
              {deployment.deployment_name}
            </CardTitle>
            {deployment.description && (
              <CardDescription>{deployment.description}</CardDescription>
            )}
          </div>
          <Badge
            className={
              statusColors[deployment.status as keyof typeof statusColors]
            }
          >
            {deployment.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Type</p>
            <p className="text-sm font-semibold capitalize">
              {deployment.deployment_type.replace(/_/g, " ")}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Priority
            </p>
            <p className="text-sm font-semibold capitalize">
              {deployment.priority}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Packets</p>
            <p className="text-sm font-semibold">
              {deployment.deployment_packets?.length || 0} recipes
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Stores</p>
            <p className="text-sm font-semibold">
              {confirmedCount}/{confirmationCount} confirmed
            </p>
          </div>
        </div>

        {deployment.scheduled_at && (
          <div className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
            Scheduled for {format(new Date(deployment.scheduled_at), "PPP p")}
          </div>
        )}

        {deployment.confirmation_deadline && (
          <div className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
            Confirmation deadline:{" "}
            {format(new Date(deployment.confirmation_deadline), "PPP p")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
