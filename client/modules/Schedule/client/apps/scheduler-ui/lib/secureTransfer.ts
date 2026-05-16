export interface TransferRecord {
  id: string;
  ts: number;
  vendor: string;
  filename: string;
  bytes: number;
  sha256: string;
}
async function sha256Web(data: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", data as BufferSource);
  const b = new Uint8Array(digest);
  return Array.from(b)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export async function secureSend(
  vendor: string,
  filename: string,
  content: string | Uint8Array,
  writeAudit: (rec: TransferRecord) => void,
) {
  const buf =
    typeof content === "string" ? new TextEncoder().encode(content) : content;
  let hash = "";
  if (typeof window !== "undefined" && crypto?.subtle) {
    hash = await sha256Web(buf);
  } else {
    const nodeCrypto = await import("crypto");
    hash = nodeCrypto
      .createHash("sha256")
      .update(Buffer.from(buf))
      .digest("hex");
  }
  const rec: TransferRecord = {
    id: Math.random().toString(36).slice(2),
    ts: Date.now(),
    vendor,
    filename,
    bytes: buf.length,
    sha256: hash,
  };
  writeAudit(rec);
  return rec;
}
