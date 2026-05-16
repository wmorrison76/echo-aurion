import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  FaStar,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimes,
  FaDollarSign,
  FaUsers,
  FaChartLine,
  FaCommentDots
} from 'react-icons/fa';
import { MdTrendingUp, MdTrendingDown } from 'react-icons/md';

import type { ClientEventHistory, ClientEventIssue } from '@/shared/lead-generation-types';

interface ClientHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
}

// Mock client event history data
const mockEventHistory: ClientEventHistory[] = [
  {
    id: 'event-1',
    clientId: 'client-1',
    eventId: 'evt-001',
    eventName: 'Annual Corporate Retreat',
    eventDate: new Date('2024-01-15'),
    eventType: 'Corporate Event',
    attendeeCount: 150,
    totalRevenue: 45000,
    profitMargin: 0.32,
    guestFeedbackScore: 8.7,
    issues: [
      {
        id: 'issue-1',
        eventId: 'evt-001',
        category: 'catering',
        severity: 'minor',
        description: 'Vegetarian options ran out during lunch service',
        resolution: 'Additional vegetarian meals prepared, client compensated with 10% discount',
        resolutionDate: new Date('2024-01-15'),
        preventionNotes: 'Increase vegetarian portions by 20% for corporate events',
        wasResolved: true,
        impactOnSatisfaction: -0.3
      }
    ],
    salesRep: 'Sarah Johnson',
    satisfactionLevel: 'very-satisfied',
    repeatBookingLikelihood: 85
  },
  {
    id: 'event-2',
    clientId: 'client-1',
    eventId: 'evt-002',
    eventName: 'Q3 Board Meeting',
    eventDate: new Date('2023-09-22'),
    eventType: 'Business Meeting',
    attendeeCount: 25,
    totalRevenue: 8500,
    profitMargin: 0.28,
    guestFeedbackScore: 9.2,
    issues: [],
    salesRep: 'Sarah Johnson',
    satisfactionLevel: 'very-satisfied',
    repeatBookingLikelihood: 95
  },
  {
    id: 'event-3',
    clientId: 'client-1',
    eventId: 'evt-003',
    eventName: 'Product Launch Celebration',
    eventDate: new Date('2023-06-10'),
    eventType: 'Product Launch',
    attendeeCount: 200,
    totalRevenue: 68000,
    profitMargin: 0.35,
    guestFeedbackScore: 7.8,
    issues: [
      {
        id: 'issue-2',
        eventId: 'evt-003',
        category: 'av-tech',
        severity: 'moderate',
        description: 'Microphone feedback during keynote presentation',
        resolution: 'Audio technician resolved immediately, backup system activated',
        resolutionDate: new Date('2023-06-10'),
        preventionNotes: 'Implement redundant audio systems for keynote events',
        wasResolved: true,
        impactOnSatisfaction: -1.2
      },
      {
        id: 'issue-3',
        eventId: 'evt-003',
        category: 'logistics',
        severity: 'minor',
        description: 'Delayed setup due to traffic congestion affecting vendor deliveries',
        resolution: 'Event started 15 minutes late, client was informed and accommodated',
        resolutionDate: new Date('2023-06-10'),
        preventionNotes: 'Schedule vendor deliveries earlier for high-profile events',
        wasResolved: true,
        impactOnSatisfaction: -0.5
      }
    ],
    salesRep: 'Sarah Johnson',
    satisfactionLevel: 'satisfied',
    repeatBookingLikelihood: 75
  }
];

