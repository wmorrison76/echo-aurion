import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import Layout from "@/components/Layout";
import {
  Calendar,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  MapPin,
  Clock,
  DollarSign,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  XCircle,
  Star,
  Mail,
  Phone,
  Download,
  Upload,
  Share2,
  Eye,
  Copy,
  Settings,
  BarChart3,
  FileText,
  Camera,
  Zap,
  Globe,
  QrCode,
  CreditCard,
  Ticket,
  Bell,
} from "lucide-react"; // Sample events data
const events = [
  {
    id: 1,
    name: "Tech Conference 2024",
    type: "Conference",
    status: "Active",
    date: "2024-03-15",
    time: "09:00 AM",
    venue: "Convention Center Hall A",
    capacity: 500,
    registered: 342,
    revenue: 85000,
    organizer: "TechCorp Inc.",
    image: "🏢",
    description:
      "Annual technology conference featuring the latest innovations and industry leaders.",
    tags: ["Technology", "Innovation", "Networking"],
  },
  {
    id: 2,
    name: "Wedding Reception",
    type: "Wedding",
    status: "Planning",
    date: "2024-04-20",
    time: "06:00 PM",
    venue: "Grand Ballroom",
    capacity: 150,
    registered: 128,
    revenue: 25000,
    organizer: "Smith & Johnson",
    image: "💒",
    description: "Elegant wedding reception with dinner and dancing.",
    tags: ["Wedding", "Reception", "Celebration"],
  },
  {
    id: 3,
    name: "Product Launch",
    type: "Corporate",
    status: "Completed",
    date: "2024-02-10",
    time: "02:00 PM",
    venue: "Innovation Hub",
    capacity: 200,
    registered: 185,
    revenue: 45000,
    organizer: "StartupXYZ",
    image: "🚀",
    description:
      "Launch event for revolutionary new product with live demonstrations.",
    tags: ["Product Launch", "Innovation", "Demo"],
  },
  {
    id: 4,
    name: "Annual Gala",
    type: "Fundraiser",
    status: "Draft",
    date: "2024-05-05",
    time: "07:00 PM",
    venue: "City Hotel Ballroom",
    capacity: 300,
    registered: 45,
    revenue: 15000,
    organizer: "Charity Foundation",
    image: "🍽️",
    description: "Formal fundraising gala with auction and entertainment.",
    tags: ["Fundraiser", "Charity", "Formal"],
  },
];
const attendees = [
  {
    id: 1,
    name: "John Smith",
    email: "john@example.com",
    status: "Confirmed",
    ticket: "VIP",
    checkedIn: true,
  },
  {
    id: 2,
    name: "Sarah Johnson",
    email: "sarah@example.com",
    status: "Confirmed",
    ticket: "Regular",
    checkedIn: true,
  },
  {
    id: 3,
    name: "Mike Davis",
    email: "mike@example.com",
    status: "Pending",
    ticket: "Regular",
    checkedIn: false,
  },
  {
    id: 4,
    name: "Emily Wilson",
    email: "emily@example.com",
    status: "Confirmed",
    ticket: "VIP",
    checkedIn: false,
  },
];
const statusColors = {
  Active: "bg-green-500",
  Planning: "bg-yellow-500",
  Completed: "bg-primary",
  Draft: "bg-surface",
  Cancelled: "bg-red-500",
};
export default function Events() {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.venue.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || event.status.toLowerCase() === statusFilter;
    const matchesType =
      typeFilter === "all" || event.type.toLowerCase() === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });
  return (
    <Layout>
      {" "}
      <div className="min-h-screen bg-background p-6">
        {" "}
        <div className="max-w-7xl mx-auto space-y-6">
          {" "}
          {/* Header */}{" "}
          <div className="flex items-center justify-between">
            {" "}
            <div>
              {" "}
              <h1 className="text-3xl font-bold mb-2">Event Management</h1>{" "}
              <p className="text-muted-foreground">
                Manage all your events, attendees, and analytics in one place
              </p>{" "}
            </div>{" "}
            <Dialog>
              {" "}
              <DialogTrigger asChild>
                {" "}
                <Button className="shadow-glow">
                  {" "}
                  <Plus className="h-4 w-4 mr-2" /> Create Event{" "}
                </Button>{" "}
              </DialogTrigger>{" "}
              <DialogContent className="max-w-2xl">
                {" "}
                <DialogHeader>
                  {" "}
                  <DialogTitle>Create New Event</DialogTitle>{" "}
                  <DialogDescription>
                    Set up a new event with all the details
                  </DialogDescription>{" "}
                </DialogHeader>{" "}
                <div className="grid grid-cols-2 gap-4 py-4">
                  {" "}
                  <div className="space-y-2">
                    {" "}
                    <Label htmlFor="event-name">Event Name</Label>{" "}
                    <Input
                      id="event-name"
                      placeholder="Enter event name"
                    />{" "}
                  </div>{" "}
                  <div className="space-y-2">
                    {" "}
                    <Label htmlFor="event-type">Event Type</Label>{" "}
                    <Select>
                      {" "}
                      <SelectTrigger>
                        {" "}
                        <SelectValue placeholder="Select type" />{" "}
                      </SelectTrigger>{" "}
                      <SelectContent>
                        {" "}
                        <SelectItem value="conference">
                          Conference
                        </SelectItem>{" "}
                        <SelectItem value="wedding">Wedding</SelectItem>{" "}
                        <SelectItem value="corporate">Corporate</SelectItem>{" "}
                        <SelectItem value="fundraiser">Fundraiser</SelectItem>{" "}
                        <SelectItem value="workshop">Workshop</SelectItem>{" "}
                      </SelectContent>{" "}
                    </Select>{" "}
                  </div>{" "}
                  <div className="space-y-2">
                    {" "}
                    <Label htmlFor="event-date">Date</Label>{" "}
                    <Input id="event-date" type="date" />{" "}
                  </div>{" "}
                  <div className="space-y-2">
                    {" "}
                    <Label htmlFor="event-time">Time</Label>{" "}
                    <Input id="event-time" type="time" />{" "}
                  </div>{" "}
                  <div className="space-y-2">
                    {" "}
                    <Label htmlFor="venue">Venue</Label>{" "}
                    <Input id="venue" placeholder="Event venue" />{" "}
                  </div>{" "}
                  <div className="space-y-2">
                    {" "}
                    <Label htmlFor="capacity">Capacity</Label>{" "}
                    <Input
                      id="capacity"
                      type="number"
                      placeholder="Maximum attendees"
                    />{" "}
                  </div>{" "}
                  <div className="col-span-2 space-y-2">
                    {" "}
                    <Label htmlFor="description">Description</Label>{" "}
                    <Textarea
                      id="description"
                      placeholder="Event description"
                    />{" "}
                  </div>{" "}
                </div>{" "}
                <div className="flex justify-end space-x-2">
                  {" "}
                  <Button variant="outline">Save as Draft</Button>{" "}
                  <Button>Create Event</Button>{" "}
                </div>{" "}
              </DialogContent>{" "}
            </Dialog>{" "}
          </div>{" "}
          {/* Stats Overview */}{" "}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {" "}
            <Card>
              {" "}
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                {" "}
                <CardTitle className="text-sm font-medium">
                  Total Events
                </CardTitle>{" "}
                <Calendar className="h-4 w-4 text-muted-foreground" />{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <div className="text-2xl font-bold">24</div>{" "}
                <p className="text-xs text-muted-foreground">
                  {" "}
                  <span className="text-green-500">+12%</span> from last
                  month{" "}
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
            <Card>
              {" "}
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                {" "}
                <CardTitle className="text-sm font-medium">
                  Total Attendees
                </CardTitle>{" "}
                <Users className="h-4 w-4 text-muted-foreground" />{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <div className="text-2xl font-bold">1,247</div>{" "}
                <p className="text-xs text-muted-foreground">
                  {" "}
                  <span className="text-green-500">+18%</span> from last
                  month{" "}
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
            <Card>
              {" "}
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                {" "}
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>{" "}
                <DollarSign className="h-4 w-4 text-muted-foreground" />{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <div className="text-2xl font-bold">$45,231</div>{" "}
                <p className="text-xs text-muted-foreground">
                  {" "}
                  <span className="text-green-500">+25%</span> from last
                  month{" "}
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
            <Card>
              {" "}
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                {" "}
                <CardTitle className="text-sm font-medium">
                  Success Rate
                </CardTitle>{" "}
                <TrendingUp className="h-4 w-4 text-muted-foreground" />{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <div className="text-2xl font-bold">94.2%</div>{" "}
                <p className="text-xs text-muted-foreground">
                  {" "}
                  <span className="text-green-500">+2%</span> from last
                  month{" "}
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
          </div>{" "}
          {/* Main Content */}{" "}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {" "}
            {/* Events List */}{" "}
            <div className="lg:col-span-2 space-y-4">
              {" "}
              {/* Filters */}{" "}
              <Card>
                {" "}
                <CardContent className="p-4">
                  {" "}
                  <div className="flex items-center space-x-4">
                    {" "}
                    <div className="relative flex-1">
                      {" "}
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />{" "}
                      <Input
                        placeholder="Search events..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />{" "}
                    </div>{" "}
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      {" "}
                      <SelectTrigger className="w-32">
                        {" "}
                        <SelectValue placeholder="Status" />{" "}
                      </SelectTrigger>{" "}
                      <SelectContent>
                        {" "}
                        <SelectItem value="all">All Status</SelectItem>{" "}
                        <SelectItem value="active">Active</SelectItem>{" "}
                        <SelectItem value="planning">Planning</SelectItem>{" "}
                        <SelectItem value="completed">Completed</SelectItem>{" "}
                        <SelectItem value="draft">Draft</SelectItem>{" "}
                      </SelectContent>{" "}
                    </Select>{" "}
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      {" "}
                      <SelectTrigger className="w-32">
                        {" "}
                        <SelectValue placeholder="Type" />{" "}
                      </SelectTrigger>{" "}
                      <SelectContent>
                        {" "}
                        <SelectItem value="all">All Types</SelectItem>{" "}
                        <SelectItem value="conference">Conference</SelectItem>{" "}
                        <SelectItem value="wedding">Wedding</SelectItem>{" "}
                        <SelectItem value="corporate">Corporate</SelectItem>{" "}
                        <SelectItem value="fundraiser">
                          Fundraiser
                        </SelectItem>{" "}
                      </SelectContent>{" "}
                    </Select>{" "}
                    <Button variant="outline" size="icon">
                      {" "}
                      <Filter className="h-4 w-4" />{" "}
                    </Button>{" "}
                  </div>{" "}
                </CardContent>{" "}
              </Card>{" "}
              {/* Events Grid */}{" "}
              <div className="space-y-4">
                {" "}
                {filteredEvents.map((event) => (
                  <Card
                    key={event.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${selectedEvent?.id === event.id ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setSelectedEvent(event)}
                  >
                    {" "}
                    <CardContent className="p-6">
                      {" "}
                      <div className="flex items-start justify-between">
                        {" "}
                        <div className="flex items-start space-x-4">
                          {" "}
                          <div className="text-3xl">{event.image}</div>{" "}
                          <div className="flex-1 min-w-0">
                            {" "}
                            <div className="flex items-center space-x-2 mb-2">
                              {" "}
                              <h3 className="font-semibold text-lg">
                                {event.name}
                              </h3>{" "}
                              <div
                                className={`w-2 h-2 rounded-full ${statusColors[event.status]}`}
                              />{" "}
                              <Badge variant="outline">
                                {event.status}
                              </Badge>{" "}
                            </div>{" "}
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {" "}
                              {event.description}{" "}
                            </p>{" "}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              {" "}
                              <div className="flex items-center space-x-2">
                                {" "}
                                <Calendar className="h-4 w-4 text-muted-foreground" />{" "}
                                <span>
                                  {event.date} at {event.time}
                                </span>{" "}
                              </div>{" "}
                              <div className="flex items-center space-x-2">
                                {" "}
                                <MapPin className="h-4 w-4 text-muted-foreground" />{" "}
                                <span>{event.venue}</span>{" "}
                              </div>{" "}
                              <div className="flex items-center space-x-2">
                                {" "}
                                <Users className="h-4 w-4 text-muted-foreground" />{" "}
                                <span>
                                  {event.registered}/{event.capacity} attendees
                                </span>{" "}
                              </div>{" "}
                              <div className="flex items-center space-x-2">
                                {" "}
                                <DollarSign className="h-4 w-4 text-muted-foreground" />{" "}
                                <span>
                                  ${event.revenue.toLocaleString()}
                                </span>{" "}
                              </div>{" "}
                            </div>{" "}
                            <div className="mt-3">
                              {" "}
                              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                {" "}
                                <span>Registration Progress</span>{" "}
                                <span>
                                  {Math.round(
                                    (event.registered / event.capacity) * 100,
                                  )}
                                  %
                                </span>{" "}
                              </div>{" "}
                              <Progress
                                value={
                                  (event.registered / event.capacity) * 100
                                }
                                className="h-2"
                              />{" "}
                            </div>{" "}
                          </div>{" "}
                        </div>{" "}
                        <div className="flex items-center space-x-2">
                          {" "}
                          <Button variant="ghost" size="sm">
                            {" "}
                            <Eye className="h-4 w-4" />{" "}
                          </Button>{" "}
                          <Button variant="ghost" size="sm">
                            {" "}
                            <Edit className="h-4 w-4" />{" "}
                          </Button>{" "}
                          <Button variant="ghost" size="sm">
                            {" "}
                            <MoreHorizontal className="h-4 w-4" />{" "}
                          </Button>{" "}
                        </div>{" "}
                      </div>{" "}
                    </CardContent>{" "}
                  </Card>
                ))}{" "}
              </div>{" "}
            </div>{" "}
            {/* Event Details Sidebar */}{" "}
            <div className="space-y-6">
              {" "}
              {selectedEvent ? (
                <>
                  {" "}
                  {/* Event Overview */}{" "}
                  <Card>
                    {" "}
                    <CardHeader>
                      {" "}
                      <CardTitle className="flex items-center space-x-2">
                        {" "}
                        <span className="text-2xl">
                          {selectedEvent.image}
                        </span>{" "}
                        <span>{selectedEvent.name}</span>{" "}
                      </CardTitle>{" "}
                      <CardDescription>
                        {selectedEvent.description}
                      </CardDescription>{" "}
                    </CardHeader>{" "}
                    <CardContent className="space-y-4">
                      {" "}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {" "}
                        <div>
                          {" "}
                          <Label className="text-muted-foreground">
                            Status
                          </Label>{" "}
                          <div className="flex items-center space-x-2 mt-1">
                            {" "}
                            <div
                              className={`w-2 h-2 rounded-full ${statusColors[selectedEvent.status]}`}
                            />{" "}
                            <span>{selectedEvent.status}</span>{" "}
                          </div>{" "}
                        </div>{" "}
                        <div>
                          {" "}
                          <Label className="text-muted-foreground">
                            Type
                          </Label>{" "}
                          <div className="mt-1">{selectedEvent.type}</div>{" "}
                        </div>{" "}
                        <div>
                          {" "}
                          <Label className="text-muted-foreground">
                            Date & Time
                          </Label>{" "}
                          <div className="mt-1">{selectedEvent.date}</div>{" "}
                          <div className="text-xs text-muted-foreground">
                            {selectedEvent.time}
                          </div>{" "}
                        </div>{" "}
                        <div>
                          {" "}
                          <Label className="text-muted-foreground">
                            Venue
                          </Label>{" "}
                          <div className="mt-1">{selectedEvent.venue}</div>{" "}
                        </div>{" "}
                      </div>{" "}
                      <Separator />{" "}
                      <div className="space-y-2">
                        {" "}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                        >
                          {" "}
                          <Settings className="h-4 w-4 mr-2" /> Event
                          Settings{" "}
                        </Button>{" "}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                        >
                          {" "}
                          <QrCode className="h-4 w-4 mr-2" /> Check-in QR
                          Code{" "}
                        </Button>{" "}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                        >
                          {" "}
                          <Download className="h-4 w-4 mr-2" /> Export
                          Attendees{" "}
                        </Button>{" "}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                        >
                          {" "}
                          <Share2 className="h-4 w-4 mr-2" /> Share Event{" "}
                        </Button>{" "}
                      </div>{" "}
                    </CardContent>{" "}
                  </Card>{" "}
                  {/* Quick Stats */}{" "}
                  <Card>
                    {" "}
                    <CardHeader>
                      {" "}
                      <CardTitle className="text-lg">
                        Quick Stats
                      </CardTitle>{" "}
                    </CardHeader>{" "}
                    <CardContent className="space-y-4">
                      {" "}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {" "}
                        <div className="text-center p-3 bg-muted/20 rounded-lg">
                          {" "}
                          <div className="text-xl font-bold text-primary">
                            {selectedEvent.registered}
                          </div>{" "}
                          <div className="text-muted-foreground">
                            Registered
                          </div>{" "}
                        </div>{" "}
                        <div className="text-center p-3 bg-muted/20 rounded-lg">
                          {" "}
                          <div className="text-xl font-bold text-green-500">
                            {Math.floor(selectedEvent.registered * 0.8)}
                          </div>{" "}
                          <div className="text-muted-foreground">
                            Checked In
                          </div>{" "}
                        </div>{" "}
                        <div className="text-center p-3 bg-muted/20 rounded-lg">
                          {" "}
                          <div className="text-xl font-bold text-blue-500">
                            ${(selectedEvent.revenue / 1000).toFixed(0)}K
                          </div>{" "}
                          <div className="text-muted-foreground">
                            Revenue
                          </div>{" "}
                        </div>{" "}
                        <div className="text-center p-3 bg-muted/20 rounded-lg">
                          {" "}
                          <div className="text-xl font-bold text-yellow-500">
                            4.8
                          </div>{" "}
                          <div className="text-muted-foreground">
                            Rating
                          </div>{" "}
                        </div>{" "}
                      </div>{" "}
                    </CardContent>{" "}
                  </Card>{" "}
                  {/* Recent Attendees */}{" "}
                  <Card>
                    {" "}
                    <CardHeader>
                      {" "}
                      <CardTitle className="text-lg flex items-center justify-between">
                        {" "}
                        Recent Registrations{" "}
                        <Badge variant="secondary">
                          {attendees.length}
                        </Badge>{" "}
                      </CardTitle>{" "}
                    </CardHeader>{" "}
                    <CardContent>
                      {" "}
                      <ScrollArea className="h-40">
                        {" "}
                        <div className="space-y-3">
                          {" "}
                          {attendees.map((attendee) => (
                            <div
                              key={attendee.id}
                              className="flex items-center space-x-3"
                            >
                              {" "}
                              <Avatar className="h-8 w-8">
                                {" "}
                                <AvatarFallback className="text-xs">
                                  {" "}
                                  {attendee.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}{" "}
                                </AvatarFallback>{" "}
                              </Avatar>{" "}
                              <div className="flex-1 min-w-0">
                                {" "}
                                <div className="font-medium text-sm">
                                  {attendee.name}
                                </div>{" "}
                                <div className="text-xs text-muted-foreground">
                                  {attendee.email}
                                </div>{" "}
                              </div>{" "}
                              <div className="flex items-center space-x-1">
                                {" "}
                                <Badge
                                  variant={
                                    attendee.status === "Confirmed"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {" "}
                                  {attendee.status}{" "}
                                </Badge>{" "}
                                {attendee.checkedIn && (
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                )}{" "}
                              </div>{" "}
                            </div>
                          ))}{" "}
                        </div>{" "}
                      </ScrollArea>{" "}
                    </CardContent>{" "}
                  </Card>{" "}
                </>
              ) : (
                <Card>
                  {" "}
                  <CardContent className="p-8 text-center">
                    {" "}
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />{" "}
                    <h3 className="font-semibold mb-2">Select an Event</h3>{" "}
                    <p className="text-sm text-muted-foreground">
                      {" "}
                      Choose an event from the list to view details and manage
                      attendees{" "}
                    </p>{" "}
                  </CardContent>{" "}
                </Card>
              )}{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </Layout>
  );
}
