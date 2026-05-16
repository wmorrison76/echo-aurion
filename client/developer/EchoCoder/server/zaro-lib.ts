import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import zlib from "zlib";

export type ManifestEntry = { path: string; size: number; sha256: string };
export type Manifest = { createdAt: string; files: ManifestEntry[] };

const IGNORES = ["node_modules", ".git", "dist", ".zaro", ".DS_Store"];

function isIgnored(p: string) {
  return IGNORES.some((seg) => p.split(path.sep).includes(seg));
}

export async function listFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string) {
    const ents = await fs.readdir(dir, { withFileTypes: true });
    for (const ent of ents) {
      const abs = path.join(dir, ent.name);
      if (isIgnored(abs)) continue;
      if (ent.isDirectory()) await walk(abs);
      else out.push(abs);
    }
  }
  await walk(root);
  return out;
}

export async function sha256(buf: Buffer): Promise<string> {
  const hash = crypto.createHash("sha256");
  hash.update(buf);
  return hash.digest("hex");
}

export async function buildManifest(
  roots: string[],
  cwd: string,
): Promise<Manifest> {
  const files: ManifestEntry[] = [];
  for (const r of roots) {
    const absRoot = path.resolve(cwd, r);
    try {
      const stats = await fs.stat(absRoot).catch(() => null);
      if (!stats) continue;
      const filePaths = stats.isDirectory()
        ? await listFiles(absRoot)
        : [absRoot];
      for (const p of filePaths) {
        const buf = await fs.readFile(p);
        files.push({
          path: path.relative(cwd, p).replace(/\\/g, "/"),
          size: buf.length,
          sha256: await sha256(buf),
        });
      }
    } catch {
      // skip unreadable
    }
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  return { createdAt: new Date().toISOString(), files };
}

// Minimal TAR writer (ustar) for regular files
function pad(buf: Buffer, size: number) {
  if (buf.length % size === 0) return buf;
  const padLen = size - (buf.length % size);
  return Buffer.concat([buf, Buffer.alloc(padLen, 0)]);
}

function oct(n: number, len: number) {
  const s = n.toString(8);
  return Buffer.from(s.padStart(len - 1, "0") + "\0");
}

function header(name: string, size: number, mode = 0o644): Buffer {
  const b = Buffer.alloc(512, 0);
  const nameBuf = Buffer.from(name);
  nameBuf.copy(b, 0, 0, Math.min(100, nameBuf.length));
  oct(mode, 8).copy(b, 100);
  oct(0, 8).copy(b, 108); // uid
  oct(0, 8).copy(b, 116); // gid
  oct(size, 12).copy(b, 124);
  oct(Math.floor(Date.now() / 1000), 12).copy(b, 136);
  // checksum placeholder (spaces)
  Buffer.from("        ").copy(b, 148);
  b[156] = "0".charCodeAt(0); // typeflag file
  Buffer.from("ustar\0").copy(b, 257);
  Buffer.from("00").copy(b, 263);
  // compute checksum
  let sum = 0;
  for (let i = 0; i < 512; i++) {
    sum += b[i];
  }
  oct(sum, 8).copy(b, 148);
  return b;
}

export async function createTarGzFromFiles(
  cwd: string,
  relPaths: string[],
): Promise<Buffer> {
  const parts: Buffer[] = [];
  for (const rel of relPaths) {
    const abs = path.join(cwd, rel);
    const data = await fs.readFile(abs);
    const h = header(rel, data.length);
    parts.push(h);
    parts.push(pad(data, 512));
  }
  // Two 512-byte zero blocks indicate end of archive
  parts.push(Buffer.alloc(1024, 0));
  const tarBuf = Buffer.concat(parts);
  const gz = zlib.gzipSync(tarBuf, { level: 9 });
  return gz;
}

// Create a tar.gz archive from an in-memory file map (relative path -> utf8 string or Buffer)
export async function createTarGzFromMap(
  files: Record<string, string | Buffer>,
): Promise<Buffer> {
  const parts: Buffer[] = [];
  for (const [relRaw, content] of Object.entries(files)) {
    const rel = String(relRaw).replace(/^\/+/, "");
    const data = Buffer.isBuffer(content)
      ? content
      : Buffer.from(
          typeof content === "string" ? content : String(content),
          "utf8",
        );
    const h = header(rel, data.length);
    parts.push(h);
    parts.push(pad(data, 512));
  }
  // End of archive blocks
  parts.push(Buffer.alloc(1024, 0));
  const tarBuf = Buffer.concat(parts);
  const gz = zlib.gzipSync(tarBuf, { level: 9 });
  return gz;
}

export function parseTar(u8: Buffer): { name: string; data: Buffer }[] {
  const entries: { name: string; data: Buffer }[] = [];
  const BLOCK = 512;
  let offset = 0;
  while (offset + BLOCK <= u8.length) {
    const header = u8.subarray(offset, offset + BLOCK);
    const nameRaw = header.subarray(0, 100);
    const name = nameRaw.toString("utf8").replace(/\0.*$/, "");
    if (!name) break;
    const sizeOct = header
      .subarray(124, 136)
      .toString("utf8")
      .replace(/\0.*$/, "")
      .trim();
    const size = sizeOct ? parseInt(sizeOct, 8) : 0;
    offset += BLOCK;
    const data = u8.subarray(offset, offset + size);
    const padLen = (BLOCK - (size % BLOCK)) % BLOCK;
    offset += size + padLen;
    entries.push({ name, data: Buffer.from(data) });
  }
  return entries;
}

export async function writeBuffer(filePath: string, buf: Buffer) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buf);
}

