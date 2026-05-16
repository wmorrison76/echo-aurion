import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import LanguageSelect from "./LanguageSelect";
import HelpDesk from "./HelpDesk";
import ProjectSettings from "./ProjectSettings";
import { EnterpriseHelpButton } from "@/components/help/EnterpriseHelpButton";
import { EchoProLogo } from "@/components/branding/EchoProLogo";
import { useI18n } from "@/i18n";
import { LayoutDashboard, Settings, Code, Palette } from "lucide-react";

const NavItem = ({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      cn(
        "text-sm px-3 py-2 rounded-md transition-colors",
        isActive
          ? "text-foreground bg-accent/40"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/30",
      )
    }
  >
    {children}
  </NavLink>
);

function ApplyButton() {
  return null;
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    try {
      const onScroll = () => setScrolled(window.scrollY > 12);
      onScroll();
      window.addEventListener("scroll", onScroll);
      return () => window.removeEventListener("scroll", onScroll);
    } catch (err) {
      console.error("Header scroll listener error:", err);
    }
  }, []);

  const { t } = useI18n();
  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full backdrop-blur supports-[backdrop-filter]:bg-background/70 py-0",
        scrolled ? "border-b" : "border-b border-transparent",
      )}
    >
      <div className="w-full flex h-10 items-center justify-between gap-1 px-4">
        <Link
          to="/"
          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
        >
          <EchoProLogo size={32} variant="gradient" />
          <span className="hidden sm:inline text-xs font-semibold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            EchoCoder Pro
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/60 text-foreground/80 shadow-sm transition hover:bg-accent/30 hover:text-foreground"
            title="Dashboard"
            aria-label="Dashboard"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
          </Link>
          <NavItem to="/studio?task=Blueprint&tab=design">
            <span className="inline-flex items-center gap-1 text-xs">
              {t("nav.blueprint")}
            </span>
          </NavItem>
          <NavItem to="/studio?task=Coder&tab=code" className="text-xs">
            {t("nav.studio")}
          </NavItem>
          <NavItem to="/echo-training" className="text-xs">
            Echo Training
          </NavItem>
          <NavItem to="/echo-controls" className="text-xs">
            Orb
          </NavItem>
        </nav>

        <div className="flex items-center gap-1 pr-1 md:pr-1">
          <Link
            to="/figma-to-code"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/60 text-foreground/80 shadow-sm transition hover:bg-accent/30 hover:text-foreground"
            title="Figma to Code"
            aria-label="Figma to Code"
          >
            <Code className="h-3.5 w-3.5" />
          </Link>
          <ProjectSettings />
          <Link
            to="/settings"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/60 text-foreground/80 shadow-sm transition hover:bg-accent/30 hover:text-foreground"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </Link>
          <HelpDesk />
          <LanguageSelect />
        </div>
      </div>
    </header>
  );
}
