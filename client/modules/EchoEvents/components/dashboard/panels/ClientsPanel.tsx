import { Users, MessageSquare, Heart } from "lucide-react";
import { MiniPanel } from "../MiniPanel";
import { cn } from "@/lib/utils";
interface ClientItem {
  id: string;
  name: string;
  company?: string;
  lastInteraction?: string;
  health?: "healthy" | "at-risk" | "new";
  engagement?: number;
}
interface ClientsPanelProps {
  clients?: ClientItem[];
  onClientClick?: (clientId: string) => void;
  isMinimized?: boolean;
  onMinimize?: () => void;
  onClose?: () => void;
  size?: "small" | "medium" | "large";
  onSizeChange?: (size: "small" | "medium" | "large") => void;
}
const DEFAULT_CLIENTS: ClientItem[] = [
  {
    id: "1",
    name: "Acme Corporation",
    company: "Tech",
    lastInteraction: "2 days ago",
    health: "healthy",
    engagement: 95,
  },
  {
    id: "2",
    name: "Global Events Inc",
    company: "Events",
    lastInteraction: "1 week ago",
    health: "healthy",
    engagement: 87,
  },
  {
    id: "3",
    name: "Luxury Weddings Co",
    company: "Weddings",
    lastInteraction: "3 weeks ago",
    health: "at-risk",
    engagement: 45,
  },
  {
    id: "4",
    name: "New Client LLC",
    company: "Unknown",
    lastInteraction: "5 days ago",
    health: "new",
    engagement: 30,
  },
];
const healthColors = {
  healthy: "text-green-400",
  "at-risk": "text-red-400",
  new: "text-blue-400",
};
const healthIcons = { healthy: "●", "at-risk": "⚠", new: "★" };
export function ClientsPanel({
  clients = DEFAULT_CLIENTS,
  onClientClick,
  isMinimized,
  onMinimize,
  onClose,
  size = "medium",
  onSizeChange,
}: ClientsPanelProps) {
  return (
    <MiniPanel
      id="clients"
      title="Top Clients"
      icon={<Users className="h-4 w-4" />}
      isMinimized={isMinimized}
      onMinimize={onMinimize}
      onClose={onClose}
      size={size}
      onSizeChange={onSizeChange}
    >
      {" "}
      <div className="space-y-2">
        {" "}
        {clients.length === 0 ? (
          <p className="text-xs text-white/50 py-4 text-center">
            {" "}
            No clients found{" "}
          </p>
        ) : (
          clients.map((client) => (
            <button
              key={client.id}
              onClick={() => onClientClick?.(client.id)}
              className="w-full text-left p-2.5 rounded-lg bg-background border border-white/10 hover:bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              {" "}
              <div className="flex items-start justify-between gap-2 mb-1">
                {" "}
                <div className="flex-1 min-w-0">
                  {" "}
                  <p className="text-xs font-semibold text-white truncate">
                    {" "}
                    {client.name}{" "}
                  </p>{" "}
                  {client.company && (
                    <p className="text-xs text-white/60">{client.company}</p>
                  )}{" "}
                </div>{" "}
                {client.health && (
                  <span
                    className={cn(
                      "text-xs font-bold flex-shrink-0",
                      healthColors[client.health],
                    )}
                  >
                    {" "}
                    {healthIcons[client.health]}{" "}
                  </span>
                )}{" "}
              </div>{" "}
              <div className="flex items-center justify-between gap-2">
                {" "}
                {client.lastInteraction && (
                  <p className="text-xs text-white/50">
                    {" "}
                    {client.lastInteraction}{" "}
                  </p>
                )}{" "}
                {client.engagement !== undefined && (
                  <div className="flex items-center gap-1">
                    {" "}
                    <div className="w-12 h-1.5 rounded-full bg-background overflow-hidden">
                      {" "}
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-purple-400"
                        style={{ width: `${client.engagement}%` }}
                      />{" "}
                    </div>{" "}
                    <span className="text-xs text-white/60">
                      {" "}
                      {client.engagement}%{" "}
                    </span>{" "}
                  </div>
                )}{" "}
              </div>{" "}
            </button>
          ))
        )}{" "}
      </div>{" "}
    </MiniPanel>
  );
}
