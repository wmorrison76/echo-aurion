import React, { useCallback, useMemo, useState } from "react";
import {
  Users,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatCurrency, generateId } from "./shared";
import {
  getAllCustomers,
  getCustomersByType,
  getVIPCustomers,
  getServiceConceptsByType,
  getUpcomingServiceEvents,
  getServiceEventsByServiceConcept,
  calculateServiceMetrics,
  getCustomerEventHistory,
} from "@/lib/customer-service-utils";
import type {
  CustomerProfile,
  ServiceConcept,
  ServiceEvent,
} from "@/types/customer-service";

type TabType = "customers" | "services" | "events" | "analysis";

export default function CustomerServiceWorkspace() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("customers");
  const [customerFilter, setCustomerFilter] = useState<"all" | "vip" | "corporate">(
    "all",
  );
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);

  const customers = useMemo(() => {
    if (customerFilter === "all") return getAllCustomers();
    if (customerFilter === "vip") return getVIPCustomers();
    return getCustomersByType("corporate");
  }, [customerFilter]);

  const upcomingEvents = useMemo(() => getUpcomingServiceEvents(90), []);

  const serviceConcepts = useMemo(
    () => getServiceConceptsByType("dine-in"),
    [],
  );

  const handleAddCustomer = useCallback(() => {
    toast({
      title: "Customer Added",
      description: "New customer profile has been created",
    });
    setIsAddingCustomer(false);
  }, [toast]);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Customers & Service Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage customer profiles, service concepts, and upcoming events
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabType)}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Customer Profiles</h2>
              <p className="text-sm text-muted-foreground">
                Manage and track customer information
              </p>
            </div>
            <Dialog open={isAddingCustomer} onOpenChange={setIsAddingCustomer}>
              <DialogTrigger asChild>
                <Button className="gap-1">
                  <Plus className="h-4 w-4" />
                  New Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Customer</DialogTitle>
                  <DialogDescription>Create a new customer profile</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input placeholder="Customer name" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Type</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="corporate">Corporate</SelectItem>
                        <SelectItem value="group">Group</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input placeholder="email@example.com" type="email" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone</label>
                    <Input placeholder="+1-555-0000" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddingCustomer(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddCustomer}>Create Customer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filter */}
          <div className="flex gap-2">
            <Button
              variant={customerFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setCustomerFilter("all")}
            >
              All ({customers.length})
            </Button>
            <Button
              variant={customerFilter === "vip" ? "default" : "outline"}
              size="sm"
              onClick={() => setCustomerFilter("vip")}
            >
              VIP ({getVIPCustomers().length})
            </Button>
            <Button
              variant={customerFilter === "corporate" ? "default" : "outline"}
              size="sm"
              onClick={() => setCustomerFilter("corporate")}
            >
              Corporate ({getCustomersByType("corporate").length})
            </Button>
          </div>

          {/* Customers Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {customers.map((customer) => (
              <Card
                key={customer.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedCustomer(customer)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{customer.name}</CardTitle>
                      <Badge variant="outline" className="mt-1">
                        {customer.type}
                      </Badge>
                    </div>
                    {customer.type === "vip" && (
                      <Badge className="bg-amber-500">VIP</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {customer.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${customer.email}`} className="hover:underline">
                        {customer.email}
                      </a>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${customer.phone}`} className="hover:underline">
                        {customer.phone}
                      </a>
                    </div>
                  )}
                  {customer.dietaryRestrictions.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2">
                      {customer.dietaryRestrictions.map((dr) => (
                        <Badge key={dr} variant="secondary" className="text-xs">
                          {dr}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {customer.allergies.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {customer.allergies.map((allergen) => (
                        <Badge
                          key={allergen}
                          variant="destructive"
                          className="text-xs"
                        >
                          {allergen}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Customer Details Modal */}
          {selectedCustomer && (
            <Dialog
              open={!!selectedCustomer}
              onOpenChange={(open) => {
                if (!open) setSelectedCustomer(null);
              }}
            >
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{selectedCustomer.name}</DialogTitle>
                  <DialogDescription>Customer profile details</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Type</p>
                      <p className="text-sm">{selectedCustomer.type}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Service Type
                      </p>
                      <p className="text-sm">{selectedCustomer.preferredServiceType}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="text-sm">{selectedCustomer.email || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                      <p className="text-sm">{selectedCustomer.phone || "N/A"}</p>
                    </div>
                  </div>

                  {selectedCustomer.notes && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Notes</p>
                      <p className="text-sm">{selectedCustomer.notes}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Event History
                    </p>
                    <div className="text-sm">
                      {getCustomerEventHistory(selectedCustomer.id).length} events
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline">Edit</Button>
                  <Button variant="destructive" size="sm" className="gap-1">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Service Concepts</h2>
            <p className="text-sm text-muted-foreground">
              Define and manage different service types
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {serviceConcepts.map((service) => (
              <Card key={service.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{service.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {service.serviceType}
                      </CardDescription>
                    </div>
                    <Badge>{service.capacity} seats</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {service.description && (
                    <p className="text-sm text-muted-foreground">
                      {service.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Avg Check Size</p>
                      <p className="font-semibold">
                        {formatCurrency(service.averageCheckSize)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Seating Time</p>
                      <p className="font-semibold">{service.seatingTime} min</p>
                    </div>
                  </div>

                  <div>
                    <Badge
                      variant={service.enabled ? "default" : "outline"}
                      className="text-xs"
                    >
                      {service.enabled ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Upcoming Events</h2>
            <p className="text-sm text-muted-foreground">
              Service events and reservations
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Next 90 Days</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Covers</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No upcoming events
                        </TableCell>
                      </TableRow>
                    ) : (
                      upcomingEvents.slice(0, 10).map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="font-medium">{event.name}</TableCell>
                          <TableCell className="text-sm">
                            {event.eventType}
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(event.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-sm">
                            {event.confirmedCovers ?? event.expectedCovers}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {event.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Service Metrics</h2>
            <p className="text-sm text-muted-foreground">
              Performance analysis across events
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.slice(0, 3).map((event) => {
              const metrics = calculateServiceMetrics(event.id);
              return (
                <Card key={event.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{event.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {new Date(event.date).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Total Covers</p>
                      <p className="font-semibold">{metrics.totalCovers}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Projected Revenue</p>
                      <p className="font-semibold">
                        {formatCurrency(metrics.projectedRevenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Projected Profit</p>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(metrics.netProfit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Profit Margin</p>
                      <p className="font-semibold">
                        {metrics.profitMargin.toFixed(1)}%
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
