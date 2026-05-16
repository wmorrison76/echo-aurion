import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Smartphone,
  Download,
  Wifi,
  WifiOff,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function MobileOfflineWorkspace() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Mobile & Offline</h2>
        <p className="text-sm text-muted-foreground">
          Progressive Web App with offline support and background sync
        </p>
      </div>

      <Tabs defaultValue="pwa" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pwa" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            PWA
          </TabsTrigger>
          <TabsTrigger value="sync" className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Sync
          </TabsTrigger>
          <TabsTrigger value="cache" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Cache
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pwa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Progressive Web App
              </CardTitle>
              <CardDescription>
                Install Echo Recipe Pro as a standalone app on your device
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">iOS</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Add to Home Screen via Safari Share Menu
                    </p>
                    <Button variant="outline" className="w-full gap-2">
                      <Download className="h-4 w-4" />
                      Instructions
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Android</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Install button appears in Chrome menu
                    </p>
                    <Button variant="outline" className="w-full gap-2">
                      <Download className="h-4 w-4" />
                      Install Now
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span> Home screen
                      install
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span> Full-screen mode
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span> App-like
                      experience
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span> Push
                      notifications
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-amber-600">○</span> Share target API
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5" />
                Offline Editing & Background Sync
              </CardTitle>
              <CardDescription>
                Continue working even without an internet connection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wifi className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-semibold">Currently Online</p>
                      <p className="text-sm text-muted-foreground">
                        All changes synced automatically
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900">
                    Connected
                  </Badge>
                </div>

                <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg text-sm text-green-900 dark:text-green-100">
                  Changes are synced in real-time. If you lose connection, your
                  edits will be queued and synced when you're back online.
                </div>
              </div>

              <div className="space-y-3 border-t pt-6">
                <h4 className="font-semibold">Offline Features</h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="text-green-600 mt-1">✓</span>
                    <div>
                      <p className="font-medium text-sm">View cached recipes</p>
                      <p className="text-xs text-muted-foreground">
                        Read previously loaded recipes without internet
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-600 mt-1">✓</span>
                    <div>
                      <p className="font-medium text-sm">
                        Edit with offline queue
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Changes are stored locally and synced automatically
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-600 mt-1">✓</span>
                    <div>
                      <p className="font-medium text-sm">Conflict resolution</p>
                      <p className="text-xs text-muted-foreground">
                        Automatic merge if others edited the same recipe
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Cache Management
              </CardTitle>
              <CardDescription>
                Control what data is available offline
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Offline Storage Usage</p>
                    <p className="text-sm text-muted-foreground">
                      45.3 MB of 50 MB available
                    </p>
                  </div>
                  <span className="text-sm font-semibold">91%</span>
                </div>
                <Progress value={91} className="h-2" />
              </div>

              <div className="space-y-3 border-t pt-6">
                <h4 className="font-semibold">Cache Contents</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Recipes</p>
                      <p className="text-xs text-muted-foreground">
                        342 recipes cached
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      28.5 MB
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Images</p>
                      <p className="text-xs text-muted-foreground">
                        152 images cached
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      16.2 MB
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium text-sm">App Shell</p>
                      <p className="text-xs text-muted-foreground">UI assets</p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      0.6 MB
                    </span>
                  </div>
                </div>
              </div>

              <Button variant="outline" className="w-full">
                Clear Cache
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
