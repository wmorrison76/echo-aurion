import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/context/LanguageContext";
import {
  Search,
  FileText,
  Image,
  ChefHat,
  Pill,
  Boxes,
  ClipboardList,
  Settings,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CommandItem = {
  id: string;
  title: string;
  description?: string;
  category: string;
  icon?: React.ComponentType<{ className?: string }>;
  action: () => void;
  keywords?: string[];
};

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [, setParams] = useSearchParams();
  const { t } = useTranslation();

  const commands: CommandItem[] = useMemo(
    () => [
      {
        id: "search",
        title: t("pages.search", "Search Recipes"),
        category: t("common.navigation", "Navigation"),
        icon: Search,
        action: () => {
          setParams({ tab: "search" });
          setIsOpen(false);
        },
        keywords: ["search", "recipe", "find"],
      },
      {
        id: "gallery",
        title: t("pages.gallery", "Gallery"),
        category: t("common.navigation", "Navigation"),
        icon: Image,
        action: () => {
          setParams({ tab: "gallery" });
          setIsOpen(false);
        },
        keywords: ["gallery", "images", "photos"],
      },
      {
        id: "add-recipe",
        title: t("pages.add_recipe", "Add Recipe"),
        category: t("common.navigation", "Navigation"),
        icon: FileText,
        action: () => {
          setParams({ tab: "add-recipe" });
          setIsOpen(false);
        },
        keywords: ["add", "new", "recipe", "create"],
      },
      {
        id: "menu-studio",
        title: t("pages.menu_studio", "Menu Studio"),
        category: t("common.navigation", "Navigation"),
        icon: Zap,
        action: () => {
          setParams({ tab: "menu-studio" });
          setIsOpen(false);
        },
        keywords: ["menu", "design", "studio"],
      },
      {
        id: "production",
        title: t("pages.production", "Production"),
        category: t("common.navigation", "Navigation"),
        icon: ChefHat,
        action: () => {
          setParams({ tab: "production" });
          setIsOpen(false);
        },
        keywords: ["production", "tasks", "cooking"],
      },
      {
        id: "inventory",
        title: t("pages.inventory", "Inventory & Supplies"),
        category: t("common.navigation", "Navigation"),
        icon: Boxes,
        action: () => {
          setParams({ tab: "inventory" });
          setIsOpen(false);
        },
        keywords: ["inventory", "supplies", "stock"],
      },
      {
        id: "nutrition",
        title: t("pages.nutrition", "Nutrition & Allergens"),
        category: t("common.navigation", "Navigation"),
        icon: Pill,
        action: () => {
          setParams({ tab: "nutrition" });
          setIsOpen(false);
        },
        keywords: ["nutrition", "allergens", "health"],
      },
      {
        id: "haccp",
        title: t("pages.haccp", "HACCP/Compliance"),
        category: t("common.navigation", "Navigation"),
        icon: ClipboardList,
        action: () => {
          setParams({ tab: "haccp" });
          setIsOpen(false);
        },
        keywords: ["haccp", "compliance", "safety"],
      },
      {
        id: "dish-assembly",
        title: t("pages.dish_assembly", "Dish Assembly"),
        category: t("common.navigation", "Navigation"),
        icon: ChefHat,
        action: () => {
          setParams({ tab: "dish-assembly" });
          setIsOpen(false);
        },
        keywords: ["dish", "assembly", "component"],
      },
      {
        id: "server-notes",
        title: t("pages.server_notes", "Server Notes"),
        category: t("common.navigation", "Navigation"),
        icon: FileText,
        action: () => {
          setParams({ tab: "server-notes" });
          setIsOpen(false);
        },
        keywords: ["server", "notes", "documentation"],
      },
    ],
    [setParams, t],
  );

  const filtered = useMemo(() => {
    if (!search) return commands;

    const searchLower = search.toLowerCase();
    return commands.filter((cmd) => {
      const titleMatch = cmd.title.toLowerCase().includes(searchLower);
      const descMatch = cmd.description?.toLowerCase().includes(searchLower);
      const keywordsMatch = cmd.keywords?.some((kw) =>
        kw.toLowerCase().includes(searchLower),
      );
      return titleMatch || descMatch || keywordsMatch;
    });
  }, [search, commands]);

  const handleSelect = useCallback(
    (item: CommandItem) => {
      item.action();
      setIsOpen(false);
      setSearch("");
    },
    [],
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered]);

  const handleOpenPalette = useCallback(() => {
    setIsOpen(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === 0 ? filtered.length - 1 : prev - 1,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[selectedIndex]) {
          handleSelect(filtered[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t("common.command_palette", "Command Palette")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder={t("common.search_commands", "Search commands...")}
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="max-h-[400px] overflow-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                {t("common.no_results", "No commands found")}
              </div>
            ) : (
              <div className="space-y-1">
                {filtered.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className={cn(
                        "w-full px-4 py-2 text-left text-sm rounded-md flex items-center gap-3 transition-colors",
                        index === selectedIndex
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent",
                      )}
                    >
                      {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.title}</div>
                        {item.description && (
                          <div className="text-xs opacity-70 truncate">
                            {item.description}
                          </div>
                        )}
                      </div>
                      <div className="text-xs opacity-50 flex-shrink-0">
                        {item.category}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
