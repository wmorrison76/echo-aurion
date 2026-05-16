import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface MenuItemProps {
  label: string;
  shortcut?: string;
  onClick?: () => void;
  submenu?: MenuItemProps[];
  divider?: boolean;
}

interface MenuProps {
  label: string;
  items: MenuItemProps[];
}

interface CakeDesignerMenuBarProps {
  onMenuAction: (action: string, data?: any) => void;
  currentCakeSize?: string;
  currentShape?: "round" | "square" | "sheet";
  pricingVisible?: boolean;
  designName?: string;
  showPricing?: boolean;
}

export default function CakeDesignerMenuBar({
  onMenuAction,
  currentCakeSize = "round",
  currentShape = "round",
  pricingVisible = true,
  designName = "Untitled Design",
  showPricing = true,
}: CakeDesignerMenuBarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  const cakeSizeOptions = [
    '6"',
    '8"',
    '10"',
    '12"',
    '14"',
    '16"',
    '18"',
    '20"',
  ];
  const shapeOptions = ["round", "square", "sheet"];
  const portionOptions = ["1/4", "1/2", "Full"];

  const menus: MenuProps[] = [
    {
      label: "File",
      items: [
        { label: "New Design", onClick: () => onMenuAction("cake-new") },
        { label: "Open Design", onClick: () => onMenuAction("cake-open") },
        {
          label: "Save",
          shortcut: "Ctrl+S",
          onClick: () => onMenuAction("cake-save"),
        },
        {
          label: "Save As",
          shortcut: "Ctrl+Shift+S",
          onClick: () => onMenuAction("cake-save-as"),
        },
        { divider: true },
        {
          label: "Export as PNG",
          onClick: () => onMenuAction("cake-export-png"),
        },
        {
          label: "Export as PDF",
          onClick: () => onMenuAction("cake-export-pdf"),
        },
        {
          label: "Print",
          shortcut: "Ctrl+P",
          onClick: () => onMenuAction("cake-print"),
        },
      ],
    },
    {
      label: "Edit",
      items: [
        {
          label: "Undo",
          shortcut: "Ctrl+Z",
          onClick: () => onMenuAction("cake-undo"),
        },
        {
          label: "Redo",
          shortcut: "Ctrl+Y",
          onClick: () => onMenuAction("cake-redo"),
        },
        { divider: true },
        { label: "Clear Canvas", onClick: () => onMenuAction("cake-clear") },
      ],
    },
    {
      label: "View",
      items: [
        { label: "3D View", onClick: () => onMenuAction("cake-view-3d") },
        {
          label: "Layer View",
          onClick: () => onMenuAction("cake-view-layers"),
        },
        { label: "Grid", onClick: () => onMenuAction("cake-toggle-grid") },
        { divider: true },
        {
          label: "Zoom In",
          shortcut: "Ctrl++",
          onClick: () => onMenuAction("cake-zoom-in"),
        },
        {
          label: "Zoom Out",
          shortcut: "Ctrl+-",
          onClick: () => onMenuAction("cake-zoom-out"),
        },
        {
          label: "Fit Canvas",
          shortcut: "Ctrl+0",
          onClick: () => onMenuAction("cake-fit-canvas"),
        },
      ],
    },
    {
      label: "Design",
      items: [
        {
          label: "Cake Size",
          submenu: cakeSizeOptions.map((size) => ({
            label: size,
            onClick: () => onMenuAction("cake-set-size", { size }),
          })),
        },
        {
          label: "Shape",
          submenu: shapeOptions.map((shape) => ({
            label: shape.charAt(0).toUpperCase() + shape.slice(1),
            onClick: () => onMenuAction("cake-set-shape", { shape }),
          })),
        },
        { divider: true },
        { label: "Flavors", onClick: () => onMenuAction("cake-set-flavors") },
        { label: "Fillings", onClick: () => onMenuAction("cake-set-fillings") },
        { label: "Frosting", onClick: () => onMenuAction("cake-set-frosting") },
        {
          label: "Frosting Color",
          onClick: () => onMenuAction("cake-set-frosting-color"),
        },
      ],
    },
    {
      label: "Decorations",
      items: [
        {
          label: "Add Decoration",
          onClick: () => onMenuAction("cake-add-decoration"),
        },
        {
          label: "Decoration Gallery",
          onClick: () => onMenuAction("cake-decoration-gallery"),
        },
        {
          label: "Remove All",
          onClick: () => onMenuAction("cake-remove-decorations"),
        },
        { divider: true },
        {
          label: "Sprinkles",
          onClick: () => onMenuAction("cake-add-sprinkles"),
        },
        { label: "Toppings", onClick: () => onMenuAction("cake-add-toppings") },
      ],
    },
    {
      label: "Tools",
      items: [
        {
          label: "Cut a Slice",
          onClick: () => onMenuAction("cake-cut-slice"),
        },
        {
          label: "Rotate Cake",
          onClick: () => onMenuAction("cake-rotate-view"),
        },
        {
          label: "Regenerate Layer",
          onClick: () => onMenuAction("cake-regenerate-layer"),
        },
        {
          label: "Reset Design",
          onClick: () => onMenuAction("cake-reset-design"),
        },
      ],
    },
    {
      label: "Pricing",
      items: [
        {
          label: `${showPricing ? "Hide" : "Show"} Pricing`,
          onClick: () => onMenuAction("cake-toggle-pricing"),
        },
        { divider: true },
        {
          label: "Adjust Prices",
          onClick: () => onMenuAction("cake-adjust-prices"),
        },
        {
          label: "Bulk Order Pricing",
          onClick: () => onMenuAction("cake-bulk-pricing"),
        },
        {
          label: "Settings",
          onClick: () => onMenuAction("cake-pricing-settings"),
        },
      ],
    },
    {
      label: "Settings",
      items: [
        {
          label: "Bakery Settings",
          onClick: () => onMenuAction("cake-bakery-settings"),
        },
        {
          label: "Default Sizes",
          onClick: () => onMenuAction("cake-default-sizes"),
        },
        {
          label: "Portions Per Size",
          onClick: () => onMenuAction("cake-portions-config"),
        },
        { divider: true },
        {
          label: "Preferences",
          onClick: () => onMenuAction("cake-preferences"),
        },
      ],
    },
    {
      label: "Help",
      items: [
        {
          label: "Keyboard Shortcuts",
          shortcut: "?",
          onClick: () => onMenuAction("cake-shortcuts"),
        },
        {
          label: "About Cake Designer",
          onClick: () => onMenuAction("cake-about"),
        },
      ],
    },
  ];

  const renderMenuItem = (item: MenuItemProps, index: number) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0;

    if (item.divider) {
      return (
        <div
          key={`divider-${index}`}
          style={{
            height: "1px",
            backgroundColor: "#444",
            margin: "4px 0",
          }}
        />
      );
    }

    return (
      <button
        key={`${item.label}-${index}`}
        onClick={() => {
          if (item.onClick) {
            item.onClick();
            setOpenMenu(null);
            setOpenSubmenu(null);
          }
        }}
        onMouseEnter={() => hasSubmenu && setOpenSubmenu(item.label)}
        onMouseLeave={() => setOpenSubmenu(null)}
        style={{
          padding: "8px 12px",
          backgroundColor: "transparent",
          border: "none",
          color: "#ccc",
          cursor: "pointer",
          fontSize: "13px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          whiteSpace: "nowrap",
          transition: "all 0.15s",
        }}
        onMouseEnterCapture={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
            "rgba(0, 240, 255, 0.1)";
          (e.currentTarget as HTMLButtonElement).style.color = "#00f0ff";
        }}
        onMouseLeaveCapture={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
            "transparent";
          (e.currentTarget as HTMLButtonElement).style.color = "#ccc";
        }}
      >
        <span>{item.label}</span>
        {item.shortcut && (
          <span
            style={{
              marginLeft: "12px",
              color: "#666",
              fontSize: "11px",
            }}
          >
            {item.shortcut}
          </span>
        )}
        {hasSubmenu && (
          <ChevronRight
            size={14}
            style={{ marginLeft: "8px", color: "#666" }}
          />
        )}

        {/* Submenu */}
        {hasSubmenu && openSubmenu === item.label && (
          <div
            onMouseLeave={() => setOpenSubmenu(null)}
            style={{
              position: "absolute",
              left: "100%",
              top: 0,
              marginLeft: "-4px",
              backgroundColor: "#1a1a1a",
              border: "1px solid #444",
              borderRadius: "4px",
              minWidth: "200px",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
              zIndex: 2000,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {item.submenu!.map((subitem, subindex) =>
              renderMenuItem(subitem, subindex),
            )}
          </div>
        )}
      </button>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        backgroundColor: "rgba(26, 26, 26, 0.98)",
        borderBottom: "1px solid #444",
        backdropFilter: "blur(8px)",
        position: "relative",
        zIndex: 1000,
      }}
    >
      {menus.map((menu) => (
        <div key={menu.label} style={{ position: "relative" }}>
          <button
            onClick={() =>
              setOpenMenu(openMenu === menu.label ? null : menu.label)
            }
            style={{
              padding: "8px 12px",
              borderRadius: "0",
              backgroundColor:
                openMenu === menu.label
                  ? "rgba(0, 240, 255, 0.15)"
                  : "transparent",
              border: "none",
              color: openMenu === menu.label ? "#00f0ff" : "#ccc",
              cursor: "pointer",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!openMenu) return;
              setOpenMenu(menu.label);
            }}
          >
            {menu.label}
            <ChevronDown size={12} />
          </button>

          {/* Dropdown Menu */}
          {openMenu === menu.label && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                backgroundColor: "#1a1a1a",
                border: "1px solid #444",
                borderRadius: "4px",
                minWidth: "220px",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
                zIndex: 1001,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {menu.items.map((item, index) => renderMenuItem(item, index))}
            </div>
          )}
        </div>
      ))}

      {/* Right side - design name and stats */}
      <div style={{ flex: 1 }} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "0 24px",
          color: "#666",
          fontSize: "12px",
        }}
      >
        <span title={designName}>{designName}</span>
        <span>|</span>
        <span>
          {currentShape} - {currentCakeSize}
        </span>
      </div>
    </div>
  );
}
