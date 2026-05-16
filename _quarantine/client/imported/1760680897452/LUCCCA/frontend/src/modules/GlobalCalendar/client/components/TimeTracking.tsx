import { useState, useCallback, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Play,
  Pause,
  Square,
  Clock,
  Target,
  Calendar,
  BarChart3,
  Timer,
  Coffee,
  Focus,
  Award,
  TrendingUp,
  Settings,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Tag,
  CheckCircle,
  AlertCircle,
  Users,
  Filter,
  Download,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TimeEntry,
  TimeCategory,
  Break,
  FocusSession,
  ProductivitySettings,
  defaultTimeCategories,
} from "@shared/time-management-types";

interface TimeTrackingProps {
  userId?: string;
  onTimeEntryUpdate?: (entry: TimeEntry) => void;
}

export default function TimeTracking({ userId = "current-user", onTimeEntryUpdate }: TimeTrackingProps) {
  // Timer state
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [currentTime, setCurrentTime] = useState(0); // seconds
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Time entries and history
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [categories, setCategories] = useState<TimeCategory[]>(defaultTimeCategories);
  const [breaks, setBreaks] = useState<Break[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);

  // Form state
  const [taskDescription, setTaskDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [isBillable, setIsBillable] = useState(false);
  const [newTag, setNewTag] = useState("");

  // Focus session state
  const [focusMode, setFocusMode] = useState(false);
  const [focusTarget, setFocusTarget] = useState(25); // minutes
  const [focusDescription, setFocusDescription] = useState("");

  // Settings
  const [settings, setSettings] = useState<ProductivitySettings>({
    userId,
    autoTrackIdle: true,
    idleTimeThreshold: 5,
    reminderInterval: 30,
    trackBreaks: true,
    focusSessionDuration: 25,
    dailyHourTarget: 8,
    weeklyHourTarget: 40,
    categories: defaultTimeCategories,
  });

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        setCurrentTime(prev => prev + 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, isPaused]);

  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const todayEntries = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    return timeEntries.filter(entry => {
      const entryDate = new Date(entry.createdAt);
      return entryDate >= today && entryDate < tomorrow;
    });
  }, [timeEntries]);

  const todayTotal = useMemo(() => {
    return todayEntries.reduce((total, entry) => {
      if (entry.duration) {
        return total + entry.duration;
      }
      if (entry.startTime && entry.endTime) {
        const duration = (new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / (1000 * 60);
        return total + duration;
      }
      return total;
    }, 0);
  }, [todayEntries]);

  const startTimer = useCallback(() => {
    if (!taskDescription.trim() || !selectedCategory) {
      return;
    }

    const newEntry: TimeEntry = {
      id: Date.now().toString(),
      userId,
      startTime: new Date(),
      description: taskDescription,
      category: categories.find(c => c.id === selectedCategory)!,
      tags,
      billable: isBillable,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setActiveEntry(newEntry);
    setIsRunning(true);
    setIsPaused(false);
    setCurrentTime(0);
  }, [taskDescription, selectedCategory, categories, tags, isBillable, userId]);

  const pauseTimer = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeTimer = useCallback(() => {
    setIsPaused(false);
  }, []);

  const stopTimer = useCallback(() => {
    if (!activeEntry) return;

    const endTime = new Date();
    const duration = Math.floor(currentTime / 60); // convert to minutes

    const completedEntry: TimeEntry = {
      ...activeEntry,
      endTime,
      duration,
      status: 'completed',
      updatedAt: new Date(),
    };

    setTimeEntries(prev => [...prev, completedEntry]);
    setActiveEntry(null);
    setIsRunning(false);
    setIsPaused(false);
    setCurrentTime(0);
    setTaskDescription("");
    setTags([]);
    
    onTimeEntryUpdate?.(completedEntry);
  }, [activeEntry, currentTime, onTimeEntryUpdate]);

  const startBreak = useCallback((type: Break['type']) => {
    if (isRunning) {
      pauseTimer();
    }

    const newBreak: Break = {
      id: Date.now().toString(),
      userId,
      startTime: new Date(),
      type,
    };

    setBreaks(prev => [...prev, newBreak]);
  }, [isRunning, pauseTimer, userId]);

  const endBreak = useCallback(() => {
    setBreaks(prev => prev.map(breakItem => {
      if (!breakItem.endTime) {
        return { ...breakItem, endTime: new Date() };
      }
      return breakItem;
    }));

    if (activeEntry && isPaused) {
      resumeTimer();
    }
  }, [activeEntry, isPaused, resumeTimer]);

  const startFocusSession = useCallback(() => {
    if (!focusDescription.trim()) return;

    const session: FocusSession = {
      id: Date.now().toString(),
      userId,
      startTime: new Date(),
      targetDuration: focusTarget,
      category: selectedCategory || 'focus',
      description: focusDescription,
      interruptions: 0,
      completed: false,
    };

    setFocusSessions(prev => [...prev, session]);
    setFocusMode(true);
    
    // Auto-start timer with focus session
    setTaskDescription(focusDescription);
    startTimer();
  }, [focusDescription, focusTarget, selectedCategory, userId, startTimer]);

  const addTag = useCallback(() => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags(prev => [...prev, newTag.trim()]);
      setNewTag("");
    }
  }, [newTag, tags]);

  const removeTag = useCallback((tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  }, []);

  const dailyProgress = (todayTotal / (settings.dailyHourTarget * 60)) * 100;
  const activeBreak = breaks.find(b => !b.endTime);

  return (
    <div className="space-y-6">
      {/* Current Timer Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Time Tracker
          </CardTitle>
          <CardDescription>
            Track your time and stay productive throughout the day
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timer Display */}
          <div className="text-center">
            <div className="text-6xl font-mono font-bold text-primary mb-2">
              {formatTime(currentTime)}
            </div>
            {activeEntry && (
              <div className="text-lg text-muted-foreground">
                {activeEntry.description}
              </div>
            )}
            {isPaused && (
              <Badge variant="secondary" className="mt-2">
                Paused
              </Badge>
            )}
            {activeBreak && (
              <Badge variant="outline" className="mt-2">
                On {activeBreak.type} break
              </Badge>
            )}
          </div>

          {/* Timer Controls */}
          <div className="flex justify-center gap-3">
            {!isRunning ? (
              <Button 
                onClick={startTimer} 
                size="lg"
                disabled={!taskDescription.trim() || !selectedCategory}
              >
                <Play className="h-4 w-4 mr-2" />
                Start
              </Button>
            ) : (
              <>
                {isPaused ? (
                  <Button onClick={resumeTimer} size="lg">
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </Button>
                ) : (
                  <Button onClick={pauseTimer} size="lg" variant="outline">
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                )}
                <Button onClick={stopTimer} size="lg" variant="destructive">
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              </>
            )}
          </div>

          {/* Break Controls */}
          {!activeBreak ? (
            <div className="flex justify-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => startBreak('short')}
              >
                <Coffee className="h-4 w-4 mr-2" />
                Short Break
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => startBreak('lunch')}
              >
                <Coffee className="h-4 w-4 mr-2" />
                Lunch Break
              </Button>
            </div>
          ) : (
            <div className="flex justify-center">
              <Button onClick={endBreak} variant="outline">
                End Break
              </Button>
            </div>
          )}

          {/* Task Input */}
          {!isRunning && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="task-description">What are you working on?</Label>
                <Textarea
                  id="task-description"
                  placeholder="Describe your task..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: category.color }}
                            />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="billable"
                    checked={isBillable}
                    onCheckedChange={setIsBillable}
                  />
                  <Label htmlFor="billable">Billable</Label>
                </div>
              </div>

              {/* Tags */}
              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="secondary" 
                      className="cursor-pointer"
                      onClick={() => removeTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add tag..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                      className="w-32"
                    />
                    <Button size="sm" onClick={addTag}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Today's Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {Math.floor(todayTotal / 60)}h {todayTotal % 60}m of {settings.dailyHourTarget}h target
              </span>
              <span className="text-sm font-medium">
                {Math.round(dailyProgress)}%
              </span>
            </div>
            <Progress value={Math.min(dailyProgress, 100)} className="h-2" />
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {todayEntries.length}
                </div>
                <div className="text-xs text-muted-foreground">Tasks</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {Math.floor(todayTotal / 60)}h {todayTotal % 60}m
                </div>
                <div className="text-xs text-muted-foreground">Time Logged</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {todayEntries.filter(e => e.billable).length}
                </div>
                <div className="text-xs text-muted-foreground">Billable</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Focus Session */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Focus className="h-5 w-5" />
            Focus Session
          </CardTitle>
          <CardDescription>
            Start a focused work session with the Pomodoro technique
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!focusMode ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="focus-description">Focus session goal</Label>
                <Input
                  id="focus-description"
                  placeholder="What will you focus on?"
                  value={focusDescription}
                  onChange={(e) => setFocusDescription(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="focus-target">Duration (minutes)</Label>
                <Select value={focusTarget.toString()} onValueChange={(v) => setFocusTarget(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="25">25 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={startFocusSession}
                disabled={!focusDescription.trim()}
                className="w-full"
              >
                <Focus className="h-4 w-4 mr-2" />
                Start Focus Session
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-lg font-medium text-primary mb-2">
                🎯 Focus Mode Active
              </div>
              <div className="text-sm text-muted-foreground">
                Stay focused on: {focusDescription}
              </div>
              <Button 
                onClick={() => setFocusMode(false)}
                variant="outline"
                size="sm"
                className="mt-4"
              >
                End Focus Session
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Today's Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {todayEntries.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No time entries for today yet
                </div>
              ) : (
                todayEntries.map((entry) => (
                  <div 
                    key={entry.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.category.color }}
                      />
                      <div>
                        <div className="font-medium">{entry.description}</div>
                        <div className="text-sm text-muted-foreground">
                          {entry.category.name}
                          {entry.billable && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Billable
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {entry.duration ? `${Math.floor(entry.duration / 60)}h ${entry.duration % 60}m` : 'Active'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(entry.startTime).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
