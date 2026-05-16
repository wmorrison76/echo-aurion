import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  XCircle,
  Download,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Clock,
  Users,
  ChefHat,
  Utensils,
  Building,
  MapPin,
  Calendar,
  Camera,
  RefreshCw,
  Settings,
  Eye,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Menu, MenuItem, MenuSection, MenuUpload, Outlet, EventSpace } from "@shared/menu-types";

interface MenuParserProps {
  onMenuCreated?: (menu: Menu) => void;
  selectedOutlet?: string;
  selectedEventSpace?: string;
}

const sampleOutlets: Outlet[] = [
  {
    id: "main-kitchen",
    name: "Main Kitchen",
    type: "banquet",
    location: "Main Building - Level 1",
    contactInfo: {
      manager: "Chef Maria Rodriguez",
      phone: "+1 (555) 123-4567",
      email: "maria@hotel.com"
    },
    capabilities: {
      maxCapacity: 500,
      simultaneousEvents: 3,
      cuisineTypes: ["American", "International", "Mediterranean"],
      serviceStyles: ["buffet", "plated", "family_style", "stations"],
      equipment: ["Commercial Ovens", "Grill Stations", "Prep Areas", "Refrigeration"]
    },
    operatingHours: {
      "Monday": { open: "06:00", close: "23:00" },
      "Tuesday": { open: "06:00", close: "23:00" },
      "Wednesday": { open: "06:00", close: "23:00" },
      "Thursday": { open: "06:00", close: "23:00" },
      "Friday": { open: "06:00", close: "24:00" },
      "Saturday": { open: "06:00", close: "24:00" },
      "Sunday": { open: "07:00", close: "22:00" }
    },
    menus: [],
    pricing: {
      laborChargePerHour: 45,
      serviceChargePercentage: 22,
      equipmentRental: {
        "Chafing Dish": 25,
        "Coffee Station": 50,
        "Beverage Station": 35
      }
    }
  },
  {
    id: "pastry-kitchen",
    name: "Pastry & Dessert Kitchen",
    type: "catering",
    location: "Main Building - Level 1",
    contactInfo: {
      manager: "Chef Sophie Laurent",
      phone: "+1 (555) 234-5678",
      email: "sophie@hotel.com"
    },
    capabilities: {
      maxCapacity: 200,
      simultaneousEvents: 2,
      cuisineTypes: ["Desserts", "Pastries", "Breakfast Items"],
      serviceStyles: ["plated", "buffet", "stations"],
      equipment: ["Convection Ovens", "Pastry Equipment", "Chocolate Tempering"]
    },
    operatingHours: {
      "Monday": { open: "05:00", close: "20:00" },
      "Tuesday": { open: "05:00", close: "20:00" },
      "Wednesday": { open: "05:00", close: "20:00" },
      "Thursday": { open: "05:00", close: "20:00" },
      "Friday": { open: "05:00", close: "21:00" },
      "Saturday": { open: "05:00", close: "21:00" },
      "Sunday": { open: "06:00", close: "19:00" }
    },
    menus: [],
    pricing: {
      laborChargePerHour: 40,
      serviceChargePercentage: 20,
      equipmentRental: {
        "Dessert Station": 40,
        "Coffee Service": 30
      }
    }
  }
];

const sampleEventSpaces: EventSpace[] = [
  {
    id: "grand-ballroom-a",
    name: "Grand Ballroom A",
    type: "ballroom",
    location: "Main Building - Level 2",
    capacity: {
      seated: 300,
      standing: 400,
      classroom: 200,
      theater: 350,
      cocktail: 450
    },
    dimensions: {
      length: 60,
      width: 40,
      height: 14,
      squareFeet: 2400
    },
    features: ["Built-in AV", "Stage", "Dance Floor", "Climate Control"],
    amenities: ["Valet Parking", "Coat Check", "Private Entrance"],
    pricing: {
      baseRentalFee: 5000,
      setupFee: 500,
      cleanupFee: 300,
      securityDeposit: 1000,
      cancellationPolicy: "48 hours notice required"
    },
    availability: {
      bookingWindow: 365,
      minimumRentalHours: 4,
      setupTime: 2,
      breakdownTime: 1
    },
    compatibleOutlets: ["main-kitchen", "pastry-kitchen"]
  },
  {
    id: "rose-garden-pavilion",
    name: "Rose Garden Pavilion",
    type: "outdoor",
    location: "Garden Level",
    capacity: {
      seated: 120,
      standing: 180,
      classroom: 80,
      theater: 150,
      cocktail: 200
    },
    dimensions: {
      length: 40,
      width: 30,
      height: 12,
      squareFeet: 1200
    },
    features: ["Garden Views", "Natural Lighting", "Retractable Roof"],
    amenities: ["Garden Access", "Photography Areas", "Weather Backup"],
    restrictions: ["No smoking", "Weather dependent"],
    pricing: {
      baseRentalFee: 3500,
      setupFee: 300,
      cleanupFee: 200,
      securityDeposit: 750,
      cancellationPolicy: "72 hours notice required"
    },
    availability: {
      bookingWindow: 180,
      minimumRentalHours: 3,
      setupTime: 1.5,
      breakdownTime: 1
    },
    compatibleOutlets: ["main-kitchen", "pastry-kitchen"]
  }
];

