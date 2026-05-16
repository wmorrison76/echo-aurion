import { create } from 'zustand';

function b64enc(buf: ArrayBuffer){ return btoa(String.fromCharCode(...new Uint8Array(buf))); }
function b64dec(b64: string){ const bin=atob(b64); const arr=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i); return arr.buffer; }

async function deriveKey(pass: string, saltB64: string){
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
  const salt = saltB64? b64dec(saltB64) : crypto.getRandomValues(new Uint8Array(16)).buffer;
  const algo = { name: 'PBKDF2', hash: 'SHA-256', iterations: 120000, salt } as Pbkdf2Params;
  const key = await crypto.subtle.deriveKey(algo, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt','decrypt']);
  const saltOut = b64enc(salt);
  return { key, saltOut };
}

let sessionKey: CryptoKey | null = null;

interface SecurityState {
  encryptionEnabled: boolean;
  hasKey: boolean;
  setEncryptionEnabled: (v: boolean)=> void;
  setPassphrase: (pass: string)=> Promise<void>;
  clearPassphrase: ()=> void;
  encryptString: (plain: string)=> Promise<string>; // returns JSON string {iv, ct}
  decryptString: (payload: string)=> Promise<string>;
}

export const useSecurityStore = create<SecurityState>()((set,get)=>({
  encryptionEnabled: (()=>{ try{ return localStorage.getItem('security:enabled')==='1'; }catch{ return false; } })(),
  hasKey: false,
  setEncryptionEnabled: (v)=>{ try{ localStorage.setItem('security:enabled', v? '1':'0'); }catch{} set({ encryptionEnabled: v }); },
  setPassphrase: async (pass)=>{
    const prevSalt = localStorage.getItem('security:salt') || '';
    const { key, saltOut } = await deriveKey(pass, prevSalt);
    sessionKey = key; set({ hasKey: true });
    if(!prevSalt) try{ localStorage.setItem('security:salt', saltOut); }catch{}
  },
  clearPassphrase: ()=>{ sessionKey = null; set({ hasKey: false }); },
  encryptString: async (plain)=>{
    if(!sessionKey) throw new Error('No key');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, sessionKey, new TextEncoder().encode(plain));
    return JSON.stringify({ iv: b64enc(iv.buffer), ct: b64enc(ct) });
  },
  decryptString: async (payload)=>{
    if(!sessionKey) throw new Error('No key');
    const { iv, ct } = JSON.parse(payload);
    const pt = await crypto.subtle.decrypt({ name:'AES-GCM', iv: b64dec(iv) }, sessionKey, b64dec(ct));
    return new TextDecoder().decode(pt);
  }
}));

export default useSecurityStore;
