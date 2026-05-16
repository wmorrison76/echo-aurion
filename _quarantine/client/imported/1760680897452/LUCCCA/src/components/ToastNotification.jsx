import React, { useEffect } from 'react';

export function ToastNotification({ message, onClose }) {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded shadow-lg">
      {message}
    </div>
  );
}