export async function snapshot(cwd: string) {
  const roots = [
    "client",
    "shared",
    "server",
    "public",
    "netlify",
    "package.json",
    "tsconfig.json",
    "vite.config.ts",
    "tailwind.config.ts",
  ];
  const manifest = await buildManifest(roots, cwd);
  const rels = manifest.files.map((f) => f.path);
  const gz = await createTarGzFromFiles(cwd, rels);
  const zdir = path.join(cwd, ".zaro", "snapshots");
  await fs.mkdir(zdir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const snapPath = path.join(zdir, `snapshot-${stamp}.tar.gz`);
  await fs.writeFile(snapPath, gz);
  const mpath = path.join(cwd, ".zaro", "manifest.json");
  await fs.writeFile(mpath, JSON.stringify(manifest, null, 2));
  return {
    manifestPath: mpath,
    snapshotPath: snapPath,
    files: manifest.files.length,
  };
}

export async function integrity(cwd: string) {
  const mpath = path.join(cwd, ".zaro", "manifest.json");
  const exists = await fs.stat(mpath).catch(() => null);
  if (!exists) return { ok: false, error: "No manifest found" } as const;
  const manifest: Manifest = JSON.parse(await fs.readFile(mpath, "utf8"));
  const current = await buildManifest(
    manifest.files.map((f) => f.path),
    cwd,
  );
  const byPath = new Map(current.files.map((f) => [f.path, f] as const));
  const changes: { path: string; change: "modified" | "missing" | "new" }[] =
    [];
  for (const f of manifest.files) {
    const cur = byPath.get(f.path);
    if (!cur) changes.push({ path: f.path, change: "missing" });
    else if (cur.sha256 !== f.sha256)
      changes.push({ path: f.path, change: "modified" });
    byPath.delete(f.path);
  }
  for (const [p] of byPath) {
    changes.push({ path: p, change: "new" });
  }
  return { ok: true, changes } as const;
}

async function readLabels(cwd: string): Promise<Record<string, string>> {
  try {
    const s = await fs.readFile(path.join(cwd, ".zaro", "labels.json"), "utf8");
    return JSON.parse(s) || {};
  } catch {
    return {};
  }
}
async function writeLabels(cwd: string, labels: Record<string, string>) {
  const dir = path.join(cwd, ".zaro");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "labels.json"),
    JSON.stringify(labels, null, 2),
    "utf8",
  );
}
export async function setLabel(cwd: string, name: string, label: string) {
  const labels = await readLabels(cwd);
  labels[name] = label;
  await writeLabels(cwd, labels);
  return { ok: true } as const;
}

export async function listSnapshots(cwd: string) {
  const zdir = path.join(cwd, ".zaro", "snapshots");
  const labels = await readLabels(cwd);
  const ents = await fs
    .readdir(zdir, { withFileTypes: true })
    .catch(() => [] as any);
  const list: { name: string; mtime: number; size: number; label?: string }[] =
    [];
  for (const ent of ents) {
    if (!ent.isFile()) continue;
    if (!/\.tar\.gz$/.test(ent.name)) continue;
    const st = await fs
      .stat(path.join(zdir, ent.name))
      .catch(() => null as any);
    if (!st) continue;
    list.push({
      name: ent.name,
      mtime: st.mtimeMs,
      size: st.size,
      label: labels[ent.name],
    });
  }
  list.sort((a, b) => a.mtime - b.mtime);
  return list;
}

export async function restore(cwd: string, name?: string) {
  const zdir = path.join(cwd, ".zaro", "snapshots");
  let target = name;
  if (!target) {
    const list = await listSnapshots(cwd);
    if (list.length === 0) return { ok: false, error: "No snapshots" } as const;
    target = list[list.length - 1].name;
  }
  const gz = await fs.readFile(path.join(zdir, target!));
  const tar = zlib.gunzipSync(gz);
  const entries = parseTar(tar);
  for (const e of entries) {
    const fp = path.join(cwd, e.name);
    await fs.mkdir(path.dirname(fp), { recursive: true });
    await fs.writeFile(fp, e.data);
  }
  return { ok: true, restored: entries.length, snapshot: target } as const;
}
