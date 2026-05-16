import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
function scrollToHash(hash: string) {
  const id = hash.replace(/^#/, "");
  if (!id) {
    return;
  }
  const element = document.getElementById(id);
  if (!element) {
    return;
  }
  requestAnimationFrame(() => {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}
export function HashScrollManager() {
  const location = useLocation();
  useEffect(() => {
    if (location.hash) {
      scrollToHash(location.hash);
    }
  }, [location.hash, location.key]);
  return null;
}
