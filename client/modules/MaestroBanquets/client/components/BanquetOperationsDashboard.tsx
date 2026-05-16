import React from "react";

import { format } from "date-fns";
import { Calendar, ChefHat, Package, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface UpcomingEvent {
  id: string;
  name: string;
  date: string; /* ISO date */
  guestCount: number;
  status: "hold" | "tentative" | "confirmed";
}

interface PendingOrder {
  id: string;
  eventName: string;
  deliveryDate: string; /* ISO date */
  status: "pending" | "approved" | "ordered";
}

interface ActivePrepList {
  id: string;
  eventName: string;
  station: string;
  items: number;
}

export default function BanquetOperationsDashboard() {
  const [upcomingEvents, setUpcomingEvents] = React.useState<UpcomingEvent[]>(
    [],
  );
  const [pendingOrders, setPendingOrders] = React.useState<PendingOrder[]>([]);
  const [activePrepLists, setActivePrepLists] = React.useState<
    ActivePrepList[]
  >([]);
  const [loading, setLoading] = React.useState(false);

  const loadDashboardData = React.useCallback(async () => {
    setLoading(true);
    try {
      const todayISO = format(new Date(), "yyyy-MM-dd");
      setUpcomingEvents([
        {
          id: "event-1",
          name: "Wedding Reception",
          date: todayISO,
          guestCount: 150,
          status: "confirmed",
        },
        {
          id: "event-2",
          name: "Corporate Dinner",
          date: todayISO,
          guestCount: 75,
          status: "tentative",
        },
      ]);
      setPendingOrders([
        {
          id: "order-1",
          eventName: "Wedding Reception",
          deliveryDate: todayISO,
          status: "pending",
        },
      ]);
      setActivePrepLists([
        {
          id: "prep-1",
          eventName: "Wedding Reception",
          station: "Hot Prep",
          items: 15,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xl font-semibold">Banquet Operations</div>
          <div className="text-sm text-muted-foreground">
            Operational readiness at a glance
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadDashboardData()}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Upcoming Events
                </p>
                <p className="text-2xl font-bold">{upcomingEvents.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Pending Orders
                </p>
                <p className="text-2xl font-bold">{pendingOrders.length}</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Active Prep Lists
                </p>
                <p className="text-2xl font-bold">{activePrepLists.length}</p>
              </div>
              <ChefHat className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Staff Scheduled
                </p>
                <p className="text-2xl font-bold">24</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{event.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.date), "MMM d, yyyy")} •{" "}
                        {event.guestCount} guests
                      </p>
                    </div>
                    <Badge
                      variant={
                        event.status === "confirmed"
                          ? "default"
                          : event.status === "tentative"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {event.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {upcomingEvents.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">
                  No events.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingOrders.map((order) => (
                <div key={order.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">Order Review Needed</p>
                      <p className="text-sm text-muted-foreground">
                        {order.eventName}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => alert("Wire order review flow")}
                    >
                      Review
                    </Button>
                  </div>
                </div>
              ))}
              {pendingOrders.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">
                  No pending actions.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
