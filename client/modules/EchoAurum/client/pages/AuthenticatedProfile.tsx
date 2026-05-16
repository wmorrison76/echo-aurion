import { AlertTriangle, Loader2 } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { useAuthenticatedProfile } from "@/modules/profile/hooks/useAuthenticatedProfile";
import {
  ProfileComplianceSection,
  ProfileConnectorsSection,
  ProfileIdentitySection,
  ProfileMetricsSection,
  ProfileRecommendationsSection,
  ProfileSecuritySection,
  ProfileTimelineSection,
  ProfileWorkflowSection,
} from "@/modules/profile/components";
export default function AuthenticatedProfile() {
  const { status, data, message } = useAuthenticatedProfile();
  return (
    <PageLayout>
      {" "}
      <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-24 sm:px-10">
        {" "}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top,_rgba(236,211,133,0.18)_0%,_rgba(12,18,35,0)_65%)]" />{" "}
        <div className="relative">
          {" "}
          {status === "loading" ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-border/40 bg-surface/90 p-12 text-sm text-muted-foreground">
              {" "}
              <Loader2 className="h-6 w-6 animate-spin text-aurum-300" />{" "}
              Loading authenticated profile…{" "}
            </div>
          ) : null}{" "}
          {status === "error" ? (
            <div className="flex items-start gap-3 rounded-3xl border border-red-500/40 bg-red-500/10 p-8 text-sm text-red-100">
              {" "}
              <AlertTriangle className="mt-1 h-5 w-5 text-red-200" />{" "}
              <div>
                {" "}
                <p className="text-base font-semibold">
                  Unable to load profile telemetry
                </p>{" "}
                <p className="mt-1 text-xs text-red-100/80">{message}</p>{" "}
              </div>{" "}
            </div>
          ) : null}{" "}
          {status === "ready" && data ? (
            <div className="space-y-10">
              {" "}
              <ProfileIdentitySection identity={data.identity} />{" "}
              <ProfileMetricsSection
                metrics={data.metrics}
                compliance={data.compliance}
              />{" "}
              <ProfileWorkflowSection
                automationRuns={data.automationRuns}
                compliance={data.compliance}
              />{" "}
              <ProfileComplianceSection compliance={data.compliance} />{" "}
              <div className="grid gap-6 lg:grid-cols-2">
                {" "}
                <ProfileSecuritySection sessions={data.sessions} />{" "}
                <ProfileConnectorsSection connectors={data.connectors} />{" "}
              </div>{" "}
              <ProfileTimelineSection timeline={data.timeline} />{" "}
              <ProfileRecommendationsSection
                recommendations={data.recommendations}
              />{" "}
            </div>
          ) : null}{" "}
        </div>{" "}
      </div>{" "}
    </PageLayout>
  );
}
