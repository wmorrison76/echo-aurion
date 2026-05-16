export type TarEntry = { name: string; mode: number; size: number; type: string; data: Uint8Array };

function text(buf: Uint8Array){ return new TextDecoder('utf-8').decode(buf); }
function parseOct(buf: Uint8Array){ const s = text(buf).replace(/\0.*$/,'').trim(); return s ? parseInt(s, 8) : 0; }

export function parseTar(u8: Uint8Array): TarEntry[] {
  const entries: TarEntry[] = [];
  const BLOCK = 512;
  let offset = 0;
  while (offset + BLOCK <= u8.length) {
    const header = u8.subarray(offset, offset + BLOCK);
    const name = text(header.subarray(0, 100)).replace(/\0.*$/, '');
    if (!name) break; // end
    const mode = parseOct(header.subarray(100, 108));
    const size = parseOct(header.subarray(124, 136));
    const typeflag = String.fromCharCode(header[156] || 0) || '0';
    offset += BLOCK;
    const fileData = u8.subarray(offset, offset + size);
    const data = new Uint8Array(fileData); // copy slice
    const pad = (BLOCK - (size % BLOCK)) % BLOCK;
    offset += size + pad;
    entries.push({ name, mode, size, type: typeflag, data });
  }
  return entries;
}

export function tarToFilesMap(entries: TarEntry[]): Record<string,string> {
  const out: Record<string,string> = {};
  for(const e of entries){
    if(e.type === '0' || e.type === '\u0000'){ // file
      out['/' + e.name.replace(/^\/+/, '')] = text(e.data);
    }
  }
  return out;
}
