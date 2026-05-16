import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import LanguageSelect from "./LanguageSelect";
import HelpDesk from "./HelpDesk";
import { useI18n } from "@/i18n";
import { LayoutDashboard, Settings } from "lucide-react";

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
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { t } = useI18n();
  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full backdrop-blur supports-[backdrop-filter]:bg-background/70",
        scrolled ? "border-b" : "border-b border-transparent",
      )}
    >
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight bg-gradient-to-r from-cyan-400 via-sky-300 to-fuchsia-400 bg-clip-text text-transparent">
            EchoCoder
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-2">
          <Link
            to="/"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/60 text-foreground/80 shadow-sm transition hover:bg-accent/30 hover:text-foreground"
            title="Dashboard"
            aria-label="Dashboard"
          >
            <LayoutDashboard className="h-4 w-4" />
          </Link>
          <NavItem to="/studio?task=Blueprint&tab=design">
            <span className="inline-flex items-center gap-1">
              {t("nav.blueprint")}
            </span>
          </NavItem>
          <NavItem to="/studio?task=Coder&tab=code">{t("nav.studio")}</NavItem>
          <NavItem to="/echo-controls">Orb</NavItem>
        </nav>

        <div className="flex items-center gap-2 pr-2 md:pr-2">
          <button
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("open-settings", {
                  detail: { tab: "avatar" },
                }),
              );
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/60 text-foreground/80 shadow-sm transition hover:bg-accent/30 hover:text-foreground"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
          <HelpDesk />
          <LanguageSelect />
        </div>
      </div>
    </header>
  );
}
