import React from 'react';
import usePanels from '../state/usePanels';
import * as ACL from '../utils/acl';
function safeCanView(panel){ try { return ACL?.canView ? ACL.canView(panel) : (panel?.noAccess? false : true); } catch { return true; } }
export default function AccessSummary(){
  const { panels=[] } = (typeof usePanels === 'function' ? usePanels() : {panels:[]});
  const rows = panels.map(p => ({ id:p.id || p.key || 'unknown', type:p.type || p.name || 'Panel', access: safeCanView(p) ? 'full' : 'summary' }));
  return (
    <section className="wb-rbac-summary" aria-label="Access Summary">
      <header><strong>Access Summary</strong></header>
      <table><thead><tr><th>Panel</th><th>Type</th><th>Access</th></tr></thead>
      <tbody>{rows.map(r=> <tr key={r.id}><td>{r.id}</td><td>{r.type}</td><td className={r.access==='full'?'ok':'limited'}>{r.access}</td></tr>)}</tbody></table>
    </section>
  );
}
