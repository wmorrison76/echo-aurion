import React from 'react';

export function LogoutButton() {
  const handleLogout = () => {
    alert('Logged out.'); // Placeholder
  };

  return (
    <button
      onClick={handleLogout}
      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
    >
      Logout
    </button>
  );
}
