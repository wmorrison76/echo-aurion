import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowRight,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Navigation,
  MousePointer,
  Eye,
  Play,
  Pause,
  Square,
  SkipForward,
  RotateCcw,
  CheckCircle,
  X,
  Lightbulb,
  Target,
  Route,
  MapPin,
  Compass,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector or element ID
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action: 'click' | 'hover' | 'navigate' | 'observe';
  arrowDirection?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  highlight?: boolean;
}

interface TutorialPath {
  id: string;
  name: string;
  description: string;
  category: 'navigation' | 'feature' | 'workflow' | 'advanced';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // in minutes
  steps: NavigationStep[];
  icon: React.ElementType;
}

const tutorialPaths: TutorialPath[] = [
  {
    id: 'basic-navigation',
    name: 'Basic Navigation Tour',
    description: 'Learn how to navigate the main areas of the application',
    category: 'navigation',
    difficulty: 'beginner',
    estimatedTime: 5,
    icon: Navigation,
    steps: [
      {
        id: 'step-1',
        title: 'Welcome to EchoCRM',
        description: 'This is the main dashboard where you can see an overview of all activities',
        target: 'main',
        position: 'center',
        action: 'observe',
        delay: 2000,
      },
      {
        id: 'step-2',
        title: 'Sidebar Navigation',
        description: 'The sidebar on the left contains all main navigation links. Hover to expand it.',
        target: 'aside',
        position: 'right',
        action: 'hover',
        arrowDirection: 'left',
        highlight: true,
      },
      {
        id: 'step-3',
        title: 'Top Navigation Bar',
        description: 'The top bar contains search, notifications, and user settings',
        target: 'nav',
        position: 'bottom',
        action: 'observe',
        arrowDirection: 'up',
        highlight: true,
      },
      {
        id: 'step-4',
        title: 'Menu Bar',
        description: 'The dock-style menu provides quick access to frequently used features',
        target: '.dock-container',
        position: 'bottom',
        action: 'observe',
        arrowDirection: 'up',
        highlight: true,
      },
      {
        id: 'step-5',
        title: 'View Selector',
        description: 'Change your view mode and filter options here',
        target: '.main-content-container',
        position: 'left',
        action: 'click',
        arrowDirection: 'right',
      },
    ],
  },
  {
    id: 'events-workflow',
    name: 'Events Management Workflow',
    description: 'Learn how to create and manage events efficiently',
    category: 'workflow',
    difficulty: 'intermediate',
    estimatedTime: 8,
    icon: Target,
    steps: [
      {
        id: 'step-1',
        title: 'Navigate to Events',
        description: 'Click on the Events link in the sidebar to access event management',
        target: 'a[href="/events"]',
        position: 'right',
        action: 'click',
        arrowDirection: 'left',
        highlight: true,
      },
      {
        id: 'step-2',
        title: 'Events Calendar View',
        description: 'This is the main events calendar where you can see all scheduled events',
        target: '.calendar-container',
        position: 'top',
        action: 'observe',
        arrowDirection: 'down',
        delay: 1000,
      },
      {
        id: 'step-3',
        title: 'Create New Event',
        description: 'Click the "New Event" button to create a new event',
        target: 'button:contains("New Event")',
        position: 'bottom',
        action: 'click',
        arrowDirection: 'up',
        highlight: true,
      },
      {
        id: 'step-4',
        title: 'Event Form',
        description: 'Fill out the event details in this form',
        target: '.dialog-content',
        position: 'left',
        action: 'observe',
        arrowDirection: 'right',
        delay: 2000,
      },
    ],
  },
  {
    id: 'sales-meeting-demo',
    name: 'Sales Meeting Platform',
    description: 'Explore the collaborative sales meeting tools',
    category: 'feature',
    difficulty: 'advanced',
    estimatedTime: 12,
    icon: Route,
    steps: [
      {
        id: 'step-1',
        title: 'Access Sales Meeting',
        description: 'Navigate to the Sales Meeting platform from the sidebar',
        target: 'a[href="/sales-meeting"]',
        position: 'right',
        action: 'click',
        arrowDirection: 'left',
        highlight: true,
      },
      {
        id: 'step-2',
        title: 'Digital Whiteboard',
        description: 'This is the collaborative whiteboard where you can draw and annotate',
        target: '.whiteboard-container',
        position: 'top',
        action: 'observe',
        arrowDirection: 'down',
        delay: 1500,
      },
      {
        id: 'step-3',
        title: 'Whiteboard Tools',
        description: 'Select drawing tools from the toolbar above the whiteboard',
        target: '.whiteboard-toolbar',
        position: 'bottom',
        action: 'observe',
        arrowDirection: 'up',
        highlight: true,
      },
      {
        id: 'step-4',
        title: 'Participants Panel',
        description: 'View and manage meeting participants in this floating panel',
        target: '.participants-panel',
        position: 'left',
        action: 'observe',
        arrowDirection: 'right',
        highlight: true,
      },
      {
        id: 'step-5',
        title: 'Video Conference',
        description: 'The video conference panel allows face-to-face communication',
        target: '.video-panel',
        position: 'left',
        action: 'observe',
        arrowDirection: 'right',
        highlight: true,
      },
    ],
  },
  {
    id: 'analytics-insights',
    name: 'Analytics & Insights',
    description: 'Discover how to access and interpret analytics data',
    category: 'feature',
    difficulty: 'intermediate',
    estimatedTime: 6,
    icon: Compass,
    steps: [
      {
        id: 'step-1',
        title: 'Open Analytics',
        description: 'Click on Analytics in the sidebar to view performance metrics',
        target: 'a[href="/analytics"]',
        position: 'right',
        action: 'click',
        arrowDirection: 'left',
        highlight: true,
      },
      {
        id: 'step-2',
        title: 'Revenue Metrics',
        description: 'View your revenue performance and trends in these cards',
        target: '.revenue-cards',
        position: 'top',
        action: 'observe',
        arrowDirection: 'down',
        delay: 1000,
      },
      {
        id: 'step-3',
        title: 'Filter Options',
        description: 'Use these filters to customize your analytics view',
        target: '.analytics-filters',
        position: 'bottom',
        action: 'observe',
        arrowDirection: 'up',
        highlight: true,
      },
    ],
  },
];

