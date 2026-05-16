// File: src/components/EchoCore/components/interaction/EchoPagination.jsx

import React from "react";

const EchoPagination = ({ currentPage, totalPages, onPageChange }) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <div className="flex space-x-2">
      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-1 rounded ${
            page === currentPage
              ? "bg-cyan-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
          }`}
        >
          {page}
        </button>
      ))}
    </div>
  );
};

export default EchoPagination;