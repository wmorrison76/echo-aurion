import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Navigation from "@/components/Navigation";
import SidebarGlass from "@/components/studio/SidebarGlass";
interface LayoutProps {
  children: ReactNode;
}
export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isStudio = location.pathname.startsWith("/studio");
  const isPlanner = location.pathname.startsWith("/planner");
  const isDesigner = location.pathname.startsWith("/designer");
  const topOffset = isStudio || isPlanner || isDesigner ? 48 : 88;
  return (
    <div className="min-h-screen bg-background whiteboard">
      {" "}
      <Navigation /> <SidebarGlass top={topOffset} />{" "}
      <main
        className={
          isStudio || isPlanner || isDesigner
            ? "pt-0 px-0"
            : "pt-24 px-2 sm:px-4"
        }
      >
        {" "}
        {children}{" "}
      </main>{" "}
    </div>
  );
}
