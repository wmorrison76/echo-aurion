import React from 'react';
import { BadgeStatus } from './BadgeStatus';

export function ModuleStatusRow({ moduleName, status, lastCheck }) {
  return (
    <tr>
      <td className="border border-gray-400 p-2">{moduleName}</td>
      <td className="border border-gray-400 p-2">
        <BadgeStatus status={status} />
      </td>
      <td className="border border-gray-400 p-2">{lastCheck}</td>
    </tr>
  );
}