export default function ClientHistoryModal({ isOpen, onClose, clientId, clientName }: ClientHistoryModalProps) {
  const [eventHistory] = useState<ClientEventHistory[]>(mockEventHistory);
  const [selectedEvent, setSelectedEvent] = useState<ClientEventHistory | null>(null);

  const getSatisfactionColor = (level: string) => {
    switch (level) {
      case 'very-satisfied': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
      case 'satisfied': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
      case 'neutral': return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800';
      case 'dissatisfied': return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800';
      case 'very-dissatisfied': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
      default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'major': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'minor': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const averageFeedbackScore = eventHistory.reduce((sum, event) => sum + event.guestFeedbackScore, 0) / eventHistory.length;
  const totalRevenue = eventHistory.reduce((sum, event) => sum + event.totalRevenue, 0);
  const totalIssues = eventHistory.reduce((sum, event) => sum + event.issues.length, 0);
  const resolvedIssues = eventHistory.reduce((sum, event) => sum + event.issues.filter(issue => issue.wasResolved).length, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-panel max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center">
            <FaCommentDots className="h-6 w-6 mr-3 text-primary" />
            Client History: {clientName}
          </DialogTitle>
          <DialogDescription>
            Complete event history with guest feedback scores and issue tracking
          </DialogDescription>
        </DialogHeader>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="glass-panel apple-button">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Feedback</p>
                  <p className="text-2xl font-bold text-green-600">{averageFeedbackScore.toFixed(1)}/10</p>
                </div>
                <FaStar className="h-6 w-6 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel apple-button">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-primary">${totalRevenue.toLocaleString()}</p>
                </div>
                <FaDollarSign className="h-6 w-6 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel apple-button">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Events</p>
                  <p className="text-2xl font-bold text-blue-600">{eventHistory.length}</p>
                </div>
                <FaCalendarAlt className="h-6 w-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel apple-button">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Issue Resolution</p>
                  <p className="text-2xl font-bold text-emerald-600">{totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 100}%</p>
                </div>
                <FaCheckCircle className="h-6 w-6 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="events" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="events" className="flex items-center">
              <FaCalendarAlt className="h-4 w-4 mr-2" />
              Event History
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center">
              <FaStar className="h-4 w-4 mr-2" />
              Feedback Trends
            </TabsTrigger>
            <TabsTrigger value="issues" className="flex items-center">
              <FaExclamationTriangle className="h-4 w-4 mr-2" />
              Issues & Resolutions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-4 mt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Attendees</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Feedback Score</TableHead>
                  <TableHead>Satisfaction</TableHead>
                  <TableHead>Issues</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventHistory.map((event) => (
                  <TableRow key={event.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <div className="font-medium">{event.eventName}</div>
                        <div className="text-xs text-muted-foreground">Rep: {event.salesRep}</div>
                      </div>
                    </TableCell>
                    <TableCell>{event.eventDate.toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {event.eventType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <FaUsers className="h-3 w-3 mr-1" />
                        {event.attendeeCount}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-green-600">
                        ${event.totalRevenue.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">{event.guestFeedbackScore}/10</span>
                        <div className="flex">
                          {Array.from({ length: 5 }, (_, i) => (
                            <FaStar
                              key={i}
                              className={cn(
                                "h-3 w-3",
                                i < Math.round(event.guestFeedbackScore / 2) ? "text-yellow-400" : "text-gray-300"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs", getSatisfactionColor(event.satisfactionLevel))}>
                        {event.satisfactionLevel.replace('-', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        {event.issues.length > 0 ? (
                          <>
                            <FaExclamationTriangle className="h-3 w-3 text-yellow-500" />
                            <span className="text-xs">{event.issues.length}</span>
                          </>
                        ) : (
                          <>
                            <FaCheckCircle className="h-3 w-3 text-green-500" />
                            <span className="text-xs">0</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedEvent(event)}
                        className="text-xs"
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass-panel apple-button">
                <CardHeader>
                  <CardTitle className="text-lg">Feedback Score Trend</CardTitle>
                  <CardDescription>Guest satisfaction over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {eventHistory.map((event, index) => (
                      <div key={event.id} className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{event.eventName}</div>
                          <div className="text-xs text-muted-foreground">{event.eventDate.toLocaleDateString()}</div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Progress value={event.guestFeedbackScore * 10} className="w-24 h-2" />
                          <span className="text-sm font-medium w-12">{event.guestFeedbackScore}/10</span>
                          {index > 0 && (
                            <div className="flex items-center">
                              {event.guestFeedbackScore > eventHistory[index - 1].guestFeedbackScore ? (
                                <MdTrendingUp className="h-4 w-4 text-green-500" />
                              ) : event.guestFeedbackScore < eventHistory[index - 1].guestFeedbackScore ? (
                                <MdTrendingDown className="h-4 w-4 text-red-500" />
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel apple-button">
                <CardHeader>
                  <CardTitle className="text-lg">Repeat Booking Likelihood</CardTitle>
                  <CardDescription>Probability of future bookings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {eventHistory.map((event) => (
                      <div key={event.id} className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{event.eventName}</div>
                          <div className="text-xs text-muted-foreground">{event.eventDate.toLocaleDateString()}</div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Progress value={event.repeatBookingLikelihood} className="w-24 h-2" />
                          <span className="text-sm font-medium w-12">{event.repeatBookingLikelihood}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="issues" className="space-y-4 mt-6">
            <div className="space-y-4">
              {eventHistory.map((event) => (
                <Card key={event.id} className="glass-panel apple-button">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{event.eventName}</span>
                      <Badge className={cn("text-xs", getSatisfactionColor(event.satisfactionLevel))}>
                        {event.issues.length} issues
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {event.eventDate.toLocaleDateString()} • {event.eventType}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {event.issues.length > 0 ? (
                      <div className="space-y-3">
                        {event.issues.map((issue) => (
                          <div key={issue.id} className="p-3 border border-border/50 rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <Badge className={cn("text-xs", getSeverityColor(issue.severity))}>
                                  {issue.severity}
                                </Badge>
                                <Badge variant="outline" className="text-xs capitalize">
                                  {issue.category.replace('-', ' ')}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-1">
                                {issue.wasResolved ? (
                                  <FaCheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <FaTimes className="h-4 w-4 text-red-500" />
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {issue.wasResolved ? 'Resolved' : 'Unresolved'}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-foreground mb-2">{issue.description}</p>
                            {issue.resolution && (
                              <p className="text-sm text-muted-foreground mb-2">
                                <strong>Resolution:</strong> {issue.resolution}
                              </p>
                            )}
                            {issue.preventionNotes && (
                              <p className="text-xs text-blue-600 dark:text-blue-400">
                                <strong>Prevention:</strong> {issue.preventionNotes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FaCheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                        <p>No issues reported for this event</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
