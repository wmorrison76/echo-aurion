import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  ArrowUpLeft,
  ArrowDownLeft,
  HelpCircle,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  X,
  CheckCircle,
  MessageSquare,
  Lightbulb,
  Zap,
  Shield,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector for the target element
  position: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  action?: 'click' | 'hover' | 'type' | 'wait' | 'scroll';
  actionData?: {
    text?: string;
    waitTime?: number;
    scrollTarget?: string;
  };
  optional?: boolean;
  prerequisite?: string; // Another step ID that must be completed first
  validation?: () => boolean; // Function to validate step completion
  autoAdvance?: boolean; // Automatically advance after action
  highlight?: boolean; // Whether to highlight the target element
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: 'getting-started' | 'beo-reo' | 'ai-features' | 'analytics' | 'admin';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // in minutes
  prerequisites?: string[]; // Tutorial IDs that should be completed first
  steps: TutorialStep[];
  tags?: string[];
}

// Sample tutorials
const sampleTutorials: Tutorial[] = [
  {
    id: 'menu-analytics-guide',
    title: 'Menu Analytics & Best Sellers',
    description: 'Learn to track best-selling items and optimize your menu for maximum revenue',
    category: 'analytics',
    difficulty: 'beginner',
    estimatedTime: 7,
    steps: [
      {
        id: 'menu-step-1',
        title: 'Open Menu Analytics',
        description: 'Navigate to the Menu Analytics page to start analyzing your best-selling items.',
        target: '[href="/menu-analytics"]',
        position: 'right',
        action: 'click',
        highlight: true,
      },
      {
        id: 'menu-step-2',
        title: 'Generate Performance Report',
        description: 'Click "Generate Full Report" to analyze all menu items across all outlets.',
        target: 'button:contains("View All Outlets")',
        position: 'bottom',
        action: 'click',
        highlight: true,
      },
      {
        id: 'menu-step-3',
        title: 'Review Recommendations',
        description: 'The system analyzes your BEO/REO data and provides recommendations: Keep top performers, Promote hidden gems, Replace underperformers.',
        target: '.items-to-replace, .items-to-promote',
        position: 'left',
        action: 'wait',
        actionData: { waitTime: 3000 },
        highlight: true,
      },
      {
        id: 'menu-step-4',
        title: 'Export for Menu Planning',
        description: 'Export the report to share with your culinary team for menu revision decisions.',
        target: 'button:contains("Export Report")',
        position: 'top',
        action: 'click',
        highlight: true,
      }
    ]
  },
  {
    id: 'weather-integration-tutorial',
    title: 'Weather Intelligence for Events',
    description: 'Monitor weather conditions and get alerts for events that might be affected',
    category: 'ai-features',
    difficulty: 'beginner',
    estimatedTime: 5,
    steps: [
      {
        id: 'weather-step-1',
        title: 'Open Weather Radar',
        description: 'Click the Weather Radar button in the dashboard header to view live weather conditions.',
        target: 'button:contains("Weather Radar")',
        position: 'bottom',
        action: 'click',
        highlight: true,
      },
      {
        id: 'weather-step-2',
        title: 'View Event Locations',
        description: 'The radar shows all your event locations with real addresses. Events with weather alerts are highlighted.',
        target: 'button:contains("Events")',
        position: 'left',
        action: 'click',
        highlight: true,
      },
      {
        id: 'weather-step-3',
        title: 'Check Weather Alerts',
        description: 'If you see weather alert notifications, click to view detailed impact analysis and recommendations.',
        target: 'button:contains("Alert")',
        position: 'bottom',
        action: 'click',
        highlight: true,
        optional: true,
      },
      {
        id: 'weather-step-4',
        title: 'Monitor Storm Movement',
        description: 'Use the timeline controls to see how storms move and plan accordingly for your events.',
        target: 'button:contains("Play")',
        position: 'top',
        action: 'click',
        highlight: true,
      }
    ]
  },
  {
    id: 'create-first-beo',
    title: 'Create Your First BEO',
    description: 'Learn how to create a Banquet Event Order step by step',
    category: 'getting-started',
    difficulty: 'beginner',
    estimatedTime: 5,
    steps: [
      {
        id: 'step-1',
        title: 'Open BEO/REO Page',
        description: 'First, navigate to the BEO/REO management page where you can create and manage event orders.',
        target: '[href="/beo-reo"]',
        position: 'right',
        action: 'click',
        highlight: true,
      },
      {
        id: 'step-2',
        title: 'Click Create BEO/REO',
        description: 'Click the "Create BEO/REO" button to start creating a new event order.',
        target: 'button:contains("Create BEO/REO")',
        position: 'bottom',
        action: 'click',
        highlight: true,
      },
      {
        id: 'step-3',
        title: 'Select Order Type',
        description: 'Choose whether you want to create a BEO (Banquet Event Order) for catered events or REO (Room Event Order) for meetings.',
        target: 'select[placeholder*="Select type"]',
        position: 'top',
        action: 'click',
        highlight: true,
      },
      {
        id: 'step-4',
        title: 'Enter Event Details',
        description: 'Fill in the basic event information including name, date, time, and guest count.',
        target: 'input[placeholder*="Corporate Conference"]',
        position: 'top',
        action: 'type',
        actionData: { text: 'My First Event' },
        highlight: true,
      },
      {
        id: 'step-5',
        title: 'Save Your Event',
        description: 'Click "Create Order" to save your new BEO/REO.',
        target: 'button:contains("Create Order")',
        position: 'top',
        action: 'click',
        highlight: true,
      }
    ]
  },
  {
    id: 'competitive-analysis-review',
    title: 'Understanding Your Competitive Position',
    description: 'Review comprehensive market analysis and strategic recommendations',
    category: 'analytics',
    difficulty: 'intermediate',
    estimatedTime: 4,
    steps: [
      {
        id: 'comp-step-1',
        title: 'Access Documentation',
        description: 'The system has generated comprehensive competitive analysis documents. Access them through the help system or documentation area.',
        target: 'button:contains("Help")',
        position: 'bottom',
        action: 'click',
        highlight: true,
      },
      {
        id: 'comp-step-2',
        title: 'Review Strengths',
        description: 'Your key competitive advantages include: Weather Integration (industry-first), Advanced Document Intelligence, and Integrated Sales-to-Execution Pipeline.',
        target: '.competitive-advantages',
        position: 'left',
        action: 'wait',
        actionData: { waitTime: 4000 },
        highlight: true,
      },
      {
        id: 'comp-step-3',
        title: 'Identify Improvement Areas',
        description: 'Focus areas for growth: Integration Ecosystem expansion, Mobile Applications development, and Marketing Automation features.',
        target: '.improvement-areas',
        position: 'right',
        action: 'wait',
        actionData: { waitTime: 3000 },
        highlight: true,
      }
    ]
  },
  {
    id: 'use-ai-assistant',
    title: 'Using Enhanced AI Features',
    description: 'Discover weather intelligence, menu optimization, and competitive insights powered by AI',
    category: 'ai-features',
    difficulty: 'beginner',
    estimatedTime: 4,
    steps: [
      {
        id: 'ai-step-1',
        title: 'Access AI-Powered Analytics',
        description: 'Multiple AI systems now enhance your workflow: Menu Analytics for optimization, Weather Intelligence for event protection, and Competitive Analysis for strategy.',
        target: 'button:contains("Menu Analytics")',
        position: 'bottom',
        action: 'click',
        highlight: true,
      },
      {
        id: 'ai-step-2',
        title: 'Review AI Recommendations',
        description: 'The AI analyzes patterns in your data to provide specific recommendations for menu items, weather planning, and competitive positioning.',
        target: '.recommendations',
        position: 'left',
        action: 'wait',
        actionData: { waitTime: 3000 },
        highlight: true,
      },
      {
        id: 'ai-step-3',
        title: 'Implement AI Insights',
        description: 'Use AI-generated insights to make data-driven decisions about menu changes, event planning, and business strategy.',
        target: 'button:contains("Export")',
        position: 'top',
        action: 'click',
        highlight: true,
      }
    ]
  }
];

