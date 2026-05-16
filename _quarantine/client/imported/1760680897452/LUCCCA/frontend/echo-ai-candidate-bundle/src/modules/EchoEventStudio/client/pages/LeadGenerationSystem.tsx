import { useState, useEffect } from 'react';
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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';
import {
  FaUsers,
  FaChartLine,
  FaCrown,
  FaBullseye,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaUserTie,
  FaStar,
  FaHistory,
  FaHandshake,
  FaDollarSign,
  FaBrain,
  FaRobot
} from 'react-icons/fa';
import { 
  MdTrendingUp, 
  MdWarning, 
  MdAutorenew,
  MdHome,
  MdArrowBack 
} from 'react-icons/md';
import { Link } from 'react-router-dom';

import type {
  ClientDemographics,
  ClientClassification,
  ProspectiveClient,
  ClientEventHistory,
  SlowPeriodOutreach,
  LegacyClientReassignment,
  WhaleClientAnalysis,
  SweetSpotAnalysis
} from '@/shared/lead-generation-types';

// Mock data for demonstration
const mockWhaleClients: WhaleClientAnalysis[] = [
  {
    id: '1',
    clientId: 'client-1',
    analysisDate: new Date('2024-01-15'),
    metrics: {
      annualValue: 450000,
      profitMargin: 0.35,
      eventFrequency: 12,
      averageEventSize: 150,
      loyaltyYears: 5,
      referralCount: 8
    },
    percentileRank: 98,
    retentionStrategies: ['Dedicated account manager', 'Priority booking', 'Custom pricing'],
    riskFactors: ['Key contact retirement pending', 'Budget pressure from board'],
    nextReviewDate: new Date('2024-04-01'),
    assignedAccountManager: 'Sarah Johnson'
  },
  {
    id: '2', 
    clientId: 'client-2',
    analysisDate: new Date('2024-01-20'),
    metrics: {
      annualValue: 380000,
      profitMargin: 0.42,
      eventFrequency: 8,
      averageEventSize: 200,
      loyaltyYears: 3,
      referralCount: 5
    },
    percentileRank: 96,
    retentionStrategies: ['VIP concierge service', 'Preferred venue access'],
    riskFactors: ['Company merger in progress'],
    nextReviewDate: new Date('2024-03-15'),
    assignedAccountManager: 'Michael Chen'
  }
];

const mockSlowPeriodOutreach: SlowPeriodOutreach[] = [
  {
    id: '1',
    clientId: 'client-3',
    targetContactDate: new Date('2024-08-15'),
    reason: 'Historical slow period August-September, last event was March',
    lastEventDate: new Date('2024-03-10'),
    monthsToSlowPeriod: 5,
    suggestedEventTypes: ['Summer networking events', 'Back-to-school promotions'],
    estimatedBudgetRange: { min: 15000, max: 35000 },
    priority: 'high',
    status: 'pending',
    assignedSalesRep: 'David Wilson',
    createdDate: new Date('2024-03-15')
  },
  {
    id: '2',
    clientId: 'client-4', 
    targetContactDate: new Date('2024-11-01'),
    reason: 'Q4 budget remaining, plan for Q1 events',
    lastEventDate: new Date('2024-06-20'),
    monthsToSlowPeriod: 8,
    suggestedEventTypes: ['Holiday parties', 'Year-end celebrations'],
    estimatedBudgetRange: { min: 25000, max: 60000 },
    priority: 'medium',
    status: 'scheduled',
    assignedSalesRep: 'Emma Rodriguez',
    createdDate: new Date('2024-06-25')
  }
];

