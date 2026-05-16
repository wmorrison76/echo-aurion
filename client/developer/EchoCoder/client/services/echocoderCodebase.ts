export type IndexedFile = {
  path: string;
  size: number;
  extension: string;
};

export async function fetchCodebaseIndex(): Promise<IndexedFile[]> {
  const response = await fetch("/api/echocoder/codebase/index");
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  const data = await response.json();
  return data.files || [];
}

export async function fetchCodeFile(
  filePath: string,
): Promise<{ content: string; truncated: boolean }> {
  const response = await fetch(
    `/api/echocoder/codebase/file?path=${encodeURIComponent(filePath)}`,
  );
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  const data = await response.json();
  return data.file;
}
