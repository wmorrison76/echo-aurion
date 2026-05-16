import { PropsWithChildren } from "react";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { Sidebar } from "./Sidebar";
import { useAurumLayoutMode } from "./AurumLayoutMode";
export function PageLayout({ children }: PropsWithChildren) {
  const { embedded } = useAurumLayoutMode();
  if (embedded) {
    return <>{children}</>;
  }
  return (
    <div
      data-loc="client/components/layout/PageLayout.tsx:7:5"
      className="min-h-screen bg-background text-foreground"
    >
      {" "}
      <SiteHeader /> <Sidebar />{" "}
      <main
        data-loc="client/components/layout/PageLayout.tsx:9:7"
        className="relative z-0"
      >
        {" "}
        {children}{" "}
      </main>{" "}
      <SiteFooter />{" "}
    </div>
  );
}
