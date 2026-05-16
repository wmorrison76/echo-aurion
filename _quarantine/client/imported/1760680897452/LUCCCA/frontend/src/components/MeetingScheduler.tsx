import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Bell,
  Mail,
  MessageSquare,
  Phone,
  Video,
  Settings,
  Copy,
  Edit,
  Trash2,
  AlertCircle,
  Check,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  MeetingSession,
  MeetingInvite,
  MeetingReminder,
  OrganizationMember
} from '@/shared/sales-meeting-types';

interface MeetingSchedulerProps {
  onScheduleMeeting: (meeting: Partial<MeetingSession>) => void;
  onUpdateReminders: (reminders: MeetingReminder[]) => void;
  existingMeetings?: MeetingSession[];
  organizationMembers?: OrganizationMember[];
}

export default function MeetingScheduler({
  onScheduleMeeting,
  onUpdateReminders,
  existingMeetings = [],
  organizationMembers = []
}: MeetingSchedulerProps) {
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingSession | null>(null);

  // Form state
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    description: '',
    startTime: '',
    duration: 60,
    meetingType: 'sales_call' as MeetingSession['meetingType'],
    securityLevel: 'standard' as MeetingSession['securityLevel'],
    allowGuestAccess: false,
    requireApproval: true,
    recordMeeting: false,
    maxParticipants: 10
  });

  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    role: 'client' as MeetingInvite['role']
  });

  const [reminderForm, setReminderForm] = useState({
    type: 'email' as MeetingReminder['type'],
    minutesBefore: 15,
    customMessage: ''
  });

  const [invitedParticipants, setInvitedParticipants] = useState<MeetingInvite[]>([]);
  const [reminders, setReminders] = useState<MeetingReminder[]>([]);

  // Mock upcoming meetings
  const upcomingMeetings: MeetingSession[] = [
    {
      id: 'upcoming-1',
      title: 'Client Presentation - Global Catering',
      description: 'Quarterly review and new service offerings presentation',
      hostId: 'user-1',
      participants: [],
      status: 'scheduled',
      startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      scheduledDuration: 90,
      meetingType: 'sales_call',
      securityLevel: 'high',
      settings: {
        allowGuestAccess: false,
        requireApproval: true,
        recordMeeting: true,
        allowScreenShare: true,
        allowFileShare: true,
        enableWaitingRoom: true,
        maxParticipants: 8
      },
      whiteboard: {
        elements: [],
        viewBox: { x: 0, y: 0, width: 1920, height: 1080, zoom: 1 },
        activeTool: { type: 'select', color: '#000000', strokeWidth: 2, opacity: 1 },
        selectedElements: [],
        collaborativeCursors: new Map()
      },
      chatHistory: [],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'upcoming-2',
      title: 'Team Training - New Sales Tools',
      description: 'Training session for the new collaborative meeting platform',
      hostId: 'user-1',
      participants: [],
      status: 'scheduled',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      scheduledDuration: 60,
      meetingType: 'training',
      securityLevel: 'standard',
      settings: {
        allowGuestAccess: false,
        requireApproval: false,
        recordMeeting: true,
        allowScreenShare: true,
        allowFileShare: false,
        enableWaitingRoom: false,
        maxParticipants: 15
      },
      whiteboard: {
        elements: [],
        viewBox: { x: 0, y: 0, width: 1920, height: 1080, zoom: 1 },
        activeTool: { type: 'select', color: '#000000', strokeWidth: 2, opacity: 1 },
        selectedElements: [],
        collaborativeCursors: new Map()
      },
      chatHistory: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const addParticipant = () => {
    if (inviteForm.email && inviteForm.name) {
      const newInvite: MeetingInvite = {
        id: `invite-${Date.now()}`,
        meetingId: 'temp',
        inviteeEmail: inviteForm.email,
        inviteeName: inviteForm.name,
        role: inviteForm.role,
        permissions: {
          canDraw: inviteForm.role !== 'client',
          canShare: inviteForm.role === 'host' || inviteForm.role === 'sales_rep',
          canChat: true,
          canModerate: inviteForm.role === 'host'
        },
        invitedBy: 'user-1',
        invitedAt: new Date(),
        status: 'pending',
        joinLink: `https://meeting.app/join/${Date.now()}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      };

      setInvitedParticipants(prev => [...prev, newInvite]);
      setInviteForm({ email: '', name: '', role: 'client' });
    }
  };

  const removeParticipant = (id: string) => {
    setInvitedParticipants(prev => prev.filter(p => p.id !== id));
  };

  const addReminder = () => {
    const newReminder: MeetingReminder = {
      id: `reminder-${Date.now()}`,
      meetingId: 'temp',
      participantId: 'all',
      type: reminderForm.type,
      scheduledFor: new Date(Date.now() + reminderForm.minutesBefore * 60 * 1000),
      sent: false,
      content: {
        subject: `Meeting Reminder: ${meetingForm.title}`,
        message: reminderForm.customMessage || `Your meeting "${meetingForm.title}" starts in ${reminderForm.minutesBefore} minutes.`,
        includeJoinLink: true
      }
    };

    setReminders(prev => [...prev, newReminder]);
    setReminderForm({ type: 'email', minutesBefore: 15, customMessage: '' });
  };

  const removeReminder = (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const scheduleMeeting = () => {
    const newMeeting: Partial<MeetingSession> = {
      title: meetingForm.title,
      description: meetingForm.description,
      startTime: new Date(meetingForm.startTime),
      scheduledDuration: meetingForm.duration,
      meetingType: meetingForm.meetingType,
      securityLevel: meetingForm.securityLevel,
      settings: {
        allowGuestAccess: meetingForm.allowGuestAccess,
        requireApproval: meetingForm.requireApproval,
        recordMeeting: meetingForm.recordMeeting,
        allowScreenShare: true,
        allowFileShare: true,
        enableWaitingRoom: meetingForm.requireApproval,
        maxParticipants: meetingForm.maxParticipants
      }
    };

    onScheduleMeeting(newMeeting);
    onUpdateReminders(reminders);
    
    // Reset form
    setMeetingForm({
      title: '',
      description: '',
      startTime: '',
      duration: 60,
      meetingType: 'sales_call',
      securityLevel: 'standard',
      allowGuestAccess: false,
      requireApproval: true,
      recordMeeting: false,
      maxParticipants: 10
    });
    setInvitedParticipants([]);
    setReminders([]);
    setIsScheduleDialogOpen(false);
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getTimeUntilMeeting = (startTime: Date) => {
    const now = new Date();
    const diff = startTime.getTime() - now.getTime();
    
    if (diff < 0) return 'Started';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `in ${hours}h ${minutes}m`;
    } else {
      return `in ${minutes}m`;
    }
  };

  const getMeetingTypeIcon = (type: MeetingSession['meetingType']) => {
    switch (type) {
      case 'sales_call': return <Phone className="h-4 w-4" />;
      case 'client_presentation': return <Video className="h-4 w-4" />;
      case 'training': return <Users className="h-4 w-4" />;
      case 'internal': return <MessageSquare className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getMeetingTypeColor = (type: MeetingSession['meetingType']) => {
    switch (type) {
      case 'sales_call': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'client_presentation': return 'bg-green-100 text-green-800 border-green-200';
      case 'training': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'internal': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Meeting Scheduler</h2>
          <p className="text-muted-foreground">Schedule meetings and manage reminders</p>
        </div>
        
        <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Meeting
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Schedule New Meeting</DialogTitle>
              <DialogDescription>
                Create a new sales meeting with video conferencing and collaboration tools
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Meeting Title</Label>
                  <Input
                    id="title"
                    value={meetingForm.title}
                    onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                    placeholder="e.g., Q1 Sales Presentation"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={meetingForm.description}
                    onChange={(e) => setMeetingForm({ ...meetingForm, description: e.target.value })}
                    placeholder="Meeting objectives and agenda"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="datetime-local"
                      value={meetingForm.startTime}
                      onChange={(e) => setMeetingForm({ ...meetingForm, startTime: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Select
                      value={meetingForm.duration.toString()}
                      onValueChange={(value) => setMeetingForm({ ...meetingForm, duration: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                        <SelectItem value="180">3 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="meetingType">Meeting Type</Label>
                    <Select
                      value={meetingForm.meetingType}
                      onValueChange={(value: MeetingSession['meetingType']) => 
                        setMeetingForm({ ...meetingForm, meetingType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales_call">Sales Call</SelectItem>
                        <SelectItem value="client_presentation">Client Presentation</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                        <SelectItem value="internal">Internal Meeting</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="securityLevel">Security Level</Label>
                    <Select
                      value={meetingForm.securityLevel}
                      onValueChange={(value: MeetingSession['securityLevel']) => 
                        setMeetingForm({ ...meetingForm, securityLevel: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="confidential">Confidential</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Participants */}
              <div className="space-y-4">
                <h4 className="font-medium">Invite Participants</h4>
                
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-4">
                    <Input
                      placeholder="Name"
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                    />
                  </div>
                  <div className="col-span-4">
                    <Input
                      placeholder="Email"
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    />
                  </div>
                  <div className="col-span-3">
                    <Select
                      value={inviteForm.role}
                      onValueChange={(value: MeetingInvite['role']) => 
                        setInviteForm({ ...inviteForm, role: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="sales_rep">Sales Rep</SelectItem>
                        <SelectItem value="support">Support</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1">
                    <Button size="sm" onClick={addParticipant} className="w-full">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {invitedParticipants.length > 0 && (
                  <div className="space-y-2">
                    {invitedParticipants.map((participant) => (
                      <div key={participant.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs">
                              {participant.inviteeName?.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium text-sm">{participant.inviteeName}</span>
                            <span className="text-xs text-muted-foreground ml-2">{participant.inviteeEmail}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {participant.role}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeParticipant(participant.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reminders */}
              <div className="space-y-4">
                <h4 className="font-medium">Meeting Reminders</h4>
                
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-3">
                    <Select
                      value={reminderForm.type}
                      onValueChange={(value: MeetingReminder['type']) => 
                        setReminderForm({ ...reminderForm, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="push">Push</SelectItem>
                        <SelectItem value="in_app">In-App</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Select
                      value={reminderForm.minutesBefore.toString()}
                      onValueChange={(value) => 
                        setReminderForm({ ...reminderForm, minutesBefore: parseInt(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="1440">1 day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-5">
                    <Input
                      placeholder="Custom message (optional)"
                      value={reminderForm.customMessage}
                      onChange={(e) => setReminderForm({ ...reminderForm, customMessage: e.target.value })}
                    />
                  </div>
                  <div className="col-span-1">
                    <Button size="sm" onClick={addReminder} className="w-full">
                      <Bell className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {reminders.length > 0 && (
                  <div className="space-y-2">
                    {reminders.map((reminder) => (
                      <div key={reminder.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-3">
                          {reminder.type === 'email' && <Mail className="h-4 w-4" />}
                          {reminder.type === 'sms' && <MessageSquare className="h-4 w-4" />}
                          {reminder.type === 'push' && <Bell className="h-4 w-4" />}
                          {reminder.type === 'in_app' && <AlertCircle className="h-4 w-4" />}
                          <span className="text-sm">
                            {reminder.type.toUpperCase()} reminder {Math.floor(reminder.scheduledFor.getTime() - Date.now()) / (1000 * 60)} minutes before
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeReminder(reminder.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={scheduleMeeting} disabled={!meetingForm.title || !meetingForm.startTime}>
                Schedule Meeting
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Upcoming Meetings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Upcoming Meetings</h3>
        
        {upcomingMeetings.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-medium mb-2">No upcoming meetings</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Schedule your first sales meeting to get started
              </p>
              <Button onClick={() => setIsScheduleDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Meeting
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {upcomingMeetings.map((meeting) => (
              <Card key={meeting.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          {getMeetingTypeIcon(meeting.meetingType)}
                          <h4 className="font-semibold">{meeting.title}</h4>
                        </div>
                        <Badge className={getMeetingTypeColor(meeting.meetingType)}>
                          {meeting.meetingType.replace('_', ' ')}
                        </Badge>
                        {meeting.securityLevel === 'high' && (
                          <Badge variant="outline" className="text-orange-600 border-orange-200">
                            High Security
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">{meeting.description}</p>
                      
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDateTime(meeting.startTime)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{meeting.scheduledDuration} minutes</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{meeting.participants.length} participants</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        {getTimeUntilMeeting(meeting.startTime)}
                      </Badge>
                      
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Copy className="h-3 w-3" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Settings className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <Bell className="h-4 w-4 mr-2" />
                              Manage Reminders
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Users className="h-4 w-4 mr-2" />
                              Manage Participants
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Join Link
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Cancel Meeting
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
