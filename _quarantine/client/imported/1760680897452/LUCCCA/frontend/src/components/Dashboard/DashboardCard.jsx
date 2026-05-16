// File: src/components/Dashboard/DashboardCard.jsx
import React, { useEffect, useState } from "react";

const DashboardCard = ({ title, children, index = 0 }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 150 * index);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div
      className={`transition-all duration-700 ease-out transform 
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"} 
        bg-white dark:bg-gray-800 rounded-lg shadow p-6`}
    >
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
};

export default DashboardCard;
