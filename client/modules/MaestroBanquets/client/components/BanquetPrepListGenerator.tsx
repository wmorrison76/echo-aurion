import React from "react";

import { format } from "date-fns";
import { ChefHat, Clock, Download, RefreshCw } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PrepListItem {
  id: string;
  recipeName: string;
  quantity: number;
  unit: string;
  estimatedTime: number;
  priority: "high" | "normal" | "low";
  status: "pending" | "in-progress" | "completed";
}

interface PrepList {
  id: string;
  eventName: string;
  station: string;
  items: PrepListItem[];
  totalTime: number;
  lastUpdated: string;
}

const STATIONS = ["Saucier", "Butcher", "Garde Manger", "Hot Prep"] as const;

export default function BanquetPrepListGenerator() {
  const [prepLists, setPrepLists] = React.useState<PrepList[]>([]);
  const [selectedStation, setSelectedStation] = React.useState<string>("all");
  const [loading, setLoading] = React.useState(false);

  const loadPrepLists = React.useCallback(async () => {
    setLoading(true);
    try {
      /* Replace with API/store wiring. */
      const now = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");
      const lists: PrepList[] = [
        {
          id: "prep-1",
          eventName: "Wedding Reception",
          station: "Saucier",
          items: [
            {
              id: "item-1",
              recipeName: "Hollandaise Sauce",
              quantity: 5,
              unit: "quarts",
              estimatedTime: 45,
              priority: "high",
              status: "pending",
            },
          ],
          totalTime: 45,
          lastUpdated: now,
        },
        {
          id: "prep-2",
          eventName: "Wedding Reception",
          station: "Garde Manger",
          items: [
            {
              id: "item-2",
              recipeName: "Caesar Salad",
              quantity: 150,
              unit: "portions",
              estimatedTime: 120,
              priority: "normal",
              status: "in-progress",
            },
          ],
          totalTime: 120,
          lastUpdated: now,
        },
      ];
      setPrepLists(lists);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadPrepLists();
  }, [loadPrepLists]);

  const filteredPrepLists = React.useMemo(() => {
    return selectedStation === "all"
      ? prepLists
      : prepLists.filter((list) => list.station === selectedStation);
  }, [prepLists, selectedStation]);

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-6 w-6 text-primary" />
                Banquet Prep List Generator
              </CardTitle>
              <CardDescription>
                Department-based prep lists for banquet events
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadPrepLists()}
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const payload = JSON.stringify(prepLists, null, 2);
                  const blob = new Blob([payload], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `prep-lists-${format(new Date(), "yyyyMMdd-HHmm")}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export All
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={selectedStation} onValueChange={setSelectedStation}>
            <TabsList>
              <TabsTrigger value="all">All Stations</TabsTrigger>
              {STATIONS.map((station) => (
                <TabsTrigger key={station} value={station}>
                  {station}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="mt-4 space-y-4">
            {filteredPrepLists.map((prepList) => (
              <Card key={prepList.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">
                        {prepList.station}
                      </CardTitle>
                      <CardDescription>
                        {prepList.eventName} • {prepList.items.length} items •{" "}
                        {prepList.totalTime} min total
                      </CardDescription>
                    </div>
                    <Badge variant="outline">{prepList.station}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recipe</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prepList.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.recipeName}
                          </TableCell>
                          <TableCell>
                            {item.quantity} {item.unit}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {item.estimatedTime} min
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                item.priority === "high"
                                  ? "destructive"
                                  : item.priority === "normal"
                                    ? "default"
                                    : "secondary"
                              }
                            >
                              {item.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                item.status === "completed"
                                  ? "default"
                                  : item.status === "in-progress"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {item.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}

            {filteredPrepLists.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                No prep lists for this station.
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
