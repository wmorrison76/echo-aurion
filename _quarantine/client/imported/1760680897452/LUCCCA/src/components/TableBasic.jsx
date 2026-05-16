import React from 'react';

export function TableBasic({ columns = [], data = [] }) {
  return (
    <table className="table-auto w-full border-collapse border border-gray-400">
      <thead>
        <tr>
          {columns.map((col, index) => (
            <th key={index} className="border border-gray-400 p-2 bg-gray-200">
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="border border-gray-400 p-2">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