// Tutorial context
interface TutorialContextType {
  currentTutorial: Tutorial | null;
  currentStep: number;
  isActive: boolean;
  startTutorial: (tutorialId: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipStep: () => void;
  stopTutorial: () => void;
  restartTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | null>(null);

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};

// Helper function to find element by selector
const findElement = (selector: string): Element | null => {
  try {
    // Handle special selectors like :contains()
    if (selector.includes(':contains(')) {
      const match = selector.match(/(.+):contains\("([^"]+)"\)/);
      if (match) {
        const [, baseSelector, text] = match;
        const elements = document.querySelectorAll(baseSelector);
        for (const element of elements) {
          if (element.textContent?.includes(text)) {
            return element;
          }
        }
      }
    }
    
    return document.querySelector(selector);
  } catch (error) {
    console.warn('Invalid selector:', selector, error);
    return null;
  }
};

// Arrow component that points to target elements
const Arrow = ({ 
  direction, 
  className 
}: { 
  direction: TutorialStep['position']; 
  className?: string; 
}) => {
  const icons = {
    'top': ArrowUp,
    'bottom': ArrowDown,
    'left': ArrowLeft,
    'right': ArrowRight,
    'top-left': ArrowUpLeft,
    'top-right': ArrowUpRight,
    'bottom-left': ArrowDownLeft,
    'bottom-right': ArrowDownRight,
  };
  
  const Icon = icons[direction];
  
  return (
    <Icon 
      className={cn(
        "h-6 w-6 text-primary animate-bounce", 
        className
      )} 
    />
  );
};

// Floating tooltip that appears next to target elements
const FloatingTooltip = ({ 
  step, 
  targetElement, 
  onNext, 
  onPrev, 
  onSkip, 
  onStop,
  isFirstStep,
  isLastStep,
  stepNumber,
  totalSteps 
}: {
  step: TutorialStep;
  targetElement: Element;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onStop: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  stepNumber: number;
  totalSteps: number;
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const updatePosition = () => {
      const rect = targetElement.getBoundingClientRect();
      const tooltipWidth = 320;
      const tooltipHeight = 200;
      const margin = 20;
      
      let x = 0;
      let y = 0;
      
      switch (step.position) {
        case 'top':
          x = rect.left + rect.width / 2 - tooltipWidth / 2;
          y = rect.top - tooltipHeight - margin;
          break;
        case 'bottom':
          x = rect.left + rect.width / 2 - tooltipWidth / 2;
          y = rect.bottom + margin;
          break;
        case 'left':
          x = rect.left - tooltipWidth - margin;
          y = rect.top + rect.height / 2 - tooltipHeight / 2;
          break;
        case 'right':
          x = rect.right + margin;
          y = rect.top + rect.height / 2 - tooltipHeight / 2;
          break;
        case 'top-left':
          x = rect.left - tooltipWidth - margin;
          y = rect.top - tooltipHeight - margin;
          break;
        case 'top-right':
          x = rect.right + margin;
          y = rect.top - tooltipHeight - margin;
          break;
        case 'bottom-left':
          x = rect.left - tooltipWidth - margin;
          y = rect.bottom + margin;
          break;
        case 'bottom-right':
          x = rect.right + margin;
          y = rect.bottom + margin;
          break;
      }
      
      // Keep tooltip within viewport
      x = Math.max(margin, Math.min(x, window.innerWidth - tooltipWidth - margin));
      y = Math.max(margin, Math.min(y, window.innerHeight - tooltipHeight - margin));
      
      setPosition({ x, y });
    };
    
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [targetElement, step.position]);
  
  return createPortal(
    <div
      className="fixed z-[1000] w-80"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <Card className="glass-panel apple-button border-primary/50 shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-primary" />
              <Badge variant="outline" className="text-xs">
                Step {stepNumber} of {totalSteps}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onStop}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <CardTitle className="text-base leading-tight">{step.title}</CardTitle>
          <CardDescription className="text-sm">{step.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={(stepNumber / totalSteps) * 100} className="w-full h-2" />
          
          {step.action && (
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center space-x-2 text-xs text-blue-700 dark:text-blue-300">
                <Bot className="h-3 w-3" />
                <span>
                  {step.action === 'click' && 'Click the highlighted element'}
                  {step.action === 'hover' && 'Hover over the highlighted element'}
                  {step.action === 'type' && 'Type in the highlighted field'}
                  {step.action === 'wait' && 'Wait for the process to complete'}
                  {step.action === 'scroll' && 'Scroll to view the element'}
                </span>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onPrev}
                disabled={isFirstStep}
              >
                Previous
              </Button>
              {step.optional && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSkip}
                >
                  Skip
                </Button>
              )}
            </div>
            
            <Button
              size="sm"
              onClick={onNext}
              className="bg-primary hover:bg-primary/90"
            >
              {isLastStep ? 'Finish' : 'Next'}
              {!isLastStep && <ArrowRight className="h-3 w-3 ml-1" />}
              {isLastStep && <CheckCircle className="h-3 w-3 ml-1" />}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Arrow pointing to target */}
      <div className="absolute" style={{
        top: step.position.includes('top') ? '100%' : 
             step.position.includes('bottom') ? '-24px' : '50%',
        left: step.position.includes('left') ? '100%' : 
              step.position.includes('right') ? '-24px' : '50%',
        transform: step.position.includes('top') || step.position.includes('bottom') ? 
                  'translateX(-50%)' : 'translateY(-50%)',
      }}>
        <Arrow direction={step.position} />
      </div>
    </div>,
    document.body
  );
};

