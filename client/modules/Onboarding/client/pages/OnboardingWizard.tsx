import React, { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCopy,
  Play,
  SkipForward,
  Sparkles,
} from "lucide-react";

import {
  buildOnboardingConfig,
  DEPARTMENT_OPTIONS,
  type OrganizationType,
  ROLE_OPTIONS,
} from "../../lib/onboarding-config";
import { ROLE_CATEGORIES, ROLE_TAXONOMY } from "../../lib/role-taxonomy";

interface OnboardingPanelProps {
  onClose?: () => void;
  onMinimize?: () => void;
  onComplete?: () => void;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
}

const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern (EST/EDT)" },
  { value: "America/Chicago", label: "Central (CST/CDT)" },
  { value: "America/Denver", label: "Mountain (MST/MDT)" },
  { value: "America/Los_Angeles", label: "Pacific (PST/PDT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
];

const ORG_TYPES: { value: OrganizationType; label: string }[] = [
  { value: "hotel", label: "Hotel" },
  { value: "resort", label: "Resort" },
  { value: "casino", label: "Casino" },
  { value: "spa", label: "Spa" },
  { value: "restaurant-group", label: "Restaurant Group" },
  { value: "venue", label: "Event Venue" },
  { value: "other", label: "Other" },
];

export default function OnboardingWizard({
  onClose,
  onMinimize,
  onComplete,
}: OnboardingPanelProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] =
    useState<OrganizationType>("hotel");
  const [timezone, setTimezone] = useState(TIMEZONE_OPTIONS[0].value);

  const [outletCount, setOutletCount] = useState(1);
  const [hasBanquets, setHasBanquets] = useState(true);
  const [banquetRooms, setBanquetRooms] = useState(0);

  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [primaryAdminName, setPrimaryAdminName] = useState("");
  const [primaryAdminRoleId, setPrimaryAdminRoleId] = useState("gm");
  const [assignedRoles, setAssignedRoles] = useState<string[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [tutorialsEnabled, setTutorialsEnabled] = useState(true);

  const assignedRolesNormalized = useMemo(() => {
    const merged = new Set(assignedRoles);
    if (primaryAdminRoleId) merged.add(primaryAdminRoleId);
    return Array.from(merged);
  }, [assignedRoles, primaryAdminRoleId]);

  const onboardingConfig = useMemo(
    () =>
      buildOnboardingConfig({
        organizationName,
        organizationType,
        timezone,
        outletCount,
        hasBanquets,
        banquetRooms,
        departments: selectedDepartments,
        primaryAdminName,
        primaryAdminRoleId,
        assignedRoles: assignedRolesNormalized,
        notifications: notificationsEnabled,
        tutorials: tutorialsEnabled,
      }),
    [
      organizationName,
      organizationType,
      timezone,
      outletCount,
      hasBanquets,
      banquetRooms,
      selectedDepartments,
      primaryAdminName,
      primaryAdminRoleId,
      assignedRolesNormalized,
      notificationsEnabled,
      tutorialsEnabled,
    ],
  );

  const [configJson, setConfigJson] = useState("");
  useEffect(() => {
    setConfigJson(JSON.stringify(onboardingConfig, null, 2));
  }, [onboardingConfig]);

  const toggleDepartment = (id: string) => {
    setSelectedDepartments((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleRole = (id: string) => {
    setAssignedRoles((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const steps: OnboardingStep[] = [
    {
      id: "welcome",
      title: "Welcome to LUCCCA",
      description: "Quick setup to tailor roles and permissions",
      component: (
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-6">
              <Sparkles className="h-12 w-12 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">Welcome aboard</h2>
            <p className="text-muted-foreground">
              We will configure outlets, departments, and roles so permissions
              match your operation.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "organization",
      title: "Organization Setup",
      description: "Define your property and timezone",
      component: (
        <div className="space-y-6">
          <div>
            <Label htmlFor="org-name">Organization Name *</Label>
            <Input
              id="org-name"
              placeholder="e.g., Grand Resort & Spa"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="org-type">Organization Type *</Label>
            <Select
              value={organizationType}
              onValueChange={(v) => setOrganizationType(v as OrganizationType)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {ORG_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="timezone">Timezone *</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ),
    },
    {
      id: "operations",
      title: "Outlets & Banquets",
      description: "Configure the footprint for your property",
      component: (
        <div className="space-y-6">
          <div>
            <Label htmlFor="outlets">Number of Outlets *</Label>
            <Select
              value={String(outletCount)}
              onValueChange={(v) => setOutletCount(Number(v))}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 50 }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Outlets can be added later.
            </p>
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label
                htmlFor="banquets-toggle"
                className="font-medium cursor-pointer"
              >
                Enable Banquets
              </Label>
              <p className="text-xs text-muted-foreground">
                Turn on banquet scheduling and workflows.
              </p>
            </div>
            <Checkbox
              id="banquets-toggle"
              checked={hasBanquets}
              onCheckedChange={(c) => setHasBanquets(Boolean(c))}
            />
          </div>
          <div>
            <Label htmlFor="banquet-rooms">Number of Banquet Rooms</Label>
            <Select
              value={String(banquetRooms)}
              onValueChange={(v) => setBanquetRooms(Number(v))}
              disabled={!hasBanquets}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 51 }, (_, i) => i).map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ),
    },
    {
      id: "departments",
      title: "Departments",
      description: "Select departments to enable",
      component: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pick the departments that should be activated at launch.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {DEPARTMENT_OPTIONS.map((d) => (
              <label
                key={d.id}
                className="flex items-center gap-2 rounded border px-3 py-2 cursor-pointer"
              >
                <Checkbox
                  checked={selectedDepartments.includes(d.id)}
                  onCheckedChange={() => toggleDepartment(d.id)}
                />
                <span className="text-sm">{d.label}</span>
              </label>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "roles",
      title: "Role Assignment",
      description: "Assign initial roles and permissions",
      component: (
        <div className="space-y-6">
          <div>
            <Label htmlFor="admin-name">Primary Admin Name *</Label>
            <Input
              id="admin-name"
              placeholder="e.g., Jordan Ellis"
              value={primaryAdminName}
              onChange={(e) => setPrimaryAdminName(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="admin-role">Primary Admin Role *</Label>
            <Select
              value={primaryAdminRoleId}
              onValueChange={setPrimaryAdminRoleId}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label>Initial Roles to Provision</Label>
            <div className="space-y-4">
              {ROLE_CATEGORIES.map((cat) => (
                <div key={cat.id} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {cat.label}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLE_TAXONOMY.filter((r) => r.categoryId === cat.id).map(
                      (r) => (
                        <label
                          key={r.id}
                          className="flex items-center gap-2 rounded border px-3 py-2 cursor-pointer"
                        >
                          <Checkbox
                            checked={assignedRolesNormalized.includes(r.id)}
                            onCheckedChange={() => toggleRole(r.id)}
                          />
                          <span className="text-xs">{r.label}</span>
                        </label>
                      ),
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <label className="flex items-center gap-2 rounded border px-3 py-2 cursor-pointer">
              <Checkbox
                checked={notificationsEnabled}
                onCheckedChange={(c) => setNotificationsEnabled(Boolean(c))}
              />
              <span className="text-sm">Enable Notifications</span>
            </label>
            <label className="flex items-center gap-2 rounded border px-3 py-2 cursor-pointer">
              <Checkbox
                checked={tutorialsEnabled}
                onCheckedChange={(c) => setTutorialsEnabled(Boolean(c))}
              />
              <span className="text-sm">Enable Tutorials</span>
            </label>
          </div>
        </div>
      ),
    },
    {
      id: "review",
      title: "Review & Complete",
      description: "Confirm the onboarding payload",
      component: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The configuration below will be stored as JSON for provisioning.
          </p>
          <Textarea
            readOnly
            className="font-mono text-xs min-h-[280px]"
            value={configJson}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              navigator.clipboard
                ?.writeText(configJson)
                .then(() =>
                  toast({
                    title: "Config copied",
                    description: "JSON payload copied to clipboard.",
                  }),
                )
                .catch(() =>
                  toast({
                    title: "Copy failed",
                    description:
                      "Clipboard permissions blocked. Copy manually instead.",
                    variant: "destructive",
                  }),
                );
            }}
          >
            <ClipboardCopy className="h-4 w-4 mr-2" />
            Copy JSON
          </Button>
        </div>
      ),
    },
    {
      id: "complete",
      title: "All Set!",
      description: "You're ready to start using LUCCCA",
      component: (
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-6">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Setup Complete!</h2>
            <p className="text-muted-foreground">
              {organizationName || "Your organization"} is ready to go.
            </p>
          </div>
          <div className="pt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Would you like to take a quick tour of the main features?
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={handleComplete}>
                Skip Tour
              </Button>
              <Button onClick={handleComplete}>
                <Play className="h-4 w-4 mr-2" />
                Start Tour
              </Button>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      if (currentStep === 1 && (!organizationName || !organizationType)) {
        toast({
          title: "Missing information",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }
      if (currentStep === 4 && (!primaryAdminName || !primaryAdminRoleId)) {
        toast({
          title: "Missing information",
          description: "Primary admin name and role are required.",
          variant: "destructive",
        });
        return;
      }
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleComplete = () => {
    setCompleted(true);
    toast({
      title: "Welcome to LUCCCA!",
      description: "Your setup is complete. Let's get started!",
    });
    onComplete?.();
    if (!onComplete && onClose) onClose();
  };

  const handleSkip = () => handleComplete();

  const progress = ((currentStep + 1) / steps.length) * 100;

  if (completed) return null;

  const currentStepData = steps[currentStep];

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <div className="border-b border-border/30 p-4 bg-background/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {currentStepData.title}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {currentStepData.description}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            <SkipForward className="h-4 w-4 mr-2" />
            Skip Setup
          </Button>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex items-center justify-center gap-2 mt-2">
          {steps.map((step, i) => (
            <div
              key={step.id}
              className={cn(
                "h-2 w-2 rounded-full transition-all",
                i <= currentStep ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8">{currentStepData.component}</CardContent>
        </Card>
      </div>
      <div className="border-t border-border/30 p-4 bg-background/50 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </div>
          <Button onClick={handleNext}>
            {currentStep === steps.length - 1 ? (
              <>
                Complete Setup <CheckCircle2 className="h-4 w-4 ml-2" />
              </>
            ) : (
              <>
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
