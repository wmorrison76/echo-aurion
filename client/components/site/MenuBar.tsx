import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  PanelsTopLeft,
  PenLine,
  Kanban,
  Bot,
  Shield,
  Workflow,
  Sparkles,
  PlayCircle,
  ShieldCheck,
  Radar,
  Rocket,
  Terminal,
  FileCode2,
  LifeBuoy,
  BookOpen,
  LineChart,
  ScrollText,
} from "lucide-react";

import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarLabel,
  MenubarShortcut,
} from "@/components/ui/menubar";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type MenuBase = {
  label: string;
  icon: LucideIcon;
  shortcut?: string;
};

type MenuLinkItem = MenuBase & {
  type: "link";
  to: string;
  external?: boolean;
};

type MenuStudioItem = MenuBase & {
  type: "studio";
  task: string;
  tab: string;
};

type MenuActionItem = MenuBase & {
  type: "action";
  event: string;
};

type MenuSeparator = {
  type: "separator";
};

type MenuEntry = MenuLinkItem | MenuStudioItem | MenuActionItem | MenuSeparator;

type MenuSection = {
  label?: string;
  items: MenuEntry[];
};

type MenuConfig = {
  label: string;
  icon: LucideIcon;
  sections: MenuSection[];
  isActive?: (context: { pathname: string; task?: string | null }) => boolean;
};

const menubarConfig = [
  {
    label: "Workspace",
    icon: LayoutDashboard,
    sections: [
      {
        label: "Navigation",
        items: [
          {
            type: "link" as const,
            label: "Dashboard Overview",
            icon: LayoutDashboard,
            to: "/",
            shortcut: "⌘0",
          },
          {
            type: "link" as const,
            label: "Studio Hub",
            icon: PanelsTopLeft,
            to: "/studio?task=Coder&tab=code",
            shortcut: "⌘1",
          },
          {
            type: "link" as const,
            label: "Automation Board",
            icon: Kanban,
            to: "/board",
            shortcut: "⌘2",
          },
          {
            type: "link" as const,
            label: "Echo Orb Controls",
            icon: Bot,
            to: "/echo-controls",
            shortcut: "⌘3",
          },
          {
            type: "link" as const,
            label: "Project Sandbox",
            icon: Terminal,
            to: "/sandbox",
            shortcut: "⌘4",
          },
          {
            type: "link" as const,
            label: "Zaro Command Deck",
            icon: Shield,
            to: "/zaro",
            shortcut: "⌘5",
          },
        ],
      },
    ],
    isActive: ({ pathname }: { pathname: string }) =>
      ["/", "/studio", "/board", "/sandbox", "/zaro", "/echo-controls"].includes(pathname),
  },
  {
    label: "Modes",
    icon: Workflow,
    sections: [
      {
        label: "Studio agents",
        items: [
          {
            type: "studio" as const,
            label: "Blueprint Designer",
            icon: PenLine,
            task: "Blueprint",
            tab: "design",
            shortcut: "⌥1",
          },
          {
            type: "studio" as const,
            label: "Planner (Seed)",
            icon: Sparkles,
            task: "Planner",
            tab: "seed",
            shortcut: "⌥2",
          },
          {
            type: "studio" as const,
            label: "Coder (Code)",
            icon: FileCode2,
            task: "Coder",
            tab: "code",
            shortcut: "⌥3",
          },
          {
            type: "studio" as const,
            label: "Reviewer Console",
            icon: ShieldCheck,
            task: "Reviewer",
            tab: "interact",
            shortcut: "⌥4",
          },
          {
            type: "studio" as const,
            label: "Integrator Ops",
            icon: Workflow,
            task: "Integrator",
            tab: "design",
            shortcut: "⌥5",
          },
          {
            type: "studio" as const,
            label: "Historian Timeline",
            icon: LineChart,
            task: "Historian",
            tab: "interact",
            shortcut: "��6",
          },
          {
            type: "studio" as const,
            label: "Scorecard Insights",
            icon: Radar,
            task: "Scorecard",
            tab: "interact",
            shortcut: "⌥7",
          },
          {
            type: "studio" as const,
            label: "Interact Live Ops",
            icon: PlayCircle,
            task: "Interact",
            tab: "interact",
            shortcut: "⌥8",
          },
        ],
      },
    ],
    isActive: ({ task }: { task?: string | null }) =>
      !!task &&
      [
        "Blueprint",
        "Planner",
        "Coder",
        "Reviewer",
        "Integrator",
        "Historian",
        "Scorecard",
        "Interact",
      ].includes(task),
  },
  {
    label: "Automation",
    icon: Sparkles,
    sections: [
      {
        label: "Module actions",
        items: [
          {
            type: "action" as const,
            label: "Pre-scan plan modules",
            icon: Radar,
            event: "module:prescan",
            shortcut: "⌃P",
          },
          {
            type: "action" as const,
            label: "Security sweep",
            icon: ShieldCheck,
            event: "module:secscan",
            shortcut: "⌃S",
          },
          {
            type: "action" as const,
            label: "Generate intent brief",
            icon: Sparkles,
            event: "module:intent",
            shortcut: "⌃I",
          },
          {
            type: "action" as const,
            label: "Dry run simulation",
            icon: PlayCircle,
            event: "module:dryrun",
            shortcut: "⌃D",
          },
          { type: "separator" as const },
          {
            type: "action" as const,
            label: "Deploy to Netlify",
            icon: Rocket,
            event: "deploy:netlify",
            shortcut: "⌘⇧D",
          },
        ],
      },
    ],
    isActive: ({ pathname }: { pathname: string }) => pathname === "/studio",
  },
  {
    label: "Resources",
    icon: LifeBuoy,
    sections: [
      {
        label: "Guides & support",
        items: [
          {
            type: "link" as const,
            label: "Builder project documentation",
            icon: BookOpen,
            to: "https://www.builder.io/c/docs/projects",
            external: true,
            shortcut: "⌘/",
          },
          {
            type: "link" as const,
            label: "AI hospitality playbook",
            icon: ScrollText,
            to: "https://www.builder.io/c/docs/projects#ai-hospitality-suite",
            external: true,
          },
          {
            type: "link" as const,
            label: "System status",
            icon: Shield,
            to: "https://status.builder.io/",
            external: true,
          },
          {
            type: "link" as const,
            label: "Contact support",
            icon: LifeBuoy,
            to: "mailto:support@builder.io?subject=EchoCoder%20Support",
            external: true,
          },
        ],
      },
    ],
  },
] satisfies MenuConfig[];

