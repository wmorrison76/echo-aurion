export type CompetitorPlatform =
  | "M3"
  | "Intacct"
  | "QuickBooks"
  | "OracleNetSuite";
export interface CompetitorExport {
  platform: CompetitorPlatform;
  files: {
    name: string;
    type: "csv" | "xlsx" | "json";
    sizeKb: number;
    records: number;
  }[];
  glCodes: string[];
  apVendors: number;
  payrollProfiles: number;
  notes?: string;
}
export interface ApiAdapterPlan {
  platform: CompetitorPlatform;
  status: "ready" | "beta" | "roadmap";
  adapterId: string;
  coverage: string[];
  zapierWorkflowId?: string;
}
export interface ImportWizardStep {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  glCodes: string[];
  apiAdapter?: ApiAdapterPlan;
}
export interface MigrationToolkitReport {
  totalRecords: number;
  totalVendors: number;
  totalPayrollProfiles: number;
  steps: ImportWizardStep[];
  adapters: ApiAdapterPlan[];
  readinessScore: number;
  blockers: string[];
}
export interface MigrationToolkitInput {
  exports: CompetitorExport[];
}
const PLATFORM_ADAPTERS: Record<CompetitorPlatform, ApiAdapterPlan> = {
  M3: {
    platform: "M3",
    status: "ready",
    adapterId: "adapter-m3-ledger",
    coverage: ["GL", "AP", "Bank Recs"],
    zapierWorkflowId: "zapier:workflow:m3-sync",
  },
  Intacct: {
    platform: "Intacct",
    status: "ready",
    adapterId: "adapter-intacct-ledger",
    coverage: ["GL", "Projects", "AP"],
    zapierWorkflowId: "zapier:workflow:intacct-sync",
  },
  QuickBooks: {
    platform: "QuickBooks",
    status: "beta",
    adapterId: "adapter-qbo-ledger",
    coverage: ["GL", "AP"],
    zapierWorkflowId: "zapier:workflow:qbo-sync",
  },
  OracleNetSuite: {
    platform: "OracleNetSuite",
    status: "roadmap",
    adapterId: "adapter-netsuite-ledger",
    coverage: ["GL", "Revenue"],
  },
};
export function buildMigrationToolkit(
  input: MigrationToolkitInput,
): MigrationToolkitReport {
  const exports = input.exports ?? [];
  const adapters = dedupeAdapters(
    exports.map((item) => PLATFORM_ADAPTERS[item.platform]),
  );
  const steps = exports.flatMap((item) => buildWizardSteps(item, adapters));
  const totals = exports.reduce(
    (acc, item) => {
      const fileRecords = item.files.reduce(
        (sum, file) => sum + file.records,
        0,
      );
      acc.records += fileRecords;
      acc.vendors += item.apVendors;
      acc.payroll += item.payrollProfiles;
      return acc;
    },
    { records: 0, vendors: 0, payroll: 0 },
  );
  const readinessScore = calculateReadinessScore(
    adapters,
    totals.records,
    totals.vendors,
  );
  const blockers = exports
    .filter((item) => PLATFORM_ADAPTERS[item.platform].status !== "ready")
    .map(
      (item) =>
        `${item.platform} adapter in ${PLATFORM_ADAPTERS[item.platform].status} status.`,
    );
  steps.sort((a, b) => a.estimatedMinutes - b.estimatedMinutes);
  return {
    totalRecords: totals.records,
    totalVendors: totals.vendors,
    totalPayrollProfiles: totals.payroll,
    steps,
    adapters,
    readinessScore,
    blockers,
  };
}
function buildWizardSteps(
  exportSet: CompetitorExport,
  adapters: ApiAdapterPlan[],
): ImportWizardStep[] {
  const adapter = adapters.find((item) => item.platform === exportSet.platform);
  const baseMinutes = Math.max(
    15,
    Math.round(
      exportSet.files.reduce(
        (sum, file) => sum + Math.min(file.records / 150, 45),
        0,
      ),
    ),
  );
  return [
    {
      id: `${exportSet.platform.toLowerCase()}-ingest`,
      title: `${exportSet.platform} data ingest`,
      description: `Normalize ${exportSet.files.length} files (${exportSet.glCodes.join(",")}) into EchoLedger staging tables.`,
      estimatedMinutes: baseMinutes,
      glCodes: exportSet.glCodes,
      apiAdapter: adapter,
    },
    {
      id: `${exportSet.platform.toLowerCase()}-validation`,
      title: `${exportSet.platform} validation`,
      description: `Reconcile ${exportSet.apVendors} vendors and ${exportSet.payrollProfiles} payroll profiles against LUCCCA master data.`,
      estimatedMinutes: Math.max(10, Math.round(exportSet.apVendors / 10)),
      glCodes: exportSet.glCodes,
      apiAdapter: adapter,
    },
  ];
}
function calculateReadinessScore(
  adapters: ApiAdapterPlan[],
  records: number,
  vendors: number,
) {
  const adapterScore = adapters.reduce(
    (sum, adapter) => sum + statusWeight(adapter.status),
    0,
  );
  const adapterPotential = adapters.length * statusWeight("ready");
  const adapterPercent =
    adapterPotential === 0 ? 0 : adapterScore / adapterPotential;
  const dataHealth =
    clamp(records / 5000, 0, 1) * 0.4 + clamp(vendors / 500, 0, 1) * 0.2 + 0.4;
  return Math.round((adapterPercent * 0.6 + dataHealth * 0.4) * 100);
}
function statusWeight(status: ApiAdapterPlan["status"]) {
  switch (status) {
    case "ready":
      return 1;
    case "beta":
      return 0.6;
    default:
      return 0.3;
  }
}
function dedupeAdapters(adapters: ApiAdapterPlan[]) {
  const map = new Map<CompetitorPlatform, ApiAdapterPlan>();
  for (const adapter of adapters) {
    if (!map.has(adapter.platform)) {
      map.set(adapter.platform, adapter);
    }
  }
  return [...map.values()];
}
function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
