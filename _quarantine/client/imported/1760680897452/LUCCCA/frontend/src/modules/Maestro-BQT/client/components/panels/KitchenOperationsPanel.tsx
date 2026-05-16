import React from 'react';
import { ChefHat, ClipboardList, Clock, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { ChefKitchenView } from './ChefKitchenView';
import { ProductionListManager } from './ProductionListManager';

export type OperationsPanelMode = 'split' | 'chef' | 'production' | 'tabs';

interface KitchenOperationsPanelProps {
  mode?: OperationsPanelMode;
  heightClass?: string;
}

export const KitchenOperationsPanel: React.FC<KitchenOperationsPanelProps> = ({
  mode = 'split',
  heightClass = 'h-[70vh]'
}) => {
  if (mode === 'chef') {
    return (
      <Card className="glass-panel overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/15 via-primary/10 to-transparent border-b">
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <ChefHat className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary">Chef Kitchen Operations</h2>
              <p className="text-sm text-muted-foreground">Live service overview</p>
            </div>
            <Badge variant="default" className="ml-auto bg-primary">
              <Zap className="h-3 w-3 mr-1" />
              Live
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className={heightClass}>
            <div className="p-6">
              <ChefKitchenView />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  if (mode === 'production') {
    return (
      <Card className="glass-panel overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-500/15 via-blue-500/10 to-transparent border-b">
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <ClipboardList className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-blue-700">Production Management</h2>
              <p className="text-sm text-muted-foreground">Automated list generation</p>
            </div>
            <Badge variant="default" className="ml-auto bg-blue-600">
              <Clock className="h-3 w-3 mr-1" />
              Real-time
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className={heightClass}>
            <div className="p-6">
              <ProductionListManager />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  if (mode === 'tabs') {
    return (
      <Card className="glass-panel overflow-hidden">
        <Tabs defaultValue="chef" className="h-full">
          <CardHeader className="border-b">
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger value="chef" className="flex items-center gap-2">
                <ChefHat className="h-4 w-4" />
                Chef Kitchen Operations
              </TabsTrigger>
              <TabsTrigger value="production" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Production Management
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="p-0">
            <TabsContent value="chef" className="mt-0">
              <ScrollArea className={heightClass}>
                <div className="p-6">
                  <ChefKitchenView />
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="production" className="mt-0">
              <ScrollArea className={heightClass}>
                <div className="p-6">
                  <ProductionListManager />
                </div>
              </ScrollArea>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <KitchenOperationsPanel mode="chef" heightClass={heightClass} />
      <KitchenOperationsPanel mode="production" heightClass={heightClass} />
    </div>
  );
};

export default KitchenOperationsPanel;
