import crypto from 'crypto';

export interface TransferRecord { id: string; ts: number; vendor: string; filename: string; bytes: number; sha256: string; }

export function sha256(data: Buffer|string){ return crypto.createHash('sha256').update(data).digest('hex'); }

export async function secureSend(vendor: string, filename: string, content: string|Buffer, writeAudit: (rec:TransferRecord)=>void){
  const buf = Buffer.isBuffer(content)? content : Buffer.from(content);
  const rec: TransferRecord = { id: crypto.randomBytes(8).toString('hex'), ts: Date.now(), vendor, filename, bytes: buf.length, sha256: sha256(buf) };
  // In prod: encrypt with PGP and SFTP/HTTPS upload. Here we only hash and audit.
  writeAudit(rec);
  return rec;
}
