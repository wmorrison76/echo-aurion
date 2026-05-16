import React, { useEffect, useState } from 'react';
const STORE = 'wb.presenter';
export default function PresenterControls(){
  const [on, setOn] = useState(()=>{ try {return !!JSON.parse(localStorage.getItem(STORE)||'{}').on;} catch {return false;} });
  const [cursor, setCursor] = useState('spotlight'); // spotlight | laser
  useEffect(()=>{ localStorage.setItem(STORE, JSON.stringify({on, cursor})); document.body.classList.toggle('wb-presenting', on); }, [on, cursor]);
  return (
    <div className="wb-presenter" role="region" aria-label="Presenter Controls">
      <button className={on?'on':''} onClick={()=>setOn(v=>!v)}>{on?'Stop Presenting':'Start Presenting'}</button>
      <label>Pointer:
        <select value={cursor} onChange={e=>setCursor(e.target.value)}>
          <option value="spotlight">Spotlight</option>
          <option value="laser">Laser</option>
        </select>
      </label>
    </div>
  );
}
