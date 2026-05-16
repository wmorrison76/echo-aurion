// PresenceIndicator.jsx
import React from 'react';

/**
 * Shows which users are online.
 */
const PresenceIndicator = ({ users }) => (
  <div className="presence-indicator">
    <h4>Online Users</h4>
    <ul>
      {users.map((user) => <li key={user.id}>{user.name}</li>)}
    </ul>
  </div>
);

export default PresenceIndicator;
