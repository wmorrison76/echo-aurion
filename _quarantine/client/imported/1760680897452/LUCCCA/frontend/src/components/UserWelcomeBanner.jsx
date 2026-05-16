import React from 'react';

export function UserWelcomeBanner({ user }) {
  return (
    <div className="user-welcome-banner">
      <h2>Welcome Back, {user || 'Chef'}!</h2>
    </div>
  );
}
