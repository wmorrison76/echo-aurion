// File: src/components/EchoCore/EchoSummonButton.jsx

import React from "react";

const EchoSummonButton = ({ onSummon }) => {
  return (
    <div
      onClick={onSummon}
      className="fixed bottom-4 right-4 z-[9999] cursor-pointer hover:scale-110 transition-transform duration-300"
      title="Summon Echo"
    >
      <img
        src="/assets/fingerprint.png"
        alt="Summon Echo"
        className="w-16 h-16 md:w-20 md:h-20 opacity-70 hover:opacity-100 animate-pulse drop-shadow-xl rounded-full"
      />
    </div>
  );
};

export default EchoSummonButton;
