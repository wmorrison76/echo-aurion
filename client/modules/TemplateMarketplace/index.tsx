import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Star,
  Download,
  Share2,
  Heart,
  Eye,
  Users,
  TrendingUp,
  Filter,
  Search,
  Plus,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/glass";
import { useI18n } from "@/i18n";
import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";
interface Template {
  id: string;
  name: string;
  category: "menu" | "workflow" | "recipe" | "schedule" | "event" | "training";
  title: string;
  description: string;
  author: string;
  rating: number;
  reviews: number;
  downloads: number;
  price: number;
  tags: string[];
  thumbnail: string;
  difficultyLevel: "beginner" | "intermediate" | "advanced";
  cookingTime?: number;
  servings?: number;
  cuisineType?: string;
  isVerified: boolean;
  isPremium: boolean;
  updatedAt: string;
}
interface MarketplaceStats {
  totalTemplates: number;
  totalUsers: number;
  totalDownloads: number;
  averageRating: number;
}
const TEMPLATES: Template[] = [
  {
    id: "menu-1",
    name: "seasonal-spring",
    category: "menu",
    title: "Spring Seasonal Menu",
    description:
      "Ready-to-use spring menu with 12 dishes featuring seasonal ingredients",
    author: "Chef Marcus",
    rating: 4.8,
    reviews: 156,
    downloads: 1250,
    price: 29.99,
    tags: ["seasonal", "spring", "vegetarian-friendly", "farm-to-table"],
    thumbnail: "🌱",
    difficultyLevel: "intermediate",
    isVerified: true,
    isPremium: true,
    updatedAt: "2024-11-20",
  },
  {
    id: "recipe-1",
    name: "beef-wellington",
    category: "recipe",
    title: "Beef Wellington - Executive Chef Recipe",
    description:
      "Michelin-standard beef wellington with full preparation guide and plating techniques",
    author: "Chef Laurent",
    rating: 4.9,
    reviews: 342,
    downloads: 2840,
    price: 19.99,
    tags: ["beef", "french", "fine-dining", "techniques"],
    thumbnail: "🥩",
    difficultyLevel: "advanced",
    cookingTime: 90,
    servings: 4,
    cuisineType: "French",
    isVerified: true,
    isPremium: true,
    updatedAt: "2024-11-15",
  },
  {
    id: "workflow-1",
    name: "prep-station-workflow",
    category: "workflow",
    title: "Daily Prep Station Workflow",
    description:
      "Optimized workflow for efficient prep station setup and maintenance",
    author: "Operation Manager Sarah",
    rating: 4.7,
    reviews: 89,
    downloads: 543,
    price: 14.99,
    tags: ["workflow", "prep", "efficiency", "training"],
    thumbnail: "⚙️",
    difficultyLevel: "beginner",
    isVerified: true,
    isPremium: false,
    updatedAt: "2024-11-18",
  },
  {
    id: "schedule-1",
    name: "weekend-schedule",
    category: "schedule",
    title: "Weekend Rush Hour Schedule Template",
    description:
      "Tested schedule for managing peak weekend service with optimal staffing",
    author: "HR Manager James",
    rating: 4.6,
    reviews: 112,
    downloads: 876,
    price: 9.99,
    tags: ["schedule", "weekend", "staffing", "peak-hours"],
    thumbnail: "📅",
    difficultyLevel: "beginner",
    isVerified: true,
    isPremium: false,
    updatedAt: "2024-11-10",
  },
  {
    id: "event-1",
    name: "wedding-catering",
    category: "event",
    title: "Wedding Catering Template - 100 Guests",
    description:
      "Complete catering package with menu, timeline, staffing, and service plan for 100-person wedding",
    author: "Event Manager Lisa",
    rating: 4.9,
    reviews: 267,
    downloads: 1998,
    price: 49.99,
    tags: ["event", "wedding", "catering", "service-plan"],
    thumbnail: "💍",
    difficultyLevel: "advanced",
    servings: 100,
    isVerified: true,
    isPremium: true,
    updatedAt: "2024-11-22",
  },
  {
    id: "training-1",
    name: "bartender-certification",
    category: "training",
    title: "Bartender Certification Program",
    description:
      "Complete training curriculum with 15 modules, tests, and skill assessments",
    author: "Training Academy",
    rating: 4.8,
    reviews: 423,
    downloads: 3456,
    price: 79.99,
    tags: ["training", "certification", "bartender", "skills"],
    thumbnail: "🍸",
    difficultyLevel: "intermediate",
    isVerified: true,
    isPremium: true,
    updatedAt: "2024-11-01",
  },
  {
    id: "menu-2",
    name: "lunch-casual",
    category: "menu",
    title: "Casual Lunch Menu",
    description: "Fast-casual lunch menu with 8 main dishes and 5 sides",
    author: "Chef Emma",
    rating: 4.5,
    reviews: 78,
    downloads: 432,
    price: 19.99,
    tags: ["casual", "lunch", "quick-service"],
    thumbnail: "🥗",
    difficultyLevel: "beginner",
    isVerified: true,
    isPremium: false,
    updatedAt: "2024-11-12",
  },
  {
    id: "recipe-2",
    name: "chocolate-soufle",
    category: "recipe",
    title: "Chocolate Soufflé - Pastry Chef Recipe",
    description:
      "Perfect chocolate soufflé with timing secrets and troubleshooting tips",
    author: "Pastry Chef Sophie",
    rating: 4.9,
    reviews: 289,
    downloads: 2156,
    price: 12.99,
    tags: ["chocolate", "dessert", "technique", "pastry"],
    thumbnail: "🍫",
    difficultyLevel: "advanced",
    cookingTime: 30,
    servings: 6,
    cuisineType: "French",
    isVerified: true,
    isPremium: false,
    updatedAt: "2024-11-08",
  },
];
const MARKETPLACE_STATS: MarketplaceStats = {
  totalTemplates: 2456,
  totalUsers: 8932,
  totalDownloads: 125643,
  averageRating: 4.72,
};
export default function TemplateMarketplaceModule() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<
    "popular" | "rated" | "newest" | "price-low" | "price-high"
  >("popular");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showMyLibrary, setShowMyLibrary] = useState(false);
  const filteredTemplates = useMemo(() => {
    let results = TEMPLATES.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase()),
        );
      const matchesCategory =
        !selectedCategory || t.category === selectedCategory;
      const matchesDifficulty =
        !difficultyFilter || t.difficultyLevel === difficultyFilter;
      return matchesSearch && matchesCategory && matchesDifficulty;
    });
    results.sort((a, b) => {
      switch (sortBy) {
        case "popular":
          return b.downloads - a.downloads;
        case "rated":
          return b.rating - a.rating;
        case "newest":
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        default:
          return 0;
      }
    });
    return results;
  }, [searchQuery, selectedCategory, difficultyFilter, sortBy]);
  const handleToggleFavorite = (templateId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(templateId)) {
      newFavorites.delete(templateId);
    } else {
      newFavorites.add(templateId);
    }
    setFavorites(newFavorites);
  };
  const handleDownload = async (template: Template) => {
    try {
      const response = await fetch("/api/template-marketplace/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: template.id }),
      });
      if (response.ok) {
        console.log(`[MARKETPLACE] Downloaded: ${template.title}`);
      }
    } catch (error) {
      console.error("[MARKETPLACE] Download error:", error);
    }
  };
  const categories = [
    {
      value: "menu",
      label: t("module.template-marketplace.categories.menus"),
      icon: "📋",
    },
    {
      value: "recipe",
      label: t("module.template-marketplace.categories.recipes"),
      icon: "👨‍🍳",
    },
    {
      value: "workflow",
      label: t("module.template-marketplace.categories.workflows"),
      icon: "⚙️",
    },
    {
      value: "schedule",
      label: t("module.template-marketplace.categories.schedules"),
      icon: "📅",
    },
    {
      value: "event",
      label: t("module.template-marketplace.categories.events"),
      icon: "🎉",
    },
    {
      value: "training",
      label: t("module.template-marketplace.categories.training"),
      icon: "📚",
    },
  ];
  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-900/50 via-slate-800/50 to-slate-900/50 rounded-lg border border-border shadow-xl p-4 gap-4 overflow-y-auto">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            {" "}
            <TrendingUp className="w-6 h-6 text-cyan-400" />{" "}
            {t("module.template-marketplace.title")}{" "}
          </h1>{" "}
          <p className="text-sm text-slate-400">
            {t("module.template-marketplace.description")}
          </p>{" "}
        </div>{" "}
        <div className="flex items-center gap-3">
          {" "}
          <ModuleChatButton
            moduleId="template-marketplace"
            moduleName={t("module.template-marketplace.title")}
          />{" "}
          <Button className="gap-2">
            {" "}
            <Plus className="w-4 h-4" />{" "}
            {t("module.template-marketplace.createTemplate")}{" "}
          </Button>{" "}
        </div>{" "}
      </div>{" "}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {" "}
        <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border border-border">
          {" "}
          <TabsTrigger
            value="browse"
            className="data-[state=active]:bg-primary/20 data-[state=active]:border-blue-500/50"
          >
            {" "}
            {t("module.template-marketplace.tabs.browse")}{" "}
          </TabsTrigger>{" "}
          <TabsTrigger
            value="my-library"
            className="data-[state=active]:bg-primary/20 data-[state=active]:border-blue-500/50"
          >
            {" "}
            {t("module.template-marketplace.tabs.myLibrary")} ({favorites.size}
            ){" "}
          </TabsTrigger>{" "}
          <TabsTrigger
            value="analytics"
            className="data-[state=active]:bg-primary/20 data-[state=active]:border-blue-500/50"
          >
            {" "}
            {t("module.template-marketplace.tabs.analytics")}{" "}
          </TabsTrigger>{" "}
        </TabsList>{" "}
        <TabsContent value="browse" className="space-y-4">
          {" "}
          <div className="flex gap-2 items-center flex-wrap">
            {" "}
            <div className="flex-1 min-w-[300px]">
              {" "}
              <div className="relative">
                {" "}
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />{" "}
                <Input
                  placeholder={t(
                    "module.template-marketplace.searchPlaceholder",
                  )}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-border"
                />{" "}
              </div>{" "}
            </div>{" "}
            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as typeof sortBy)}
            >
              {" "}
              <SelectTrigger className="w-[150px] bg-slate-800/50 border-border">
                {" "}
                <SelectValue
                  placeholder={t("module.template-marketplace.sortBy")}
                />{" "}
              </SelectTrigger>{" "}
              <SelectContent>
                {" "}
                <SelectItem value="popular">
                  {t("module.template-marketplace.sort.mostPopular")}
                </SelectItem>{" "}
                <SelectItem value="rated">
                  {t("module.template-marketplace.sort.topRated")}
                </SelectItem>{" "}
                <SelectItem value="newest">
                  {t("module.template-marketplace.sort.newest")}
                </SelectItem>{" "}
                <SelectItem value="price-low">
                  {t("module.template-marketplace.sort.priceLow")}
                </SelectItem>{" "}
                <SelectItem value="price-high">
                  {t("module.template-marketplace.sort.priceHigh")}
                </SelectItem>{" "}
              </SelectContent>{" "}
            </Select>{" "}
            <Select
              value={difficultyFilter || "all"}
              onValueChange={(v) => setDifficultyFilter(v === "all" ? null : v)}
            >
              {" "}
              <SelectTrigger className="w-[150px] bg-slate-800/50 border-border">
                {" "}
                <SelectValue
                  placeholder={t("module.template-marketplace.difficulty")}
                />{" "}
              </SelectTrigger>{" "}
              <SelectContent>
                {" "}
                <SelectItem value="all">
                  {t("module.template-marketplace.difficulty.all")}
                </SelectItem>{" "}
                <SelectItem value="beginner">
                  {t("module.template-marketplace.difficulty.beginner")}
                </SelectItem>{" "}
                <SelectItem value="intermediate">
                  {t("module.template-marketplace.difficulty.intermediate")}
                </SelectItem>{" "}
                <SelectItem value="advanced">
                  {t("module.template-marketplace.difficulty.advanced")}
                </SelectItem>{" "}
              </SelectContent>{" "}
            </Select>{" "}
          </div>{" "}
          <div className="flex gap-2 flex-wrap">
            {" "}
            {categories.map((cat) => (
              <Button
                key={cat.value}
                variant={selectedCategory === cat.value ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setSelectedCategory(
                    selectedCategory === cat.value ? null : cat.value,
                  )
                }
                className={
                  selectedCategory === cat.value
                    ? "bg-primary/20 border-blue-500/50"
                    : "bg-slate-800/50 border-border hover:border-slate-600/50"
                }
              >
                {" "}
                {cat.icon} {cat.label}{" "}
              </Button>
            ))}{" "}
          </div>{" "}
          <div className="grid grid-cols-2 gap-3">
            {" "}
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className="bg-slate-800/30 border-border backdrop-blur-sm overflow-hidden hover:border-slate-600/50 transition-colors cursor-pointer"
              >
                {" "}
                <div className="p-3">
                  {" "}
                  <div className="flex items-start justify-between mb-2">
                    {" "}
                    <div className="text-3xl">{template.thumbnail}</div>{" "}
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`w-6 h-6 p-0 ${favorites.has(template.id) ? "text-red-400" : "text-slate-400"}`}
                      onClick={() => handleToggleFavorite(template.id)}
                    >
                      {" "}
                      <Heart
                        className={`w-4 h-4 ${favorites.has(template.id) ? "fill-current" : ""}`}
                      />{" "}
                    </Button>{" "}
                  </div>{" "}
                  <h3 className="font-semibold text-slate-100 text-sm line-clamp-2 mb-1">
                    {template.title}
                  </h3>{" "}
                  <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                    {template.description}
                  </p>{" "}
                  <div className="flex items-center gap-1 mb-2 text-xs">
                    {" "}
                    <span
                      className={`px-2 py-0.5 rounded-full ${template.isPremium ? "bg-yellow-500/20 text-yellow-200" : "bg-primary/20 text-blue-200"}`}
                    >
                      {template.isPremium ? "Premium" : "Free"}
                    </span>{" "}
                    <span className="px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300 capitalize">
                      {template.difficultyLevel}
                    </span>{" "}
                  </div>{" "}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    {" "}
                    <div>
                      {" "}
                      <p className="text-slate-400">⭐ Rating</p>{" "}
                      <p className="font-semibold text-slate-100">
                        {template.rating}/5.0 ({template.reviews})
                      </p>{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <p className="text-slate-400">📥 Downloads</p>{" "}
                      <p className="font-semibold text-slate-100">
                        {(template.downloads / 1000).toFixed(1)}k
                      </p>{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="flex gap-2">
                    {" "}
                    <Button
                      size="sm"
                      className="flex-1 h-7 text-xs gap-1"
                      onClick={() => handleDownload(template)}
                    >
                      {" "}
                      <Download className="w-3 h-3" />{" "}
                      {template.price === 0
                        ? t("module.template-marketplace.download")
                        : `$${template.price}`}{" "}
                    </Button>{" "}
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs gap-1 bg-slate-800/50 border-border"
                    >
                      {" "}
                      <Share2 className="w-3 h-3" /> {t("action.share")}{" "}
                    </Button>{" "}
                  </div>{" "}
                </div>{" "}
              </Card>
            ))}{" "}
          </div>{" "}
        </TabsContent>{" "}
        <TabsContent value="my-library" className="space-y-4">
          {" "}
          {favorites.size === 0 ? (
            <Card className="bg-slate-800/30 border-border backdrop-blur-sm">
              {" "}
              <CardContent className="pt-6 text-center">
                {" "}
                <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />{" "}
                <p className="text-slate-300 font-semibold mb-2">
                  {t("module.template-marketplace.noFavorites")}
                </p>{" "}
                <p className="text-slate-400 text-sm">
                  {t("module.template-marketplace.heartTemplates")}
                </p>{" "}
              </CardContent>{" "}
            </Card>
          ) : (
            <div className="space-y-2">
              {" "}
              {TEMPLATES.filter((t) => favorites.has(t.id)).map((template) => (
                <Card
                  key={template.id}
                  className="bg-slate-800/30 border-border backdrop-blur-sm"
                >
                  {" "}
                  <CardContent className="p-3 flex items-center justify-between">
                    {" "}
                    <div className="flex items-center gap-3 flex-1">
                      {" "}
                      <div className="text-3xl">{template.thumbnail}</div>{" "}
                      <div className="flex-1">
                        {" "}
                        <p className="font-semibold text-slate-100 text-sm">
                          {template.title}
                        </p>{" "}
                        <p className="text-xs text-slate-400">
                          By {template.author}
                        </p>{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="flex items-center gap-2">
                      {" "}
                      <div className="text-right text-xs">
                        {" "}
                        <p className="text-slate-300">${template.price}</p>{" "}
                        <p className="text-slate-400">
                          ⭐ {template.rating}
                        </p>{" "}
                      </div>{" "}
                      <Button
                        size="sm"
                        className="h-7"
                        onClick={() => handleDownload(template)}
                      >
                        {" "}
                        <Download className="w-3 h-3" />{" "}
                      </Button>{" "}
                    </div>{" "}
                  </CardContent>{" "}
                </Card>
              ))}{" "}
            </div>
          )}{" "}
        </TabsContent>{" "}
        <TabsContent value="analytics" className="space-y-4">
          {" "}
          <div className="grid grid-cols-4 gap-3">
            {" "}
            <Card className="bg-slate-800/30 border-border backdrop-blur-sm">
              {" "}
              <CardHeader className="pb-2">
                {" "}
                <CardTitle className="text-sm text-slate-300">
                  {t("module.template-marketplace.analytics.totalTemplates")}
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <div className="text-3xl font-bold text-blue-400">
                  {MARKETPLACE_STATS.totalTemplates.toLocaleString()}
                </div>{" "}
              </CardContent>{" "}
            </Card>{" "}
            <Card className="bg-slate-800/30 border-border backdrop-blur-sm">
              {" "}
              <CardHeader className="pb-2">
                {" "}
                <CardTitle className="text-sm text-slate-300">
                  {t("module.template-marketplace.analytics.activeUsers")}
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <div className="text-3xl font-bold text-green-400">
                  {MARKETPLACE_STATS.totalUsers.toLocaleString()}
                </div>{" "}
              </CardContent>{" "}
            </Card>{" "}
            <Card className="bg-slate-800/30 border-border backdrop-blur-sm">
              {" "}
              <CardHeader className="pb-2">
                {" "}
                <CardTitle className="text-sm text-slate-300">
                  {t("module.template-marketplace.analytics.totalDownloads")}
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <div className="text-3xl font-bold text-cyan-400">
                  {MARKETPLACE_STATS.totalDownloads.toLocaleString()}
                </div>{" "}
              </CardContent>{" "}
            </Card>{" "}
            <Card className="bg-slate-800/30 border-border backdrop-blur-sm">
              {" "}
              <CardHeader className="pb-2">
                {" "}
                <CardTitle className="text-sm text-slate-300">
                  {t("module.template-marketplace.analytics.avgRating")}
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <div className="text-3xl font-bold text-yellow-400">
                  {MARKETPLACE_STATS.averageRating}
                </div>{" "}
              </CardContent>{" "}
            </Card>{" "}
          </div>{" "}
          <Card className="bg-slate-800/30 border-border backdrop-blur-sm">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle className="text-sm">
                {t(
                  "module.template-marketplace.analytics.categoryDistribution",
                )}
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-2">
              {" "}
              {categories.map((cat) => {
                const count = TEMPLATES.filter(
                  (t) => t.category === cat.value,
                ).length;
                const percentage = ((count / TEMPLATES.length) * 100).toFixed(
                  0,
                );
                return (
                  <div key={cat.value} className="flex items-center gap-3">
                    {" "}
                    <span className="text-sm w-20">
                      {cat.icon} {cat.label}
                    </span>{" "}
                    <div className="flex-1 bg-slate-700/50 rounded-full h-2 overflow-hidden">
                      {" "}
                      <div
                        className="bg-gradient-to-r from-blue-400 to-cyan-400 h-full"
                        style={{ width: `${percentage}%` }}
                      ></div>{" "}
                    </div>{" "}
                    <span className="text-sm text-slate-400 w-12 text-right">
                      {count} ({percentage}%)
                    </span>{" "}
                  </div>
                );
              })}{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card className="bg-slate-800/30 border-border backdrop-blur-sm">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle className="text-sm">
                {t("module.template-marketplace.analytics.topTemplates")}
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <div className="space-y-2">
                {" "}
                {TEMPLATES.sort((a, b) => b.downloads - a.downloads)
                  .slice(0, 5)
                  .map((t, i) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-surface"
                    >
                      {" "}
                      <span className="text-sm font-semibold text-cyan-400 w-6">
                        {i + 1}.
                      </span>{" "}
                      <span className="text-sm text-slate-100 flex-1">
                        {t.title}
                      </span>{" "}
                      <span className="text-xs text-slate-400">
                        {t.downloads.toLocaleString()} downloads
                      </span>{" "}
                    </div>
                  ))}{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
      </Tabs>{" "}
    </div>
  );
}
