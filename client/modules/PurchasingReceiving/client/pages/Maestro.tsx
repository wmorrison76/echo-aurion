import { AppLayout } from "@/components/AppLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CommitteeConfigPanel } from "@/components/maestro/CommitteeConfigPanel";
import { CommitteeDocsCard } from "@/components/maestro/CommitteeDocsCard";
export default function Maestro() {
  return (
    <AppLayout>
      {" "}
      <div className="space-y-6">
        {" "}
        <Card className="border border-violet-500/20 bg-card">
          {" "}
          <CardHeader className="space-y-2">
            {" "}
            <div className="flex flex-wrap items-center gap-3">
              {" "}
              <CardTitle className="text-xl font-semibold text-violet-100">
                {" "}
                Maestro Committee Control Center{" "}
              </CardTitle>{" "}
              <Badge className="border-violet-400/60 bg-violet-500/10 text-[0.7rem] uppercase tracking-[0.28em] text-violet-200">
                {" "}
                Alpha{" "}
              </Badge>{" "}
            </div>{" "}
            <CardDescription className="text-sm text-violet-100/80">
              {" "}
              Tune Planner, Risk, and Historian orchestration before executing
              Maestro runs. All changes are exportable as overrides or
              environment variables for deployments.{" "}
            </CardDescription>{" "}
          </CardHeader>{" "}
          <CardContent className="grid gap-3 text-sm text-slate-300 md:grid-cols-3">
            {" "}
            <div>
              {" "}
              <p className="font-semibold text-slate-200">Modes</p>{" "}
              <p>
                Dual-core keeps Historian disabled. Triple-core activates
                history-driven fixes.
              </p>{" "}
            </div>{" "}
            <div>
              {" "}
              <p className="font-semibold text-slate-200">Guardrails</p>{" "}
              <p>
                Hard stops ensure policy adherence and escalation thresholds for
                finance review.
              </p>{" "}
            </div>{" "}
            <div>
              {" "}
              <p className="font-semibold text-slate-200">Scoring</p>{" "}
              <p>
                Weights balance spend, waste, stockout risk, shelf life, QC, and
                labor exposures.
              </p>{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),minmax(0,360px)]">
          {" "}
          <CommitteeConfigPanel /> <CommitteeDocsCard />{" "}
        </div>{" "}
      </div>{" "}
    </AppLayout>
  );
}
