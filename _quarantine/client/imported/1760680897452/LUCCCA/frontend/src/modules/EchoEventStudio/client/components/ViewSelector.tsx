import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  TrendingUp, 
  Settings,
  ChevronDown,
  Eye,
  Filter,
  Plus
} from 'lucide-react';

interface ViewConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
  isCustom?: boolean;
}

const defaultViews: ViewConfig[] = [
  {
    id: 'my-work',
    name: 'My Work',
    description: 'Tasks and events assigned to you',
    icon: Users,
    badge: 'Personal'
  },
  {
    id: 'team-overview',
    name: 'Team Overview',
    description: 'High-level view for managers and supervisors',
    icon: LayoutDashboard,
    badge: 'Manager'
  },
  {
    id: 'active-events',
    name: 'Active Events',
    description: 'Currently running and upcoming events',
    icon: Calendar,
    badge: 'Live'
  },
  {
    id: 'analytics-view',
    name: 'Analytics View',
    description: 'KPIs, metrics, and performance data',
    icon: TrendingUp,
    badge: 'Insights'
  },
  {
    id: 'admin-panel',
    name: 'Admin Panel',
    description: 'System configuration and user management',
    icon: Settings,
    badge: 'Admin'
  }
];

interface ViewSelectorProps {
  currentView?: string;
  onViewChange?: (viewId: string) => void;
  className?: string;
}

export default function ViewSelector({ 
  currentView = 'my-work', 
  onViewChange,
  className 
}: ViewSelectorProps) {
  const [selectedView, setSelectedView] = useState(currentView);
  
  const handleViewChange = (viewId: string) => {
    setSelectedView(viewId);
    onViewChange?.(viewId);
  };

  const currentViewConfig = defaultViews.find(view => view.id === selectedView) || defaultViews[0];
  const CurrentIcon = currentViewConfig.icon;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-10 px-4 py-2 bg-background/95 backdrop-blur-sm",
              "hover:bg-background/80 border-border/30",
              "shadow-sm font-medium transition-all duration-200"
            )}
          >
            <CurrentIcon className="h-4 w-4 mr-2" />
            <span className="font-medium">{currentViewConfig.name}</span>
            {currentViewConfig.badge && (
              <Badge
                variant="secondary"
                className="ml-2 text-xs px-2 py-0.5 bg-primary/10 text-primary border-primary/20 rounded-full"
              >
                {currentViewConfig.badge}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-80 bg-background/95 backdrop-blur-xl border border-border/30 shadow-xl rounded-xl"
        >
          <DropdownMenuLabel className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-foreground">
            <Eye className="h-4 w-4 text-primary" />
            Switch View
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="mx-2" />
          
          {defaultViews.map((view) => {
            const Icon = view.icon;
            const isSelected = view.id === selectedView;
            
            return (
              <DropdownMenuItem
                key={view.id}
                onClick={() => handleViewChange(view.id)}
                className={cn(
                  "flex items-start gap-3 p-4 mx-2 mb-1 cursor-pointer rounded-lg transition-all duration-200",
                  "hover:bg-muted/50",
                  isSelected && "bg-primary/10 border border-primary/20 shadow-sm"
                )}
              >
                <Icon className={cn(
                  "h-4 w-4 mt-0.5 flex-shrink-0",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm font-medium",
                      isSelected ? "text-primary" : "text-foreground"
                    )}>
                      {view.name}
                    </span>
                    {view.badge && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium",
                          isSelected
                            ? "bg-primary/10 text-primary border-primary/30"
                            : "bg-muted/30 text-muted-foreground border-muted-foreground/30"
                        )}
                      >
                        {view.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {view.description}
                  </p>
                </div>
              </DropdownMenuItem>
            );
          })}
          
          <DropdownMenuSeparator className="mx-2" />

          <DropdownMenuItem className="flex items-center gap-3 p-4 mx-2 mb-2 text-muted-foreground hover:bg-muted/50 rounded-lg transition-all duration-200">
            <Plus className="h-4 w-4" />
            <span className="text-sm font-medium">Create Custom View</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Filter indicator */}
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 bg-background/95 backdrop-blur-sm border-border/30 hover:bg-background/80 shadow-sm transition-all duration-200"
        title="Filter current view"
      >
        <Filter className="h-4 w-4" />
      </Button>
    </div>
  );
}
