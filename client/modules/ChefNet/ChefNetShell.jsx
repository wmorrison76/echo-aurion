import React, { useEffect } from "react";
import "./styles/chefnet.css";
import { ChefNetProvider, useChefNetState, useChefNetDispatch } from "./state/chefnetStore";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { MessageSquare, MessageCircle, Heart, Briefcase, Smile, User, Zap, BarChart3, BookOpen } from "lucide-react";
import ChefNetFeedPanel from "./panels/ChefNetFeedPanel.jsx";
import ChefNetVentingPanel from "./panels/ChefNetVentingPanel.jsx";
import RecognitionPanel from "./panels/RecognitionPanel.jsx";
import JobBoardPanel from "./panels/JobBoardPanel.jsx";
import WellbeingPanel from "./panels/WellbeingPanel.jsx";
import CultureAnalyticsPanel from "./panels/CultureAnalyticsPanel.jsx";
import PeerMentorPanel from "./panels/PeerMentorPanel.jsx";
import ResourcesPanel from "./panels/ResourcesPanel.jsx";
import ChefNetProfilePanel from "./panels/ChefNetProfilePanel.jsx";
import RecognitionTimelinePanel from "./panels/RecognitionTimelinePanel.jsx";
import CultureDashboardPanel from "./panels/CultureDashboardPanel.jsx";
import { FireworksContainer, triggerFireworks } from "./utils/fireworks";

const NAV_ITEMS = [
  { id: "feed", label: "Open Forum", icon: MessageSquare },
  { id: "vent", label: "Anonymous Vent", icon: MessageCircle },
  { id: "recognition", label: "Recognition", icon: Heart },
  { id: "jobs", label: "Job Board", icon: Briefcase },
  { id: "wellbeing", label: "Wellbeing", icon: Smile },
  { id: "profile", label: "Your Profile", icon: User },
  { id: "timeline", label: "Recognition Timeline", icon: Zap },
  { id: "culture", label: "Culture Dashboard", icon: BarChart3 },
  { id: "resources", label: "Resources", icon: BookOpen },
];

function ShellInner({ initialTab = "feed", showHeader = true, organizationId = null, userId = null }) {
  const state = useChefNetState();
  const dispatch = useChefNetDispatch();

  const current = state.currentTab || initialTab;
  const setTab = (id) => dispatch({ type: "SET_TAB", tab: id });

  useEffect(() => {
    const handleRecognitionCreated = (event) => {
      triggerFireworks();
      if (window.echo && typeof window.echo.celebrate === "function") {
        window.echo.celebrate();
      }
      window.dispatchEvent(new CustomEvent("chefnet-celebration", { detail: event.detail }));
    };

    window.addEventListener("recognition-created", handleRecognitionCreated);
    return () => window.removeEventListener("recognition-created", handleRecognitionCreated);
  }, []);

  let Panel = null;
  let panelProps = {};

  switch (current) {
    case "feed":
      Panel = ChefNetFeedPanel;
      break;
    case "vent":
      Panel = ChefNetVentingPanel;
      break;
    case "recognition":
      Panel = RecognitionPanel;
      break;
    case "jobs":
      Panel = JobBoardPanel;
      break;
    case "wellbeing":
      Panel = WellbeingPanel;
      break;
    case "profile":
      Panel = ChefNetProfilePanel;
      panelProps = { user: { id: userId } };
      break;
    case "timeline":
      Panel = RecognitionTimelinePanel;
      break;
    case "culture":
      Panel = CultureDashboardPanel;
      panelProps = { organizationId: organizationId || "default" };
      break;
    case "resources":
      Panel = ResourcesPanel;
      break;
    default:
      Panel = ChefNetFeedPanel;
  }

  return (
    <div className="flex h-full w-full">
      {/* Sidebar */}
      <Sidebar>
        <SidebarHeader>
          <h2 className="text-xs font-semibold truncate text-sidebar-foreground uppercase tracking-wide">
            ChefNet
          </h2>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = current === item.id;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => setTab(item.id)}
                        isActive={isActive}
                        tooltip={item.label}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        {showHeader && (
          <header className="mb-3 flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="chefnet-badge bg-sky-50 text-slate-900 dark:bg-cyan-950/70 dark:text-cyan-200 border-sky-200 dark:border-cyan-500/60">
                  ChefNet • People & Culture
                </span>
              </div>
              <h1 className="mt-2 text-xl md:text-2xl font-semibold tracking-tight">
                Building better kitchens, one conversation at a time.
              </h1>
              <p className="mt-1 text-xs md:text-sm text-slate-500 dark:text-slate-300/80 max-w-2xl">
                A private, psychologically safe space for chefs and teams to connect, vent, grow, and support each other across the LUCCCA ecosystem.
              </p>
            </div>
          </header>
        )}

        <section className="chefnet-card flex-1 min-h-0 px-3 py-3 md:p-4">
          <div className="h-full w-full chefnet-scroll overflow-y-auto">
            <Panel {...panelProps} />
          </div>
        </section>
      </main>
    </div>
  );
}

export default function ChefNetShell(props) {
  return (
    <SidebarProvider defaultOpen={true}>
      <ChefNetProvider>
        <FireworksContainer />
        <ShellInner {...props} />
      </ChefNetProvider>
    </SidebarProvider>
  );
}
