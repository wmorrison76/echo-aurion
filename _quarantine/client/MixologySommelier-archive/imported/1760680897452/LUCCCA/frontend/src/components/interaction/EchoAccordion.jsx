// File: src/components/EchoCore/components/interaction/EchoAccordion.jsx

import React, { useState } from "react";

const EchoAccordion = ({ sections }) => {
  const [activeIndex, setActiveIndex] = useState(null);
  const toggle = (idx) => setActiveIndex(activeIndex === idx ? null : idx);
  return (
    <div className="space-y-2">
      {sections.map((section, idx) => (
        <div key={idx} className="border rounded">
          <button
            onClick={() => toggle(idx)}
            className="w-full text-left px-4 py-2 bg-gray-100 dark:bg-gray-700 font-semibold"
          >
            {section.title}
          </button>
          {activeIndex === idx && (
            <div className="p-4 bg-white dark:bg-gray-800">
              {section.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default EchoAccordion;