const mockLegacyReassignments: LegacyClientReassignment[] = [
  {
    id: '1',
    clientId: 'client-5',
    formerSalesRep: 'John Smith',
    formerRepDepartureDate: new Date('2024-02-15'),
    clientValue: {
      annualRevenue: 125000,
      profitMargin: 0.28,
      eventFrequency: 6
    },
    difficultyAssessment: {
      score: 7,
      factors: ['Very demanding client', 'Multiple revisions required', 'Payment delays'],
      notes: 'Client requires high-touch service and has unrealistic expectations'
    },
    businessWorthAssessment: {
      isWorthRetaining: true,
      reasons: ['Consistent revenue', 'Good payment history overall', 'Industry connections'],
      estimatedCostToMaintain: 15000
    },
    reassignmentDecision: 'reassign',
    newSalesRep: 'Lisa Chang',
    decisionMadeBy: 'Sales Director',
    decisionDate: new Date('2024-02-20'),
    decisionNotes: 'Lisa has experience with demanding clients in this industry'
  },
  {
    id: '2',
    clientId: 'client-6',
    formerSalesRep: 'Robert Davis',
    formerRepDepartureDate: new Date('2024-01-30'),
    clientValue: {
      annualRevenue: 45000,
      profitMargin: 0.12,
      eventFrequency: 3
    },
    difficultyAssessment: {
      score: 9,
      factors: ['Constant complaints', 'Unreasonable demands', 'Negative reviews'],
      notes: 'Client has caused significant stress and resource drain'
    },
    businessWorthAssessment: {
      isWorthRetaining: false,
      reasons: ['Low profit margin', 'High maintenance cost', 'Negative impact on team morale'],
      estimatedCostToMaintain: 25000
    },
    reassignmentDecision: 'decline',
    decisionMadeBy: 'Sales Director',
    decisionDate: new Date('2024-02-05'),
    denialReason: 'Client relationship is no longer profitable due to excessive demands and low margins'
  }
];

