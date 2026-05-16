/**
 * Genesis Onboarding Panel
 *
 * Hard-gates onboarding actions with RBAC:
 * - ONBOARDING_VIEW: can see the panel
 * - ONBOARDING_EDIT: can generate and apply config
 */

import React from "react";

import { AlertCircle, CheckCircle2, Lock } from "lucide-react";

import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n";
import { osBus } from "@/lib/os-bus";
import { can } from "@/lib/genesis/permissions/permissionChecks";
import {
  getGenesisConfig,
  saveGenesisConfig,
} from "@/lib/genesis-config-store";
import { getCurrentUser } from "@/stores/genesisAuthStore";
import type { User } from "@/../shared/types/genesis-permissions";

type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
};

export default function GenesisOnboardingPanel() {
  const { t } = useI18n();

  const [user, setUser] = React.useState<User | null>(null);
  const [config, setConfig] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [steps, setSteps] = React.useState<OnboardingStep[]>([]);

  React.useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    const cfg = getGenesisConfig();
    setConfig(cfg);

    const onboardingSteps: OnboardingStep[] = [
      {
        id: "outlets",
        title: "Configure Outlets",
        description: "Add restaurant, banquets, pastry, and other outlets",
        completed: Array.isArray(cfg?.outlets) && cfg.outlets.length > 0,
        required: true,
      },
      {
        id: "commissaries",
        title: "Configure Commissaries",
        description: "Set up central production and supply locations",
        completed:
          Array.isArray(cfg?.commissaries) && cfg.commissaries.length > 0,
        required: true,
      },
      {
        id: "vendors",
        title: "Set Up Vendors",
        description: "Define delivery schedules and lead times",
        completed: Array.isArray(cfg?.vendors) && cfg.vendors.length > 0,
        required: true,
      },
      {
        id: "pars",
        title: "Define PAR Levels",
        description: "Set inventory targets per outlet",
        completed: Array.isArray(cfg?.pars) && cfg.pars.length > 0,
        required: false,
      },
    ];
    setSteps(onboardingSteps);
  }, []);

  const canViewOnboarding = can(user, "ONBOARDING_VIEW");
  const canEditOnboarding = can(user, "ONBOARDING_EDIT");

  const handleGenerateAndApply = React.useCallback(async () => {
    if (!canEditOnboarding) {
      setMessage({
        type: "error",
        text: "Insufficient permission: ONBOARDING_EDIT",
      });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const newConfig = getGenesisConfig();
      if (!newConfig) throw new Error("Failed to generate config");

      saveGenesisConfig(newConfig);
      setConfig(newConfig);

      setMessage({
        type: "success",
        text: "Genesis configuration generated and applied successfully!",
      });

      osBus.emit("genesis:onboarding_config_applied", {
        configId: newConfig.configId,
        timestamp: new Date().toISOString(),
        actor: user?.userId || "unknown",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err instanceof Error ? err.message : "Failed to apply configuration",
      });
    } finally {
      setLoading(false);
    }
  }, [canEditOnboarding, user?.userId]);

  if (!canViewOnboarding) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background p-4">
        <Card className="p-6 max-w-md text-center">
          <Lock className="w-12 h-12 mx-auto mb-4 text-amber-500" />
          <h3 className="text-lg font-semibold text-foreground">
            Access Restricted
          </h3>
          <p className="text-sm text-foreground/70 mt-2">
            You don't have permission to view the onboarding panel.
          </p>
          <p className="text-xs text-foreground/60 mt-3">
            Required permission{" "}
            <code className="bg-foreground/10 px-2 py-1 rounded">
              ONBOARDING_VIEW
            </code>
          </p>
        </Card>
      </div>
    );
  }

  const completedCount = steps.filter((s) => s.completed).length;
  const requiredCount = steps.filter((s) => s.required).length;
  const progress =
    requiredCount > 0 ? (completedCount / requiredCount) * 100 : 0;

  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      <div className="flex-shrink-0 border-b border-border/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-foreground">
              Genesis Onboarding
            </div>
            <div className="text-sm text-foreground/70 mt-1">
              Configure outlets, commissaries, vendors, and PAR levels to
              bootstrap the Genesis system
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ModuleChatButton
              moduleId="genesis"
              moduleName="Genesis Onboarding"
            />
            <Badge variant="outline">Phase 1</Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {message ? (
          <Card
            className={[
              "p-4 flex gap-3",
              message.type === "success"
                ? "bg-green-500/10 border-green-500/30"
                : "bg-red-500/10 border-red-500/30",
            ].join(" ")}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p
                className={
                  message.type === "success" ? "text-green-200" : "text-red-200"
                }
              >
                {message.text}
              </p>
            </div>
          </Card>
        ) : null}

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-foreground">
              Onboarding Progress
            </div>
            <Badge variant="secondary">
              {completedCount} / {requiredCount}
            </Badge>
          </div>
          <div className="w-full bg-foreground/10 rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </Card>

        <div className="space-y-3">
          <div className="text-sm font-medium text-foreground">
            Onboarding Steps
          </div>
          {steps.map((step) => (
            <Card
              key={step.id}
              className={[
                "p-4 border transition-colors",
                step.completed
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-border/30",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                <div
                  className={[
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                    step.completed
                      ? "border-green-500 bg-green-500"
                      : "border-foreground/30",
                  ].join(" ")}
                >
                  {step.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-foreground">
                      {step.title}
                    </h4>
                    {step.required ? (
                      <Badge variant="secondary" className="text-xs">
                        Required
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-foreground/70 mt-1">
                    {step.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {config ? (
          <Card className="p-4">
            <div className="text-sm font-medium text-foreground mb-3">
              Current Configuration
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <div className="text-xs text-foreground/70">Outlets</div>
                <div className="text-lg font-semibold text-foreground">
                  {config.outlets?.length || 0}
                </div>
              </div>
              <div>
                <div className="text-xs text-foreground/70">Commissaries</div>
                <div className="text-lg font-semibold text-foreground">
                  {config.commissaries?.length || 0}
                </div>
              </div>
              <div>
                <div className="text-xs text-foreground/70">Vendors</div>
                <div className="text-lg font-semibold text-foreground">
                  {config.vendors?.length || 0}
                </div>
              </div>
              <div>
                <div className="text-xs text-foreground/70">PAR Rules</div>
                <div className="text-lg font-semibold text-foreground">
                  {config.pars?.length || 0}
                </div>
              </div>
            </div>
          </Card>
        ) : null}
      </div>

      <div className="flex-shrink-0 border-t border-border/30 p-4 bg-background">
        <div className="space-y-2">
          {!canEditOnboarding ? (
            <p className="text-sm text-amber-600 dark:text-amber-400 flex gap-2">
              <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
              You don't have permission to generate and apply configuration.
            </p>
          ) : null}

          <Button
            onClick={handleGenerateAndApply}
            disabled={loading || !canEditOnboarding}
            className="w-full"
            size="lg"
          >
            {loading ? "Generating..." : "Generate & Apply Genesis Config"}
          </Button>
        </div>
      </div>
    </div>
  );
}
