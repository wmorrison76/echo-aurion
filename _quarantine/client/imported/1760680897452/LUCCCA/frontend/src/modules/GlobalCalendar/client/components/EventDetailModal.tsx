import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Building2,
  DollarSign,
  Phone,
  Mail,
  FileText,
  CheckCircle,
  AlertCircle,
  XCircle,
  Edit,
  Download,
  Send,
  Eye,
  User,
  ChefHat,
  Music,
  Camera,
  Utensils,
  Wine,
  Flower
} from "lucide-react";

interface EventDetailModalProps {
  children: React.ReactNode;
  event: any;
}

export default function EventDetailModal({ children, event }: EventDetailModalProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  // Sample BEO/REO data based on event type
  const getBeoReoData = () => {
    if (event.type === "BEO") {
      return {
        status: event.status === "confirmed" ? "completed" : "in-progress",
        completionPercentage: event.status === "confirmed" ? 100 : 75,
        sections: {
          eventDetails: { completed: true, lastUpdated: "2024-01-10 14:30" },
          catering: { completed: event.status === "confirmed", lastUpdated: "2024-01-12 10:15" },
          avRequirements: { completed: true, lastUpdated: "2024-01-11 16:45" },
          roomSetup: { completed: event.status === "confirmed", lastUpdated: "2024-01-13 09:20" },
          timeline: { completed: event.status === "confirmed", lastUpdated: "2024-01-14 11:30" },
          billing: { completed: false, lastUpdated: null }
        },
        documents: [
          { name: "Event Layout Diagram", status: "completed", url: "#" },
          { name: "Catering Menu Final", status: "completed", url: "#" },
          { name: "AV Equipment List", status: "completed", url: "#" },
          { name: "Timeline Schedule", status: event.status === "confirmed" ? "completed" : "draft", url: "#" },
          { name: "Final Invoice", status: "pending", url: null }
        ]
      };
    } else {
      return {
        status: "completed",
        completionPercentage: 100,
        sections: {
          eventExecution: { completed: true, lastUpdated: "2024-01-16 18:30" },
          clientFeedback: { completed: true, lastUpdated: "2024-01-17 10:00" },
          vendorReconciliation: { completed: true, lastUpdated: "2024-01-17 14:15" },
          finalBilling: { completed: true, lastUpdated: "2024-01-18 09:30" },
          postEventReport: { completed: false, lastUpdated: null }
        },
        documents: [
          { name: "Event Execution Report", status: "completed", url: "#" },
          { name: "Client Satisfaction Survey", status: "completed", url: "#" },
          { name: "Vendor Invoices", status: "completed", url: "#" },
          { name: "Final Revenue Report", status: "completed", url: "#" },
          { name: "Post-Event Analysis", status: "pending", url: null }
        ]
      };
    }
  };

  const beoReoData = getBeoReoData();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "in-progress": case "draft": return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "pending": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-600 bg-green-50 border-green-200";
      case "in-progress": case "draft": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "pending": return "text-red-600 bg-red-50 border-red-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const sampleVendors = [
    { name: "Elite Catering Services", type: "Catering", contact: "chef@elitecatering.com", status: "confirmed" },
    { name: "Sound & Vision AV", type: "Audio/Visual", contact: "av@soundvision.com", status: "confirmed" },
    { name: "Bloom Florists", type: "Decorations", contact: "orders@bloomflorists.com", status: "pending" },
    { name: "Premier Photography", type: "Photography", contact: "info@premierphotos.com", status: "confirmed" }
  ];

  const sampleTimeline = [
    { time: "08:00", task: "Venue setup begins", responsible: "Operations Team", status: "completed" },
    { time: "09:00", task: "AV equipment installation", responsible: "Sound & Vision AV", status: "completed" },
    { time: "10:00", task: "Catering setup", responsible: "Elite Catering", status: "completed" },
    { time: "11:00", task: "Decoration installation", responsible: "Bloom Florists", status: "pending" },
    { time: "12:00", task: "Final walk-through", responsible: "Event Manager", status: "pending" },
    { time: "09:00", task: "Event begins", responsible: "All Teams", status: "scheduled" }
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span>{event.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge
                variant="outline"
                className={
                  event.type === "BEO"
                    ? "bg-blue-100 text-blue-700 border-blue-200"
                    : "bg-purple-100 text-purple-700 border-purple-200"
                }
              >
                {event.type}
              </Badge>
              <Badge className={getStatusColor(beoReoData.status)}>
                {beoReoData.status === "completed" ? "Completed" : "In Progress"}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="beo-reo">{event.type}</TabsTrigger>
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Event Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{event.date}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{event.time}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{event.guests} guests</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{event.department}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-green-600">
                      {event.value || "$" + (Math.random() * 50000 + 10000).toFixed(0)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{event.type} Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Completion</span>
                    <span className="text-sm font-medium">{beoReoData.completionPercentage}%</span>
                  </div>
                  <Progress value={beoReoData.completionPercentage} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    {beoReoData.status === "completed" 
                      ? "All sections completed and approved" 
                      : "Some sections still require attention"}
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate('/echoscope-beo');
                      }}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit {event.type}
                    </Button>
                    {beoReoData.status === "completed" && (
                      <Button size="sm" variant="outline" className="flex-1">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Section Status</CardTitle>
                <CardDescription>Current progress on {event.type} sections</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(beoReoData.sections).map(([section, data]: [string, any]) => (
                    <div key={section} className="flex items-center justify-between p-2 rounded-lg border border-border">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(data.completed ? "completed" : "pending")}
                        <span className="text-sm capitalize">{section.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {data.lastUpdated ? new Date(data.lastUpdated).toLocaleDateString() : "Pending"}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="beo-reo" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{event.type} Document Status</span>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate('/echoscope-beo');
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Full {event.type}
                  </Button>
                </CardTitle>
                <CardDescription>
                  {event.type === "BEO" 
                    ? "Banquet Event Order - Pre-event planning document"
                    : "Retail Event Order - Post-event reconciliation document"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {Object.entries(beoReoData.sections).map(([section, data]: [string, any]) => (
                      <div key={section} className="flex items-start justify-between p-4 rounded-lg border border-border hover:bg-muted/50">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            {getStatusIcon(data.completed ? "completed" : "pending")}
                            <h4 className="font-medium capitalize">{section.replace(/([A-Z])/g, ' $1').trim()}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {data.lastUpdated 
                              ? `Last updated: ${new Date(data.lastUpdated).toLocaleString()}`
                              : "Not started yet"}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          {data.completed && (
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vendors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Vendor Management</CardTitle>
                <CardDescription>Vendors assigned to this event</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sampleVendors.map((vendor, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          {vendor.type === "Catering" && <ChefHat className="h-4 w-4 text-primary" />}
                          {vendor.type === "Audio/Visual" && <Music className="h-4 w-4 text-primary" />}
                          {vendor.type === "Decorations" && <Flower className="h-4 w-4 text-primary" />}
                          {vendor.type === "Photography" && <Camera className="h-4 w-4 text-primary" />}
                        </div>
                        <div>
                          <h4 className="font-medium">{vendor.name}</h4>
                          <p className="text-sm text-muted-foreground">{vendor.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(vendor.status)}>
                          {vendor.status}
                        </Badge>
                        <Button size="sm" variant="outline">
                          <Mail className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Event Timeline</CardTitle>
                <CardDescription>Detailed schedule for event day</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {sampleTimeline.map((item, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 rounded-lg border border-border">
                        <div className="w-16 text-sm font-medium text-primary">{item.time}</div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            {getStatusIcon(item.status)}
                            <h4 className="font-medium">{item.task}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">{item.responsible}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Event Documents</CardTitle>
                <CardDescription>All related documents and files</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {beoReoData.documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">{doc.name}</h4>
                          <Badge className={getStatusColor(doc.status)} variant="outline">
                            {doc.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {doc.url && (
                          <>
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