// Main EchoHelp component
export const EchoHelp = ({ 
  onTutorialRequest 
}: { 
  onTutorialRequest?: (query: string) => void; 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTutorial, setCurrentTutorial] = useState<Tutorial | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [highlightedElement, setHighlightedElement] = useState<Element | null>(null);
  
  const highlightStyle = useRef<HTMLStyleElement | null>(null);
  
  // Create highlight overlay for target elements
  useEffect(() => {
    if (!highlightStyle.current) {
      highlightStyle.current = document.createElement('style');
      document.head.appendChild(highlightStyle.current);
    }
    
    if (isActive && currentTutorial && highlightedElement) {
      const rect = highlightedElement.getBoundingClientRect();
      highlightStyle.current.textContent = `
        .echo-help-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.5);
          z-index: 999;
          pointer-events: none;
        }
        .echo-help-highlight {
          position: fixed;
          top: ${rect.top - 4}px;
          left: ${rect.left - 4}px;
          width: ${rect.width + 8}px;
          height: ${rect.height + 8}px;
          border: 2px solid hsl(var(--primary));
          border-radius: 8px;
          box-shadow: 0 0 20px hsl(var(--primary) / 0.5);
          z-index: 1001;
          pointer-events: none;
          animation: echo-help-pulse 2s infinite;
        }
        @keyframes echo-help-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.02); }
        }
      `;
    } else {
      highlightStyle.current.textContent = '';
    }
    
    return () => {
      if (highlightStyle.current) {
        highlightStyle.current.textContent = '';
      }
    };
  }, [isActive, currentTutorial, highlightedElement, currentStep]);
  
  const startTutorial = useCallback((tutorialId: string) => {
    const tutorial = sampleTutorials.find(t => t.id === tutorialId);
    if (tutorial) {
      setCurrentTutorial(tutorial);
      setCurrentStep(0);
      setIsActive(true);
      setIsOpen(false);
    }
  }, []);
  
  const stopTutorial = useCallback(() => {
    setIsActive(false);
    setCurrentTutorial(null);
    setCurrentStep(0);
    setHighlightedElement(null);
  }, []);
  
  const nextStep = useCallback(() => {
    if (currentTutorial && currentStep < currentTutorial.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      stopTutorial();
    }
  }, [currentTutorial, currentStep, stopTutorial]);
  
  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);
  
  const skipStep = useCallback(() => {
    nextStep();
  }, [nextStep]);
  
  const restartTutorial = useCallback(() => {
    if (currentTutorial) {
      setCurrentStep(0);
    }
  }, [currentTutorial]);
  
  // Update highlighted element when step changes
  useEffect(() => {
    if (isActive && currentTutorial) {
      const step = currentTutorial.steps[currentStep];
      if (step && step.highlight) {
        const element = findElement(step.target);
        setHighlightedElement(element);
        
        // Scroll element into view
        if (element) {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'center' 
          });
        }
      } else {
        setHighlightedElement(null);
      }
    }
  }, [isActive, currentTutorial, currentStep]);
  
  const contextValue: TutorialContextType = {
    currentTutorial,
    currentStep,
    isActive,
    startTutorial,
    nextStep,
    prevStep,
    skipStep,
    stopTutorial,
    restartTutorial,
  };
  
  const currentStepData = currentTutorial?.steps[currentStep];
  const targetElement = currentStepData?.target ? findElement(currentStepData.target) : null;
  
  return (
    <TutorialContext.Provider value={contextValue}>
      {/* Tutorial Launcher Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="h-9 w-9 apple-button"
        title="EchoHelp - Interactive Tutorials"
      >
        <HelpCircle className="h-4 w-4" />
      </Button>
      
      {/* Tutorial Selection Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="glass-panel max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center">
              <div className="p-2 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg mr-3">
                <Shield className="h-6 w-6 text-white" />
              </div>
              EchoHelp Interactive Tutorials
            </DialogTitle>
            <DialogDescription>
              Get step-by-step guidance with visual walkthroughs for all features including Menu Analytics, Weather Intelligence, and competitive positioning tools.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {sampleTutorials.map((tutorial) => (
              <Card key={tutorial.id} className="glass-panel apple-button cursor-pointer hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{tutorial.title}</CardTitle>
                      <CardDescription className="mt-1">{tutorial.description}</CardDescription>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <Badge variant="outline" className="capitalize text-xs">
                        {tutorial.difficulty}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {tutorial.estimatedTime} min
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {tutorial.steps.length} steps
                    </div>
                    <Button
                      size="sm"
                      onClick={() => startTutorial(tutorial.id)}
                      className="apple-button"
                    >
                      <Play className="h-3 w-3 mr-2" />
                      Start Tutorial
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Active Tutorial Overlay */}
      {isActive && (
        <>
          <div className="echo-help-overlay" />
          {highlightedElement && <div className="echo-help-highlight" />}
        </>
      )}
      
      {/* Active Tutorial Tooltip */}
      {isActive && currentTutorial && currentStepData && targetElement && (
        <FloatingTooltip
          step={currentStepData}
          targetElement={targetElement}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipStep}
          onStop={stopTutorial}
          isFirstStep={currentStep === 0}
          isLastStep={currentStep === currentTutorial.steps.length - 1}
          stepNumber={currentStep + 1}
          totalSteps={currentTutorial.steps.length}
        />
      )}
    </TutorialContext.Provider>
  );
};

export default EchoHelp;
