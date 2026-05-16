// AuditLogPanel.jsx
import React, { useState } from 'react';
import AuditLog from './AuditLog';

/**
 * Panel to display audit logs.
 */
const AuditLogPanel = () => {
  const [logs] = useState(() => {
    const log = new AuditLog();
    log.addLog('System initialized.');
    return log.getLogs();
  });

  return (
    <div className="audit-log-panel">
      <h3>Audit Logs</h3>
      <ul>
        {logs.map((l, i) => <li key={i}>{l.timestamp.toString()} - {l.message}</li>)}
      </ul>
    </div>
  );
};

export default AuditLogPanel;
