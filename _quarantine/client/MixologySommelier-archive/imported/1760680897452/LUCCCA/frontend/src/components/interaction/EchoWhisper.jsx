// File: src/components/EchoCore/components/interaction/EchoWhisper.jsx

import React, { useEffect, useState } from "react";
import EchoAnimator from "./EchoAnimator";

const hints = [
  "Need a revenue summary? Try @profit.",
  "Ask me about inventory: 'Echo, show stock levels'.",
  "Want menu insights? Try 'Echo, menu mix overview'.",
];

const EchoWhisper = () => {
  const [hintIndex, setHintIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setHintIndex((prev) => (prev + 1) % hints.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <EchoAnimator type="fade">
      <p className="text-xs text-gray-400 italic">{hints[hintIndex]}</p>
    </EchoAnimator>
  );
};

export default EchoWhisper;
