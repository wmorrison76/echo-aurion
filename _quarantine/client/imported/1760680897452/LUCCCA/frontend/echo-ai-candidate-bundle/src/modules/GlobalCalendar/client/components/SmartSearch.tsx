import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Dialog, 
  DialogContent 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Clock,
  User,
  Calendar,
  FileText,
  Building,
  TrendingUp,
  Settings,
  Star,
  ArrowRight,
  Hash,
  MapPin,
  DollarSign,
  Users,
  ChefHat,
  Command,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  type: 'contact' | 'event' | 'beo' | 'venue' | 'menu' | 'analytics' | 'page' | 'action';
  category: string;
  url?: string;
  action?: () => void;
  metadata?: {
    date?: string;
    status?: string;
    value?: number;
    location?: string;
  };
  relevance: number;
}

interface SmartSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mock data - in real app this would come from your API/database
const searchData: Omit<SearchResult, 'relevance'>[] = [
  // Contacts
  {
    id: 'contact-1',
    title: 'Sarah Johnson - TechCorp Inc.',
    description: 'Corporate Leadership Summit contact',
    type: 'contact',
    category: 'Contacts',
    url: '/contacts?id=contact-1',
    metadata: { location: 'New York, NY' }
  },
  {
    id: 'contact-2',
    title: 'Michael Chen - Global Events Ltd.',
    description: 'Event planning specialist',
    type: 'contact',
    category: 'Contacts',
    url: '/contacts?id=contact-2',
    metadata: { location: 'San Francisco, CA' }
  },
  
  // Events
  {
    id: 'event-1',
    title: 'Corporate Leadership Summit',
    description: '250 guests • Grand Ballroom A',
    type: 'event',
    category: 'Events',
    url: '/beo-reo?event=event-1',
    metadata: { date: '2024-01-15', status: 'approved', value: 45000 }
  },
  {
    id: 'event-2',
    title: 'Tech Innovation Conference',
    description: '180 guests • Conference Hall B',
    type: 'event',
    category: 'Events',
    url: '/beo-reo?event=event-2',
    metadata: { date: '2024-01-16', status: 'pending', value: 78000 }
  },
  
  // BEO/REO
  {
    id: 'beo-1',
    title: 'BEO-2024-001 - Corporate Leadership Summit',
    description: 'Banquet Event Order - Ready to execute',
    type: 'beo',
    category: 'BEO/REO',
    url: '/beo-reo?beo=beo-1',
    metadata: { status: 'approved', value: 45000 }
  },
  
  // Venues
  {
    id: 'venue-1',
    title: 'Grand Ballroom A',
    description: '300 seated • 400 standing • Built-in AV',
    type: 'venue',
    category: 'Venues',
    url: '/events?venue=venue-1',
    metadata: { location: 'Main Building - Level 2' }
  },
  
  // Menus
  {
    id: 'menu-1',
    title: 'Executive Lunch Menu',
    description: 'Premium catering options • 12 items',
    type: 'menu',
    category: 'Menus',
    url: '/beo-reo?menu=menu-1'
  },
  
  // Pages & Actions
  {
    id: 'page-dashboard',
    title: 'Dashboard',
    description: 'Main overview and KPIs',
    type: 'page',
    category: 'Navigation',
    url: '/'
  },
  {
    id: 'page-analytics',
    title: 'Analytics',
    description: 'Performance metrics and reports',
    type: 'page',
    category: 'Navigation',
    url: '/analytics'
  },
  {
    id: 'action-new-event',
    title: 'Create New Event',
    description: 'Start a new BEO or REO',
    type: 'action',
    category: 'Quick Actions',
    action: () => {
      // Trigger new event creation
      console.log('Creating new event...');
    }
  },
  {
    id: 'action-ai-assistant',
    title: 'AI Sales Assistant',
    description: 'Get personalized event suggestions',
    type: 'action',
    category: 'AI Tools',
    action: () => {
      // Trigger AI assistant
      console.log('Opening AI Sales Assistant...');
    }
  }
];

// Fuzzy search function
const fuzzySearch = (query: string, text: string): number => {
  if (!query) return 1;
  
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Exact match gets highest score
  if (textLower.includes(queryLower)) {
    return textLower.indexOf(queryLower) === 0 ? 1 : 0.8;
  }
  
  // Character-by-character fuzzy matching
  let score = 0;
  let queryIndex = 0;
  
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      score += 1;
      queryIndex++;
    }
  }
  
  return queryIndex === queryLower.length ? score / textLower.length : 0;
};

const getIcon = (type: string) => {
  switch (type) {
    case 'contact': return User;
    case 'event': return Calendar;
    case 'beo': return FileText;
    case 'venue': return Building;
    case 'menu': return ChefHat;
    case 'analytics': return TrendingUp;
    case 'page': return Hash;
    case 'action': return Zap;
    default: return Search;
  }
};