const quickUtilities = [
  {
    label: "Figma Plugin",
    to: "https://www.figma.com/community/plugin/747985167520967365/builder-io-ai-powered-figma-to-code-react-vue-tailwind-more",
    external: true,
  },
] satisfies { label: string; to: string; external?: boolean }[];

function buildStudioPath(task: string, tab: string): string {
  const params = new URLSearchParams();
  params.set("task", task);
  params.set("tab", tab);
  return `/studio?${params.toString()}`;
}

export default function MenuBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const activeTask = params.get("task");

  function handleItemSelect(entry: MenuEntry) {
    if (entry.type === "separator") return;
    if (entry.type === "link") {
      if (entry.external) {
        window.open(entry.to, "_blank", "noopener,noreferrer");
      } else {
        navigate(entry.to);
      }
      return;
    }
    if (entry.type === "studio") {
      navigate(buildStudioPath(entry.task, entry.tab));
      return;
    }
    window.dispatchEvent(new CustomEvent(entry.event));
  }

  return (
    <div
      data-menubar
      className="sticky top-16 z-30 border-b bg-gradient-to-r from-background/95 via-background/75 to-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/65"
    >
      <div className="container flex flex-col gap-3 py-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
          <Menubar className="flex-1 min-w-[260px] border-primary/30 bg-background/80 backdrop-blur-sm shadow-sm">
            {menubarConfig.map((menu) => {
              const isActive = menu.isActive?.({
                pathname: location.pathname,
                task: activeTask,
              });
              return (
                <MenubarMenu key={menu.label}>
                  <MenubarTrigger
                    className={cn(
                      "gap-2 rounded-sm px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.26em]",
                      isActive
                        ? "bg-primary/15 text-foreground shadow-inner"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <menu.icon className="h-4 w-4" aria-hidden />
                    {menu.label}
                  </MenubarTrigger>
                  <MenubarContent className="min-w-[240px]">
                    {menu.sections.map((section, sectionIndex) => (
                      <div key={`${menu.label}-${sectionIndex}`} className="py-0.5">
                        {section.label ? (
                          <MenubarLabel className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                            {section.label}
                          </MenubarLabel>
                        ) : null}
                        {section.items.map((entry, entryIndex) => {
                          if (entry.type === "separator") {
                            return (
                              <MenubarSeparator
                                key={`${menu.label}-${sectionIndex}-sep-${entryIndex}`}
                              />
                            );
                          }
                          const Icon = entry.icon;
                          const shortcutLabel = entry.external
                            ? entry.shortcut
                              ? `${entry.shortcut} ↗`
                              : "↗"
                            : entry.shortcut;
                          return (
                            <MenubarItem
                              key={`${menu.label}-${sectionIndex}-${entry.label}`}
                              onSelect={(event) => {
                                event.preventDefault();
                                handleItemSelect(entry);
                              }}
                            >
                              <span className="flex items-center gap-2">
                                <Icon
                                  className="h-4 w-4 text-muted-foreground"
                                  aria-hidden
                                />
                                <span className="truncate text-sm">
                                  {entry.label}
                                </span>
                              </span>
                              {shortcutLabel ? (
                                <MenubarShortcut>{shortcutLabel}</MenubarShortcut>
                              ) : null}
                            </MenubarItem>
                          );
                        })}
                      </div>
                    ))}
                  </MenubarContent>
                </MenubarMenu>
              );
            })}
          </Menubar>
          <div className="flex flex-wrap items-center gap-1">
            {quickUtilities.map((util) =>
              util.external ? (
                <a
                  key={util.label}
                  href={util.to}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-transparent px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                >
                  {util.label}
                </a>
              ) : (
                <Link
                  key={util.label}
                  to={util.to}
                  className="inline-flex items-center justify-center rounded-full border border-transparent px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                >
                  {util.label}
                </Link>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
