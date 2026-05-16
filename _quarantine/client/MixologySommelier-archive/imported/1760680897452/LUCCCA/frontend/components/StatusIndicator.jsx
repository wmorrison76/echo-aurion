import React from 'react';

export function StatusIndicator({ status }) {
  const color = status === 'online' ? 'green' : 'red';

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <span
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: color,
          marginRight: '8px',
        }}
      ></span>
      <span>{status === 'online' ? 'Online' : 'Offline'}</span>
    </div>
  );
}
