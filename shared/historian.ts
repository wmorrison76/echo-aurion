export type HistorianChangeType = "created" | "modified" | "deleted";

export type HistorianFileChange = {
  path: string;
  changeType: HistorianChangeType;
  added: number;
  removed: number;
  before?: string | null;
  after?: string | null;
  beforeHash?: string | null;
  afterHash?: string | null;
};

export type HistorianCheckResult = {
  ok: boolean;
  summary: string;
};

export type HistorianChecks = {
  typecheck?: HistorianCheckResult;
  tests?: HistorianCheckResult;
};

export type HistorianSpecReview = {
  reason: string;
  act: string;
  verify: string;
};

export type HistorianEvent = {
  id: string;
  createdAt: number;
  actor: string;
  message: string;
  backupId?: string;
  files: HistorianFileChange[];
  checks?: HistorianChecks;
  specReview?: HistorianSpecReview | null;
  projectSlug?: string | null;
};

export type HistorianListResponse = {
  events: HistorianEvent[];
  nextCursor: string | null;
};
