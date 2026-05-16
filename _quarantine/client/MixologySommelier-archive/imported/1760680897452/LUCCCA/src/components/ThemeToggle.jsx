import React, { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className="theme-toggle bg-gray-800 text-white p-2 rounded"
    >
      {darkMode ? 'Light Mode' : 'Dark Mode'}
    </button>
  );
}
