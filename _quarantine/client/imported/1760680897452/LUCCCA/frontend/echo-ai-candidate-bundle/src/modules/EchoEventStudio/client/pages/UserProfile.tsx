import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  User,
  Settings,
  DollarSign,
  Target,
  TrendingUp,
  Award,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Edit,
  Save,
  Plus,
  Trash2,
  Home,
  Users,
  BarChart3,
  PieChart,
  Calculator,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
  Star,
  Trophy
} from 'lucide-react';
import {
  UserProfile as UserProfileType,
  CommissionSettings,
  SalesGoals,
  TieredCommissionRate,
  BonusStructure,
  SalesPerformance,
  CommissionRecord
} from '@/shared/sales-commission-types';

export default function UserProfile() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserProfileType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<UserProfileType | null>(null);
  const [commissionRecords, setCommissionRecords] = useState<CommissionRecord[]>([]);
  const [performance, setPerformance] = useState<SalesPerformance | null>(null);
  const [isCommissionDialogOpen, setIsCommissionDialogOpen] = useState(false);
  const [isGoalsDialogOpen, setIsGoalsDialogOpen] = useState(false);

  // Sample data initialization
  useEffect(() => {
    const sampleUser: UserProfileType = {
      id: 'user_wm_001',
      name: 'William Morrison',
      email: 'william.morrison@echocrm.com',
      role: 'sales_agent',
      avatar: 'WM',
      phone: '+1 (555) 123-4567',
      startDate: '2023-06-15',
      isActive: true,
      permissions: ['view_clients', 'edit_clients', 'create_events', 'view_commission', 'edit_commission'],
      commissionSettings: {
        baseCommissionRate: 5.5,
        tieredRates: [
          {
            id: 'tier_1',
            threshold: 0,
            rate: 5.5,
            description: 'Base rate for sales up to $50,000'
          },
          {
            id: 'tier_2',
            threshold: 50000,
            rate: 7.0,
            description: 'Enhanced rate for sales $50,000 - $100,000'
          },
          {
            id: 'tier_3',
            threshold: 100000,
            rate: 8.5,
            description: 'Premium rate for sales above $100,000'
          }
        ],
        bonusStructure: [
          {
            id: 'monthly_goal',
            type: 'goal_achievement',
            threshold: 25000,
            amount: 1000,
            isPercentage: false,
            description: 'Monthly revenue goal achievement bonus',
            period: 'monthly'
          },
          {
            id: 'quality_bonus',
            type: 'quality_bonus',
            threshold: 4.5,
            amount: 500,
            isPercentage: false,
            description: 'Client satisfaction score above 4.5/5',
            period: 'quarterly'
          }
        ],
        isActive: true,
        effectiveDate: '2024-01-01',
        paymentSchedule: 'monthly',
        clawbackPeriod: 90
      },
      salesGoals: {
        currentPeriod: '2024-Q1',
        monthlyRevenue: 25000,
        quarterlyRevenue: 75000,
        annualRevenue: 300000,
        monthlyClients: 3,
        quarterlyClients: 9,
        annualClients: 36,
        conversionRate: 30,
        averageDealSize: 8500,
        retentionRate: 85,
        upsellTarget: 15,
        prospectingTarget: 15,
        lastUpdated: '2024-01-15T10:00:00Z'
      },
      createdAt: '2023-06-15T09:00:00Z',
      updatedAt: '2024-01-20T14:30:00Z'
    };

    const sampleCommissionRecords: CommissionRecord[] = [
      {
        id: 'comm_001',
        userId: 'user_wm_001',
        dealId: 'deal_001',
        clientId: 'client_001',
        clientName: 'TechCorp Inc.',
        dealValue: 45000,
        commissionRate: 5.5,
        commissionAmount: 2475,
        status: 'paid',
        earnedDate: '2024-01-15',
        paymentDate: '2024-01-31',
        payPeriod: '2024-01',
        bonusesApplied: [],
        notes: 'Corporate annual event - successful completion',
        approvedBy: 'manager_001',
        createdAt: '2024-01-15T16:00:00Z',
        updatedAt: '2024-01-31T12:00:00Z'
      },
      {
        id: 'comm_002',
        userId: 'user_wm_001',
        dealId: 'deal_002',
        clientId: 'client_002',
        clientName: 'Global Events Ltd.',
        dealValue: 78000,
        commissionRate: 7.0,
        commissionAmount: 5460,
        status: 'approved',
        earnedDate: '2024-01-18',
        payPeriod: '2024-01',
        bonusesApplied: [
          {
            bonusId: 'monthly_goal',
            type: 'goal_achievement',
            amount: 1000,
            description: 'Monthly goal exceeded'
          }
        ],
        notes: 'Multi-event contract - premium client',
        approvedBy: 'manager_001',
        createdAt: '2024-01-18T11:00:00Z',
        updatedAt: '2024-01-20T09:00:00Z'
      }
    ];

    const samplePerformance: SalesPerformance = {
      userId: 'user_wm_001',
      period: '2024-01',
      revenue: {
        actual: 123000,
        target: 25000,
        percentage: 492
      },
      clients: {
        actual: 4,
        target: 3,
        percentage: 133
      },
      deals: {
        won: 4,
        lost: 1,
        pending: 2,
        conversionRate: 80
      },
      commission: {
        earned: 8935,
        paid: 2475,
        pending: 6460
      },
      pipeline: {
        qualified: 12,
        proposal: 3,
        negotiation: 2,
        totalValue: 186000
      },
      activities: {
        calls: 45,
        emails: 78,
        meetings: 12,
        proposals: 6
      },
      qualityMetrics: {
        clientSatisfaction: 4.7,
        retentionRate: 88,
        upsellRate: 22,
        averageDealSize: 30750
      }
    };

    setCurrentUser(sampleUser);
    setEditedUser(sampleUser);
    setCommissionRecords(sampleCommissionRecords);
    setPerformance(samplePerformance);
  }, []);

  const handleSave = () => {
    if (editedUser) {
      setCurrentUser(editedUser);
      setIsEditing(false);
      // In production, this would save to the backend
    }
  };

  const handleCancel = () => {
    setEditedUser(currentUser);
    setIsEditing(false);
  };

  const addTieredRate = () => {
    if (!editedUser) return;
    
    const newRate: TieredCommissionRate = {
      id: `tier_${Date.now()}`,
      threshold: 0,
      rate: 5.0,
      description: 'New commission tier'
    };

    setEditedUser({
      ...editedUser,
      commissionSettings: {
        ...editedUser.commissionSettings,
        tieredRates: [...editedUser.commissionSettings.tieredRates, newRate]
      }
    });
  };

  const updateTieredRate = (index: number, field: keyof TieredCommissionRate, value: any) => {
    if (!editedUser) return;

    const updatedRates = [...editedUser.commissionSettings.tieredRates];
    updatedRates[index] = {
      ...updatedRates[index],
      [field]: value
    };

    setEditedUser({
      ...editedUser,
      commissionSettings: {
        ...editedUser.commissionSettings,
        tieredRates: updatedRates
      }
    });
  };

  const removeTieredRate = (index: number) => {
    if (!editedUser) return;

    const updatedRates = editedUser.commissionSettings.tieredRates.filter((_, i) => i !== index);

    setEditedUser({
      ...editedUser,
      commissionSettings: {
        ...editedUser.commissionSettings,
        tieredRates: updatedRates
      }
    });
  };

  const addBonus = () => {
    if (!editedUser) return;
    
    const newBonus: BonusStructure = {
      id: `bonus_${Date.now()}`,
      type: 'goal_achievement',
      threshold: 0,
      amount: 0,
      isPercentage: false,
      description: 'New bonus structure',
      period: 'monthly'
    };

    setEditedUser({
      ...editedUser,
      commissionSettings: {
        ...editedUser.commissionSettings,
        bonusStructure: [...editedUser.commissionSettings.bonusStructure, newBonus]
      }
    });
  };

  const getCommissionTotal = () => {
    return commissionRecords.reduce((total, record) => total + record.commissionAmount, 0);
  };

  const getPaidCommission = () => {
    return commissionRecords
      .filter(record => record.status === 'paid')
      .reduce((total, record) => total + record.commissionAmount, 0);
  };

  const getPendingCommission = () => {
    return commissionRecords
      .filter(record => record.status === 'approved' || record.status === 'pending')
      .reduce((total, record) => total + record.commissionAmount, 0);
  };

  if (!currentUser || !performance) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="apple-button p-1 h-auto"
          >
            <Home className="h-4 w-4 mr-1" />
            Dashboard
          </Button>
          <span>/</span>
          <span className="text-foreground font-medium">User Profile</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src="/placeholder.svg" alt={currentUser.name} />
              <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                {currentUser.avatar}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{currentUser.name}</h1>
              <p className="text-muted-foreground">
                {currentUser.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} • Member since {new Date(currentUser.startDate).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button
                onClick={() => setIsEditing(true)}
                className="apple-button"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="apple-button"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="apple-button bg-primary hover:bg-primary/90"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Performance Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Monthly Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                ${performance.revenue.actual.toLocaleString()}
              </div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-500">{performance.revenue.percentage}%</span>
                <span>of target</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Commission Earned
              </CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                ${performance.commission.earned.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                ${performance.commission.paid.toLocaleString()} paid • ${performance.commission.pending.toLocaleString()} pending
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Conversion Rate
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {performance.deals.conversionRate}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {performance.deals.won} won • {performance.deals.lost} lost
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Client Satisfaction
              </CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {performance.qualityMetrics.clientSatisfaction}/5
              </div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                <div className="flex">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-3 w-3",
                        i < Math.floor(performance.qualityMetrics.clientSatisfaction)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      )}
                    />
                  ))}
                </div>
                <span>rating</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="commission">Commission</TabsTrigger>
            <TabsTrigger value="goals">Sales Goals</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Manage your personal details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={isEditing ? editedUser?.name : currentUser.name}
                      onChange={(e) => editedUser && setEditedUser({...editedUser, name: e.target.value})}
                      disabled={!isEditing}
                      className="apple-button"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={isEditing ? editedUser?.email : currentUser.email}
                      onChange={(e) => editedUser && setEditedUser({...editedUser, email: e.target.value})}
                      disabled={!isEditing}
                      className="apple-button"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={isEditing ? editedUser?.phone : currentUser.phone}
                      onChange={(e) => editedUser && setEditedUser({...editedUser, phone: e.target.value})}
                      disabled={!isEditing}
                      className="apple-button"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={isEditing ? editedUser?.role : currentUser.role}
                      onValueChange={(value) => editedUser && setEditedUser({...editedUser, role: value as any})}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className="apple-button">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass-panel">
                        <SelectItem value="sales_agent">Sales Agent</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="director">Director</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commission" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Commission Settings</span>
                    {isEditing && (
                      <Button
                        size="sm"
                        onClick={() => setIsCommissionDialogOpen(true)}
                        className="apple-button"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Your commission structure and bonus details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Base Commission Rate</Label>
                    <div className="text-2xl font-bold text-primary">
                      {currentUser.commissionSettings.baseCommissionRate}%
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Tiered Rates</Label>
                    <div className="space-y-2 mt-2">
                      {currentUser.commissionSettings.tieredRates.map((tier, index) => (
                        <div key={tier.id} className="flex items-center justify-between p-2 bg-muted/20 rounded">
                          <div>
                            <div className="font-medium">{tier.rate}%</div>
                            <div className="text-xs text-muted-foreground">
                              Above ${tier.threshold.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Bonus Structure</Label>
                    <div className="space-y-2 mt-2">
                      {currentUser.commissionSettings.bonusStructure.map((bonus) => (
                        <div key={bonus.id} className="p-2 bg-muted/20 rounded">
                          <div className="font-medium">{bonus.description}</div>
                          <div className="text-sm text-muted-foreground">
                            ${bonus.amount.toLocaleString()} • {bonus.period}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle>Commission History</CardTitle>
                  <CardDescription>
                    Recent commission payments and earnings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Total Earned</div>
                        <div className="font-semibold">${getCommissionTotal().toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Paid</div>
                        <div className="font-semibold text-green-600">${getPaidCommission().toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Pending</div>
                        <div className="font-semibold text-yellow-600">${getPendingCommission().toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {commissionRecords.slice(0, 5).map((record) => (
                        <div key={record.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{record.clientName}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(record.earnedDate).toLocaleDateString()} • ${record.dealValue.toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">${record.commissionAmount.toLocaleString()}</div>
                            <Badge
                              className={cn(
                                "text-xs",
                                record.status === 'paid' ? 'bg-green-500/20 text-green-700' :
                                record.status === 'approved' ? 'bg-blue-500/20 text-blue-700' :
                                'bg-yellow-500/20 text-yellow-700'
                              )}
                            >
                              {record.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="goals" className="space-y-6">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Sales Goals - {currentUser.salesGoals.currentPeriod}</span>
                  {isEditing && (
                    <Button
                      size="sm"
                      onClick={() => setIsGoalsDialogOpen(true)}
                      className="apple-button"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit Goals
                    </Button>
                  )}
                </CardTitle>
                <CardDescription>
                  Track your progress against sales targets and performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Monthly Revenue</Label>
                      <span className="text-sm text-muted-foreground">
                        ${performance.revenue.actual.toLocaleString()} / ${currentUser.salesGoals.monthlyRevenue.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={Math.min(performance.revenue.percentage, 100)} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {performance.revenue.percentage}% of target
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Monthly Clients</Label>
                      <span className="text-sm text-muted-foreground">
                        {performance.clients.actual} / {currentUser.salesGoals.monthlyClients}
                      </span>
                    </div>
                    <Progress value={Math.min(performance.clients.percentage, 100)} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {performance.clients.percentage}% of target
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Conversion Rate</Label>
                      <span className="text-sm text-muted-foreground">
                        {performance.deals.conversionRate}% / {currentUser.salesGoals.conversionRate}%
                      </span>
                    </div>
                    <Progress value={(performance.deals.conversionRate / currentUser.salesGoals.conversionRate) * 100} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Average Deal Size</Label>
                      <span className="text-sm text-muted-foreground">
                        ${performance.qualityMetrics.averageDealSize.toLocaleString()} / ${currentUser.salesGoals.averageDealSize.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={(performance.qualityMetrics.averageDealSize / currentUser.salesGoals.averageDealSize) * 100} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Retention Rate</Label>
                      <span className="text-sm text-muted-foreground">
                        {performance.qualityMetrics.retentionRate}% / {currentUser.salesGoals.retentionRate}%
                      </span>
                    </div>
                    <Progress value={(performance.qualityMetrics.retentionRate / currentUser.salesGoals.retentionRate) * 100} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Weekly Prospecting</Label>
                      <span className="text-sm text-muted-foreground">
                        Target: {currentUser.salesGoals.prospectingTarget} prospects/week
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      For 10:3:1 ratio (10 prospects → 3 clients → 1 immediate action)
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle>Activity Summary</CardTitle>
                  <CardDescription>Your sales activities this month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-muted/20 rounded-lg">
                      <div className="text-2xl font-bold">{performance.activities.calls}</div>
                      <div className="text-sm text-muted-foreground">Calls Made</div>
                    </div>
                    <div className="text-center p-3 bg-muted/20 rounded-lg">
                      <div className="text-2xl font-bold">{performance.activities.emails}</div>
                      <div className="text-sm text-muted-foreground">Emails Sent</div>
                    </div>
                    <div className="text-center p-3 bg-muted/20 rounded-lg">
                      <div className="text-2xl font-bold">{performance.activities.meetings}</div>
                      <div className="text-sm text-muted-foreground">Meetings</div>
                    </div>
                    <div className="text-center p-3 bg-muted/20 rounded-lg">
                      <div className="text-2xl font-bold">{performance.activities.proposals}</div>
                      <div className="text-sm text-muted-foreground">Proposals</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle>Pipeline Overview</CardTitle>
                  <CardDescription>Current sales pipeline status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Qualified Prospects</span>
                      <span className="font-semibold">{performance.pipeline.qualified}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">In Proposal</span>
                      <span className="font-semibold">{performance.pipeline.proposal}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">In Negotiation</span>
                      <span className="font-semibold">{performance.pipeline.negotiation}</span>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Total Pipeline Value</span>
                        <span className="font-bold text-lg">${performance.pipeline.totalValue.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
