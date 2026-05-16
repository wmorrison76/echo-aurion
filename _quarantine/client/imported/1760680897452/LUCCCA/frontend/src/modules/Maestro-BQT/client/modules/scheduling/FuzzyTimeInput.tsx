import React from 'react';
import { useScheduleSettings } from './scheduleSettingsStore';

function toDisplay(value: string, format: '12'|'24'){
  if(!value) return '';
  const [H,M] = value.split(':').map(Number);
  if(format==='24') return `${String(H).padStart(2,'0')}:${String(M).padStart(2,'0')}`;
  const ampm = H<12? 'AM':'PM'; const h = (H%12)||12; return `${String(h).padStart(2,'0')}:${String(M).padStart(2,'0')} ${ampm}`;
}
function toValue(input: string){
  // Accept forms like "5", "515", "5:15", "5pm", "12:30 am", "1700"
  const lower = input.toLowerCase();
  const hasA = /a/.test(lower);
  const hasP = /p/.test(lower);
  const s = lower.replace(/[^0-9]/g,'');
  const base = (()=>{
    if(s.length<=2){ const H = Number(s)||0; return { H, M:0 }; }
    const H = Number(s.slice(0, s.length-2)); const M = Number(s.slice(-2)); return { H, M };
  })();
  let H24 = base.H;
  let M = base.M;
  const mm = Math.round(M/15)*15 % 60;
  const carry = Math.floor((M+7)/60);
  H24 = (H24 + (carry?1:0))%24;
  if(hasP && H24<12) H24 += 12;
  if(hasA && H24===12) H24 = 0;
  return `${String(H24).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
}
function suggestions(format:'12'|'24', q:string){
  const out: {value:string; label:string}[] = [];
  for(let h=0;h<24;h++){
    for(let m=0;m<60;m+=15){
      const v = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
      const label = toDisplay(v, format);
      if(!q) out.push({ value:v, label });
      else {
        const digits = label.replace(/[^0-9]/g,'');
        if(digits.includes(q.replace(/[^0-9]/g,'')) || label.toLowerCase().includes(q.toLowerCase())) out.push({ value:v, label });
      }
    }
  }
  return out.slice(0, 24);
}

export const FuzzyTimeInput: React.FC<{ value?: string; onChange:(v:string)=>void; placeholder?:string; showSuggestions?: boolean }>=({ value, onChange, placeholder, showSuggestions = false })=>{
  const { hourFormat } = useScheduleSettings();
  const [q, setQ] = React.useState('');
  React.useEffect(()=>{ setQ(value || ''); }, [value]);
  const opts = showSuggestions ? suggestions(hourFormat, q) : [];
  const onKeyUp=(e: React.KeyboardEvent<HTMLInputElement>)=>{
    const t = e.currentTarget;
    let v = t.value;
    if(/^[0-9]{1,2}$/.test(v)){
      t.value = v + ':';
    }
  };
  return (
    <div className="relative">
      <input
        className="border rounded px-1.5 py-0.5 text-xs w-20 text-black dark:text-black"
        placeholder={placeholder}
        defaultValue={toDisplay(value||'', hourFormat)}
        onChange={(e)=> setQ(e.target.value)}
        onBlur={()=> { if(q){ const val = toValue(q); onChange(val); } }}
        onKeyUp={onKeyUp}
        list={undefined}
      />
      {showSuggestions && opts.length>0 && (
        <div className="absolute z-20 mt-1 w-36 max-h-48 overflow-auto rounded border bg-background shadow">
          {opts.map(o=> (
            <button key={o.value} className="w-full text-left px-2 py-1 text-xs hover:bg-muted/50" onMouseDown={()=> { onChange(o.value); setQ(o.label); }}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default FuzzyTimeInput;
