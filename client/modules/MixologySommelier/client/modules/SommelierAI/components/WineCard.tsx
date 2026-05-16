import React from "react";
import { Wine } from "../../../lib/wines";
import { Star, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

interface WineCardProps {
  wine: Wine;
  onClick?: () => void;
}

export const WineCard: React.FC<WineCardProps> = ({ wine, onClick }) => {
  const [liked, setLiked] = React.useState(false);
  const { t } = useI18n();
  const wineTypeClass = `wine-card-${wine.type}`;
  const wineIndicatorClass = `wine-type-indicator-${wine.type}`;

  return (
    <div
      onClick={onClick}
      className={cn(
        "luccca-theme glass neon-border",
        "p-7 rounded-[18px]",
        "cursor-pointer",
        "hover:scale-[1.02] hover:-translate-y-1",
        "transition-all duration-300",
        "relative overflow-hidden group",
        wineTypeClass,
      )}
    >
      <div className={cn("wine-type-indicator", wineIndicatorClass)} />

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <h3 className="text-xl font-bold text-foreground mb-1.5 tracking-tight">
            {wine.name}
          </h3>
          <p className="text-sm text-muted-foreground font-medium">
            {wine.region} • {wine.vintage}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setLiked((prev) => !prev);
          }}
          className={cn(
            "text-muted-foreground hover:text-accent transition-colors",
            liked && "text-accent",
          )}
        >
          <Heart
            className={cn(
              "w-5 h-5",
              liked && "dark:drop-shadow-[0_0_8px_rgba(0,209,255,0.4)]",
            )}
            fill={liked ? "currentColor" : "none"}
          />
        </button>
      </div>

      <div className="text-4xl mb-5 text-center opacity-90 relative z-10">
        {wine.image}
      </div>

      <div className="flex items-center gap-1.5 mb-5 relative z-10">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={cn(
              "w-3.5 h-3.5",
              i < Math.round(wine.rating / 2)
                ? "fill-accent text-accent"
                : "fill-muted text-muted",
            )}
          />
        ))}
        <span className="text-sm font-bold text-accent ml-1.5">{wine.rating}</span>
      </div>

      <p className="text-sm text-muted-foreground mb-4 line-clamp-2 relative z-10">
        {wine.description}
      </p>

      <div className="flex gap-2 flex-wrap mb-5 relative z-10">
        {wine.grapeVarieties.map((grape) => (
          <span
            key={grape}
            className="px-3.5 py-1.5 bg-accent/10 text-accent rounded-lg text-xs font-semibold"
          >
            {grape}
          </span>
        ))}
      </div>

      <div className="flex justify-between items-center pt-5 border-t border-border relative z-10">
        <span className="text-2xl font-bold text-foreground">${wine.price}</span>
        <button className="luccca-theme bg-accent text-background px-5 py-2.5 rounded-md font-semibold text-sm shadow-lg hover:shadow-xl hover:scale-105 hover:-translate-y-0.5 transition-all duration-200">
          {t("View Details") || "View Details"}
        </button>
      </div>
    </div>
  );
};
