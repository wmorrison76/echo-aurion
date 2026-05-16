import React from "react";

// Bottom-right LUCCCA logo watermark used across all pages (also prints)
export default function CornerBrand() {
  const logoSrc =
    "https://cdn.builder.io/api/v1/image/assets%2Faccc7891edf04665961a321335d9540b%2Fc559ee72f28d41e3b77cf18c85d92bba?format=webp&width=240";
  const style: React.CSSProperties = {
    position: "fixed",
    right: 12,
    bottom: 0,
    zIndex: 25,
    pointerEvents: "none",
    width: 140,
    height: "auto",
    opacity: 0.75,
  };
  return <img src={logoSrc} alt="LUCCCA" style={style} aria-hidden />;
}