export default function LeadGenerationSystem() {
  const [activeTab, setActiveTab] = useState('overview');
  const [whaleClients] = useState<WhaleClientAnalysis[]>(mockWhaleClients);
  const [slowPeriodOutreach] = useState<SlowPeriodOutreach[]>(mockSlowPeriodOutreach);
  const [legacyReassignments] = useState<LegacyClientReassignment[]>(mockLegacyReassignments);
  const [isCreateLeadRuleOpen, setIsCreateLeadRuleOpen] = useState(false);

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'whale': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800';
      case 'sweet-spot': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800';
      case 'standard': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
      case 'low-value': return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
      default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800';
      case 'low': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
      default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
    }
  };

  const whaleClientPercentage = 4; // Top 4% are whale clients
  const totalClients = 250; // Example total client count
  const whaleClientCount = Math.ceil(totalClients * (whaleClientPercentage / 100));

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
                <BreadcrumbPage className="font-medium">Lead Generation & Client Management</BreadcrumbPage>
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
            <h1 className="text-3xl font-bold text-foreground">Lead Generation & Client Management</h1>
            <p className="text-muted-foreground mt-2">
              AI-powered lead generation, client classification, and proactive relationship management
            </p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" className="apple-button">
              <FaBrain className="h-4 w-4 mr-2" />
              Generate Leads
            </Button>
            <Dialog open={isCreateLeadRuleOpen} onOpenChange={setIsCreateLeadRuleOpen}>
              <DialogTrigger asChild>
                <Button className="apple-button">
                  <FaBullseye className="h-4 w-4 mr-2" />
                  Create Lead Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-panel max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Lead Generation Rule</DialogTitle>
                  <DialogDescription>
                    Define criteria for automatically identifying and scoring potential clients
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="rule-name">Rule Name</Label>
                      <Input id="rule-name" placeholder="Corporate Tech Events" className="apple-input" />
                    </div>
                    <div>
                      <Label htmlFor="minimum-score">Minimum Score</Label>
                      <Input id="minimum-score" type="number" placeholder="75" className="apple-input" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" placeholder="Target tech companies for corporate events..." className="apple-input" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="industries">Target Industries</Label>
                      <Input id="industries" placeholder="Technology, Software, Fintech" className="apple-input" />
                    </div>
                    <div>
                      <Label htmlFor="company-sizes">Company Sizes</Label>
                      <Input id="company-sizes" placeholder="Medium, Large, Enterprise" className="apple-input" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateLeadRuleOpen(false)} className="apple-button">
                    Cancel
                  </Button>
                  <Button onClick={() => setIsCreateLeadRuleOpen(false)} className="apple-button">
                    Create Rule
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glass-panel apple-button">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Whale Clients</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {whaleClientCount} <span className="text-sm text-muted-foreground">({whaleClientPercentage}%)</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Top 4% by value</p>
                </div>
                <FaCrown className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel apple-button">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sweet Spot Clients</p>
                  <p className="text-2xl font-bold text-emerald-600">78</p>
                  <p className="text-xs text-muted-foreground mt-1">Optimal profit ratio</p>
                </div>
                <FaBullseye className="h-8 w-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel apple-button">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Slow Period Outreach</p>
                  <p className="text-2xl font-bold text-orange-600">{slowPeriodOutreach.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Scheduled contacts</p>
                </div>
                <FaCalendarAlt className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel apple-button">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Legacy Reassignments</p>
                  <p className="text-2xl font-bold text-red-600">{legacyReassignments.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Pending decisions</p>
                </div>
                <FaUserTie className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center">
              <FaChartLine className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="whale-clients" className="flex items-center">
              <FaCrown className="h-4 w-4 mr-2" />
              Whale Clients
            </TabsTrigger>
            <TabsTrigger value="slow-period" className="flex items-center">
              <FaCalendarAlt className="h-4 w-4 mr-2" />
              Slow Period
            </TabsTrigger>
            <TabsTrigger value="legacy" className="flex items-center">
              <FaUserTie className="h-4 w-4 mr-2" />
              Legacy Clients
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center">
              <FaBrain className="h-4 w-4 mr-2" />
              AI Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Client Classification Distribution */}
              <Card className="glass-panel apple-button">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FaUsers className="h-5 w-5 mr-2" />
                    Client Classification Distribution
                  </CardTitle>
                  <CardDescription>
                    Distribution of clients across value categories
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full" />
                        <span className="text-sm">Whale Clients (Top 4%)</span>
                      </div>
                      <span className="text-sm font-medium">{whaleClientCount}</span>
                    </div>
                    <Progress value={4} className="h-2" />
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                        <span className="text-sm">Sweet Spot Clients</span>
                      </div>
                      <span className="text-sm font-medium">78</span>
                    </div>
                    <Progress value={31} className="h-2" />
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full" />
                        <span className="text-sm">Standard Clients</span>
                      </div>
                      <span className="text-sm font-medium">145</span>
                    </div>
                    <Progress value={58} className="h-2" />
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-gray-500 rounded-full" />
                        <span className="text-sm">Low Value Clients</span>
                      </div>
                      <span className="text-sm font-medium">17</span>
                    </div>
                    <Progress value={7} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Lead Generation Performance */}
              <Card className="glass-panel apple-button">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MdTrendingUp className="h-5 w-5 mr-2" />
                    Lead Generation Performance
                  </CardTitle>
                  <CardDescription>
                    AI-powered lead generation results this month
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">47</p>
                      <p className="text-xs text-muted-foreground">New Leads</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-600">23</p>
                      <p className="text-xs text-muted-foreground">Qualified</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">12</p>
                      <p className="text-xs text-muted-foreground">Contacted</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">5</p>
                      <p className="text-xs text-muted-foreground">Converted</p>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span>Conversion Rate</span>
                      <span className="font-medium text-green-600">21.7%</span>
                    </div>
                    <Progress value={21.7} className="h-2 mt-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="whale-clients" className="space-y-6 mt-6">
            <Card className="glass-panel apple-button">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FaCrown className="h-5 w-5 mr-2 text-purple-500" />
                  Whale Clients (Top 4%)
                </CardTitle>
                <CardDescription>
                  Premium clients requiring dedicated account management and retention strategies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Annual Value</TableHead>
                      <TableHead>Percentile</TableHead>
                      <TableHead>Account Manager</TableHead>
                      <TableHead>Risk Factors</TableHead>
                      <TableHead>Next Review</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {whaleClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <FaCrown className="h-4 w-4 text-purple-500" />
                            <span className="font-medium">Client {client.clientId}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-green-600">
                            ${client.metrics.annualValue.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                            {client.percentileRank}th
                          </Badge>
                        </TableCell>
                        <TableCell>{client.assignedAccountManager}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {client.riskFactors.slice(0, 2).map((risk, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {risk.length > 20 ? risk.substring(0, 20) + '...' : risk}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {client.nextReviewDate.toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="slow-period" className="space-y-6 mt-6">
            <Card className="glass-panel apple-button">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FaCalendarAlt className="h-5 w-5 mr-2 text-orange-500" />
                  18-Month Advance Slow Period Outreach
                </CardTitle>
                <CardDescription>
                  Proactive client contact scheduling for anticipated slow periods
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Target Date</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Budget Range</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned Rep</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slowPeriodOutreach.map((outreach) => (
                      <TableRow key={outreach.id}>
                        <TableCell>
                          <span className="font-medium">Client {outreach.clientId}</span>
                        </TableCell>
                        <TableCell>
                          {outreach.targetContactDate.toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {outreach.reason.length > 30 ? outreach.reason.substring(0, 30) + '...' : outreach.reason}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">
                            ${outreach.estimatedBudgetRange.min.toLocaleString()} - ${outreach.estimatedBudgetRange.max.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs", getPriorityColor(outreach.priority))}>
                            {outreach.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">
                            {outreach.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{outreach.assignedSalesRep}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="legacy" className="space-y-6 mt-6">
            <Card className="glass-panel apple-button">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FaUserTie className="h-5 w-5 mr-2 text-red-500" />
                  Legacy Client Reassignments
                </CardTitle>
                <CardDescription>
                  Client reassignment decisions when sales representatives leave the company
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Former Rep</TableHead>
                      <TableHead>Annual Value</TableHead>
                      <TableHead>Difficulty Score</TableHead>
                      <TableHead>Decision</TableHead>
                      <TableHead>New Rep</TableHead>
                      <TableHead>Decision Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {legacyReassignments.map((reassignment) => (
                      <TableRow key={reassignment.id}>
                        <TableCell>
                          <span className="font-medium">Client {reassignment.clientId}</span>
                        </TableCell>
                        <TableCell>{reassignment.formerSalesRep}</TableCell>
                        <TableCell>
                          <span className="font-semibold">
                            ${reassignment.clientValue.annualRevenue.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm">{reassignment.difficultyAssessment.score}/10</span>
                            {reassignment.difficultyAssessment.score >= 7 && (
                              <MdWarning className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "text-xs",
                            reassignment.reassignmentDecision === 'reassign' 
                              ? 'bg-green-100 text-green-700 border-green-200' 
                              : reassignment.reassignmentDecision === 'decline'
                              ? 'bg-red-100 text-red-700 border-red-200'
                              : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                          )}>
                            {reassignment.reassignmentDecision}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {reassignment.newSalesRep || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {reassignment.decisionDate?.toLocaleDateString() || 'Pending'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass-panel apple-button">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FaRobot className="h-5 w-5 mr-2 text-blue-500" />
                    AI Lead Scoring Model
                  </CardTitle>
                  <CardDescription>
                    Machine learning insights and model performance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">87.3%</p>
                      <p className="text-xs text-muted-foreground">Model Accuracy</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">92.1%</p>
                      <p className="text-xs text-muted-foreground">Precision Rate</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Top Scoring Factors</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Industry Match</span>
                        <span>32%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Company Size</span>
                        <span>28%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Revenue Range</span>
                        <span>21%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Location</span>
                        <span>19%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel apple-button">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FaHandshake className="h-5 w-5 mr-2 text-emerald-500" />
                    Sweet Spot Analysis
                  </CardTitle>
                  <CardDescription>
                    Optimal client profile for maximum profitability
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-600">34.2%</p>
                      <p className="text-xs text-muted-foreground">Avg Profit Margin</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">$127K</p>
                      <p className="text-xs text-muted-foreground">Avg Lifetime Value</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Optimal Profile</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Company Size:</span>
                        <span className="font-medium">Medium (50-200 employees)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Budget Range:</span>
                        <span className="font-medium">$25K - $75K</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Event Frequency:</span>
                        <span className="font-medium">4-8 per year</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Industry:</span>
                        <span className="font-medium">Tech, Finance, Healthcare</span>
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
