import React from 'react';

export function ShiftCell({ start, end, first, lastInitial, positions, badges}:{ start:string; end:string; first:string; lastInitial:string; positions:string[]; badges?:string[] }){
  const name = `${first} ${lastInitial}.`;
  return (
    <div className="rounded-md border border-black/10 bg-white shadow-sm p-2 text-sm">
      <div className="font-medium">{start} – {end}</div>
      <div className="mt-0.5 text-gray-900">{name}</div>
      <div className="text-xs text-gray-600">{positions.join(', ')}</div>
      {badges && badges.length>0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {badges.map((b,i)=> (<span key={i} className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[10px]">{b}</span>))}
        </div>
      )}
    </div>
  );
}

export default ShiftCell;
