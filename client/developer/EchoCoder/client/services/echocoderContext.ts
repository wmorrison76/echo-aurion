export type ContextFile = {
  path: string;
  content: string;
  truncated?: boolean;
};

export type ContextPlanResponse = {
  summary?: string;
  plan?: string;
  patches?: Array<{ path: string; content?: string; rationale?: string }>;
};

export async function generateContextPlan(payload: {
  prompt: string;
  files: ContextFile[];
  changeRequestId?: string;
}): Promise<ContextPlanResponse> {
  const response = await fetch("/api/echocoder/context/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  const data = await response.json();
  return data.data;
}
