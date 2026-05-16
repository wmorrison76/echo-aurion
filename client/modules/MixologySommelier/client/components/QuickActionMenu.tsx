/** * Quick Action Menu Component * Contextual quick actions to reduce clicks */ import React from "react";
import {
  ShoppingCart,
  Package,
  ArrowRightLeft,
  Eye,
  Sparkles,
  FileText,
  Plus,
  Edit,
  Trash2,
  Copy,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
export interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "primary" | "danger";
  disabled?: boolean;
}
interface QuickActionMenuProps {
  actions: QuickAction[];
  position?: "top" | "bottom" | "left" | "right";
  trigger?: "hover" | "click";
  className?: string;
}
export const QuickActionMenu: React.FC<QuickActionMenuProps> = ({
  actions,
  position = "bottom",
  trigger = "hover",
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const positionClasses = {
    top: "bottom-full mb-2",
    bottom: "top-full mt-2",
    left: "right-full mr-2",
    right: "left-full ml-2",
  };
  return (
    <div
      className="relative inline-block"
      onMouseLeave={() => trigger === "hover" && setIsOpen(false)}
    >
      {" "}
      <div
        onMouseEnter={() => trigger === "hover" && setIsOpen(true)}
        onClick={() => trigger === "click" && setIsOpen(!isOpen)}
        className={cn("cursor-pointer", className)}
      >
        {" "}
        {/* Trigger will be provided by parent */}{" "}
      </div>{" "}
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 min-w-[200px] bg-background border border-border rounded-lg shadow-xl p-1",
            positionClasses[position],
          )}
        >
          {" "}
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => {
                action.onClick();
                setIsOpen(false);
              }}
              disabled={action.disabled}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                "hover:bg-muted",
                action.disabled && "opacity-50 cursor-not-allowed",
                action.variant === "primary" && "text-accent",
                action.variant === "danger" && "text-red-500",
              )}
            >
              {" "}
              {action.icon}{" "}
              <span className="text-sm font-medium">{action.label}</span>{" "}
            </button>
          ))}{" "}
        </div>
      )}{" "}
    </div>
  );
}; /** * Pre-built quick actions for common scenarios */
export const useQuickActions = () => {
  const navigate = useNavigate();
  const wineActions = (wineId: string, wineName: string): QuickAction[] => [
    {
      id: "view",
      label: "View Details",
      icon: <Eye className="w-4 h-4" />,
      onClick: () => navigate(`/catalog?wine=${wineId}`),
    },
    {
      id: "order",
      label: "Order Now",
      icon: <ShoppingCart className="w-4 h-4" />,
      onClick: () => {
        /* Emit OS Bus event or navigate to order page */ navigate(
          `/purchase-orders?add=${wineId}`,
        );
      },
      variant: "primary",
    },
    {
      id: "pairing",
      label: "Get Pairing",
      icon: <Sparkles className="w-4 h-4" />,
      onClick: () => navigate(`/recommendations?wine=${wineId}`),
    },
    {
      id: "inventory",
      label: "Check Inventory",
      icon: <Package className="w-4 h-4" />,
      onClick: () => navigate(`/inventory?search=${wineName}`),
    },
  ];
  const inventoryActions = (
    itemId: string,
    itemName: string,
  ): QuickAction[] => [
    {
      id: "view",
      label: "View Details",
      icon: <Eye className="w-4 h-4" />,
      onClick: () => navigate(`/inventory?item=${itemId}`),
    },
    {
      id: "transfer",
      label: "Transfer",
      icon: <ArrowRightLeft className="w-4 h-4" />,
      onClick: () => navigate(`/transfers?from=${itemId}`),
      variant: "primary",
    },
    {
      id: "reorder",
      label: "Create PO",
      icon: <FileText className="w-4 h-4" />,
      onClick: () => navigate(`/purchase-orders?add=${itemId}`),
    },
    {
      id: "edit",
      label: "Edit",
      icon: <Edit className="w-4 h-4" />,
      onClick: () => {
        /* Trigger inline editing */ const event = new CustomEvent(
          "inventory:edit",
          { detail: { itemId } },
        );
        window.dispatchEvent(event);
      },
    },
  ];
  const recommendationActions = (
    recommendationId: string,
    itemId: string,
    itemType: "wine" | "cocktail",
  ): QuickAction[] => [
    {
      id: "add-to-cart",
      label: "Add to Cart",
      icon: <ShoppingCart className="w-4 h-4" />,
      onClick: () => {
        /* Add to cart via OS Bus */ const event = new CustomEvent(
          "beverage:add_to_cart",
          { detail: { recommendationId, itemId, itemType } },
        );
        window.dispatchEvent(event);
      },
      variant: "primary",
    },
    {
      id: "view-details",
      label: "View Details",
      icon: <Eye className="w-4 h-4" />,
      onClick: () => {
        if (itemType === "wine") {
          navigate(`/catalog?wine=${itemId}`);
        } else {
          navigate(`/recommendations?cocktail=${itemId}`);
        }
      },
    },
    {
      id: "check-inventory",
      label: "Check Inventory",
      icon: <Package className="w-4 h-4" />,
      onClick: () => navigate(`/inventory?item=${itemId}`),
    },
  ];
  return { wineActions, inventoryActions, recommendationActions };
};
