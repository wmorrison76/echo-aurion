import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  Users,
  Heart,
  Star,
  Calendar,
  MessageSquare,
  Phone,
  Mail,
  MapPin,
  Clock,
  TrendingUp,
  Award,
  Gift,
  Bell,
  Settings,
  Search,
  Filter,
  Plus,
  Edit,
  Eye,
  MoreVertical,
  Send,
  Download,
  Upload,
  RefreshCw,
  Target,
  BarChart3,
  Activity,
  Zap,
  Hotel,
  Coffee,
  Utensils,
  Wifi,
  Car,
  Plane,
  Globe,
  ShoppingBag,
  Camera,
  Music,
  Gamepad2,
  BookOpen,
  Dumbbell,
  Waves,
  TreePine,
  Mountain,
  Building,
  Home,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import {
  Guest,
  GuestJourney,
  Reservation,
  GuestSegment,
  defaultGuestSegments,
  AutomatedMessage,
  CommunicationEntry,
} from "@shared/guest-experience-types";

export default function GuestExperience() {
  const [activeTab, setActiveTab] = useState("guests");
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSegment, setSelectedSegment] = useState<string>("all");
  const [isAddGuestOpen, setIsAddGuestOpen] = useState(false);

  // Mock guest data - in production this would come from your PMS/CRM integration
  const guests: Guest[] = [
    {
      id: "guest-1",
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah.johnson@email.com",
      phone: "+1 (555) 123-4567",
      dateOfBirth: new Date("1985-06-15"),
      nationality: "US",
      language: "English",
      preferredContactMethod: "email",
      marketingOptIn: true,
      communicationFrequency: "weekly",
      guestType: "leisure",
      loyaltyTier: "gold",
      lifetimeValue: 15240,
      averageSpend: 1524,
      totalStays: 10,
      preferences: {
        roomType: ["Suite", "Ocean View"],
        floor: "high",
        bedType: "king",
        smokingRoom: false,
        quietRoom: true,
        amenities: ["Pool", "Spa", "Gym", "Restaurant"],
        services: ["Room Service", "Concierge"],
        dietaryRestrictions: ["Vegetarian"],
        favoriteRestaurants: ["Ocean Breeze", "Garden Terrace"],
        cuisinePreferences: ["Mediterranean", "Asian"],
        drinkPreferences: ["Wine", "Cocktails"],
        interests: ["Spa", "Fine Dining", "Cultural Tours"],
        activityLevel: "medium",
        groupSize: "couple",
        meetingRoomNeeds: false,
        businessCenterAccess: false,
        earlyCheckIn: true,
        lateCheckOut: true,
        loyaltyPrograms: ["Marriott Bonvoy"]
      },
      specialRequests: ["Extra pillows", "Late check-out"],
      allergies: ["Shellfish"],
      accessibilityNeeds: [],
      socialProfiles: [
        {
          platform: "instagram",
          profileUrl: "@sarahjohnson",
          followerCount: 2500,
          influencerStatus: false,
          lastUpdated: new Date()
        }
      ],
      reviewHistory: [
        {
          id: "review-1",
          platform: "tripadvisor",
          rating: 5,
          reviewText: "Amazing stay! The spa was incredible and the staff was so attentive.",
          reviewDate: new Date("2024-01-10"),
          sentimentScore: 0.9,
          categories: [
            { category: "service", score: 5, sentiment: "positive" },
            { category: "amenities", score: 5, sentiment: "positive" }
          ],
          verified: true
        }
      ],
      createdAt: new Date("2023-01-15"),
      updatedAt: new Date(),
      lastStayDate: new Date("2024-01-08"),
      nextReservationDate: new Date("2024-03-15"),
      marketingSegments: ["vip-guests", "leisure-families"],
      emailEngagementScore: 0.85
    },
    {
      id: "guest-2",
      firstName: "Michael",
      lastName: "Chen",
      email: "michael.chen@company.com",
      phone: "+1 (555) 987-6543",
      nationality: "CA",
      language: "English",
      preferredContactMethod: "email",
      marketingOptIn: true,
      communicationFrequency: "monthly",
      guestType: "business",
      loyaltyTier: "platinum",
      lifetimeValue: 28500,
      averageSpend: 2850,
      totalStays: 15,
      preferences: {
        roomType: ["Executive Suite", "Business Floor"],
        floor: "high",
        bedType: "king",
        smokingRoom: false,
        quietRoom: true,
        amenities: ["Business Center", "Gym", "Executive Lounge"],
        services: ["Concierge", "Valet"],
        dietaryRestrictions: [],
        favoriteRestaurants: ["Executive Dining"],
        cuisinePreferences: ["Asian", "Continental"],
        drinkPreferences: ["Coffee", "Spirits"],
        interests: ["Business Networking", "Fitness"],
        activityLevel: "low",
        groupSize: "solo",
        meetingRoomNeeds: true,
        businessCenterAccess: true,
        earlyCheckIn: true,
        lateCheckOut: true,
        loyaltyPrograms: ["Hilton Honors", "American Express"]
      },
      specialRequests: ["Express check-in", "Business newspaper"],
      allergies: [],
      accessibilityNeeds: [],
      socialProfiles: [
        {
          platform: "linkedin",
          profileUrl: "michaelchen-exec",
          followerCount: 5000,
          influencerStatus: true,
          lastUpdated: new Date()
        }
      ],
      reviewHistory: [
        {
          id: "review-2",
          platform: "google",
          rating: 4,
          reviewText: "Great business facilities and efficient service. The executive lounge is excellent.",
          reviewDate: new Date("2024-01-20"),
          sentimentScore: 0.7,
          categories: [
            { category: "service", score: 4, sentiment: "positive" },
            { category: "amenities", score: 5, sentiment: "positive" }
          ],
          verified: true
        }
      ],
      createdAt: new Date("2022-06-10"),
      updatedAt: new Date(),
      lastStayDate: new Date("2024-01-18"),
      marketingSegments: ["business-travelers", "vip-guests"],
      emailEngagementScore: 0.92
    },
    {
      id: "guest-3",
      firstName: "Emily",
      lastName: "Rodriguez",
      email: "emily.rodriguez@family.com",
      phone: "+1 (555) 456-7890",
      dateOfBirth: new Date("1990-03-22"),
      nationality: "US",
      language: "English",
      preferredContactMethod: "sms",
      marketingOptIn: true,
      communicationFrequency: "weekly",
      guestType: "leisure",
      loyaltyTier: "silver",
      lifetimeValue: 8900,
      averageSpend: 1780,
      totalStays: 5,
      preferences: {
        roomType: ["Family Suite", "Connecting Rooms"],
        floor: "any",
        bedType: "twin",
        smokingRoom: false,
        quietRoom: false,
        amenities: ["Pool", "Kids Club", "Restaurant"],
        services: ["Babysitting", "Room Service"],
        dietaryRestrictions: ["Gluten-free"],
        favoriteRestaurants: ["Family Buffet"],
        cuisinePreferences: ["American", "Italian"],
        drinkPreferences: ["Juice", "Soft Drinks"],
        interests: ["Family Activities", "Beach", "Pool"],
        activityLevel: "high",
        groupSize: "family",
        meetingRoomNeeds: false,
        businessCenterAccess: false,
        earlyCheckIn: false,
        lateCheckOut: false,
        loyaltyPrograms: []
      },
      specialRequests: ["Crib for infant", "Ground floor room"],
      allergies: [],
      accessibilityNeeds: ["Wheelchair accessible"],
      socialProfiles: [],
      reviewHistory: [
        {
          id: "review-3",
          platform: "booking",
          rating: 5,
          reviewText: "Perfect for families! Kids loved the pool and activities. Very accommodating staff.",
          reviewDate: new Date("2023-12-15"),
          sentimentScore: 0.95,
          categories: [
            { category: "amenities", score: 5, sentiment: "positive" },
            { category: "service", score: 5, sentiment: "positive" }
          ],
          verified: true
        }
      ],
      createdAt: new Date("2023-05-20"),
      updatedAt: new Date(),
      lastStayDate: new Date("2023-12-12"),
      marketingSegments: ["leisure-families"],
      emailEngagementScore: 0.78
    }
  ];

  // Mock reservations data - would integrate with PMS
  const reservations: Reservation[] = [
    {
      id: "res-1",
      guestId: "guest-1",
      confirmationNumber: "CONF123456",
      checkInDate: new Date("2024-03-15"),
      checkOutDate: new Date("2024-03-18"),
      nights: 3,
      adults: 2,
      children: 0,
      infants: 0,
      roomType: "Ocean View Suite",
      rateCode: "LEISURE",
      roomRate: 450,
      totalAmount: 1485, // 3 nights + taxes/fees
      currency: "USD",
      bookingSource: "direct",
      bookingDate: new Date("2024-02-10"),
      status: "confirmed",
      paymentStatus: "paid",
      paymentMethod: "Credit Card",
      specialRequests: ["Champagne on arrival", "Late check-out"],
      roomPreferences: ["High floor", "Ocean view"],
      arrivalTime: "3:00 PM",
      packageDeals: ["Spa Package"],
      addOns: [
        {
          id: "addon-1",
          type: "spa",
          name: "Couples Massage",
          description: "90-minute couples massage at the spa",
          price: 300,
          date: new Date("2024-03-16"),
          time: "2:00 PM",
          quantity: 1,
          status: "booked"
        }
      ],
      upsellOpportunities: [
        {
          id: "upsell-1",
          type: "dining",
          title: "Romantic Dinner Package",
          description: "Private beachside dinner for two",
          originalPrice: 200,
          discountedPrice: 150,
          validUntil: new Date("2024-03-10"),
          priority: "high",
          automatedOffer: true,
          conversionProbability: 0.65
        }
      ],
      communicationLog: [
        {
          id: "comm-1",
          timestamp: new Date("2024-02-15"),
          type: "email",
          direction: "outbound",
          subject: "Booking Confirmation",
          content: "Thank you for choosing our resort! Your reservation is confirmed.",
          staffMember: "Sarah Williams",
          department: "Reservations",
          priority: "medium",
          status: "delivered",
          requiresFollowUp: false,
          automated: true,
          templateUsed: "booking-confirmation"
        }
      ],
      createdAt: new Date("2024-02-10"),
      updatedAt: new Date()
    }
  ];

  // Mock journey data - would be built from guest interactions
  const guestJourneys: GuestJourney[] = [
    {
      guestId: "guest-1",
      reservationId: "res-1",
      stages: [
        {
          id: "pre-arrival",
          name: "Pre-Arrival",
          order: 1,
          status: "completed",
          startDate: new Date("2024-02-10"),
          completedDate: new Date("2024-03-14"),
          expectedActions: ["Send welcome email", "Collect preferences", "Offer upsells"],
          completedActions: ["Send welcome email", "Collect preferences"],
          automatedMessages: [],
          personalizedContent: [],
          recommendations: []
        },
        {
          id: "arrival",
          name: "Arrival & Check-in",
          order: 2,
          status: "pending",
          expectedActions: ["Express check-in", "Room upgrade offer", "Amenity delivery"],
          completedActions: [],
          automatedMessages: [],
          personalizedContent: [],
          recommendations: []
        }
      ],
      currentStage: "pre-arrival",
      touchpoints: [
        {
          id: "touch-1",
          type: "email",
          channel: "email",
          timestamp: new Date("2024-02-15"),
          direction: "outbound",
          subject: "Welcome to Paradise Resort",
          message: "We're excited to welcome you next month!",
          attachments: [],
          opened: true,
          clicked: true,
          responded: false,
          sentiment: "positive",
          staffMember: "Sarah Williams",
          department: "Guest Relations"
        }
      ],
      engagementScore: 0.85,
      responseRate: 0.6,
      conversionEvents: [],
      createdAt: new Date("2024-02-10")
    }
  ];

  const filteredGuests = useMemo(() => {
    if (!guests || !Array.isArray(guests)) return [];

    return guests.filter(guest => {
      if (!guest) return false;

      const matchesSearch = !searchTerm ||
        guest.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guest.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guest.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSegment = selectedSegment === "all" ||
        (guest.marketingSegments && guest.marketingSegments.includes(selectedSegment));

      return matchesSearch && matchesSegment;
    });
  }, [guests, searchTerm, selectedSegment]);

  const guestMetrics = useMemo(() => {
    if (!guests || !Array.isArray(guests) || guests.length === 0) {
      return {
        totalGuests: 0,
        vipGuests: 0,
        avgLifetimeValue: 0,
        avgEngagement: 0
      };
    }

    const totalGuests = guests.length;
    const vipGuests = guests.filter(g => g?.loyaltyTier === 'gold' || g?.loyaltyTier === 'platinum').length;
    const avgLifetimeValue = guests.reduce((sum, g) => sum + (g?.lifetimeValue || 0), 0) / totalGuests;
    const avgEngagement = guests.reduce((sum, g) => sum + (g?.emailEngagementScore || 0), 0) / totalGuests;

    return {
      totalGuests,
      vipGuests,
      avgLifetimeValue,
      avgEngagement: avgEngagement * 100
    };
  }, [guests]);

  const getLoyaltyColor = (tier: string) => {
    switch (tier) {
      case 'platinum': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'gold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'silver': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'bronze': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getGuestTypeIcon = (type: string) => {
    switch (type) {
      case 'business': return Building;
      case 'leisure': return TreePine;
      case 'group': return Users;
      case 'vip': return Star;
      default: return User;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Guest Experience Management</h1>
            <p className="text-muted-foreground">
              Comprehensive guest profiles, journey mapping, and personalized communication
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Dialog open={isAddGuestOpen} onOpenChange={setIsAddGuestOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Guest
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Guest Profile</DialogTitle>
                  <DialogDescription>
                    Create a comprehensive guest profile with preferences and history
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="John" />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Doe" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="john@example.com" />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" placeholder="+1 (555) 123-4567" />
                  </div>
                  <div>
                    <Label htmlFor="guestType">Guest Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="leisure">Leisure</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="group">Group</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="loyaltyTier">Loyalty Tier</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="bronze">Bronze</SelectItem>
                        <SelectItem value="silver">Silver</SelectItem>
                        <SelectItem value="gold">Gold</SelectItem>
                        <SelectItem value="platinum">Platinum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddGuestOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsAddGuestOpen(false)}>
                    Create Guest Profile
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Guest Database</DropdownMenuItem>
                <DropdownMenuItem>Preference Report</DropdownMenuItem>
                <DropdownMenuItem>Journey Analytics</DropdownMenuItem>
                <DropdownMenuItem>Communication Log</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-panel dark:glass-panel-dark">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Guests</p>
                  <p className="text-2xl font-bold">{guestMetrics.totalGuests}</p>
                  <p className="text-xs text-green-600">+15 this month</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel dark:glass-panel-dark">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">VIP Guests</p>
                  <p className="text-2xl font-bold">{guestMetrics.vipGuests}</p>
                  <p className="text-xs text-yellow-600">Gold/Platinum tier</p>
                </div>
                <Star className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel dark:glass-panel-dark">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Lifetime Value</p>
                  <p className="text-2xl font-bold">${Math.round(guestMetrics.avgLifetimeValue).toLocaleString()}</p>
                  <p className="text-xs text-green-600">+12% from last quarter</p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel dark:glass-panel-dark">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Engagement Rate</p>
                  <p className="text-2xl font-bold">{Math.round(guestMetrics.avgEngagement)}%</p>
                  <p className="text-xs text-blue-600">Email engagement</p>
                </div>
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass-panel dark:glass-panel-dark">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search guests by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Guest Segments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Segments</SelectItem>
                  {(defaultGuestSegments || []).map((segment) => (
                    <SelectItem key={segment.id} value={segment.id}>
                      {segment.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                More Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="guests">Guest Profiles</TabsTrigger>
            <TabsTrigger value="journeys">Journey Mapping</TabsTrigger>
            <TabsTrigger value="communications">Communications</TabsTrigger>
            <TabsTrigger value="segments">Guest Segments</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
          </TabsList>

          <TabsContent value="guests">
            <div className="grid gap-4">
              {filteredGuests.map((guest) => {
                const GuestTypeIcon = getGuestTypeIcon(guest.guestType);
                
                return (
                  <Card key={guest.id} className="glass-panel dark:glass-panel-dark cursor-pointer hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <Avatar className="h-16 w-16">
                            <AvatarFallback className="bg-primary/10 text-primary text-lg">
                              {guest.firstName[0]}{guest.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold">{guest.firstName} {guest.lastName}</h3>
                              <Badge className={getLoyaltyColor(guest.loyaltyTier)}>
                                {guest.loyaltyTier.toUpperCase()}
                              </Badge>
                              <div className="flex items-center gap-1">
                                <GuestTypeIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground capitalize">{guest.guestType}</span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Contact</p>
                                <p className="font-medium">{guest.email}</p>
                                <p className="text-muted-foreground">{guest.phone}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Lifetime Value</p>
                                <p className="font-medium text-green-600">${guest.lifetimeValue.toLocaleString()}</p>
                                <p className="text-muted-foreground">{guest.totalStays} stays</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Last Stay</p>
                                <p className="font-medium">
                                  {guest.lastStayDate?.toLocaleDateString() || 'Never'}
                                </p>
                                {guest.nextReservationDate && (
                                  <p className="text-muted-foreground">
                                    Next: {guest.nextReservationDate.toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              <div>
                                <p className="text-muted-foreground">Engagement</p>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1">
                                    <Progress value={guest.emailEngagementScore * 100} className="h-2" />
                                  </div>
                                  <span className="text-xs">{Math.round(guest.emailEngagementScore * 100)}%</span>
                                </div>
                              </div>
                            </div>

                            {/* Preferences Preview */}
                            <div className="flex gap-2 mt-3">
                              <div className="text-xs text-muted-foreground">Preferences:</div>
                              {guest.preferences?.amenities?.slice(0, 3).map((amenity) => (
                                <Badge key={amenity} variant="outline" className="text-xs">
                                  {amenity}
                                </Badge>
                              )) || []}
                              {(guest.preferences?.amenities?.length || 0) > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{(guest.preferences?.amenities?.length || 0) - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedGuest(guest)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem>Edit Profile</DropdownMenuItem>
                              <DropdownMenuItem>View Journey</DropdownMenuItem>
                              <DropdownMenuItem>Send Message</DropdownMenuItem>
                              <DropdownMenuItem>Create Reservation</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>Add to Segment</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="journeys">
            <div className="space-y-6">
              {/* Journey Mapping Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="glass-panel apple-button">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Active Journeys</p>
                        <p className="text-2xl font-bold text-primary">24</p>
                      </div>
                      <MapPin className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-panel apple-button">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Journey Score</p>
                        <p className="text-2xl font-bold text-green-600">8.7/10</p>
                      </div>
                      <Star className="h-8 w-8 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-panel apple-button">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Touchpoints</p>
                        <p className="text-2xl font-bold text-blue-600">156</p>
                      </div>
                      <Activity className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Journey Map Visualization */}
              <Card className="glass-panel apple-button">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Guest Journey Timeline</CardTitle>
                      <CardDescription>Visual representation of guest touchpoints and experiences</CardDescription>
                    </div>
                    <Button className="apple-button">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Journey Map
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Journey Stages */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {[
                        { stage: 'Discovery', icon: Search, color: 'text-blue-600', count: 45 },
                        { stage: 'Booking', icon: Calendar, color: 'text-green-600', count: 38 },
                        { stage: 'Pre-Arrival', icon: Clock, color: 'text-orange-600', count: 32 },
                        { stage: 'Experience', icon: Heart, color: 'text-red-600', count: 29 },
                        { stage: 'Post-Stay', icon: MessageSquare, color: 'text-purple-600', count: 24 }
                      ].map((stage, index) => (
                        <div key={stage.stage} className="text-center">
                          <div className="relative">
                            <div className={cn(
                              "w-16 h-16 rounded-full border-4 mx-auto flex items-center justify-center mb-3",
                              "bg-white dark:bg-background border-current", stage.color
                            )}>
                              <stage.icon className={cn("h-6 w-6", stage.color)} />
                            </div>
                            {index < 4 && (
                              <div className="absolute top-8 left-full w-full h-0.5 bg-border hidden md:block" />
                            )}
                          </div>
                          <h3 className="font-medium text-sm">{stage.stage}</h3>
                          <p className="text-xs text-muted-foreground">{stage.count} touchpoints</p>
                        </div>
                      ))}
                    </div>

                    {/* Recent Journey Activities */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Recent Journey Activities</h4>
                      <div className="space-y-3">
                        {(guestJourneys || []).slice(0, 5).map((journey, index) => (
                          <div key={index} className="flex items-center space-x-4 p-3 bg-muted/30 rounded-lg">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">Guest #{journey.guestId}</span>
                                <Badge className={cn(
                                  "text-xs",
                                  journey.currentStage === 'completed' ? 'bg-green-100 text-green-700' :
                                  journey.currentStage === 'active' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                )}>
                                  {journey.currentStage}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {journey.touchpoints?.length || 0} touchpoints • Score: {Math.round((journey.engagementScore || 0) * 10)}/10
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">
                                {journey.createdAt?.toLocaleDateString()}
                              </p>
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                View Journey
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="communications">
            <div className="space-y-6">
              {/* Communication Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="glass-panel apple-button">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Messages Sent</p>
                        <p className="text-2xl font-bold text-blue-600">1,247</p>
                      </div>
                      <Send className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-panel apple-button">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Open Rate</p>
                        <p className="text-2xl font-bold text-green-600">67%</p>
                      </div>
                      <Eye className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-panel apple-button">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Response Rate</p>
                        <p className="text-2xl font-bold text-purple-600">23%</p>
                      </div>
                      <MessageSquare className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-panel apple-button">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Automation Rules</p>
                        <p className="text-2xl font-bold text-orange-600">12</p>
                      </div>
                      <Settings className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card className="glass-panel apple-button">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common communication tasks and automations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button className="apple-button h-auto p-4">
                      <div className="text-center">
                        <Send className="h-6 w-6 mx-auto mb-2" />
                        <div className="font-medium">Send Message</div>
                        <div className="text-xs text-muted-foreground">Compose and send messages</div>
                      </div>
                    </Button>

                    <Button variant="outline" className="apple-button h-auto p-4">
                      <div className="text-center">
                        <Settings className="h-6 w-6 mx-auto mb-2" />
                        <div className="font-medium">Automation Rules</div>
                        <div className="text-xs text-muted-foreground">Setup automated workflows</div>
                      </div>
                    </Button>

                    <Button variant="outline" className="apple-button h-auto p-4">
                      <div className="text-center">
                        <FileText className="h-6 w-6 mx-auto mb-2" />
                        <div className="font-medium">Templates</div>
                        <div className="text-xs text-muted-foreground">Manage message templates</div>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Communications */}
              <Card className="glass-panel apple-button">
                <CardHeader>
                  <CardTitle>Recent Communications</CardTitle>
                  <CardDescription>Latest messages and interactions with guests</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { guest: 'Sarah Johnson', type: 'Email', subject: 'Welcome to our venue!', time: '2 hours ago', status: 'delivered' },
                      { guest: 'Michael Chen', type: 'SMS', subject: 'Event reminder - Tomorrow at 6 PM', time: '4 hours ago', status: 'read' },
                      { guest: 'Emily Rodriguez', type: 'Email', subject: 'Thank you for choosing us!', time: '1 day ago', status: 'replied' },
                      { guest: 'David Wilson', type: 'SMS', subject: 'Parking instructions for your event', time: '2 days ago', status: 'delivered' },
                      { guest: 'Lisa Chang', type: 'Email', subject: 'Event confirmation and details', time: '3 days ago', status: 'opened' }
                    ].map((comm, index) => (
                      <div key={index} className="flex items-center space-x-4 p-3 bg-muted/30 rounded-lg">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          comm.type === 'Email' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                        )}>
                          {comm.type === 'Email' ? <Mail className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{comm.guest}</span>
                            <Badge variant="outline" className="text-xs">
                              {comm.type}
                            </Badge>
                            <Badge className={cn(
                              "text-xs",
                              comm.status === 'delivered' ? 'bg-gray-100 text-gray-700' :
                              comm.status === 'read' ? 'bg-blue-100 text-blue-700' :
                              comm.status === 'replied' ? 'bg-green-100 text-green-700' :
                              'bg-orange-100 text-orange-700'
                            )}>
                              {comm.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{comm.subject}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">{comm.time}</p>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Communication Templates */}
              <Card className="glass-panel apple-button">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Message Templates</CardTitle>
                      <CardDescription>Pre-built templates for common communications</CardDescription>
                    </div>
                    <Button variant="outline" className="apple-button">
                      <Plus className="h-4 w-4 mr-2" />
                      New Template
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { name: 'Welcome Message', category: 'Pre-Event', usage: 145 },
                      { name: 'Event Reminder', category: 'Day Of', usage: 98 },
                      { name: 'Thank You Note', category: 'Post-Event', usage: 203 },
                      { name: 'Follow-up Survey', category: 'Post-Event', usage: 156 }
                    ].map((template, index) => (
                      <div key={index} className="p-4 border border-border/50 rounded-lg hover:border-primary/50 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{template.name}</span>
                          <Badge variant="outline" className="text-xs">{template.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Used {template.usage} times</p>
                        <div className="flex space-x-2 mt-3">
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                            Use Template
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="segments">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(defaultGuestSegments || []).map((segment) => (
                <Card key={segment.id} className="glass-panel dark:glass-panel-dark">
                  <CardHeader>
                    <CardTitle className="text-lg">{segment.name}</CardTitle>
                    <CardDescription>{segment.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {guests.filter(g => g?.marketingSegments?.includes(segment.id)).length}
                        </div>
                        <div className="text-sm text-muted-foreground">Guests in segment</div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Avg Lifetime Value</span>
                          <span>$12,500</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Engagement Rate</span>
                          <span>85%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Conversion Rate</span>
                          <span>22%</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1">
                          <Users className="h-4 w-4 mr-2" />
                          View Guests
                        </Button>
                        <Button size="sm" variant="outline">
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="automation">
            <Card className="glass-panel dark:glass-panel-dark">
              <CardHeader>
                <CardTitle>Guest Communication Automation</CardTitle>
                <CardDescription>
                  Set up automated messages and workflows for different guest touchpoints
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium">Automation Engine</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create automated workflows for pre-arrival, in-stay, and post-stay communications
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Workflow
                    </Button>
                    <Button variant="outline">
                      <Settings className="h-4 w-4 mr-2" />
                      Templates
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Guest Detail Modal */}
        {selectedGuest && (
          <Dialog open={!!selectedGuest} onOpenChange={() => setSelectedGuest(null)}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {selectedGuest.firstName[0]}{selectedGuest.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  {selectedGuest.firstName} {selectedGuest.lastName}
                  <Badge className={getLoyaltyColor(selectedGuest.loyaltyTier)}>
                    {selectedGuest.loyaltyTier.toUpperCase()}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Complete guest profile with preferences, history, and communication timeline
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Contact Information</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {selectedGuest.email}
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {selectedGuest.phone}
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        {selectedGuest.nationality}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Stay History</h4>
                    <div className="space-y-1 text-sm">
                      <div>Total Stays: <span className="font-medium">{selectedGuest.totalStays}</span></div>
                      <div>Lifetime Value: <span className="font-medium text-green-600">${selectedGuest.lifetimeValue.toLocaleString()}</span></div>
                      <div>Average Spend: <span className="font-medium">${selectedGuest.averageSpend.toLocaleString()}</span></div>
                      <div>Last Stay: <span className="font-medium">{selectedGuest.lastStayDate?.toLocaleDateString()}</span></div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Preferences</h4>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-muted-foreground">Room Type:</span>
                        <div className="flex gap-1 mt-1">
                          {(selectedGuest.preferences?.roomType || []).map(type => (
                            <Badge key={type} variant="outline" className="text-xs">{type}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Amenities:</span>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {(selectedGuest.preferences?.amenities || []).map(amenity => (
                            <Badge key={amenity} variant="outline" className="text-xs">{amenity}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Dining:</span>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {(selectedGuest.preferences?.cuisinePreferences || []).map(cuisine => (
                            <Badge key={cuisine} variant="outline" className="text-xs">{cuisine}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {(selectedGuest.specialRequests?.length || 0) > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Special Requests</h4>
                      <div className="flex gap-1 flex-wrap">
                        {(selectedGuest.specialRequests || []).map(request => (
                          <Badge key={request} variant="secondary" className="text-xs">{request}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedGuest(null)}>
                  Close
                </Button>
                <Button>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Layout>
  );
}

// TODO: Third-party integration points:
// 1. PMS Integration: Connect to Cloud PMS Pro, Hotel Management Suite, or Fidelio for guest data sync
// 2. Email/SMS: Integrate with SendGrid, Mailchimp, or Twilio for communications
// 3. Review Platforms: Connect to TripAdvisor, Google, Booking.com APIs for review data
// 4. Social Media: Integrate with Instagram, Facebook APIs for social profiles
// 5. Analytics: Connect to Google Analytics, Mixpanel for behavior tracking
// 6. CRM Integration: Sync with Salesforce, HubSpot for sales alignment
// 7. Payment Processing: Integrate with Stripe, Square for payment history
// 8. Loyalty Programs: Connect to third-party loyalty platform APIs
