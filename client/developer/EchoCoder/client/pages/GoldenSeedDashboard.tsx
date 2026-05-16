import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Home,
  ChefHat,
  Cake,
  Calendar,
  Package,
  Crown,
  Wine,
  Users,
  Handshake,
  HelpCircle,
  Pencil,
  Video,
  Palette,
  StickyNote,
  Code,
  Sparkles,
  Grid3x3,
  Layout,
} from "lucide-react";

const modules = [
  { id: "dashboard", name: "Dashboard", icon: Home, path: "/dashboard", desc: "Home screen" },
  { id: "culinary", name: "Culinary", icon: ChefHat, path: "/culinary", desc: "Recipe management" },
  { id: "pastry", name: "Pastry", icon: Cake, path: "/pastry", desc: "Cake design" },
  { id: "schedule", name: "Schedule", icon: Calendar, path: "/schedule", desc: "Production timeline" },
  { id: "inventory", name: "Inventory", icon: Package, path: "/inventory", desc: "Supply tracking" },
  { id: "maestro", name: "Maestro", icon: Crown, path: "/maestro", desc: "Kitchen management" },
  { id: "mixology", name: "Mixology", icon: Wine, path: "/mixology", desc: "Bar management" },
  { id: "crm", name: "CRM", icon: Users, path: "/crm", desc: "Customer management" },
  { id: "chefnet", name: "ChefNet", icon: Handshake, path: "/chefnet", desc: "Team collaboration" },
  { id: "support", name: "Support", icon: HelpCircle, path: "/support", desc: "Help desk" },
  { id: "whiteboard", name: "Whiteboard", icon: Pencil, path: "/whiteboard", desc: "Drawing canvas" },
  { id: "video", name: "Video", icon: Video, path: "/video", desc: "Video conference" },
  { id: "canvas", name: "Canvas", icon: Palette, path: "/canvas", desc: "3D visualization" },
  { id: "stickynotes", name: "Sticky Notes", icon: StickyNote, path: "/stickynotes", desc: "Quick notes" },
  { id: "echocoder", name: "EchoCoder", icon: Code, path: "/echocoder", desc: "Developer studio", badge: "🔧" },
  { id: "aurum", name: "Echo Aurum", icon: Sparkles, path: "/aurum", desc: "Analytics" },
  { id: "layout", name: "Echo Layout", icon: Layout, path: "/layout", desc: "Space management" },
];

export default function GoldenSeedDashboard() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <section className="border-b border-border/40 bg-card/50 backdrop-blur">
        <div className="container px-4 py-12 sm:py-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 mb-4">
            <Grid3x3 className="h-3 w-3" />
            <span className="text-xs font-medium text-foreground">Golden Seed Suite</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Hospitality Management</h1>
          <p className="mt-2 text-muted-foreground">15 integrated modules for professional hospitality operations</p>
        </div>
      </section>

      {/* Modules Grid */}
      <section className="container px-4 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {modules.map(({ id, name, icon: Icon, path, desc, badge }) => (
            <Link key={id} to={path}>
              <Card className="h-full hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="rounded-md bg-primary/10 p-2 text-primary group-hover:bg-primary/20 transition">
                      <Icon className="h-5 w-5" />
                    </div>
                    {badge && <span className="text-lg">{badge}</span>}
                  </div>
                  <CardTitle className="text-base mt-2">{name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="container px-4 py-12 sm:py-16 border-t border-border/40">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Modules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">17</div>
              <p className="text-xs text-muted-foreground mt-1">Dashboard + 15 Modules + Settings</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Color Schemes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5</div>
              <p className="text-xs text-muted-foreground mt-1">Cyan, Blue, Emerald, Violet, Rose</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Languages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5</div>
              <p className="text-xs text-muted-foreground mt-1">EN/ES/FR/PT/IT</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">✓</div>
              <p className="text-xs text-muted-foreground mt-1">Production Ready</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