export default function MenuParser({ onMenuCreated, selectedOutlet, selectedEventSpace }: MenuParserProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
  const [uploading, setUploading] = useState(false);
  const [currentUpload, setCurrentUpload] = useState<MenuUpload | null>(null);
  const [parsedMenu, setParsedMenu] = useState<Partial<Menu> | null>(null);
  const [outlets] = useState<Outlet[]>(sampleOutlets);
  const [eventSpaces] = useState<EventSpace[]>(sampleEventSpaces);
  const [selectedMenuOutlet, setSelectedMenuOutlet] = useState(selectedOutlet || "");
  const [selectedMenuEventSpace, setSelectedMenuEventSpace] = useState(selectedEventSpace || "");

  const handleFileUpload = useCallback(async (file: File) => {
    setUploading(true);
    
    const upload: MenuUpload = {
      id: `upload-${Date.now()}`,
      originalFilename: file.name,
      contentType: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      uploadedBy: "William Morrison",
      status: "uploading",
      processingStage: "ocr",
      progress: 0
    };

    setCurrentUpload(upload);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setCurrentUpload(prev => {
        if (!prev) return null;
        
        let newProgress = prev.progress + Math.random() * 15;
        let newStage = prev.processingStage;
        let newStatus = prev.status;

        if (newProgress >= 25 && prev.processingStage === "ocr") {
          newStage = "parsing";
        } else if (newProgress >= 60 && prev.processingStage === "parsing") {
          newStage = "validation";
        } else if (newProgress >= 90 && prev.processingStage === "validation") {
          newStage = "complete";
          newStatus = "completed";
          newProgress = 100;
        }

        if (newProgress >= 100) {
          clearInterval(progressInterval);
          setUploading(false);
          
          // Simulate parsed menu result
          const mockParsedMenu: Partial<Menu> = {
            name: file.name.replace(/\.[^/.]+$/, ""),
            type: "banquet",
            outlet: selectedMenuOutlet,
            effectiveDate: new Date().toISOString().split('T')[0],
            sections: [
              {
                id: "appetizers",
                name: "Appetizers",
                displayOrder: 1,
                items: [
                  {
                    id: "item-1",
                    name: "Shrimp Cocktail",
                    description: "Fresh jumbo shrimp with cocktail sauce",
                    price: 18,
                    category: "Appetizers",
                    allergens: ["shellfish"],
                    dietaryInfo: ["gluten-free"]
                  },
                  {
                    id: "item-2",
                    name: "Bruschetta Trio",
                    description: "Three varieties of artisanal bruschetta",
                    price: 14,
                    category: "Appetizers",
                    dietaryInfo: ["vegetarian"]
                  }
                ]
              },
              {
                id: "entrees",
                name: "Main Courses",
                displayOrder: 2,
                items: [
                  {
                    id: "item-3",
                    name: "Grilled Salmon",
                    description: "Atlantic salmon with herb butter and seasonal vegetables",
                    price: 32,
                    category: "Main Courses",
                    allergens: ["fish"],
                    dietaryInfo: ["gluten-free"]
                  },
                  {
                    id: "item-4",
                    name: "Beef Tenderloin",
                    description: "8oz prime beef with red wine reduction",
                    price: 42,
                    category: "Main Courses",
                    dietaryInfo: ["gluten-free"]
                  }
                ]
              }
            ]
          };

          setParsedMenu(mockParsedMenu);
          setActiveTab("review");
        }

        return {
          ...prev,
          progress: Math.min(newProgress, 100),
          processingStage: newStage,
          status: newStatus
        };
      });
    }, 200);

    return () => clearInterval(progressInterval);
  }, [selectedMenuOutlet]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "uploading":
      case "processing":
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStageDescription = (stage?: string) => {
    switch (stage) {
      case "ocr":
        return "Reading text from document...";
      case "parsing":
        return "Analyzing menu structure...";
      case "validation":
        return "Validating menu items...";
      case "complete":
        return "Processing complete!";
      default:
        return "Preparing upload...";
    }
  };

  const handleSaveMenu = () => {
    if (parsedMenu && onMenuCreated) {
      const completeMenu: Menu = {
        id: `menu-${Date.now()}`,
        name: parsedMenu.name || "Untitled Menu",
        type: parsedMenu.type || "banquet",
        outlet: selectedMenuOutlet,
        effectiveDate: parsedMenu.effectiveDate || new Date().toISOString().split('T')[0],
        sections: parsedMenu.sections || []
      };
      
      onMenuCreated(completeMenu);
      setIsDialogOpen(false);
      setParsedMenu(null);
      setCurrentUpload(null);
      setActiveTab("upload");
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button className="apple-button">
          <Upload className="h-4 w-4 mr-2" />
          Parse Menu
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Menu Parser & Manager</DialogTitle>
          <DialogDescription>
            Upload and parse catering/banquet menus, manage outlets and event spaces
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">Upload Menu</TabsTrigger>
            <TabsTrigger value="outlets">Outlets</TabsTrigger>
            <TabsTrigger value="spaces">Event Spaces</TabsTrigger>
            <TabsTrigger value="review" disabled={!parsedMenu}>Review & Save</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium">Menu Details</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="outlet-select">Select Outlet</Label>
                    <Select value={selectedMenuOutlet || ""} onValueChange={setSelectedMenuOutlet}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose outlet..." />
                      </SelectTrigger>
                      <SelectContent>
                        {outlets?.filter(outlet => outlet?.id && outlet?.name && outlet?.type).map(outlet => (
                          <SelectItem key={outlet.id} value={outlet.id}>
                            <div className="flex items-center">
                              <Building className="h-4 w-4 mr-2" />
                              {outlet.name} - {outlet.type}
                            </div>
                          </SelectItem>
                        )) || []}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="space-select">Event Space (Optional)</Label>
                    <Select value={selectedMenuEventSpace || ""} onValueChange={setSelectedMenuEventSpace}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose event space..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No specific space</SelectItem>
                        {eventSpaces?.filter(space => space?.id && space?.name && space?.type).map(space => (
                          <SelectItem key={space.id} value={space.id}>
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-2" />
                              {space.name} - {space.type}
                            </div>
                          </SelectItem>
                        )) || []}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Upload Menu Document</h4>
                <div
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('menu-upload')?.click()}
                >
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    PDF, JPG, PNG up to 10MB
                  </p>
                  <input
                    id="menu-upload"
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                </div>
              </div>
            </div>

            {currentUpload && (
              <Card className="glass-panel">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(currentUpload.status)}
                      <div>
                        <p className="font-medium">{currentUpload.originalFilename}</p>
                        <p className="text-sm text-muted-foreground">
                          {getStageDescription(currentUpload.processingStage)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={currentUpload.status === "completed" ? "default" : "secondary"}>
                      {currentUpload.status}
                    </Badge>
                  </div>
                  <Progress value={currentUpload.progress} className="w-full" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {currentUpload.progress.toFixed(0)}% complete
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="outlets" className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Manage Outlets</h4>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Outlet
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {outlets.map(outlet => (
                <Card key={outlet.id} className="glass-panel">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{outlet.name}</CardTitle>
                        <CardDescription>{outlet.location}</CardDescription>
                        <Badge variant="outline" className="mt-2 capitalize">
                          {outlet.type}
                        </Badge>
                      </div>
                      <div className="flex space-x-1">
                        <Button size="sm" variant="ghost">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center">
                        <Users className="h-3 w-3 mr-2 text-muted-foreground" />
                        Max: {outlet.capabilities.maxCapacity}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-2 text-muted-foreground" />
                        {outlet.capabilities.simultaneousEvents} events
                      </div>
                      <div className="flex items-center">
                        <ChefHat className="h-3 w-3 mr-2 text-muted-foreground" />
                        {outlet.capabilities.cuisineTypes.length} cuisines
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="h-3 w-3 mr-2 text-muted-foreground" />
                        ${outlet.pricing.laborChargePerHour}/hr
                      </div>
                    </div>
                    
                    <div className="text-sm">
                      <p className="text-muted-foreground mb-1">Manager:</p>
                      <p>{outlet.contactInfo.manager}</p>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {outlet.capabilities.serviceStyles.slice(0, 3).map((style, index) => (
                        <Badge key={index} variant="outline" className="text-xs capitalize">
                          {style.replace('_', ' ')}
                        </Badge>
                      ))}
                      {outlet.capabilities.serviceStyles.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{outlet.capabilities.serviceStyles.length - 3}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="spaces" className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Manage Event Spaces</h4>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Space
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eventSpaces.map(space => (
                <Card key={space.id} className="glass-panel">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{space.name}</CardTitle>
                        <CardDescription>{space.location}</CardDescription>
                        <Badge variant="outline" className="mt-2 capitalize">
                          {space.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex space-x-1">
                        <Button size="sm" variant="ghost">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Camera className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center">
                        <Users className="h-3 w-3 mr-2 text-muted-foreground" />
                        {space.capacity.seated} seated
                      </div>
                      <div className="flex items-center">
                        <Utensils className="h-3 w-3 mr-2 text-muted-foreground" />
                        {space.capacity.cocktail} cocktail
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-3 w-3 mr-2 text-muted-foreground" />
                        {space.dimensions.squareFeet} sq ft
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="h-3 w-3 mr-2 text-muted-foreground" />
                        ${space.pricing.baseRentalFee}
                      </div>
                    </div>
                    
                    <div className="text-sm">
                      <p className="text-muted-foreground mb-1">Setup: {space.availability.setupTime}h | Breakdown: {space.availability.breakdownTime}h</p>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {space.features.slice(0, 3).map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {space.features.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{space.features.length - 3}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="review" className="space-y-6 mt-6">
            {parsedMenu && parsedMenu.sections && (
              <>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Menu Successfully Parsed!</AlertTitle>
                  <AlertDescription>
                    Review the extracted menu items below and make any necessary adjustments before saving.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Menu Information</h4>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="menu-name">Menu Name</Label>
                        <Input 
                          id="menu-name" 
                          value={parsedMenu.name || ""} 
                          onChange={(e) => setParsedMenu(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="menu-type">Menu Type</Label>
                        <Select value={parsedMenu.type || ""} onValueChange={(value) => setParsedMenu(prev => ({ ...prev, type: value as any }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="banquet">Banquet</SelectItem>
                            <SelectItem value="catering">Catering</SelectItem>
                            <SelectItem value="restaurant">Restaurant</SelectItem>
                            <SelectItem value="cocktail">Cocktail</SelectItem>
                            <SelectItem value="buffet">Buffet</SelectItem>
                            <SelectItem value="plated">Plated</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="effective-date">Effective Date</Label>
                        <Input 
                          id="effective-date" 
                          type="date"
                          value={parsedMenu.effectiveDate || ""} 
                          onChange={(e) => setParsedMenu(prev => ({ ...prev, effectiveDate: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Parsing Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sections Found:</span>
                        <span>{parsedMenu.sections?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Items:</span>
                        <span>{parsedMenu.sections?.reduce((total, section) => total + section.items.length, 0) || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Outlet:</span>
                        <span>{outlets.find(o => o.id === selectedMenuOutlet)?.name || "None"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Event Space:</span>
                        <span>{eventSpaces.find(s => s.id === selectedMenuEventSpace)?.name || "None selected"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Menu Sections & Items</h4>
                  {parsedMenu.sections?.filter(section => section?.id && section?.name).map((section, sectionIndex) => (
                    <Card key={section.id} className="glass-panel">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{section.name}</CardTitle>
                        {section.description && (
                          <CardDescription>{section.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {section.items?.filter(item => item?.id && item?.name).map((item, itemIndex) => (
                            <div key={item.id} className="flex items-start justify-between p-3 bg-muted/20 rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h5 className="font-medium">{item.name}</h5>
                                  <Badge variant="outline" className="text-xs">
                                    ${item.price || 0}
                                  </Badge>
                                </div>
                                {item.description && (
                                  <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                                )}
                                <div className="flex flex-wrap gap-1">
                                  {item.dietaryInfo?.map((info, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {info.replace('_', ' ')}
                                    </Badge>
                                  ))}
                                  {item.allergens?.map((allergen, index) => (
                                    <Badge key={index} variant="destructive" className="text-xs">
                                      {allergen}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <Button size="sm" variant="ghost">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            Cancel
          </Button>
          {parsedMenu && activeTab === "review" && (
            <Button onClick={handleSaveMenu}>
              <Save className="h-4 w-4 mr-2" />
              Save Menu
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
