const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function base64ToBytes(b64: string): Uint8Array {
  b64 = b64.replace(/[^A-Za-z0-9+/=]/g, '');
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < b64.length; i++) {
    const ch = b64[i];
    if (ch === '=') break;
    const val = alphabet.indexOf(ch);
    if (val < 0) continue;
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

export function base64ToString(b64: string): string {
  try {
    if (typeof atob === 'function') return atob(b64);
  } catch {}
  const bytes = base64ToBytes(b64);
  try { return new TextDecoder().decode(bytes); } catch { return String.fromCharCode.apply(null, Array.from(bytes)); }
}
