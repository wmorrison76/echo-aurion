/***
 * LUCCCA — BUILD 28
 * StaffingSummaryCard
 *
 * PURPOSE:
 *  - Visualize staffing requirements calculated via Build 25
 *  - Show total labor impact + breakdown by role
 ***/

import React from "react";

type RoleData = {
  role: string;
  count: number;
  hoursEach: number;
  totalHours: number;
};

export default function StaffingSummaryCard({
  roles,
  totalHours,
}: {
  roles: RoleData[];
  totalHours: number;
}) {
  if (!roles || roles.length === 0) {
    return (
      <div className="border border-slate-200 p-3 rounded-md bg-white text-xs text-slate-500">
        No staffing data available.
      </div>
    );
  }

  return (
    <div className="border border-slate-200 p-3 rounded-md bg-white text-sm">
      <h3 className="font-semibold text-slate-700">Staffing Snapshot</h3>

      <div className="mt-2 bg-slate-50 border border-slate-200 rounded p-2 text-xs flex justify-between">
        <span className="text-slate-600">Total Labor Hours</span>
        <span className="font-semibold text-slate-800">{totalHours}</span>
      </div>

      <table className="w-full text-xs mt-3">
        <thead>
          <tr className="text-slate-500">
            <th className="text-left">Role</th>
            <th className="text-right">Count</th>
            <th className="text-right">Hours</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((r, i) => (
            <tr
              key={i}
              className="border-t border-slate-200 text-slate-700"
            >
              <td className="py-1">{r.role}</td>
              <td className="py-1 text-right">{r.count}</td>
              <td className="py-1 text-right">{r.totalHours}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalHours > 120 && (
        <div className="mt-3 text-xs text-red-600 font-semibold">
          ⚠ High staffing load — operational risk elevated.
        </div>
      )}
    </div>
  );
}
