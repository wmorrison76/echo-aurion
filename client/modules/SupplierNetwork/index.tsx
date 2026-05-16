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
  TrendingDown,
  Users,
  Package,
  Briefcase,
  MessageSquare,
  Star,
  MapPin,
  DollarSign,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/glass";
import { useI18n } from "@/i18n";
import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";
interface Supplier {
  id: string;
  name: string;
  category: "produce" | "meat" | "dairy" | "pantry" | "beverages" | "specialty";
  location: string;
  rating: number;
  reviews: number;
  bulkDiscounts: { quantity: number; discount: number }[];
  currentPrice: number;
  networkPrice: number;
  savings: number;
  minOrder: number;
  deliveryTime: number;
  isVerified: boolean;
  networkPartner: boolean;
  specialties: string[];
  contactPerson: string;
  phone: string;
}
interface TalentMember {
  id: string;
  name: string;
  role: "chef" | "baker" | "bartender" | "server" | "manager" | "specialist";
  experience: number;
  location: string;
  availability: "full-time" | "part-time" | "flexible" | "on-demand";
  hourlyRate: number;
  rating: number;
  skills: string[];
  certifications: string[];
  phone: string;
  email: string;
  isAvailable: boolean;
  networkMember: boolean;
}
interface NetworkMetrics {
  totalSavings: number;
  activeSuppliers: number;
  talentPool: number;
  avgDeliveryTime: number;
}
const SUPPLIERS: Supplier[] = [
  {
    id: "produce-1",
    name: "Fresh Harvest Collective",
    category: "produce",
    location: "San Francisco, CA",
    rating: 4.8,
    reviews: 234,
    bulkDiscounts: [
      { quantity: 10, discount: 5 },
      { quantity: 25, discount: 10 },
      { quantity: 50, discount: 15 },
    ],
    currentPrice: 2.5,
    networkPrice: 1.89,
    savings: 0.61,
    minOrder: 50,
    deliveryTime: 1,
    isVerified: true,
    networkPartner: true,
    specialties: ["Organic", "Seasonal", "Local"],
    contactPerson: "Maria Garcia",
    phone: "(555) 123-4567",
  },
  {
    id: "meat-1",
    name: "Premium Butcher Network",
    category: "meat",
    location: "Oakland, CA",
    rating: 4.9,
    reviews: 456,
    bulkDiscounts: [
      { quantity: 20, discount: 8 },
      { quantity: 50, discount: 15 },
      { quantity: 100, discount: 20 },
    ],
    currentPrice: 18.5,
    networkPrice: 14.2,
    savings: 4.3,
    minOrder: 20,
    deliveryTime: 1,
    isVerified: true,
    networkPartner: true,
    specialties: ["Prime Beef", "Heritage Pork", "Free-range Poultry"],
    contactPerson: "Tom Johnson",
    phone: "(555) 234-5678",
  },
  {
    id: "dairy-1",
    name: "Artisan Cheese & Dairy",
    category: "dairy",
    location: "Marin County, CA",
    rating: 4.7,
    reviews: 189,
    bulkDiscounts: [
      { quantity: 15, discount: 7 },
      { quantity: 40, discount: 12 },
    ],
    currentPrice: 12.0,
    networkPrice: 9.6,
    savings: 2.4,
    minOrder: 15,
    deliveryTime: 2,
    isVerified: true,
    networkPartner: true,
    specialties: ["Artisan Cheese", "Organic Milk", "Specialty Butter"],
    contactPerson: "Sophie Martin",
    phone: "(555) 345-6789",
  },
  {
    id: "beverages-1",
    name: "Premium Wine & Spirits Network",
    category: "beverages",
    location: "Napa Valley, CA",
    rating: 4.9,
    reviews: 567,
    bulkDiscounts: [
      { quantity: 12, discount: 10 },
      { quantity: 36, discount: 18 },
      { quantity: 72, discount: 25 },
    ],
    currentPrice: 35.0,
    networkPrice: 26.25,
    savings: 8.75,
    minOrder: 12,
    deliveryTime: 2,
    isVerified: true,
    networkPartner: true,
    specialties: ["Wine Selection", "Spirits", "Craft Beverages"],
    contactPerson: "James Williams",
    phone: "(555) 456-7890",
  },
  {
    id: "pantry-1",
    name: "Bulk Pantry Supplies Co",
    category: "pantry",
    location: "Sacramento, CA",
    rating: 4.5,
    reviews: 123,
    bulkDiscounts: [
      { quantity: 5, discount: 3 },
      { quantity: 15, discount: 8 },
      { quantity: 50, discount: 15 },
    ],
    currentPrice: 1.2,
    networkPrice: 0.95,
    savings: 0.25,
    minOrder: 5,
    deliveryTime: 3,
    isVerified: true,
    networkPartner: true,
    specialties: ["Dry Goods", "Condiments", "Spices"],
    contactPerson: "David Chen",
    phone: "(555) 567-8901",
  },
];
const TALENT: TalentMember[] = [
  {
    id: "chef-1",
    name: "Marcus Johnson",
    role: "chef",
    experience: 15,
    location: "San Francisco, CA",
    availability: "flexible",
    hourlyRate: 65,
    rating: 4.9,
    skills: ["French Cuisine", "Menu Development", "Kitchen Management"],
    certifications: ["Culinary Institute", "Food Safety Manager"],
    phone: "(555) 111-2222",
    email: "marcus@talentnetwork.com",
    isAvailable: true,
    networkMember: true,
  },
  {
    id: "baker-1",
    name: "Sophie Laurent",
    role: "baker",
    experience: 12,
    location: "Oakland, CA",
    availability: "part-time",
    hourlyRate: 42,
    rating: 4.8,
    skills: ["Bread Baking", "Pastries", "Cake Design", "Specialty Desserts"],
    certifications: ["Le Cordon Bleu", "Food Safety"],
    phone: "(555) 222-3333",
    email: "sophie@talentnetwork.com",
    isAvailable: true,
    networkMember: true,
  },
  {
    id: "bartender-1",
    name: "Alex Rivera",
    role: "bartender",
    experience: 8,
    location: "San Francisco, CA",
    availability: "on-demand",
    hourlyRate: 28,
    rating: 4.7,
    skills: [
      "Cocktail Creation",
      "Mixology",
      "Bar Management",
      "Customer Service",
    ],
    certifications: ["Certified Mixologist", "Food Safety"],
    phone: "(555) 333-4444",
    email: "alex@talentnetwork.com",
    isAvailable: true,
    networkMember: true,
  },
  {
    id: "manager-1",
    name: "Lisa Chen",
    role: "manager",
    experience: 10,
    location: "San Francisco, CA",
    availability: "full-time",
    hourlyRate: 55,
    rating: 4.8,
    skills: [
      "Restaurant Operations",
      "Staff Management",
      "Budget Control",
      "Training",
    ],
    certifications: ["Restaurant Management", "HR Certification"],
    phone: "(555) 444-5555",
    email: "lisa@talentnetwork.com",
    isAvailable: false,
    networkMember: true,
  },
  {
    id: "specialist-1",
    name: "David Rodriguez",
    role: "specialist",
    experience: 20,
    location: "Bay Area, CA",
    availability: "flexible",
    hourlyRate: 75,
    rating: 4.9,
    skills: [
      "Menu Consulting",
      "Kitchen Design",
      "Cost Optimization",
      "Training Programs",
    ],
    certifications: ["Advanced Culinary", "Business Management"],
    phone: "(555) 555-6666",
    email: "david@talentnetwork.com",
    isAvailable: true,
    networkMember: true,
  },
];
const NETWORK_METRICS: NetworkMetrics = {
  totalSavings: 45620,
  activeSuppliers: 287,
  talentPool: 1245,
  avgDeliveryTime: 1.8,
};
export default function SupplierNetworkModule() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("suppliers");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"savings" | "rating" | "delivery">(
    "savings",
  );
  const filteredSuppliers = useMemo(() => {
    let results = SUPPLIERS.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.specialties.some((spec) =>
          spec.toLowerCase().includes(searchQuery.toLowerCase()),
        );
      const matchesCategory =
        !selectedCategory || s.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
    results.sort((a, b) => {
      switch (sortBy) {
        case "savings":
          return b.savings - a.savings;
        case "rating":
          return b.rating - a.rating;
        case "delivery":
          return a.deliveryTime - b.deliveryTime;
        default:
          return 0;
      }
    });
    return results;
  }, [searchQuery, selectedCategory, sortBy]);
  const filteredTalent = useMemo(() => {
    let results = TALENT.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.skills.some((skill) =>
          skill.toLowerCase().includes(searchQuery.toLowerCase()),
        );
      const matchesRole = !selectedRole || t.role === selectedRole;
      return matchesSearch && matchesRole;
    });
    results.sort((a, b) => {
      if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
      return b.rating - a.rating;
    });
    return results;
  }, [searchQuery, selectedRole]);
  const categories = [
    {
      value: "produce",
      label: t("module.supplier-network.categories.produce"),
      icon: "🥬",
    },
    {
      value: "meat",
      label: t("module.supplier-network.categories.meat"),
      icon: "🥩",
    },
    {
      value: "dairy",
      label: t("module.supplier-network.categories.dairy"),
      icon: "🧀",
    },
    {
      value: "pantry",
      label: t("module.supplier-network.categories.pantry"),
      icon: "🥫",
    },
    {
      value: "beverages",
      label: t("module.supplier-network.categories.beverages"),
      icon: "🍷",
    },
    {
      value: "specialty",
      label: t("module.supplier-network.categories.specialty"),
      icon: "⭐",
    },
  ];
  const roles = [
    {
      value: "chef",
      label: t("module.supplier-network.roles.chef"),
      icon: "👨‍🍳",
    },
    {
      value: "baker",
      label: t("module.supplier-network.roles.baker"),
      icon: "🎂",
    },
    {
      value: "bartender",
      label: t("module.supplier-network.roles.bartender"),
      icon: "🍸",
    },
    {
      value: "server",
      label: t("module.supplier-network.roles.server"),
      icon: "🎯",
    },
    {
      value: "manager",
      label: t("module.supplier-network.roles.manager"),
      icon: "👔",
    },
    {
      value: "specialist",
      label: t("module.supplier-network.roles.specialist"),
      icon: "⭐",
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
            <TrendingDown className="w-6 h-6 text-green-400" />{" "}
            {t("module.supplier-network.title")}{" "}
          </h1>{" "}
          <p className="text-sm text-slate-400">
            {t("module.supplier-network.description")}
          </p>{" "}
        </div>{" "}
        <div className="flex items-center gap-3">
          {" "}
          <ModuleChatButton
            moduleId="supplier-network"
            moduleName={t("module.supplier-network.title")}
          />{" "}
          <Button className="gap-2">
            {" "}
            <Plus className="w-4 h-4" />{" "}
            {t("module.supplier-network.networkSettings")}{" "}
          </Button>{" "}
        </div>{" "}
      </div>{" "}
      <div className="grid grid-cols-4 gap-3">
        {" "}
        <Card className="bg-slate-800/30 border-border backdrop-blur-sm">
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-sm text-slate-300">
              {t("module.supplier-network.metrics.totalSavings")}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-3xl font-bold text-green-400">
              ${(NETWORK_METRICS.totalSavings / 1000).toFixed(1)}k
            </div>{" "}
            <p className="text-xs text-slate-400 mt-1">
              {t("module.supplier-network.metrics.thisYear")}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card className="bg-slate-800/30 border-border backdrop-blur-sm">
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-sm text-slate-300">
              {t("module.supplier-network.metrics.networkSuppliers")}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-3xl font-bold text-blue-400">
              {NETWORK_METRICS.activeSuppliers}
            </div>{" "}
            <p className="text-xs text-slate-400 mt-1">
              {t("module.supplier-network.metrics.activePartners")}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card className="bg-slate-800/30 border-border backdrop-blur-sm">
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-sm text-slate-300">
              {t("module.supplier-network.metrics.talentPool")}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-3xl font-bold text-purple-400">
              {NETWORK_METRICS.talentPool}
            </div>{" "}
            <p className="text-xs text-slate-400 mt-1">
              {t("module.supplier-network.metrics.availableMembers")}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card className="bg-slate-800/30 border-border backdrop-blur-sm">
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-sm text-slate-300">
              {t("module.supplier-network.metrics.avgDelivery")}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-3xl font-bold text-cyan-400">
              {NETWORK_METRICS.avgDeliveryTime}
            </div>{" "}
            <p className="text-xs text-slate-400 mt-1">
              {t("module.supplier-network.metrics.days")}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {" "}
        <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 border border-border">
          {" "}
          <TabsTrigger
            value="suppliers"
            className="data-[state=active]:bg-primary/20 data-[state=active]:border-blue-500/50"
          >
            {" "}
            <Package className="w-4 h-4 mr-2" />{" "}
            {t("module.supplier-network.tabs.suppliers")}{" "}
          </TabsTrigger>{" "}
          <TabsTrigger
            value="talent"
            className="data-[state=active]:bg-primary/20 data-[state=active]:border-blue-500/50"
          >
            {" "}
            <Users className="w-4 h-4 mr-2" />{" "}
            {t("module.supplier-network.tabs.talent")}{" "}
          </TabsTrigger>{" "}
        </TabsList>{" "}
        <TabsContent value="suppliers" className="space-y-4">
          {" "}
          <div className="flex gap-2 items-center flex-wrap">
            {" "}
            <div className="flex-1 min-w-[300px]">
              {" "}
              <div className="relative">
                {" "}
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />{" "}
                <Input
                  placeholder={t("module.supplier-network.searchPlaceholder")}
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
              <SelectTrigger className="w-[140px] bg-slate-800/50 border-border">
                {" "}
                <SelectValue placeholder="Sort by" />{" "}
              </SelectTrigger>{" "}
              <SelectContent>
                {" "}
                <SelectItem value="savings">Best Savings</SelectItem>{" "}
                <SelectItem value="rating">Top Rated</SelectItem>{" "}
                <SelectItem value="delivery">Fastest Delivery</SelectItem>{" "}
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
          <div className="space-y-3">
            {" "}
            {filteredSuppliers.map((supplier) => (
              <Card
                key={supplier.id}
                className="bg-slate-800/30 border-border backdrop-blur-sm hover:border-slate-600/50 transition-colors"
              >
                {" "}
                <CardContent className="p-3">
                  {" "}
                  <div className="grid grid-cols-3 gap-3">
                    {" "}
                    <div>
                      {" "}
                      <h3 className="font-semibold text-slate-100 mb-1">
                        {supplier.name}
                      </h3>{" "}
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                        {" "}
                        <MapPin className="w-3 h-3" /> {supplier.location}{" "}
                      </div>{" "}
                      <div className="flex flex-wrap gap-1">
                        {" "}
                        {supplier.specialties.slice(0, 2).map((spec, i) => (
                          <span
                            key={i}
                            className="text-xs bg-primary/20 text-blue-200 px-2 py-0.5 rounded"
                          >
                            {" "}
                            {spec}{" "}
                          </span>
                        ))}{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="text-center space-y-1">
                      {" "}
                      <div>
                        {" "}
                        <p className="text-xs text-slate-400">Rating</p>{" "}
                        <p className="font-semibold text-yellow-400">
                          ⭐ {supplier.rating}
                        </p>{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <p className="text-xs text-slate-400">Reviews</p>{" "}
                        <p className="font-semibold text-slate-100">
                          {supplier.reviews}
                        </p>{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <p className="text-xs text-slate-400">Delivery</p>{" "}
                        <p className="font-semibold text-slate-100">
                          {supplier.deliveryTime}d
                        </p>{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="text-right space-y-2">
                      {" "}
                      <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-2">
                        {" "}
                        <p className="text-xs text-emerald-300 font-semibold">
                          Network Price
                        </p>{" "}
                        <p className="text-2xl font-bold text-green-400">
                          ${supplier.networkPrice.toFixed(2)}
                        </p>{" "}
                        <p className="text-xs text-slate-400">
                          {" "}
                          was ${supplier.currentPrice.toFixed(2)} (
                          {(
                            (supplier.savings / supplier.currentPrice) *
                            100
                          ).toFixed(0)}
                          % off){" "}
                        </p>{" "}
                      </div>{" "}
                      <Button size="sm" className="w-full h-7 text-xs">
                        {" "}
                        <MessageSquare className="w-3 h-3 mr-1" /> Contact{" "}
                      </Button>{" "}
                    </div>{" "}
                  </div>{" "}
                </CardContent>{" "}
              </Card>
            ))}{" "}
          </div>{" "}
        </TabsContent>{" "}
        <TabsContent value="talent" className="space-y-4">
          {" "}
          <div className="flex gap-2 items-center flex-wrap">
            {" "}
            <div className="flex-1 min-w-[300px]">
              {" "}
              <div className="relative">
                {" "}
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />{" "}
                <Input
                  placeholder="Search talent..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-border"
                />{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
          <div className="flex gap-2 flex-wrap">
            {" "}
            {roles.map((role) => (
              <Button
                key={role.value}
                variant={selectedRole === role.value ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setSelectedRole(
                    selectedRole === role.value ? null : role.value,
                  )
                }
                className={
                  selectedRole === role.value
                    ? "bg-primary/20 border-blue-500/50"
                    : "bg-slate-800/50 border-border hover:border-slate-600/50"
                }
              >
                {" "}
                {role.icon} {role.label}{" "}
              </Button>
            ))}{" "}
          </div>{" "}
          <div className="space-y-3">
            {" "}
            {filteredTalent.map((member) => (
              <Card
                key={member.id}
                className="bg-slate-800/30 border-border backdrop-blur-sm hover:border-slate-600/50 transition-colors"
              >
                {" "}
                <CardContent className="p-3">
                  {" "}
                  <div className="grid grid-cols-3 gap-3">
                    {" "}
                    <div>
                      {" "}
                      <div className="flex items-center gap-2 mb-2">
                        {" "}
                        <h3 className="font-semibold text-slate-100">
                          {member.name}
                        </h3>{" "}
                        {member.isAvailable && (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        )}{" "}
                      </div>{" "}
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                        {" "}
                        <MapPin className="w-3 h-3" /> {member.location}{" "}
                      </div>{" "}
                      <div className="space-y-1 text-xs">
                        {" "}
                        <p className="text-slate-400">Skills</p>{" "}
                        <div className="flex flex-wrap gap-1">
                          {" "}
                          {member.skills.slice(0, 2).map((skill, i) => (
                            <span
                              key={i}
                              className="bg-purple-500/20 text-purple-200 px-2 py-0.5 rounded"
                            >
                              {" "}
                              {skill}{" "}
                            </span>
                          ))}{" "}
                        </div>{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="text-center space-y-1">
                      {" "}
                      <div>
                        {" "}
                        <p className="text-xs text-slate-400">
                          Experience
                        </p>{" "}
                        <p className="font-semibold text-blue-400">
                          {member.experience} yrs
                        </p>{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <p className="text-xs text-slate-400">Rating</p>{" "}
                        <p className="font-semibold text-yellow-400">
                          ⭐ {member.rating}
                        </p>{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <p className="text-xs text-slate-400">
                          Availability
                        </p>{" "}
                        <p
                          className={`font-semibold text-xs capitalize ${member.availability === "full-time" ? "text-green-400" : "text-slate-300"}`}
                        >
                          {member.availability}
                        </p>{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="text-right space-y-2">
                      {" "}
                      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-2">
                        {" "}
                        <p className="text-xs text-purple-300 font-semibold">
                          Hourly Rate
                        </p>{" "}
                        <p className="text-2xl font-bold text-purple-400">
                          ${member.hourlyRate}
                        </p>{" "}
                        <p className="text-xs text-slate-400">
                          Network rate
                        </p>{" "}
                      </div>{" "}
                      <Button size="sm" className="w-full h-7 text-xs">
                        {" "}
                        <MessageSquare className="w-3 h-3 mr-1" /> Contact{" "}
                      </Button>{" "}
                    </div>{" "}
                  </div>{" "}
                </CardContent>{" "}
              </Card>
            ))}{" "}
          </div>{" "}
        </TabsContent>{" "}
      </Tabs>{" "}
    </div>
  );
}
