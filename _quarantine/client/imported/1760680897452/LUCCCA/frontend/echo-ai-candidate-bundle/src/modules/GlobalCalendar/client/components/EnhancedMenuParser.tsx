import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface EnhancedMenuParserProps {
  onMenuCreated?: (menu: Menu) => void;
  selectedOutlet?: string;
  selectedEventSpace?: string;
  persistedMenus?: Menu[];
  onMenuSelected?: (menu: Menu, selectedItems: string[]) => void;
}

interface ParsedMenuWithSelection extends Menu {
  selectedItems: string[];
  selectionTimestamp: Date;
}

export default function EnhancedMenuParser({ 
  onMenuCreated, 
  selectedOutlet, 
  selectedEventSpace,
  persistedMenus = [],
  onMenuSelected
}: EnhancedMenuParserProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUpload, setCurrentUpload] = useState<MenuUpload | null>(null);
  const [parsedMenu, setParsedMenu] = useState<Partial<Menu> | null>(null);
  const [selectedMenuItems, setSelectedMenuItems] = useState<string[]>([]);
  const [storedMenus, setStoredMenus] = useState<ParsedMenuWithSelection[]>([]);
  const [selectedMenuOutlet, setSelectedMenuOutlet] = useState(selectedOutlet || "");
  const [selectedMenuEventSpace, setSelectedMenuEventSpace] = useState(selectedEventSpace || "");
  
  // Mock outlets and event spaces
  const outlets: Outlet[] = [
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
    }
  ];

  const eventSpaces: EventSpace[] = [
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
      compatibleOutlets: ["main-kitchen"]
    }
  ];

  // Load persisted menus on component mount
  useEffect(() => {
    const saved = localStorage.getItem('echoCRM-parsed-menus');
    if (saved) {
      try {
        const parsedMenus = JSON.parse(saved);
        setStoredMenus(parsedMenus);
      } catch (error) {
        console.error('Error loading persisted menus:', error);
      }
    }
  }, []);

  // Save menus to localStorage whenever storedMenus changes
  useEffect(() => {
    localStorage.setItem('echoCRM-parsed-menus', JSON.stringify(storedMenus));
  }, [storedMenus]);

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      setUploading(true);
      setError(null);
      
      // Validate file
      if (!file) {
        throw new Error("No file selected");
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error("File size exceeds 10MB limit");
      }
      
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error("Invalid file type. Please upload PDF, JPG, or PNG files only.");
      }
      
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

      // Simulate upload progress with error handling
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
            
            // Create a comprehensive parsed menu
            const mockParsedMenu: Menu = {
              id: `menu-${Date.now()}`,
              name: file.name.replace(/\.[^/.]+$/, ""),
              type: "banquet",
              outlet: selectedMenuOutlet,
              effectiveDate: new Date().toISOString().split('T')[0],
              sections: [
                {
                  id: "appetizers",
                  name: "Appetizers",
                  description: "Start your event with elegant appetizers",
                  displayOrder: 1,
                  items: [
                    {
                      id: "app-1",
                      name: "Shrimp Cocktail",
                      description: "Fresh jumbo shrimp with cocktail sauce",
                      price: 18,
                      category: "Appetizers",
                      allergens: ["shellfish"],
                      dietaryInfo: ["gluten-free"],
                      preparationTime: 30,
                      servingSize: "6 pieces",
                      available: true
                    },
                    {
                      id: "app-2",
                      name: "Bruschetta Trio",
                      description: "Three varieties of artisanal bruschetta",
                      price: 14,
                      category: "Appetizers",
                      dietaryInfo: ["vegetarian"],
                      preparationTime: 20,
                      servingSize: "3 pieces",
                      available: true
                    },
                    {
                      id: "app-3",
                      name: "Beef Sliders",
                      description: "Mini wagyu beef burgers with truffle aioli",
                      price: 22,
                      category: "Appetizers",
                      allergens: ["gluten", "dairy"],
                      preparationTime: 25,
                      servingSize: "2 sliders",
                      available: true
                    }
                  ]
                },
                {
                  id: "entrees",
                  name: "Main Courses",
                  description: "Exquisite main courses for your special event",
                  displayOrder: 2,
                  items: [
                    {
                      id: "ent-1",
                      name: "Grilled Salmon",
                      description: "Atlantic salmon with herb butter and seasonal vegetables",
                      price: 32,
                      category: "Main Courses",
                      allergens: ["fish"],
                      dietaryInfo: ["gluten-free"],
                      preparationTime: 45,
                      servingSize: "8oz fillet",
                      available: true
                    },
                    {
                      id: "ent-2",
                      name: "Filet Mignon",
                      description: "8oz prime beef tenderloin with red wine reduction",
                      price: 48,
                      category: "Main Courses",
                      allergens: ["dairy"],
                      preparationTime: 35,
                      servingSize: "8oz",
                      available: true
                    },
                    {
                      id: "ent-3",
                      name: "Vegetarian Wellington",
                      description: "Roasted vegetables wrapped in flaky pastry",
                      price: 28,
                      category: "Main Courses",
                      allergens: ["gluten"],
                      dietaryInfo: ["vegetarian"],
                      preparationTime: 50,
                      servingSize: "Individual portion",
                      available: true
                    }
                  ]
                },
                {
                  id: "desserts",
                  name: "Desserts",
                  description: "Sweet endings to your memorable event",
                  displayOrder: 3,
                  items: [
                    {
                      id: "des-1",
                      name: "Chocolate Lava Cake",
                      description: "Warm chocolate cake with molten center and vanilla ice cream",
                      price: 12,
                      category: "Desserts",
                      allergens: ["gluten", "dairy", "eggs"],
                      preparationTime: 25,
                      servingSize: "Individual",
                      available: true
                    },
                    {
                      id: "des-2",
                      name: "Tiramisu",
                      description: "Classic Italian dessert with coffee and mascarpone",
                      price: 10,
                      category: "Desserts",
                      allergens: ["gluten", "dairy", "eggs"],
                      preparationTime: 15,
                      servingSize: "Individual",
                      available: true
                    }
                  ]
                }
              ],
              totalItems: 7,
              averagePrice: 26.29,
              currency: "USD",
              lastModified: new Date().toISOString()
            };
            
            setParsedMenu(mockParsedMenu);
            setActiveTab("select");
          }

          return {
            ...prev,
            progress: Math.min(newProgress, 100),
            processingStage: newStage,
            status: newStatus
          };
        });
      }, 500);

    } catch (error) {
      setError(error instanceof Error ? error.message : "Upload failed");
      setUploading(false);
      setCurrentUpload(null);
    }
  }, [selectedMenuOutlet]);

  const handleItemSelection = (itemId: string, selected: boolean) => {
    setSelectedMenuItems(prev => 
      selected 
        ? [...prev, itemId]
        : prev.filter(id => id !== itemId)
    );
  };

  const handleSaveMenu = () => {
    if (!parsedMenu) return;
    
    try {
      const menuWithSelection: ParsedMenuWithSelection = {
        ...parsedMenu as Menu,
        selectedItems: selectedMenuItems,
        selectionTimestamp: new Date()
      };
      
      setStoredMenus(prev => [...prev, menuWithSelection]);
      
      if (onMenuCreated) {
        onMenuCreated(parsedMenu as Menu);
      }
      
      // Reset for next upload
      setParsedMenu(null);
      setSelectedMenuItems([]);
      setCurrentUpload(null);
      setActiveTab("upload");
      setIsDialogOpen(false);
      
    } catch (error) {
      setError("Failed to save menu");
    }
  };

  const handleSelectStoredMenu = (menu: ParsedMenuWithSelection) => {
    if (onMenuSelected) {
      onMenuSelected(menu, menu.selectedItems);
    }
    setIsDialogOpen(false);
  };

  const handleDeleteStoredMenu = (menuId: string) => {
    setStoredMenus(prev => prev.filter(menu => menu.id !== menuId));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "uploading": return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case "error": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStageDescription = (stage: string) => {
    switch (stage) {
      case "ocr": return "Extracting text from document...";
      case "parsing": return "Analyzing menu structure...";
      case "validation": return "Validating extracted data...";
      case "complete": return "Menu parsed successfully!";
      default: return "Processing...";
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="apple-button">
          <ChefHat className="h-4 w-4 mr-2" />
          Parse Menu
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center">
            <ChefHat className="h-6 w-6 mr-2" />
            Enhanced Menu Parser & Manager
          </DialogTitle>
          <DialogDescription>
            Upload new menus or select from previously parsed menus for BEO/REO creation
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">Upload New</TabsTrigger>
            <TabsTrigger value="stored">Stored Menus ({storedMenus.length})</TabsTrigger>
            <TabsTrigger value="select" disabled={!parsedMenu}>Select Items</TabsTrigger>
            <TabsTrigger value="review" disabled={!parsedMenu || selectedMenuItems.length === 0}>Review</TabsTrigger>
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

          <TabsContent value="stored" className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Previously Parsed Menus</h4>
              <Badge variant="outline">{storedMenus.length} saved</Badge>
            </div>
            
            {storedMenus.length === 0 ? (
              <div className="text-center py-8">
                <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No menus saved yet</p>
                <p className="text-sm text-muted-foreground">Upload and parse a menu to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {storedMenus.map(menu => (
                  <Card key={menu.id} className="glass-panel cursor-pointer hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{menu.name}</CardTitle>
                          <CardDescription className="capitalize">
                            {menu.type} • {menu.totalItems} items
                          </CardDescription>
                        </div>
                        <div className="flex space-x-1">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleSelectStoredMenu(menu)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleDeleteStoredMenu(menu.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center">
                          <DollarSign className="h-3 w-3 mr-2 text-muted-foreground" />
                          Avg: ${menu.averagePrice?.toFixed(2)}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-2 text-muted-foreground" />
                          {new Date(menu.selectionTimestamp).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="text-sm">
                        <p className="text-muted-foreground mb-1">Selected items: {menu.selectedItems.length}</p>
                        <div className="flex flex-wrap gap-1">
                          {menu.sections.slice(0, 3).map(section => (
                            <Badge key={section.id} variant="outline" className="text-xs">
                              {section.name}
                            </Badge>
                          ))}
                          {menu.sections.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{menu.sections.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <Button 
                        className="w-full mt-3"
                        size="sm"
                        onClick={() => handleSelectStoredMenu(menu)}
                      >
                        Use This Menu
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="select" className="space-y-6 mt-6">
            {parsedMenu && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Menu Parsed Successfully</span>
                  <Badge>{parsedMenu.totalItems} items found</Badge>
                </div>

                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {parsedMenu.sections?.filter(section => section?.id && section?.name).map(section => (
                      <Card key={section.id}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">{section.name}</CardTitle>
                          {section.description && (
                            <CardDescription>{section.description}</CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {section.items?.filter(item => item?.id && item?.name).map(item => (
                              <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg">
                                <Checkbox
                                  checked={selectedMenuItems.includes(item.id)}
                                  onCheckedChange={(checked) => handleItemSelection(item.id, checked as boolean)}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium">{item.name}</h4>
                                    <Badge variant="outline">${item.price || 0}</Badge>
                                  </div>
                                  {item.description && (
                                    <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                                  )}
                                  <div className="flex flex-wrap gap-1">
                                    {item.dietaryInfo?.map(diet => (
                                      <Badge key={diet} variant="outline" className="text-xs">
                                        {diet.replace('_', ' ')}
                                      </Badge>
                                    ))}
                                    {item.allergens?.map(allergen => (
                                      <Badge key={allergen} variant="destructive" className="text-xs">
                                        {allergen}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>

                <div className="text-sm text-muted-foreground">
                  Selected items: {selectedMenuItems.length} | 
                  Estimated total: ${parsedMenu.sections
                    ?.flatMap(section => section.items)
                    .filter(item => selectedMenuItems.includes(item.id))
                    .reduce((sum, item) => sum + (item.price || 0), 0)
                    .toFixed(2)
                  } per person
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="review" className="space-y-6 mt-6">
            {parsedMenu && selectedMenuItems.length > 0 && (
              <>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Ready to Create BEO/REO!</AlertTitle>
                  <AlertDescription>
                    You have selected {selectedMenuItems.length} items from {parsedMenu.name}. 
                    Save this menu to use it for BEO/REO generation.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Menu Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Menu Name:</span>
                        <span>{parsedMenu.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="capitalize">{parsedMenu.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Selected Items:</span>
                        <span>{selectedMenuItems.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Selected Items</h4>
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {parsedMenu.sections
                          ?.flatMap(section => section.items)
                          .filter(item => selectedMenuItems.includes(item.id))
                          .map(item => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span>{item.name}</span>
                              <span>${item.price || 0}</span>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            Cancel
          </Button>
          {activeTab === "review" && (
            <Button onClick={handleSaveMenu} disabled={selectedMenuItems.length === 0}>
              <Save className="h-4 w-4 mr-2" />
              Save Menu & Close
            </Button>
          )}
          {activeTab === "select" && selectedMenuItems.length > 0 && (
            <Button onClick={() => setActiveTab("review")}>
              Continue to Review
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
