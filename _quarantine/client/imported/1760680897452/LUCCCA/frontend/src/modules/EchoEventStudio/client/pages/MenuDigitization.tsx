import { useState, useCallback, useRef } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';
import {
  FaUpload,
  FaFileAlt,
  FaRobot,
  FaCheckCircle,
  FaExclamationTriangle,
  FaEye,
  FaEdit,
  FaTrash,
  FaDollarSign,
  FaUtensils,
  FaWineGlass,
  FaCocktail,
  FaClipboardList,
  FaBrain,
  FaChartLine,
  FaUsers,
  FaClock
} from 'react-icons/fa';
import { 
  MdCloudUpload,
  MdAnalytics,
  MdHome,
  MdArrowBack,
  MdSettings 
} from 'react-icons/md';
import { Link } from 'react-router-dom';

import type {
  DigitalizedMenu,
  MenuItemBase,
  MenuUploadResult,
  BEOFromMenu,
  RegionalPricingAnalysis,
  MenuCategory
} from '@/shared/menu-digitization-types';

// Mock data for demonstration
const mockDigitalizedMenus: DigitalizedMenu[] = [
  {
    id: 'menu-1',
    name: 'Spring Corporate Catering Menu 2024',
    description: 'Fresh seasonal offerings for corporate events',
    venue: 'Main Kitchen',
    menuType: 'catering',
    effectiveDate: new Date('2024-03-01'),
    expirationDate: new Date('2024-06-30'),
    items: [],
    servingStyles: [],
    pricing: {
      baseMarkup: 0.35,
      tierPricing: [],
      serviceFees: [],
      gratuityPolicy: {
        isAutomatic: true,
        percentage: 18,
        applicableServices: ['service staff'],
        description: 'Automatic 18% gratuity for parties of 8 or more'
      },
      taxRate: 0.0875,
      discountPolicies: []
    },
    isActive: true,
    createdBy: 'chef@venue.com',
    createdDate: new Date('2024-02-15'),
    lastModified: new Date('2024-02-20'),
    version: 1
  },
  {
    id: 'menu-2',
    name: 'Wedding Reception Menu',
    description: 'Elegant options for wedding celebrations',
    venue: 'Banquet Hall',
    menuType: 'banquet',
    effectiveDate: new Date('2024-01-01'),
    items: [],
    servingStyles: [],
    pricing: {
      baseMarkup: 0.45,
      tierPricing: [],
      serviceFees: [],
      gratuityPolicy: {
        isAutomatic: false,
        applicableServices: [],
        description: 'Gratuity at client discretion'
      },
      taxRate: 0.0875,
      discountPolicies: []
    },
    isActive: true,
    createdBy: 'events@venue.com',
    createdDate: new Date('2024-01-15'),
    lastModified: new Date('2024-02-10'),
    version: 2
  }
];

const mockRegionalAnalysis: RegionalPricingAnalysis[] = [
  {
    itemName: 'Grilled Salmon with Lemon Herb Butter',
    ourPrice: 34.95,
    competitorPrices: [
      { venueName: 'Riverside Banquet Hall', location: '2.3 miles', price: 38.00, distance: 2.3, similarity: 92, lastUpdated: new Date() },
      { venueName: 'Grand Plaza Hotel', location: '4.1 miles', price: 42.50, distance: 4.1, similarity: 88, lastUpdated: new Date() },
      { venueName: 'The Estate Club', location: '3.7 miles', price: 45.00, distance: 3.7, similarity: 85, lastUpdated: new Date() }
    ],
    averageMarketPrice: 41.83,
    pricePosition: 'below-market',
    recommendedPriceRange: { min: 36.00, max: 42.00 },
    confidenceScore: 87,
    lastAnalyzed: new Date(),
    recommendations: [
      {
        type: 'increase',
        reasoning: 'Our price is 16% below market average for similar quality items',
        expectedImpact: 'Could increase revenue by 8-12% with minimal demand impact',
        riskLevel: 'low',
        implementationNotes: 'Consider gradual increase over 2-3 months'
      }
    ]
  }
];

