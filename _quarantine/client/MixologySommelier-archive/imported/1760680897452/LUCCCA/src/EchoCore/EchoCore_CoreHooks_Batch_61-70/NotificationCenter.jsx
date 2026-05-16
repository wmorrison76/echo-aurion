// NotificationCenter.jsx
import React from 'react';

/**
 * Component that displays active notifications.
 */
const NotificationCenter = ({ notifications, onDismiss }) => (
  <div className="notification-center">
    {notifications.map((n) => (
      <div key={n.id} className="notification">
        <p>{n.message}</p>
        <button onClick={() => onDismiss(n.id)}>Dismiss</button>
      </div>
    ))}
  </div>
);

export default NotificationCenter;
