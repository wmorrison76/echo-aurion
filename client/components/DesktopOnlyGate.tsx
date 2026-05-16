/**
 * DesktopOnlyGate — wraps a panel content in a device check.
 * On mobile/tablet, shows a friendly "Best experienced on desktop" card instead.
 * Used for 3D-heavy panels (Cake Viewer, EchoCanvas Studio).
 */
import React from "react";
import { Monitor, Smartphone } from "lucide-react";

const ACCENT = "#c8a97e";

export default function DesktopOnlyGate({ panelName, children, minWidth = 900 }: {
  panelName: string;
  children: React.ReactNode;
  minWidth?: number;
}) {
  const [isDesktop, setIsDesktop] = React.useState<boolean>(() =>
    typeof window === "undefined" ? true : window.innerWidth >= minWidth
  );
  const [bypass, setBypass] = React.useState(false);

  React.useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= minWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [minWidth]);

  if (isDesktop || bypass) return <>{children}</>;

  return (
    <div className="w-full h-full flex items-center justify-center p-6" style={{ background: "#0b1020" }} data-testid="desktop-only-gate">
      <div className="max-w-sm rounded-xl p-6 text-center space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${ACCENT}40` }}>
        <div className="flex items-center justify-center gap-2" style={{ color: ACCENT }}>
          <Smartphone size={18} />
          <span className="text-[11px]">→</span>
          <Monitor size={22} />
        </div>
        <div className="text-[16px] font-semibold" style={{ color: ACCENT }}>
          {panelName} is built for desktop
        </div>
        <div className="text-[11px]" style={{ color: "#94a3b8" }}>
          The 3D designer, photoreal rendering, and precision controls need a larger screen.
          We're building a streamlined mobile companion — for now, please open this on a desktop or laptop.
        </div>
        <button
          onClick={() => setBypass(true)}
          className="px-3 py-2 rounded text-[10px] mt-2"
          style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px dashed ${ACCENT}60` }}
          data-testid="desktop-gate-bypass"
        >
          Continue anyway (not recommended)
        </button>
      </div>
    </div>
  );
}
