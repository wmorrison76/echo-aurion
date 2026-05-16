export type PatchInput = { path: string; content: string };

export type PatchPreview = {
  path: string;
  exists?: boolean;
  before?: string;
  after?: string;
  error?: string;
};

export async function previewPatches(payload: {
  tenantId?: string;
  patches: PatchInput[];
}): Promise<PatchPreview[]> {
  const response = await fetch("/api/echocoder/patch/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  const data = await response.json();
  return data.previews || [];
}

export async function stagePatches(payload: {
  changeRequestId: string;
  patches: PatchInput[];
}) {
  const response = await fetch("/api/echocoder/patch/stage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return await response.json();
}