interface NavigationTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPath?: string;
}

interface TutorialOverlayProps {
  step: NavigationStep;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onStop: () => void;
  currentStepIndex: number;
  totalSteps: number;
  isPlaying: boolean;
  onPlayPause: () => void;
}

function TutorialOverlay({
  step,
  onNext,
  onPrevious,
  onSkip,
  onStop,
  currentStepIndex,
  totalSteps,
  isPlaying,
  onPlayPause,
}: TutorialOverlayProps) {
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [overlayPosition, setOverlayPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const element = document.querySelector(step.target) as HTMLElement;
    if (element) {
      setTargetElement(element);
      
      // Highlight the target element
      if (step.highlight) {
        element.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3)';
        element.style.position = 'relative';
        element.style.zIndex = '9998';
        element.style.transition = 'all 0.3s ease-in-out';
      }

      // Calculate overlay position
      const rect = element.getBoundingClientRect();
      let top = 0, left = 0;

      switch (step.position) {
        case 'top':
          top = rect.top - 120;
          left = rect.left + rect.width / 2 - 200;
          break;
        case 'bottom':
          top = rect.bottom + 20;
          left = rect.left + rect.width / 2 - 200;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - 100;
          left = rect.left - 420;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - 100;
          left = rect.right + 20;
          break;
        case 'center':
          top = window.innerHeight / 2 - 100;
          left = window.innerWidth / 2 - 200;
          break;
      }

      setOverlayPosition({ top, left });
    }

    return () => {
      if (element && step.highlight) {
        element.style.boxShadow = '';
        element.style.zIndex = '';
      }
    };
  }, [step]);

  const getArrowIcon = () => {
    switch (step.arrowDirection) {
      case 'up': return <ArrowUp className="h-6 w-6 text-primary animate-bounce" />;
      case 'down': return <ArrowDown className="h-6 w-6 text-primary animate-bounce" />;
      case 'left': return <ArrowLeft className="h-6 w-6 text-primary animate-bounce" />;
      case 'right': return <ArrowRight className="h-6 w-6 text-primary animate-bounce" />;
      default: return null;
    }
  };

  return (
    <>
      {/* Dark overlay */}
      <div className="fixed inset-0 bg-black/50 z-[9997]" />
      
      {/* Tutorial card */}
      <div
        className="fixed z-[9999] w-96"
        style={{ top: overlayPosition.top, left: overlayPosition.left }}
      >
        <Card className="bg-background/95 backdrop-blur-xl border-2 border-primary/20 shadow-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                Step {currentStepIndex + 1} of {totalSteps}
              </Badge>
              <Button variant="ghost" size="sm" onClick={onStop} className="h-6 w-6 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardTitle className="text-lg flex items-center gap-2">
              {step.arrowDirection && getArrowIcon()}
              {step.title}
            </CardTitle>
            <CardDescription className="text-sm">
              {step.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPrevious}
                  disabled={currentStepIndex === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPlayPause}
                  className="w-10 h-8 p-0"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onSkip}>
                  Skip
                </Button>
                <Button size="sm" onClick={onNext}>
                  {currentStepIndex === totalSteps - 1 ? 'Finish' : 'Next'}
                </Button>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function NavigationTutorial({ isOpen, onClose, selectedPath }: NavigationTutorialProps) {
  const [activeTutorial, setActiveTutorial] = useState<TutorialPath | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const stepTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (selectedPath) {
      const path = tutorialPaths.find(p => p.id === selectedPath);
      if (path) {
        setActiveTutorial(path);
        setCurrentStepIndex(0);
        setIsRunning(true);
        setIsPlaying(true);
      }
    }
  }, [selectedPath]);

  useEffect(() => {
    if (isPlaying && activeTutorial && isRunning) {
      const currentStep = activeTutorial.steps[currentStepIndex];
      if (currentStep?.delay) {
        stepTimeoutRef.current = setTimeout(() => {
          handleNext();
        }, currentStep.delay);
      }
    }

    return () => {
      if (stepTimeoutRef.current) {
        clearTimeout(stepTimeoutRef.current);
      }
    };
  }, [isPlaying, currentStepIndex, activeTutorial, isRunning]);

  const handleStartTutorial = (tutorial: TutorialPath) => {
    setActiveTutorial(tutorial);
    setCurrentStepIndex(0);
    setIsRunning(true);
    setIsPlaying(true);
  };

  const handleNext = () => {
    if (!activeTutorial) return;
    
    if (currentStepIndex < activeTutorial.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleStopTutorial();
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleStopTutorial = () => {
    setIsRunning(false);
    setIsPlaying(false);
    setActiveTutorial(null);
    setCurrentStepIndex(0);
    if (stepTimeoutRef.current) {
      clearTimeout(stepTimeoutRef.current);
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-700 border-green-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'advanced': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'navigation': return <Navigation className="h-4 w-4" />;
      case 'feature': return <Lightbulb className="h-4 w-4" />;
      case 'workflow': return <Route className="h-4 w-4" />;
      case 'advanced': return <Target className="h-4 w-4" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  return (
    <>
      <Dialog open={isOpen && !isRunning} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
                <Navigation className="h-6 w-6 text-white" />
              </div>
              Navigation Tutorials
            </DialogTitle>
            <DialogDescription>
              Interactive tutorials to help you navigate and use EchoCRM effectively. 
              Each tutorial includes step-by-step guidance with visual arrows and highlights.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tutorialPaths.map((tutorial) => {
              const Icon = tutorial.icon;
              return (
                <Card key={tutorial.id} className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{tutorial.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={getDifficultyColor(tutorial.difficulty)}>
                              {tutorial.difficulty}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {getCategoryIcon(tutorial.category)}
                              <span className="ml-1 capitalize">{tutorial.category}</span>
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div>{tutorial.estimatedTime} min</div>
                        <div>{tutorial.steps.length} steps</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <CardDescription className="text-sm">
                      {tutorial.description}
                    </CardDescription>
                    <Button 
                      onClick={() => handleStartTutorial(tutorial)}
                      className="w-full"
                      size="sm"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Tutorial
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tutorial Overlay */}
      {isRunning && activeTutorial && (
        <TutorialOverlay
          step={activeTutorial.steps[currentStepIndex]}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onSkip={handleSkip}
          onStop={handleStopTutorial}
          currentStepIndex={currentStepIndex}
          totalSteps={activeTutorial.steps.length}
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
        />
      )}
    </>
  );
}
