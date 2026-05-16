import React from 'react';
import { fakeLogData } from '../utils/fakeLogData';
import { LogEntry } from '../components/LogEntry';

export default function Logs() {
  return (
    <div className="logs-page">
      <h1 className="text-2xl font-bold mb-4">System Logs</h1>
      <div className="log-list">
        {fakeLogData.map((log, index) => (
          <LogEntry key={index} timestamp={log.timestamp} message={log.message} />
        ))}
      </div>
    </div>
  );
}