export default function MenuDigitization() {
  const [activeTab, setActiveTab] = useState('upload');
  const [digitalizedMenus] = useState<DigitalizedMenu[]>(mockDigitalizedMenus);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<MenuUploadResult | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<DigitalizedMenu | null>(null);
  const [isCreateBEOOpen, setIsCreateBEOOpen] = useState(false);
  const [regionalAnalysis] = useState<RegionalPricingAnalysis[]>(mockRegionalAnalysis);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploading(true);
    setUploadProgress(0);

    // Simulate file processing
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          
          // Mock successful upload result
          setUploadResult({
            success: true,
            menuId: 'menu-' + Date.now(),
            itemsProcessed: 45,
            itemsSuccessful: 43,
            itemsFailed: 2,
            errors: [
              {
                line: 12,
                field: 'price',
                message: 'Invalid price format',
                severity: 'error',
                suggestion: 'Use format: $XX.XX'
              }
            ],
            warnings: [
              {
                line: 8,
                field: 'allergens',
                message: 'Allergen information missing',
                impact: 'May affect dietary restriction compliance',
                recommendation: 'Add comprehensive allergen information'
              }
            ],
            extractedData: {
              venueName: 'Uploaded Venue',
              menuName: file.name.replace(/\.[^/.]+$/, ''),
              menuType: 'catering',
              effectiveDate: new Date(),
              itemCategories: ['Appetizers', 'Entrees', 'Desserts', 'Beverages'],
              totalItems: 43,
              priceRange: { min: 8.50, max: 65.00 },
              detecteddietaryOptions: ['Vegetarian', 'Gluten-Free', 'Dairy-Free'],
              suggestedPackages: [
                {
                  name: 'Corporate Lunch Package',
                  items: ['Caesar Salad', 'Grilled Chicken', 'Seasonal Vegetables'],
                  estimatedPrice: 28.50,
                  targetGuestCount: 25,
                  reasoning: 'Popular lunch combination with good profit margin'
                }
              ]
            },
            processingTime: 3.2
          });
          return 100;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 200);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const getMenuTypeColor = (type: string) => {
    switch (type) {
      case 'catering': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
      case 'banquet': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800';
      case 'restaurant': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
      case 'cocktail': return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800';
      default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
    }
  };

  const getPricePositionColor = (position: string) => {
    switch (position) {
      case 'below-market': return 'text-red-600';
      case 'market-rate': return 'text-green-600';
      case 'above-market': return 'text-blue-600';
      case 'premium': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/" className="flex items-center space-x-2 hover:text-primary">
                    <MdHome className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium">Menu Digitization & BEO Builder</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          <Button 
            variant="outline" 
            size="sm" 
            asChild
            className="apple-button"
          >
            <Link to="/" className="flex items-center space-x-2">
              <MdArrowBack className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>
          </Button>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Menu Digitization & BEO Builder</h1>
            <p className="text-muted-foreground mt-2">
              Upload, digitize, and analyze menus with AI-powered pricing insights and BEO/REO generation
            </p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" className="apple-button">
              <MdAnalytics className="h-4 w-4 mr-2" />
              Regional Analysis
            </Button>
            <Button 
              className="apple-button"
              onClick={() => fileInputRef.current?.click()}
            >
              <FaUpload className="h-4 w-4 mr-2" />
              Upload Menu
            </Button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.csv,.xlsx"
          onChange={(e) => handleFileUpload(e.target.files)}
          className="hidden"
        />

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="upload" className="flex items-center">
              <MdCloudUpload className="h-4 w-4 mr-2" />
              Upload & Process
            </TabsTrigger>
            <TabsTrigger value="menus" className="flex items-center">
              <FaUtensils className="h-4 w-4 mr-2" />
              Digital Menus
            </TabsTrigger>
            <TabsTrigger value="beo-builder" className="flex items-center">
              <FaClipboardList className="h-4 w-4 mr-2" />
              BEO Builder
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center">
              <FaChartLine className="h-4 w-4 mr-2" />
              Pricing Analysis
            </TabsTrigger>
            <TabsTrigger value="ai-insights" className="flex items-center">
              <FaBrain className="h-4 w-4 mr-2" />
              AI Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6 mt-6">
            {/* Upload Area */}
            <Card className="glass-panel apple-button">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FaUpload className="h-5 w-5 mr-2" />
                  Menu Upload & Digitization
                </CardTitle>
                <CardDescription>
                  Upload menu files (PDF, Word, Images, Excel) for AI-powered digitization and analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isUploading && !uploadResult ? (
                  <div
                    className="border-2 border-dashed border-border/50 rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <MdCloudUpload className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">Upload Menu Files</h3>
                    <p className="text-muted-foreground mb-4">
                      Drag and drop files here, or click to browse
                    </p>
                    <div className="flex justify-center space-x-4 text-sm text-muted-foreground">
                      <span>PDF</span>
                      <span>•</span>
                      <span>Word</span>
                      <span>•</span>
                      <span>Images</span>
                      <span>•</span>
                      <span>Excel</span>
                    </div>
                  </div>
                ) : isUploading ? (
                  <div className="text-center py-12">
                    <FaRobot className="h-16 w-16 mx-auto mb-4 text-primary animate-pulse" />
                    <h3 className="text-lg font-medium mb-4">AI Processing Menu...</h3>
                    <Progress value={uploadProgress} className="w-full max-w-md mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">
                      Extracting menu items, prices, and analyzing content
                    </p>
                  </div>
                ) : uploadResult ? (
                  <div className="space-y-6">
                    {/* Upload Results */}
                    <Alert className={uploadResult.success ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-red-500 bg-red-50 dark:bg-red-900/20"}>
                      <div className="flex items-center">
                        {uploadResult.success ? (
                          <FaCheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        ) : (
                          <FaExclamationTriangle className="h-4 w-4 text-red-600 mr-2" />
                        )}
                        <AlertTitle>
                          {uploadResult.success ? 'Menu Successfully Processed!' : 'Processing Completed with Issues'}
                        </AlertTitle>
                      </div>
                      <AlertDescription className="mt-2">
                        Processed {uploadResult.itemsProcessed} items in {uploadResult.processingTime}s. 
                        {uploadResult.itemsSuccessful} successful, {uploadResult.itemsFailed} failed.
                      </AlertDescription>
                    </Alert>

                    {/* Processing Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card className="glass-panel apple-button">
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">{uploadResult.itemsSuccessful}</div>
                          <div className="text-sm text-muted-foreground">Items Processed</div>
                        </CardContent>
                      </Card>
                      <Card className="glass-panel apple-button">
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600">{uploadResult.extractedData.itemCategories.length}</div>
                          <div className="text-sm text-muted-foreground">Categories</div>
                        </CardContent>
                      </Card>
                      <Card className="glass-panel apple-button">
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-purple-600">{uploadResult.extractedData.detecteddietaryOptions.length}</div>
                          <div className="text-sm text-muted-foreground">Dietary Options</div>
                        </CardContent>
                      </Card>
                      <Card className="glass-panel apple-button">
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-orange-600">{uploadResult.extractedData.suggestedPackages.length}</div>
                          <div className="text-sm text-muted-foreground">Suggested Packages</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Extracted Data Summary */}
                    <Card className="glass-panel apple-button">
                      <CardHeader>
                        <CardTitle>Extracted Menu Data</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium">Menu Name</Label>
                            <p className="text-sm text-muted-foreground">{uploadResult.extractedData.menuName}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Menu Type</Label>
                            <Badge className={cn("ml-2", getMenuTypeColor(uploadResult.extractedData.menuType || 'catering'))}>
                              {uploadResult.extractedData.menuType}
                            </Badge>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Price Range</Label>
                            <p className="text-sm text-muted-foreground">
                              ${uploadResult.extractedData.priceRange.min} - ${uploadResult.extractedData.priceRange.max}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Categories</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {uploadResult.extractedData.itemCategories.map((category, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {category}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex justify-center space-x-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setUploadResult(null)}
                        className="apple-button"
                      >
                        Upload Another Menu
                      </Button>
                      <Button 
                        onClick={() => setActiveTab('menus')}
                        className="apple-button"
                      >
                        View Digital Menus
                      </Button>
                      <Button 
                        onClick={() => setActiveTab('beo-builder')}
                        className="apple-button"
                      >
                        Create BEO/REO
                      </Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="menus" className="space-y-6 mt-6">
            <Card className="glass-panel apple-button">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FaUtensils className="h-5 w-5 mr-2" />
                  Digital Menu Library
                </CardTitle>
                <CardDescription>
                  Manage and organize your digitized menus
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Menu Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Effective Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {digitalizedMenus.map((menu) => (
                      <TableRow key={menu.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{menu.name}</div>
                            <div className="text-xs text-muted-foreground">{menu.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs", getMenuTypeColor(menu.menuType))}>
                            {menu.menuType}
                          </Badge>
                        </TableCell>
                        <TableCell>{menu.venue}</TableCell>
                        <TableCell>{menu.items.length}</TableCell>
                        <TableCell>{menu.effectiveDate.toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className={menu.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                            {menu.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <FaEye className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <FaEdit className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setSelectedMenu(menu);
                                setIsCreateBEOOpen(true);
                              }}
                            >
                              <FaClipboardList className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="beo-builder" className="space-y-6 mt-6">
            <Card className="glass-panel apple-button">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FaClipboardList className="h-5 w-5 mr-2" />
                  BEO/REO Builder
                </CardTitle>
                <CardDescription>
                  Create detailed Banquet Event Orders and Resume Event Orders from your digital menus
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <FaClipboardList className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Ready to Build Your BEO/REO</h3>
                  <p className="text-muted-foreground mb-6">
                    Select a digital menu to start creating your Banquet Event Order or Resume Event Order
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
                    {digitalizedMenus.slice(0, 2).map((menu) => (
                      <Button
                        key={menu.id}
                        variant="outline"
                        className="apple-button p-4 h-auto"
                        onClick={() => {
                          setSelectedMenu(menu);
                          setIsCreateBEOOpen(true);
                        }}
                      >
                        <div className="text-center">
                          <FaUtensils className="h-6 w-6 mx-auto mb-2" />
                          <div className="font-medium">{menu.name}</div>
                          <div className="text-xs text-muted-foreground">{menu.venue}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-6 mt-6">
            <Card className="glass-panel apple-button">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FaChartLine className="h-5 w-5 mr-2" />
                  Regional Pricing Analysis
                </CardTitle>
                <CardDescription>
                  AI-powered competitive pricing analysis for menu items
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Menu Item</TableHead>
                      <TableHead>Our Price</TableHead>
                      <TableHead>Market Average</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Recommendation</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regionalAnalysis.map((analysis, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="font-medium">{analysis.itemName}</div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">${analysis.ourPrice}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">${analysis.averageMarketPrice}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs", getPricePositionColor(analysis.pricePosition))}>
                            {analysis.pricePosition.replace('-', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {analysis.recommendations[0]?.type === 'increase' && '↗ Increase'}
                            {analysis.recommendations[0]?.type === 'decrease' && '↘ Decrease'}
                            {analysis.recommendations[0]?.type === 'maintain' && '→ Maintain'}
                            <div className="text-xs text-muted-foreground">
                              ${analysis.recommendedPriceRange.min} - ${analysis.recommendedPriceRange.max}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Progress value={analysis.confidenceScore} className="w-16 h-2" />
                            <span className="text-xs">{analysis.confidenceScore}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <FaEye className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai-insights" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass-panel apple-button">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FaBrain className="h-5 w-5 mr-2" />
                    Menu Optimization Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <FaChartLine className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900 dark:text-blue-100">Revenue Opportunity</span>
                    </div>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Your pricing is 12% below market average. Consider gradual increases on premium items to boost revenue by an estimated $15,000 annually.
                    </p>
                  </div>
                  
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <FaUsers className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-900 dark:text-green-100">Popular Items</span>
                    </div>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Salmon and vegetarian options show high demand. Consider featuring these prominently in packages.
                    </p>
                  </div>
                  
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <FaClock className="h-4 w-4 text-orange-600" />
                      <span className="font-medium text-orange-900 dark:text-orange-100">Operational Efficiency</span>
                    </div>
                    <p className="text-sm text-orange-800 dark:text-orange-200">
                      Items with similar prep times can be grouped to optimize kitchen workflow during large events.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel apple-button">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FaUtensils className="h-5 w-5 mr-2" />
                    Chef Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="p-3 border border-border/50 rounded-lg">
                      <div className="font-medium text-sm mb-1">Seasonal Menu Updates</div>
                      <p className="text-sm text-muted-foreground">
                        Spring menu should emphasize fresh, local ingredients. Consider adding asparagus and spring pea dishes.
                      </p>
                    </div>
                    
                    <div className="p-3 border border-border/50 rounded-lg">
                      <div className="font-medium text-sm mb-1">Dietary Accommodation</div>
                      <p className="text-sm text-muted-foreground">
                        Increase gluten-free and vegan options to capture growing market segment (23% increase in requests).
                      </p>
                    </div>
                    
                    <div className="p-3 border border-border/50 rounded-lg">
                      <div className="font-medium text-sm mb-1">Presentation Enhancement</div>
                      <p className="text-sm text-muted-foreground">
                        Consider action stations for appetizers - 34% higher guest satisfaction and 18% better profit margins.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Create BEO Dialog */}
        <Dialog open={isCreateBEOOpen} onOpenChange={setIsCreateBEOOpen}>
          <DialogContent className="glass-panel max-w-4xl">
            <DialogHeader>
              <DialogTitle>Create BEO/REO from Menu</DialogTitle>
              <DialogDescription>
                Build a comprehensive Banquet Event Order or Resume Event Order using {selectedMenu?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="event-name">Event Name</Label>
                  <Input id="event-name" placeholder="Corporate Holiday Party" className="apple-input" />
                </div>
                <div>
                  <Label htmlFor="guest-count">Guest Count</Label>
                  <Input id="guest-count" type="number" placeholder="150" className="apple-input" />
                </div>
                <div>
                  <Label htmlFor="event-date">Event Date</Label>
                  <Input id="event-date" type="date" className="apple-input" />
                </div>
                <div>
                  <Label htmlFor="event-type">Event Type</Label>
                  <Select>
                    <SelectTrigger className="apple-input">
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corporate">Corporate Event</SelectItem>
                      <SelectItem value="wedding">Wedding Reception</SelectItem>
                      <SelectItem value="social">Social Event</SelectItem>
                      <SelectItem value="conference">Conference</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label>Special Requirements</Label>
                <Textarea 
                  placeholder="Dietary restrictions, special requests, setup requirements..."
                  className="apple-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateBEOOpen(false)} className="apple-button">
                Cancel
              </Button>
              <Button onClick={() => setIsCreateBEOOpen(false)} className="apple-button">
                Generate BEO/REO
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
