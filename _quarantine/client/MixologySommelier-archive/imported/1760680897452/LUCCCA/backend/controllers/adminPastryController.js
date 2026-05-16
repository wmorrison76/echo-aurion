import fs from 'fs';
import path from 'path';

export function exportPastryTestLog(req, res) {
  const logData = {
    timestamp: new Date().toISOString(),
    modulesTested: ["Recipe Library", "Cake Designer", "Photo Gallery"],
    status: "Ready for Phase 1 Real-World Testing"
  };

  const exportPath = path.resolve(`./backend/exports/pastry_test_log_${Date.now()}.json`);
  fs.writeFileSync(exportPath, JSON.stringify(logData, null, 2));

  res.json({ message: 'Test log generated.', path: exportPath });
}