const useRecentSearches = () => {
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('recent-searches');
    return saved ? JSON.parse(saved) : [];
  });

  const addRecentSearch = useCallback((query: string) => {
    if (!query.trim()) return;
    
    setRecentSearches(prev => {
      const updated = [query, ...prev.filter(s => s !== query)].slice(0, 5);
      localStorage.setItem('recent-searches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { recentSearches, addRecentSearch };
};

export default function SmartSearch({ isOpen, onClose }: SmartSearchProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { recentSearches, addRecentSearch } = useRecentSearches();

  // Search results with fuzzy matching
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    
    return searchData
      .map(item => {
        const titleScore = fuzzySearch(query, item.title);
        const descScore = item.description ? fuzzySearch(query, item.description) : 0;
        const categoryScore = fuzzySearch(query, item.category) * 0.5;
        
        const relevance = Math.max(titleScore, descScore, categoryScore);
        
        return {
          ...item,
          relevance
        } as SearchResult;
      })
      .filter(item => item.relevance > 0.1)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10);
  }, [query]);

  // Simulate search delay
  useEffect(() => {
    if (query) {
      setIsSearching(true);
      const timer = setTimeout(() => setIsSearching(false), 200);
      return () => clearTimeout(timer);
    }
  }, [query]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            Math.min(prev + 1, searchResults.length - 1)
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          handleSelect(searchResults[selectedIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, selectedIndex, onClose]);

  const handleSelect = useCallback((result: SearchResult) => {
    if (!result) return;
    
    addRecentSearch(query);
    
    if (result.action) {
      result.action();
    } else if (result.url) {
      navigate(result.url);
    }
    
    onClose();
    setQuery("");
  }, [query, addRecentSearch, navigate, onClose]);

  const handleRecentSearchClick = useCallback((recentQuery: string) => {
    setQuery(recentQuery);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-panel max-w-2xl p-0 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-border/50">
          <Search className="h-4 w-4 text-muted-foreground mr-3" />
          <Input
            placeholder="Search contacts, events, BEO/REO, venues..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
            autoFocus
          />
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">↑↓</kbd>
            <span>navigate</span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">↵</kbd>
            <span>select</span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">esc</kbd>
            <span>close</span>
          </div>
        </div>

        <ScrollArea className="max-h-96">
          {/* Loading State */}
          {isSearching && (
            <div className="p-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <Skeleton className="h-4 w-4" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Search Results */}
          {!isSearching && query && searchResults.length > 0 && (
            <div className="py-2">
              {searchResults.map((result, index) => {
                const Icon = getIcon(result.type);
                const isSelected = index === selectedIndex;
                
                return (
                  <div
                    key={result.id}
                    className={cn(
                      "flex items-center px-4 py-3 cursor-pointer transition-colors",
                      isSelected && "bg-primary/10 border-r-2 border-primary"
                    )}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <Icon className={cn(
                        "h-4 w-4",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            isSelected ? "text-primary" : "text-foreground"
                          )}>
                            {result.title}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {result.category}
                          </Badge>
                        </div>
                        {result.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {result.description}
                          </p>
                        )}
                        {result.metadata && (
                          <div className="flex items-center space-x-3 mt-1">
                            {result.metadata.date && (
                              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(result.metadata.date).toLocaleDateString()}</span>
                              </div>
                            )}
                            {result.metadata.value && (
                              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                <DollarSign className="h-3 w-3" />
                                <span>${result.metadata.value.toLocaleString()}</span>
                              </div>
                            )}
                            {result.metadata.location && (
                              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span>{result.metadata.location}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </div>
                );
              })}
            </div>
          )}

          {/* No Results */}
          {!isSearching && query && searchResults.length === 0 && (
            <div className="p-8 text-center">
              <Search className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No results found for "{query}"
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Try searching for contacts, events, venues, or menu items
              </p>
            </div>
          )}

          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border/30">
                Recent Searches
              </div>
              {recentSearches.map((recentQuery, index) => (
                <div
                  key={index}
                  className="flex items-center px-4 py-2 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRecentSearchClick(recentQuery)}
                >
                  <Clock className="h-3 w-3 text-muted-foreground mr-3" />
                  <span className="text-sm text-foreground">{recentQuery}</span>
                </div>
              ))}
            </div>
          )}

          {/* Quick Actions when no query */}
          {!query && (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border/30">
                Quick Actions
              </div>
              <div className="space-y-1">
                <div className="flex items-center px-4 py-2 cursor-pointer hover:bg-muted/50">
                  <Zap className="h-3 w-3 text-primary mr-3" />
                  <span className="text-sm text-foreground">Create New Event</span>
                  <div className="ml-auto flex items-center space-x-1 text-xs text-muted-foreground">
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl</kbd>
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs">N</kbd>
                  </div>
                </div>
                <div className="flex items-center px-4 py-2 cursor-pointer hover:bg-muted/50">
                  <Star className="h-3 w-3 text-purple-500 mr-3" />
                  <span className="text-sm text-foreground">AI Sales Assistant</span>
                  <div className="ml-auto flex items-center space-x-1 text-xs text-muted-foreground">
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl</kbd>
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs">A</kbd>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search Tips */}
          {!query && recentSearches.length === 0 && (
            <div className="p-4 text-center">
              <Command className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-2">
                Search across all your data
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Contacts: "Sarah Johnson" or "TechCorp"</p>
                <p>• Events: "Leadership Summit" or "BEO-2024"</p>
                <p>• Venues: "Ballroom" or "Conference Hall"</p>
                <p>• Actions: "Create" or "AI Assistant"</p>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Global Search Hook
export const useGlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    openSearch: () => setIsOpen(true),
    closeSearch: () => setIsOpen(false)
  };
};
