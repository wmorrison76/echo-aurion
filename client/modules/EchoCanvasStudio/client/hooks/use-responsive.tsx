import React from "react";

const MOBILE_BREAK = 768;
const TABLET_BREAK = 1024;

export function useResponsive() {
  const [width, setWidth] = React.useState(
    typeof window !== "undefined" ? window.innerWidth : 1024,
  );

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return {
    isMobile: width < MOBILE_BREAK,
    isTablet: width >= MOBILE_BREAK && width < TABLET_BREAK,
    isDesktop: width >= TABLET_BREAK,
  };
}
