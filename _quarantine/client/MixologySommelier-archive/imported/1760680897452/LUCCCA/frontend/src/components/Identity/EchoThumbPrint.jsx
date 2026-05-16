// EchoThumbPrint.jsx
import React from "react";
import EchoIcon from "@/assets/Echo.png";

const EchoThumbPrint = ({ size = 64 }) => {
  return (
    <div
      className="rounded-full shadow-lg flex items-center justify-center bg-gradient-to-br from-orange-500 via-red-400 to-pink-500"
      style={{ width: size, height: size }}
    >
      <img
        src={EchoIcon}
        alt="Echo Thumbprint"
        className="rounded-full object-contain w-3/4 h-3/4"
      />
    </div>
  );
};

export default EchoThumbPrint;
