import path from "path";
import { promises as fs } from "fs";
import { snapshot } from "../zaro-lib";
import { snapshotEncryptionService } from "./SnapshotEncryptionService";

type VaultLocation = "local" | "offsite";

export type VaultEntry = {
  id: string;
  createdAt: string;
  location: VaultLocation;
  sizeBytes: number;
  snapshotPath: string;
  encryptedPath: string;
};

const ROOT = process.cwd();
const LOCAL_DIR = path.join(ROOT, ".zaro", "vault", "local");
const DRILL_REPORTS = path.join(ROOT, ".zaro", "vault", "drill-reports.jsonl");

function getOffsiteDir() {
  const override = process.env.ECHO_VAULT_OFFSITE_DIR;
  if (override) return path.resolve(override);
  return path.join(ROOT, ".zaro", "vault", "offsite");
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function appendDrillReport(report: Record<string, any>) {
  await ensureDir(path.dirname(DRILL_REPORTS));
  const line = JSON.stringify(report);
  await fs.appendFile(DRILL_REPORTS, line + "\n", "utf8");
}

async function readJson(pathname: string) {
  const raw = await fs.readFile(pathname, "utf8");
  return JSON.parse(raw);
}

async function listVaultEntries(dir: string, location: VaultLocation): Promise<VaultEntry[]> {
  const entries = await fs.readdir(dir).catch(() => [] as string[]);
  const results: VaultEntry[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    const full = path.join(dir, entry);
    try {
      const payload = await readJson(full);
      results.push({
        id: payload.id,
        createdAt: payload.createdAt,
        location,
        sizeBytes: payload.sizeBytes,
        snapshotPath: payload.snapshotPath,
        encryptedPath: full,
      });
    } catch {
      continue;
    }
  }
  return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function enforceRetention(dir: string, keep: number) {
  const entries = await fs.readdir(dir).catch(() => [] as string[]);
  const files = await Promise.all(
    entries
      .filter((entry) => entry.endsWith(".json"))
      .map(async (entry) => {
        const full = path.join(dir, entry);
        const stat = await fs.stat(full);
        return { full, mtime: stat.mtimeMs };
      }),
  );
  files.sort((a, b) => b.mtime - a.mtime);
  const toDelete = files.slice(keep);
  for (const file of toDelete) {
    await fs.rm(file.full, { force: true });
  }
}

export async function createVaultBackup(): Promise<{
  local: VaultEntry;
  offsite: VaultEntry;
}> {
  const password = process.env.ECHO_VAULT_PASSWORD;
  if (!password) {
    throw new Error("ECHO_VAULT_PASSWORD is required for vault backups");
  }

  const snapshotInfo = await snapshot(ROOT);
  const snapshotPath = snapshotInfo.snapshotPath;
  const snapshotBuffer = await fs.readFile(snapshotPath);
  const encrypted = await snapshotEncryptionService.encryptSnapshot(
    snapshotBuffer,
    password,
  );

  const id = `vault_${Date.now()}`;
  const payload = {
    id,
    createdAt: new Date().toISOString(),
    snapshotPath,
    sizeBytes: encrypted.data.length,
    algorithm: encrypted.algorithm,
    compression: encrypted.compression,
    salt: encrypted.salt,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    data: encrypted.data.toString("base64"),
  };

  await ensureDir(LOCAL_DIR);
  const localPath = path.join(LOCAL_DIR, `${id}.json`);
  await fs.writeFile(localPath, JSON.stringify(payload, null, 2), "utf8");

  const offsiteDir = getOffsiteDir();
  await ensureDir(offsiteDir);
  const offsitePath = path.join(offsiteDir, `${id}.json`);
  await fs.writeFile(offsitePath, JSON.stringify(payload, null, 2), "utf8");

  const retention = Number(process.env.ECHO_VAULT_RETENTION || "5");
  await enforceRetention(LOCAL_DIR, retention);
  await enforceRetention(offsiteDir, retention);

  return {
    local: {
      id,
      createdAt: payload.createdAt,
      location: "local",
      sizeBytes: payload.sizeBytes,
      snapshotPath,
      encryptedPath: localPath,
    },
    offsite: {
      id,
      createdAt: payload.createdAt,
      location: "offsite",
      sizeBytes: payload.sizeBytes,
      snapshotPath,
      encryptedPath: offsitePath,
    },
  };
}

export async function listVault(): Promise<{
  local: VaultEntry[];
  offsite: VaultEntry[];
}> {
  await ensureDir(LOCAL_DIR);
  const offsiteDir = getOffsiteDir();
  await ensureDir(offsiteDir);

  const local = await listVaultEntries(LOCAL_DIR, "local");
  const offsite = await listVaultEntries(offsiteDir, "offsite");
  return { local, offsite };
}

export async function runRestoreDrill(): Promise<{
  ok: boolean;
  durationMs: number;
  source: VaultLocation;
  restoredBytes: number;
}> {
  const started = Date.now();
  const password = process.env.ECHO_VAULT_PASSWORD;
  if (!password) {
    throw new Error("ECHO_VAULT_PASSWORD is required for restore drills");
  }

  const vaults = await listVault();
  const candidate =
    vaults.offsite[0] || vaults.local[0] || null;
  if (!candidate) {
    throw new Error("No vault entries found");
  }

  const payload = await readJson(candidate.encryptedPath);
  const decrypted = await snapshotEncryptionService.decryptSnapshot(
    {
      data: Buffer.from(payload.data, "base64"),
      iv: payload.iv,
      authTag: payload.authTag,
      salt: payload.salt,
      algorithm: payload.algorithm,
      compression: payload.compression,
    },
    password,
  );

  const result = {
    ok: true,
    durationMs: Date.now() - started,
    source: candidate.location,
    restoredBytes: decrypted.data.length,
  };
  await appendDrillReport({
    ...result,
    ranAt: new Date().toISOString(),
    vaultId: candidate.id,
  });
  return result;
}

export function scheduleRestoreDrill() {
  const intervalMinutes = Number(
    process.env.ECHO_VAULT_DRILL_INTERVAL_MINUTES || "0",
  );
  if (!intervalMinutes || intervalMinutes <= 0) return;
  const intervalMs = intervalMinutes * 60 * 1000;

  setInterval(async () => {
    try {
      await runRestoreDrill();
    } catch (error) {
      console.error("Vault restore drill failed:", error);
    }
  }, intervalMs);
}
