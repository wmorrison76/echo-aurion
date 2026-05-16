// File: src/components/EchoCore/components/interaction/EchoToast.jsx

import React, { useEffect } from "react";

const EchoToast = ({ message, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded shadow-lg">
      {message}
    </div>
  );
};

export default EchoToast;