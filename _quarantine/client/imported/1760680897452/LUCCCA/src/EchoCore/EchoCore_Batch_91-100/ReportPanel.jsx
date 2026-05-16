// ReportPanel.jsx
import React, { useState } from 'react';
import SystemHealthMonitor from './SystemHealthMonitor';
import AuditLog from './AuditLog';
import SystemReportGenerator from './SystemReportGenerator';

/**
 * Panel to generate and display system reports.
 */
const ReportPanel = () => {
  const [report, setReport] = useState(null);

  const generate = () => {
    const monitor = new SystemHealthMonitor();
    const log = new AuditLog();
    log.addLog('Report generated.');
    const generator = new SystemReportGenerator(monitor, log);
    setReport(generator.generateReport());
  };

  return (
    <div className="report-panel">
      <h3>System Report</h3>
      <button onClick={generate}>Generate Report</button>
      {report && (
        <div>
          <p>Status: {report.status}</p>
          <p>Generated: {report.generatedAt.toString()}</p>
        </div>
      )}
    </div>
  );
};

export default ReportPanel;
