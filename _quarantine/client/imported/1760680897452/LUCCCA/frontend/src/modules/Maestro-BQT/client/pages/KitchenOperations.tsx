/**
 * Kitchen Operations Page - Maestro Banquets
 * Multi-panel kitchen operations interface with split-screen layout
 */

import React, { useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { ChefKitchenView } from '../components/panels/ChefKitchenView';
import { ProductionListManager } from '../components/panels/ProductionListManager';
import { DraggableDashboard, type PanelConfig } from '../components/panels/DraggableDashboard';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import {
  ChefHat, ClipboardList, TrendingUp, Users,
  Calendar, Clock, Target, Maximize2, Minimize2,
  RotateCcw, Zap, Activity
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { cn } from '../lib/utils';

export default function KitchenOperations() {
  const [layoutMode, setLayoutMode] = useState<'split' | 'tabs' | 'chef-focus' | 'production-focus'>('split');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dashReset, setDashReset] = useState(0);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const panels: PanelConfig[] = React.useMemo(() => [
    {
      id: 'Chef Kitchen Operations',
      render: () => (
        <ScrollArea className="h-full">
          <div className="p-4">
            <ChefKitchenView />
          </div>
        </ScrollArea>
      ),
      default: { x: 0, y: 0, w: 720, h: 520 },
      minW: 360,
      minH: 260,
    },
    {
      id: 'Production Management',
      render: () => (
        <ScrollArea className="h-full">
          <div className="p-4">
            <ProductionListManager />
          </div>
        </ScrollArea>
      ),
      default: { x: 740, y: 0, w: 520, h: 520 },
      minW: 360,
      minH: 260,
    },
  ], []);

  const layoutControls = (
    <div className="flex items-center gap-2">
      <div className="flex border rounded-full shadow-sm bg-background overflow-hidden">
        <Button
          aria-label="Split View"
          variant={layoutMode === 'split' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setLayoutMode('split')}
          className="rounded-none border-r"
        >
          <Activity className="h-4 w-4 mr-1" />
          Split View
        </Button>
        <Button
          aria-label="Chef Focus"
          variant={layoutMode === 'chef-focus' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setLayoutMode('chef-focus')}
          className="rounded-none border-r"
        >
          <ChefHat className="h-4 w-4 mr-1" />
          Chef Focus
        </Button>
        <Button
          aria-label="Production Focus"
          variant={layoutMode === 'production-focus' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setLayoutMode('production-focus')}
          className="rounded-none border-r"
        >
          <ClipboardList className="h-4 w-4 mr-1" />
          Production
        </Button>
        <Button
          aria-label="Tabbed View"
          variant={layoutMode === 'tabs' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setLayoutMode('tabs')}
          className="rounded-none"
        >
          <Target className="h-4 w-4 mr-1" />
          Tabbed
        </Button>
      </div>

      <Button
        aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        variant="outline"
        size="sm"
        onClick={toggleFullscreen}
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </Button>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="h-full flex flex-col">
          {/* Fullscreen Header */}
          <div className="border-b bg-gradient-to-r from-primary/10 to-background p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <ChefHat className="h-6 w-6 text-primary" />
                  <h1 className="text-2xl font-bold">Kitchen Operations Center</h1>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <Activity className="h-3 w-3 mr-1" />
                  Live Operations
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {layoutControls}
                <Button
                  variant="outline"
                  onClick={() => setIsFullscreen(false)}
                >
                  <Minimize2 className="h-4 w-4 mr-2" />
                  Exit Fullscreen
                </Button>
              </div>
            </div>
          </div>

          {/* Fullscreen Content */}
          <div className="flex-1 p-4">
            {layoutMode === 'split' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                <Card className="glass-panel h-full overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <ChefHat className="h-5 w-5" />
                      Chef Kitchen View
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 h-full">
                    <ScrollArea className="h-full">
                      <div className="p-6">
                        <ChefKitchenView />
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
                <Card className="glass-panel h-full overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardList className="h-5 w-5" />
                      Production Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 h-full">
                    <ScrollArea className="h-full">
                      <div className="p-6">
                        <ProductionListManager />
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}
            {layoutMode === 'chef-focus' && <ChefKitchenView />}
            {layoutMode === 'production-focus' && <ProductionListManager />}
            {layoutMode === 'tabs' && (
              <Tabs defaultValue="chef" className="h-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="chef">Chef Kitchen View</TabsTrigger>
                  <TabsTrigger value="production">Production Management</TabsTrigger>
                </TabsList>
                <TabsContent value="chef" className="h-full">
                  <ChefKitchenView />
                </TabsContent>
                <TabsContent value="production" className="h-full">
                  <ProductionListManager />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      title="Kitchen Operations Center"
      subtitle="Multi-panel chef and production management interface"
      actions={layoutControls}
    >
      <div className="space-y-6">
        {/* Quick Stats Header */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-panel">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Events</p>
                  <p className="text-2xl font-bold text-primary">12</p>
                </div>
                <Calendar className="h-8 w-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-panel">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Production Lists</p>
                  <p className="text-2xl font-bold text-blue-600">8</p>
                </div>
                <ClipboardList className="h-8 w-8 text-blue-600/60" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-panel">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Staff On Duty</p>
                  <p className="text-2xl font-bold text-green-600">24</p>
                </div>
                <Users className="h-8 w-8 text-green-600/60" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-panel">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Efficiency</p>
                  <p className="text-2xl font-bold text-orange-600">94%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Free-layout workspace with draggable/resizable panels */}
        <ErrorBoundary onReset={()=>{ try{ localStorage.removeItem('kitchen:layout:v1'); }catch{} setDashReset(v=>v+1); }}>
          <DraggableDashboard panels={panels} height={1200} storageKey="kitchen:layout:v1" resetToken={dashReset} />
        </ErrorBoundary>
      </div>
    </DashboardLayout>
  );
}
