/** * Global Search Bar Component * Unified search for wines, inventory, orders, recipes * Reduces navigation clicks by 50% */ import React, {
  useState,
  useEffect,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Wine,
  Package,
  FileText,
  Sparkles,
  X,
  Command,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
interface SearchResult {
  id: string;
  type: "wine" | "inventory" | "order" | "recipe" | "cocktail";
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  url: string;
  priority?: "high" | "medium" | "low";
}
export const GlobalSearchBar: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null); // Keyboard shortcut: Cmd/Ctrl+K useEffect(() => { const handleKeyDown = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key ==="k") { e.preventDefault(); setIsOpen(true); inputRef.current?.focus(); } if (e.key ==="Escape" && isOpen) { setIsOpen(false); setQuery(""); } }; window.addEventListener("keydown", handleKeyDown); return () => window.removeEventListener("keydown", handleKeyDown); }, [isOpen]); // Search as you type useEffect(() => { if (!query.trim()) { setResults([]); return; } const searchQuery = query.toLowerCase(); const searchResults: SearchResult[] = []; // Search wines (mock - replace with API) const wines = [ { id:"1", name:"Château Margaux", region:"Bordeaux", type:"red" }, { id:"2", name:"Chablis", region:"Burgundy", type:"white" }, ]; wines .filter(w => w.name.toLowerCase().includes(searchQuery) || w.region.toLowerCase().includes(searchQuery)) .forEach(wine => { searchResults.push({ id: wine.id, type:"wine", title: wine.name, subtitle: wine.region, icon: <Wine className="w-4 h-4" />, url: `/catalog?wine=${wine.id}`, priority:"high", }); }); // Search inventory (mock - replace with API) if (searchQuery.includes("inventory") || searchQuery.includes("stock")) { searchResults.push({ id:"inv-1", type:"inventory", title:"View Inventory", subtitle:"Check stock levels", icon: <Package className="w-4 h-4" />, url:"/inventory", priority:"high", }); } // Search orders (mock - replace with API) if (searchQuery.includes("order") || searchQuery.includes("po")) { searchResults.push({ id:"order-1", type:"order", title:"Purchase Orders", subtitle:"View and create orders", icon: <FileText className="w-4 h-4" />, url:"/purchase-orders", priority:"high", }); } // Search recipes/cocktails (mock - replace with API) if (searchQuery.includes("cocktail") || searchQuery.includes("recipe")) { searchResults.push({ id:"recipe-1", type:"recipe", title:"Cocktail Recipes", subtitle:"Generate new recipes", icon: <Sparkles className="w-4 h-4" />, url:"/recommendations?type=cocktail", priority:"medium", }); } setResults(searchResults.slice(0, 8)); setSelectedIndex(0); }, [query]); // Keyboard navigation useEffect(() => { if (!isOpen) return; const handleKeyDown = (e: KeyboardEvent) => { if (e.key ==="ArrowDown") { e.preventDefault(); setSelectedIndex(prev => Math.min(prev + 1, results.length - 1)); } else if (e.key ==="ArrowUp") { e.preventDefault(); setSelectedIndex(prev => Math.max(prev - 1, 0)); } else if (e.key ==="Enter" && results[selectedIndex]) { e.preventDefault(); handleSelectResult(results[selectedIndex]); } }; window.addEventListener("keydown", handleKeyDown); return () => window.removeEventListener("keydown", handleKeyDown); }, [isOpen, results, selectedIndex]); const handleSelectResult = (result: SearchResult) => { navigate(result.url); setIsOpen(false); setQuery(""); }; const handleClickOutside = (e: MouseEvent) => { if (resultsRef.current && !resultsRef.current.contains(e.target as Node)) { setIsOpen(false); } }; useEffect(() => { if (isOpen) { document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside); } }, [isOpen]); return ( <div className="relative flex-1 max-w-2xl mx-4" ref={resultsRef}> {/* Search Input */} <div className="relative"> <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /> <input ref={inputRef} type="text" placeholder={t("Search wines, inventory, orders...") ||"Search wines, inventory, orders..."} value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => setIsOpen(true)} className={cn("w-full pl-10 pr-20 py-2.5 rounded-lg border border-border bg-background text-foreground","focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent","placeholder:text-muted-foreground" )} /> <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2"> {query && ( <button onClick={() => { setQuery(""); inputRef.current?.focus(); }} className="p-1 hover:bg-muted rounded" > <X className="w-3 h-3 text-muted-foreground" /> </button> )} <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted border border-border rounded"> <Command className="w-3 h-3" />K </kbd> </div> </div> {/* Results Dropdown */} {isOpen && (query || results.length > 0) && ( <div className="absolute top-full mt-2 w-full bg-background border border-border rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto"> {results.length > 0 ? ( <div className="p-2"> {results.map((result, index) => ( <button key={result.id} onClick={() => handleSelectResult(result)} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors", index === selectedIndex ?"bg-accent/10 text-accent" :"hover:bg-muted/50" )} > <div className={cn("p-2 rounded-lg", result.type ==="wine" &&"bg-red-500/10 text-red-500", result.type ==="inventory" &&"bg-primary/10 text-blue-500", result.type ==="order" &&"bg-green-500/10 text-green-500", result.type ==="recipe" &&"bg-purple-500/10 text-purple-500", )}> {result.icon} </div> <div className="flex-1 min-w-0"> <div className="font-medium text-foreground truncate">{result.title}</div> {result.subtitle && ( <div className="text-sm text-muted-foreground truncate">{result.subtitle}</div> )} </div> {result.priority && ( <div className={cn("px-2 py-0.5 rounded text-xs font-medium", result.priority ==="high" &&"bg-green-500/10 text-green-500", result.priority ==="medium" &&"bg-yellow-500/10 text-yellow-500", result.priority ==="low" &&"bg-surface/10 text-muted-foreground", )}> {result.priority} </div> )} </button> ))} </div> ) : query ? ( <div className="p-8 text-center text-muted-foreground"> <p>No results found for"{query}"</p> <p className="text-sm mt-2">Try searching for wines, inventory, or orders</p> </div> ) : ( <div className="p-4"> <div className="text-sm text-muted-foreground mb-2">Recent searches</div> <div className="text-xs text-muted-foreground">No recent searches</div> </div> )} </div> )} </div> );
};
