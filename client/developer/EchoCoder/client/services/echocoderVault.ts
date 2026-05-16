export type VaultEntry = {
  id: string;
  createdAt: string;
  location: "local" | "offsite";
  sizeBytes: number;
  snapshotPath: string;
  encryptedPath: string;
};

export async function fetchVaultStatus(): Promise<{
  local: VaultEntry[];
  offsite: VaultEntry[];
}> {
  const response = await fetch("/api/vault/status");
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  const data = await response.json();
  return data.vault;
}

export async function triggerVaultBackup() {
  const response = await fetch("/api/vault/backup", { method: "POST" });
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return await response.json();
}

export async function triggerVaultDrill() {
  const response = await fetch("/api/vault/drill", { method: "POST" });
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return await response.json();
}
