/**
 * PastryStandalone — public-facing entry point for /pastry, /pastry/success, /pastry/admin.
 * Standalone from the internal enterprise Pastry module (which lives at modules/Pastry/client/App).
 */
import React, { useMemo } from "react";
import { PastryLanding } from "../Pastry/PastryLanding";
import { PastrySuccess } from "../Pastry/PastrySuccess";
import { PastryAdmin } from "../Pastry/PastryAdmin";
import { PastryGallery } from "../Pastry/PastryGallery";
import { PastryLook } from "../Pastry/PastryLook";

export default function PastryStandalone() {
  const path = useMemo(() => window.location.pathname, []);

  // Track referral click once per session
  React.useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && !sessionStorage.getItem(`ref_${ref}`)) {
      fetch(`/api/pastry/referrals/ping?ref=${encodeURIComponent(ref)}`).catch(() => {});
      sessionStorage.setItem(`ref_${ref}`, "1");
    }
  }, []);

  if (path.startsWith("/pastry/look/")) return <PastryLook />;
  if (path.startsWith("/pastry/success")) return <PastrySuccess />;
  if (path.startsWith("/pastry/admin")) return <PastryAdmin />;
  if (path.startsWith("/pastry/gallery")) return <PastryGallery />;
  return <PastryLanding />;
}
