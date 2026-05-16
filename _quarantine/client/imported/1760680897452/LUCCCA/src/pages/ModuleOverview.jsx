import React from 'react';
import { ModuleStatusRow } from '../components/ModuleStatusRow';

export default function ModuleOverview() {
  const moduleData = [
    { name: 'Echo AI', status: 'online', lastCheck: '2025-07-16 08:45' },
    { name: 'Zelda Master', status: 'online', lastCheck: '2025-07-16 08:45' },
    { name: 'Argus', status: 'online', lastCheck: '2025-07-16 08:45' },
    { name: 'Red Phoenix', status: 'maintenance', lastCheck: '2025-07-16 07:30' },
    { name: 'Odin Spear', status: 'online', lastCheck: '2025-07-16 08:45' },
  ];

  return (
    <div className="module-overview-page">
      <h1 className="text-2xl font-bold mb-4">Module Overview</h1>
      <table className="table-auto w-full border-collapse border border-gray-400">
        <thead>
          <tr>
            <th className="border border-gray-400 p-2">Module</th>
            <th className="border border-gray-400 p-2">Status</th>
            <th className="border border-gray-400 p-2">Last Check</th>
          </tr>
        </thead>
        <tbody>
          {moduleData.map((mod, index) => (
            <ModuleStatusRow
              key={index}
              moduleName={mod.name}
              status={mod.status}
              lastCheck={mod.lastCheck}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
