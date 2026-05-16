EchoCarousel.jsx
// File: src/components/EchoCore/components/interaction/EchoCarousel.jsx

import React, { useState } from "react";

const EchoCarousel = ({ items }) => {
  const [index, setIndex] = useState(0);
  const prev = () => setIndex((index - 1 + items.length) % items.length);
  const next = () => setIndex((index + 1) % items.length);

  return (
    <div className="relative w-full overflow-hidden">
      <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${index * 100}%)` }}>
        {items.map((item, idx) => (
          <div key={idx} className="flex-shrink-0 w-full">
            {item}
          </div>
        ))}
      </div>
      <button onClick={prev} className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-gray-800 text-white px-2 py-1 rounded">Prev</button>
      <button onClick={next} className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-gray-800 text-white px-2 py-1 rounded">Next</button>
    </div>
  );
};

export default EchoCarousel;
