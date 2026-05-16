import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
const ENV_FLAGS: Array<{
  key: string;
  description: string;
  defaultValue: string;
}> = [
  {
    key: "VITE_MAESTRO_COMMITTEE_MODE",
    description: "dual or triple — enables historian agent in triple mode",
    defaultValue: "dual",
  },
  {
    key: "VITE_MAESTRO_COMMITTEE_ENFORCE_HARD_STOPS",
    description: "true to block on policy failures instead of soft approvals",
    defaultValue: "true",
  },
  {
    key: "VITE_MAESTRO_COMMITTEE_UNDER_ORDER_THRESHOLD",
    description: "max acceptable stockout probability (decimal)",
    defaultValue: "0.0025",
  },
  {
    key: "VITE_MAESTRO_COMMITTEE_ESCALATION_DELTA_PCT",
    description: "spend delta (decimal) that forces escalation",
    defaultValue: "0.08",
  },
  {
    key: "VITE_MAESTRO_WEIGHT_COST",
    description: "weight for total spend in scoring",
    defaultValue: "0.35",
  },
  {
    key: "VITE_MAESTRO_WEIGHT_WASTE",
    description: "weight for projected waste",
    defaultValue: "0.20",
  },
  {
    key: "VITE_MAESTRO_WEIGHT_STOCKOUT",
    description: "weight for stockout risk",
    defaultValue: "0.20",
  },
  {
    key: "VITE_MAESTRO_WEIGHT_SHELF",
    description: "weight for shelf-life violations",
    defaultValue: "0.15",
  },
  {
    key: "VITE_MAESTRO_WEIGHT_QC",
    description: "weight for QC failure risk",
    defaultValue: "0.05",
  },
  {
    key: "VITE_MAESTRO_WEIGHT_LABOR",
    description: "weight for overtime labor",
    defaultValue: "0.05",
  },
];
export function CommitteeDocsCard() {
  return (
    <Card className="border border-slate-800/70 bg-card">
      {" "}
      <CardHeader>
        {" "}
        <CardTitle className="text-lg text-slate-100">
          Implementation Notes
        </CardTitle>{" "}
        <CardDescription className="text-slate-300">
          {" "}
          Surface environment toggles, rollout guidance, and guardrail behavior
          for Maestro committee orchestration.{" "}
        </CardDescription>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-6">
        {" "}
        <section className="space-y-2">
          {" "}
          <h3 className="text-sm font-semibold text-slate-100">
            Rollout Checklist
          </h3>{" "}
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
            {" "}
            <li>
              Use dual mode for baseline Planner + Risk runs, switch to triple
              when Historian signals are available.
            </li>{" "}
            <li>
              Keep hard stops enabled for production; disable only in controlled
              pilots.
            </li>{" "}
            <li>
              Review spend delta and stockout tolerance with finance before
              adjusting thresholds.
            </li>{" "}
            <li>
              Document per-tenant overrides in your deployment manifest along
              with data lineage notes.
            </li>{" "}
          </ul>{" "}
        </section>{" "}
        <section className="space-y-3">
          {" "}
          <div className="flex items-center justify-between">
            {" "}
            <h3 className="text-sm font-semibold text-slate-100">
              Environment Flags
            </h3>{" "}
            <Badge
              variant="outline"
              className="border-border text-[0.7rem] uppercase tracking-[0.2em]"
            >
              {" "}
              Default reference{" "}
            </Badge>{" "}
          </div>{" "}
          <div className="space-y-3">
            {" "}
            {ENV_FLAGS.map((flag) => (
              <div
                key={flag.key}
                className="rounded-md border border-slate-800/70 bg-surface p-3"
              >
                {" "}
                <p className="font-mono text-xs text-sky-200">
                  {flag.key}
                </p>{" "}
                <p className="text-sm text-slate-200">{flag.description}</p>{" "}
                <p className="text-xs text-slate-400">
                  Default: {flag.defaultValue}
                </p>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </section>{" "}
        <section className="space-y-2">
          {" "}
          <h3 className="text-sm font-semibold text-slate-100">
            Using the Config
          </h3>{" "}
          <p className="text-sm text-slate-300">
            {" "}
            Call{" "}
            <span className="font-semibold text-sky-200">
              resolveCommitteeConfig
            </span>{" "}
            in server code or React hooks and supply overrides captured from
            this panel. Wrap the result when calling{" "}
            <span className="ml-1 font-semibold text-sky-200">
              runCommittee
            </span>{" "}
            so scoring and constraints stay aligned across Planner, Risk, and
            Historian agents.{" "}
          </p>{" "}
          <p className="text-xs text-slate-400">
            {" "}
            Any override not supplied inherits from the defaults above or live
            environment values.{" "}
          </p>{" "}
        </section>{" "}
      </CardContent>{" "}
    </Card>
  );
}
