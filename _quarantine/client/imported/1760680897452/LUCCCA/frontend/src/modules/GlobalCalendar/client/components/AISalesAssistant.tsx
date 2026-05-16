import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Bot,
  Sparkles,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  Heart,
  Star,
  Gift,
  Camera,
  Music,
  Utensils,
  Lightbulb,
  Target,
  CheckCircle,
  Plus,
  MessageSquare,
  Zap,
  Shield,
  BrainCircuit,
  Send,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  AlertTriangle,
  Clock,
  Phone,
  Mail,
  FileText,
  Headphones,
  Award,
  TrendingDown,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AIsuggestion {
  id: string;
  category: 'enhancement' | 'personalization' | 'upsell' | 'experience' | 'objection_handling';
  title: string;
  description: string;
  estimatedCost: number;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  reasoning: string;
  examples?: string[];
  implementation: string;
}

interface ObjectionHandling {
  id: string;
  objectionType: 'price' | 'timing' | 'authority' | 'competition' | 'value' | 'need';
  objection: string;
  response: string;
  empathyStatement: string;
  followUpQuestions: string[];
  supportingEvidence?: string[];
  alternatives?: string[];
  confidence: number;
}

interface SalesGuidance {
  id: string;
  scenario: string;
  recommendation: string;
  reasoning: string;
  nextSteps: string[];
  successMetrics: string[];
  riskFactors?: string[];
}

interface EventContext {
  type?: string;
  guestCount?: number;
  budget?: number;
  venue?: string;
  clientIndustry?: string;
  eventGoals?: string[];
  previousEvents?: string[];
  seasonality?: string;
  demographics?: {
    ageRange?: string;
    interests?: string[];
    culturalConsiderations?: string[];
  };
}

interface AISalesAssistantProps {
  eventContext?: EventContext;
  onSuggestionApply?: (suggestion: AIsuggestion) => void;
  userLevel?: 'new' | 'experienced' | 'expert';
}

const mockObjectionHandling: ObjectionHandling[] = [
  {
    id: 'obj-1',
    objectionType: 'price',
    objection: 'Your pricing seems higher than other venues we\'ve looked at.',
    empathyStatement: 'I completely understand your concern about the investment. Budget is always an important consideration when planning a significant event.',
    response: 'You\'re absolutely right to compare options. What I\'ve found is that when we break down the total value - including our award-winning catering, dedicated coordination, premium AV equipment, and post-event services - our clients typically find we actually provide more value per dollar than competitors.',
    followUpQuestions: [
      'What specific services are most important to you for this event?',
      'Would it be helpful if I showed you a detailed breakdown of what\'s included?',
      'Are there any services from your previous quotes that you felt were missing or inadequate?'
    ],
    supportingEvidence: [
      '98% client satisfaction rating',
      'Average 40% cost savings on outside vendor coordination',
      'Included services that competitors charge extra for'
    ],
    alternatives: [
      'Seasonal pricing options',
      'Customized package to match your budget',
      'Payment plan options'
    ],
    confidence: 0.92
  },
  {
    id: 'obj-2',
    objectionType: 'timing',
    objection: 'We need more time to think about it and discuss with our team.',
    empathyStatement: 'That makes perfect sense. This is a significant decision and it\'s important that everyone on your team feels confident about the choice.',
    response: 'I completely respect that you want to take time for a thorough discussion. Many of our best clients have told me they appreciated having space to evaluate all their options. To help facilitate your team discussion, I can provide a comprehensive proposal summary and be available for any follow-up questions.',
    followUpQuestions: [
      'What additional information would be most helpful for your team\'s discussion?',
      'Is there a specific timeline that would work best for a follow-up conversation?',
      'Are there particular concerns or questions from team members I could address now?'
    ],
    supportingEvidence: [
      'Detailed proposal with transparent pricing',
      'References from similar organizations',
      'Flexible booking timeline'
    ],
    alternatives: [
      'Soft hold on your preferred date while you decide',
      'Additional site visit for key decision-makers',
      'Customized presentation for your team'
    ],
    confidence: 0.89
  },
  {
    id: 'obj-3',
    objectionType: 'authority',
    objection: 'I need to get approval from my manager/board before making this decision.',
    empathyStatement: 'I absolutely understand. Getting proper approval is crucial for a decision of this magnitude, and I respect your process.',
    response: 'This is completely normal for events of this scale. I work with many organizations that have approval processes. I\'d be happy to provide whatever materials or information would be most helpful for presenting to your manager or board. I can also make myself available to answer any questions they might have directly.',
    followUpQuestions: [
      'What information would be most compelling for your approval process?',
      'Would a brief presentation or detailed proposal work better for your manager/board?',
      'Are there specific concerns or criteria they typically evaluate?'
    ],
    supportingEvidence: [
      'Executive summary with ROI breakdown',
      'Risk mitigation and contingency plans',
      'References from similar organizational levels'
    ],
    alternatives: [
      'Executive presentation package',
      'Direct call with decision-makers',
      'Trial or smaller event proposal'
    ],
    confidence: 0.87
  },
  {
    id: 'obj-4',
    objectionType: 'competition',
    objection: 'We\'re also considering [Competitor Name] and they offered something similar.',
    empathyStatement: 'It\'s smart that you\'re exploring multiple options. Choosing the right venue is such an important decision, and due diligence is always wise.',
    response: 'I\'m glad you\'re being thorough in your evaluation. What I\'ve learned from clients who have compared us to other venues is that the real difference often comes down to the details of execution and the support you receive throughout the process. Would it be helpful if we discussed what specific aspects are most important to you?',
    followUpQuestions: [
      'What aspects of their proposal resonated most with you?',
      'Are there any concerns you have about their offering?',
      'What would make the difference in your final decision?'
    ],
    supportingEvidence: [
      'Detailed comparison chart of services',
      'Client testimonials mentioning competitive advantages',
      'Unique value propositions and exclusive services'
    ],
    alternatives: [
      'Match or enhance competitor offerings',
      'Highlight unique services not available elsewhere',
      'Provide additional value-adds'
    ],
    confidence: 0.91
  },
  {
    id: 'obj-5',
    objectionType: 'value',
    objection: 'We\'re not sure if we really need all these features for our event.',
    empathyStatement: 'That\'s a very practical perspective. You want to make sure you\'re investing in services that will truly enhance your event rather than just adding cost.',
    response: 'You\'re absolutely right to focus on value. The best events are often the ones where every element serves a specific purpose. Let\'s walk through your event goals and I can show you how each service directly supports what you\'re trying to achieve. We can also customize the package to focus on what matters most to you.',
    followUpQuestions: [
      'What are the top 3 goals you want to achieve with this event?',
      'Which elements of your event are absolutely essential versus nice-to-have?',
      'Have you had any experiences with events where certain services made a big difference?'
    ],
    supportingEvidence: [
      'Success stories showing ROI of specific services',
      'Customization options and flexible packages',
      'Post-event feedback highlighting value of services'
    ],
    alternatives: [
      'Essential services package',
      'Tiered service options',
      'Pay-for-performance arrangements'
    ],
    confidence: 0.85
  }
];

const mockSalesGuidance: SalesGuidance[] = [
  {
    id: 'guide-1',
    scenario: 'Client seems engaged but hasn\'t committed after multiple meetings',
    recommendation: 'Create urgency with a time-sensitive incentive while addressing remaining concerns',
    reasoning: 'Engaged prospects often just need a catalyst to move forward. This suggests they like the venue but may have lingering doubts or budget concerns.',
    nextSteps: [
      'Schedule a final decision call within 48 hours',
      'Offer a limited-time incentive (upgrade or discount)',
      'Address any remaining objections directly',
      'Provide social proof from similar successful events'
    ],
    successMetrics: [
      'Decision made within one week',
      'Client references the incentive as helpful',
      'Signed contract with minimal additional negotiations'
    ],
    riskFactors: [
      'Pushy approach might backfire',
      'May need to honor incentive for other clients',
      'Could signal desperation if not handled professionally'
    ]
  },
  {
    id: 'guide-2',
    scenario: 'Price objection from a client with a substantial budget',
    recommendation: 'Reframe the conversation around value and ROI rather than cost',
    reasoning: 'When budget isn\'t truly the issue, price objections often mask concerns about value or decision-making anxiety.',
    nextSteps: [
      'Ask about their definition of a successful event',
      'Present case studies with similar budgets',
      'Break down pricing to show cost-per-guest value',
      'Emphasize unique services that justify premium pricing'
    ],
    successMetrics: [
      'Client stops mentioning price as primary concern',
      'Focus shifts to event quality and success metrics',
      'Agreement on value proposition before discussing terms'
    ],
    riskFactors: [
      'Might be testing negotiation boundaries',
      'Could have genuine budget constraints not disclosed',
      'May be using price to delay decision'
    ]
  }
];

const mockSuggestions: AIsuggestion[] = [
  {
    id: 'sug-1',
    category: 'personalization',
    title: 'Custom Welcome Reception with Industry Networking',
    description: 'Create a themed welcome reception featuring industry-specific networking areas with custom signage and curated conversation starters.',
    estimatedCost: 2500,
    impact: 'high',
    confidence: 0.92,
    reasoning: 'Based on the corporate client type and 250+ guests, a structured networking approach increases engagement by 40% and client satisfaction by 35%.',
    examples: ['Tech industry: Innovation showcase stations', 'Healthcare: Wellness-themed refreshments', 'Finance: Market insight displays'],
    implementation: 'Coordinate with venue for space allocation, design custom signage, brief staff on facilitation techniques.'
  },
  {
    id: 'sug-2',
    category: 'enhancement',
    title: 'Live Social Media Wall with Event Hashtag',
    description: 'Install digital displays showing real-time social media posts from attendees using a custom event hashtag.',
    estimatedCost: 800,
    impact: 'medium',
    confidence: 0.87,
    reasoning: 'For corporate events with younger demographics, social media integration increases engagement by 60% and extends event reach beyond attendees.',
    implementation: 'Set up displays, create branded hashtag, assign social media monitor, provide posting guidelines.'
  },
  {
    id: 'sug-3',
    category: 'upsell',
    title: 'Professional Event Photography & Same-Day Delivery',
    description: 'Provide professional photographers with instant photo processing and delivery via branded USB drives or digital gallery.',
    estimatedCost: 1500,
    impact: 'high',
    confidence: 0.89,
    reasoning: 'Corporate clients value immediate content for internal communications. 85% of similar events that added this service reported increased satisfaction and future bookings.',
    implementation: 'Book photographers, set up processing station, create branded delivery materials, establish timeline for delivery.'
  },
  {
    id: 'sug-4',
    category: 'experience',
    title: 'Interactive Welcome Gifts with QR-Coded Event Guide',
    description: 'Create personalized welcome bags with QR codes linking to digital event guides, schedules, and networking profiles.',
    estimatedCost: 1200,
    impact: 'medium',
    confidence: 0.84,
    reasoning: 'Personalization increases perceived value by 45%. QR integration reduces paper waste and allows real-time updates to event information.',
    examples: ['Branded notebooks with QR codes', 'Local artisan gifts', 'Sustainable items aligned with company values'],
    implementation: 'Design QR system, source gifts, create digital platform, prepare personalized content for each attendee.'
  },
  {
    id: 'sug-5',
    category: 'personalization',
    title: 'Dietary Preference Pre-Screening & Custom Menu Cards',
    description: 'Implement advanced dietary screening with personalized menu cards placed at each seat showing customized meal options.',
    estimatedCost: 600,
    impact: 'high',
    confidence: 0.91,
    reasoning: 'Detailed dietary accommodation shows attention to detail and inclusivity. 78% of attendees remember events that properly accommodated their needs.',
    implementation: 'Create detailed dietary survey, coordinate with kitchen, design personalized menu cards, train serving staff.'
  },
  {
    id: 'sug-6',
    category: 'objection_handling',
    title: 'Proactive Budget Transparency with Value Breakdown',
    description: 'Present detailed cost breakdowns upfront showing cost-per-guest and included services to address price concerns before they arise.',
    estimatedCost: 0,
    impact: 'high',
    confidence: 0.88,
    reasoning: 'Transparency builds trust and prevents price objections. Clients who understand value proposition are 3x more likely to book.',
    examples: ['Cost-per-guest analysis showing competitive pricing', 'Service comparison chart vs competitors', 'ROI calculator for corporate events'],
    implementation: 'Create standardized pricing transparency tools, train sales team on value presentation, develop ROI calculators.'
  }
];

export default function AISalesAssistant({ 
  eventContext = {}, 
  onSuggestionApply,
  userLevel = 'experienced' 
}: AISalesAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<AIsuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("suggestions");
  const [chatMessages, setChatMessages] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>>([]);
  const [userInput, setUserInput] = useState("");
  const [appliedSuggestions, setAppliedSuggestions] = useState<string[]>([]);
  const [objectionHandling, setObjectionHandling] = useState<ObjectionHandling[]>(mockObjectionHandling);
  const [salesGuidance, setSalesGuidance] = useState<SalesGuidance[]>(mockSalesGuidance);
  const [currentObjection, setCurrentObjection] = useState<string>("");
  const [objectionResponse, setObjectionResponse] = useState<ObjectionHandling | null>(null);

  // Auto-send functionality state
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimer, setTypingTimer] = useState<NodeJS.Timeout | null>(null);
  const [autoSendEnabled, setAutoSendEnabled] = useState(true);
  const autoSendDelayRef = useRef(2000); // 2 seconds delay

  useEffect(() => {
    if (isOpen && !isAnalyzing && suggestions.length === 0) {
      generateSuggestions();
    }
  }, [isOpen]);

  const generateSuggestions = async () => {
    setIsAnalyzing(true);
    
    // Simulate AI analysis delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // In a real implementation, this would call your AI service
    // For now, we'll filter and rank mock suggestions based on context
    const filteredSuggestions = mockSuggestions.filter(suggestion => {
      if (eventContext.budget && suggestion.estimatedCost > eventContext.budget * 0.3) {
        return false; // Don't suggest if cost is more than 30% of budget
      }
      return true;
    });

    // Sort by confidence and impact
    const sortedSuggestions = filteredSuggestions.sort((a, b) => {
      const aScore = a.confidence * (a.impact === 'high' ? 3 : a.impact === 'medium' ? 2 : 1);
      const bScore = b.confidence * (b.impact === 'high' ? 3 : b.impact === 'medium' ? 2 : 1);
      return bScore - aScore;
    });

    setSuggestions(sortedSuggestions);
    setIsAnalyzing(false);
  };

  const handleApplySuggestion = (suggestion: AIsuggestion) => {
    setAppliedSuggestions(prev => [...prev, suggestion.id]);
    onSuggestionApply?.(suggestion);
    
    // Add confirmation message to chat
    setChatMessages(prev => [...prev, {
      role: 'assistant',
      content: `Great choice! I've added "${suggestion.title}" to your event. This enhancement will help create a more memorable experience for your guests. Would you like me to suggest complementary add-ons?`,
      timestamp: new Date()
    }]);
  };

  const handleChatSubmit = useCallback(() => {
    if (!userInput.trim()) return;

    const userMessage = {
      role: 'user' as const,
      content: userInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);

    // Clear typing indicators
    setIsTyping(false);
    if (typingTimer) {
      clearTimeout(typingTimer);
      setTypingTimer(null);
    }

    // More natural, conversational AI responses based on input analysis
    setTimeout(() => {
      const input = userInput.toLowerCase();
      let response = "";

      // Analyze user input for more contextual responses
      if (input.includes('help') || input.includes('assist')) {
        response = "I'm here to help! I specialize in making events memorable and successful. What specific aspect would you like to explore together?";
      } else if (input.includes('budget') || input.includes('cost') || input.includes('price')) {
        response = "I totally get that budget is important. Let's find creative ways to maximize impact while being mindful of costs. What's your priority - guest experience, operational efficiency, or something else?";
      } else if (input.includes('guest') || input.includes('attendee')) {
        response = "Great focus on your guests! Happy attendees make successful events. Tell me more about your audience - what would make them feel truly welcomed and engaged?";
      } else if (input.includes('venue') || input.includes('space') || input.includes('location')) {
        response = "Location sets the tone for everything! I'd love to help you optimize your space. Are you working with what you have or exploring options?";
      } else if (input.includes('food') || input.includes('catering') || input.includes('menu')) {
        response = "Food brings people together! I have lots of ideas for memorable dining experiences. Are you thinking about dietary needs, presentation style, or flavor profiles?";
      } else if (input.includes('time') || input.includes('schedule') || input.includes('timeline')) {
        response = "Timing is everything in events! Let's make sure your schedule flows smoothly. What part of the timeline are you most concerned about?";
      } else if (input.includes('thank') || input.includes('thanks')) {
        response = "You're so welcome! I love helping create amazing experiences. What else can we tackle together?";
      } else if (input.includes('stress') || input.includes('worried') || input.includes('concern')) {
        response = "I hear you - event planning can feel overwhelming sometimes. Let's break this down into manageable pieces. What's weighing on you most right now?";
      } else if (input.includes('idea') || input.includes('suggest') || input.includes('recommend')) {
        response = "I'm full of ideas! Based on what you've shared, I'm already thinking of several directions we could go. Want me to prioritize by impact, budget, or ease of implementation?";
      } else if (input.includes('client') || input.includes('boss') || input.includes('approval')) {
        response = "Ah, the approval process! I've helped many people present ideas that get the green light. Want to brainstorm how to frame this in a way that resonates with decision-makers?";
      } else {
        // More dynamic general responses
        const dynamicResponses = [
          "That's an interesting perspective! I'm already thinking of a few directions we could explore together. What feels most important to you right now?",
          "I love where you're going with this! Let me share some ideas that might spark even more creativity for your event.",
          "You know what? That reminds me of a really successful event I helped with recently. The approach might work perfectly for your situation too!",
          "I can definitely work with that! Based on what you're telling me, I'm seeing some exciting possibilities. Should we dive deeper?",
          "That's exactly the kind of thinking that makes events special! I have some ideas that could really amplify what you're already considering.",
          "Great question! I've been learning from so many successful events lately, and I think some of those insights could be really valuable here."
        ];
        response = dynamicResponses[Math.floor(Math.random() * dynamicResponses.length)];
      }

      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }]);
    }, 800); // Slightly faster response for more natural conversation flow

    setUserInput("");
  }, [userInput, typingTimer]);

  // Auto-send functionality
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserInput(value);

    if (!autoSendEnabled || !value.trim()) {
      return;
    }

    // Clear existing timer
    if (typingTimer) {
      clearTimeout(typingTimer);
    }

    // Set typing indicator
    setIsTyping(true);

    // Set new timer for auto-send
    const newTimer = setTimeout(() => {
      if (value.trim()) {
        handleChatSubmit();
      }
      setIsTyping(false);
    }, autoSendDelayRef.current);

    setTypingTimer(newTimer);
  }, [autoSendEnabled, typingTimer, handleChatSubmit]);

  // Handle manual send (Enter key or button)
  const handleManualSend = useCallback(() => {
    if (typingTimer) {
      clearTimeout(typingTimer);
      setTypingTimer(null);
    }
    setIsTyping(false);
    handleChatSubmit();
  }, [typingTimer, handleChatSubmit]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (typingTimer) {
        clearTimeout(typingTimer);
      }
    };
  }, [typingTimer]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'enhancement': return <Sparkles className="h-4 w-4" />;
      case 'personalization': return <Heart className="h-4 w-4" />;
      case 'upsell': return <TrendingUp className="h-4 w-4" />;
      case 'experience': return <Star className="h-4 w-4" />;
      case 'objection_handling': return <Shield className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getObjectionIcon = (objectionType: string) => {
    switch (objectionType) {
      case 'price': return <DollarSign className="h-4 w-4" />;
      case 'timing': return <Clock className="h-4 w-4" />;
      case 'authority': return <Users className="h-4 w-4" />;
      case 'competition': return <Target className="h-4 w-4" />;
      case 'value': return <Award className="h-4 w-4" />;
      case 'need': return <HelpCircle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const handleObjectionInput = (objection: string) => {
    setCurrentObjection(objection);
    // Simple keyword matching for demo - in production, this would use AI
    const matchedResponse = objectionHandling.find(oh =>
      objection.toLowerCase().includes('price') || objection.toLowerCase().includes('cost') || objection.toLowerCase().includes('expensive') ? oh.objectionType === 'price' :
      objection.toLowerCase().includes('time') || objection.toLowerCase().includes('think') || objection.toLowerCase().includes('discuss') ? oh.objectionType === 'timing' :
      objection.toLowerCase().includes('manager') || objection.toLowerCase().includes('approval') || objection.toLowerCase().includes('boss') ? oh.objectionType === 'authority' :
      objection.toLowerCase().includes('competitor') || objection.toLowerCase().includes('other') || objection.toLowerCase().includes('comparing') ? oh.objectionType === 'competition' :
      objection.toLowerCase().includes('need') || objection.toLowerCase().includes('features') || objection.toLowerCase().includes('necessary') ? oh.objectionType === 'value' :
      false
    );
    setObjectionResponse(matchedResponse || null);
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'low': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="apple-button bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white">
          <Bot className="h-4 w-4 mr-2" />
          AI Sales Assistant
          <Sparkles className="h-3 w-3 ml-1" />
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg mr-3">
              <Bot className="h-6 w-6 text-white" />
            </div>
            AI Sales Assistant
            <Badge variant="outline" className="ml-2 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900">
              {userLevel === 'new' ? 'Guided Mode' : userLevel === 'experienced' ? 'Enhanced Mode' : 'Expert Mode'}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            AI-powered suggestions to make your events more personalized and memorable.
            {userLevel === 'new' && " I'll provide extra guidance and explanations for each recommendation."}
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4">
          <Alert className="border-blue-500/50 bg-blue-500/10">
            <Shield className="h-4 w-4 text-blue-500" />
            <AlertTitle className="flex items-center">
              Connected to Echo AI System
              <div className="w-2 h-2 bg-green-500 rounded-full ml-2 animate-pulse" />
            </AlertTitle>
            <AlertDescription>
              Echo is monitoring system performance and ensuring all suggestions align with venue capabilities and safety protocols.
            </AlertDescription>
          </Alert>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="suggestions" className="flex items-center">
              <Lightbulb className="h-4 w-4 mr-2" />
              Suggestions
            </TabsTrigger>
            <TabsTrigger value="objections" className="flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Objections
            </TabsTrigger>
            <TabsTrigger value="guidance" className="flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Guidance
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center">
              <MessageSquare className="h-4 w-4 mr-2" />
              AI Chat
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center">
              <BrainCircuit className="h-4 w-4 mr-2" />
              Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="suggestions" className="space-y-4 mt-6">
            {isAnalyzing ? (
              <Card className="glass-panel">
                <CardContent className="p-8 text-center">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      <Bot className="h-12 w-12 text-primary animate-pulse" />
                      <div className="absolute -top-1 -right-1">
                        <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">Analyzing Your Event</h3>
                      <p className="text-sm text-muted-foreground">
                        Processing event details, venue capabilities, and industry trends to generate personalized suggestions...
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggestions.map((suggestion) => (
                  <Card key={suggestion.id} className="glass-panel">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-2">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            {getCategoryIcon(suggestion.category)}
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg leading-tight">{suggestion.title}</CardTitle>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="outline" className="capitalize">
                                {suggestion.category}
                              </Badge>
                              <Badge className={cn("text-xs", getImpactColor(suggestion.impact))}>
                                {suggestion.impact} impact
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {Math.round(suggestion.confidence * 100)}% confidence
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center">
                          <DollarSign className="h-3 w-3 mr-2 text-muted-foreground" />
                          ${suggestion.estimatedCost.toLocaleString()}
                        </div>
                        <div className="flex items-center">
                          <Target className="h-3 w-3 mr-2 text-muted-foreground" />
                          ROI: {suggestion.impact}
                        </div>
                      </div>

                      {userLevel === 'new' && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">Why this works:</p>
                          <p className="text-xs text-blue-600 dark:text-blue-200">{suggestion.reasoning}</p>
                        </div>
                      )}

                      {suggestion.examples && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Examples:</p>
                          {suggestion.examples.map((example, index) => (
                            <p key={index} className="text-xs text-muted-foreground">• {example}</p>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApplySuggestion(suggestion)}
                          disabled={appliedSuggestions.includes(suggestion.id)}
                          className="apple-button"
                        >
                          {appliedSuggestions.includes(suggestion.id) ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Applied
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Add to Event
                            </>
                          )}
                        </Button>
                        <div className="flex space-x-1">
                          <Button size="sm" variant="ghost" title="This is helpful">
                            <ThumbsUp className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" title="Not relevant">
                            <ThumbsDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex justify-center">
              <Button variant="outline" onClick={generateSuggestions} disabled={isAnalyzing}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate New Suggestions
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="objections" className="space-y-6 mt-6">
            {/* Objection Handler */}
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-blue-500" />
                  AI Objection Handler
                </CardTitle>
                <CardDescription>
                  Enter a client objection to receive empathetic responses and follow-up strategies
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="objection-input">Client Objection</Label>
                  <Textarea
                    id="objection-input"
                    placeholder="e.g., 'Your pricing seems higher than other venues we've looked at'"
                    value={currentObjection}
                    onChange={(e) => handleObjectionInput(e.target.value)}
                    rows={3}
                  />
                </div>

                {objectionResponse && (
                  <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center space-x-2">
                      {getObjectionIcon(objectionResponse.objectionType)}
                      <Badge className="capitalize bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200">
                        {objectionResponse.objectionType.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(objectionResponse.confidence * 100)}% confidence
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-sm text-blue-700 dark:text-blue-300 mb-1">1. Acknowledge & Empathize</h4>
                        <p className="text-sm text-blue-600 dark:text-blue-200 italic">
                          "{objectionResponse.empathyStatement}"
                        </p>
                      </div>

                      <div>
                        <h4 className="font-medium text-sm text-blue-700 dark:text-blue-300 mb-1">2. Address the Concern</h4>
                        <p className="text-sm text-blue-600 dark:text-blue-200">
                          {objectionResponse.response}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-medium text-sm text-blue-700 dark:text-blue-300 mb-2">3. Follow-up Questions</h4>
                        <ul className="space-y-1">
                          {objectionResponse.followUpQuestions.map((question, index) => (
                            <li key={index} className="text-sm text-blue-600 dark:text-blue-200 flex items-start">
                              <span className="mr-2">•</span>
                              <span>"{question}"</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {objectionResponse.supportingEvidence && (
                        <div>
                          <h4 className="font-medium text-sm text-blue-700 dark:text-blue-300 mb-2">Supporting Evidence</h4>
                          <ul className="space-y-1">
                            {objectionResponse.supportingEvidence.map((evidence, index) => (
                              <li key={index} className="text-sm text-blue-600 dark:text-blue-200 flex items-start">
                                <CheckCircle className="h-3 w-3 mr-2 mt-0.5 text-green-500" />
                                <span>{evidence}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {objectionResponse.alternatives && (
                        <div>
                          <h4 className="font-medium text-sm text-blue-700 dark:text-blue-300 mb-2">Alternative Solutions</h4>
                          <ul className="space-y-1">
                            {objectionResponse.alternatives.map((alternative, index) => (
                              <li key={index} className="text-sm text-blue-600 dark:text-blue-200 flex items-start">
                                <Lightbulb className="h-3 w-3 mr-2 mt-0.5 text-yellow-500" />
                                <span>{alternative}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2 pt-3 border-t border-blue-200 dark:border-blue-800">
                      <Button size="sm" variant="outline" className="bg-white dark:bg-gray-800">
                        <Copy className="h-3 w-3 mr-2" />
                        Copy Response
                      </Button>
                      <Button size="sm" variant="outline" className="bg-white dark:bg-gray-800">
                        <Mail className="h-3 w-3 mr-2" />
                        Email Template
                      </Button>
                      <Button size="sm" variant="outline" className="bg-white dark:bg-gray-800">
                        <FileText className="h-3 w-3 mr-2" />
                        Save to CRM
                      </Button>
                    </div>
                  </div>
                )}

                {!objectionResponse && currentObjection && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <HelpCircle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                        Custom Objection Detected
                      </span>
                    </div>
                    <p className="text-sm text-yellow-600 dark:text-yellow-200 mb-3">
                      This objection doesn't match our common patterns. Here are some general best practices:
                    </p>
                    <ul className="space-y-1 text-sm text-yellow-600 dark:text-yellow-200">
                      <li>• Listen actively and acknowledge their concern</li>
                      <li>• Ask clarifying questions to understand the root issue</li>
                      <li>• Provide specific examples or social proof</li>
                      <li>• Offer alternatives or compromises when appropriate</li>
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Common Objection Library */}
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Common Objection Library</CardTitle>
                <CardDescription>
                  Pre-prepared responses for frequently encountered objections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {objectionHandling.map((objection) => {
                    const ObjectionIcon = getObjectionIcon(objection.objectionType);

                    return (
                      <Card key={objection.id} className="p-4 cursor-pointer hover:border-primary/50 transition-colors">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <ObjectionIcon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant="outline" className="capitalize text-xs">
                                {objection.objectionType.replace('_', ' ')}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {Math.round(objection.confidence * 100)}%
                              </Badge>
                            </div>
                            <p className="text-sm font-medium mb-2 line-clamp-2">
                              "{objection.objection}"
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {objection.empathyStatement}
                            </p>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="mt-2 h-6 px-2 text-xs"
                              onClick={() => {
                                setCurrentObjection(objection.objection);
                                setObjectionResponse(objection);
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View Response
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guidance" className="space-y-6 mt-6">
            {/* Sales Guidance */}
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2 text-green-500" />
                  AI Sales Guidance
                </CardTitle>
                <CardDescription>
                  Strategic recommendations based on your current sales situation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {salesGuidance.map((guidance) => (
                    <Card key={guidance.id} className="p-4">
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-medium text-lg mb-2">{guidance.scenario}</h3>
                          <div className="flex items-center space-x-2 mb-3">
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300">
                              Recommended Action
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{guidance.reasoning}</p>
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <p className="text-sm font-medium text-green-700 dark:text-green-300">
                              {guidance.recommendation}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-sm mb-2 flex items-center">
                              <CheckCircle className="h-4 w-4 mr-1 text-blue-500" />
                              Next Steps
                            </h4>
                            <ul className="space-y-1">
                              {guidance.nextSteps.map((step, index) => (
                                <li key={index} className="text-sm text-muted-foreground flex items-start">
                                  <span className="mr-2 text-blue-500">{index + 1}.</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h4 className="font-medium text-sm mb-2 flex items-center">
                              <Target className="h-4 w-4 mr-1 text-green-500" />
                              Success Metrics
                            </h4>
                            <ul className="space-y-1">
                              {guidance.successMetrics.map((metric, index) => (
                                <li key={index} className="text-sm text-muted-foreground flex items-start">
                                  <CheckCircle className="h-3 w-3 mr-2 mt-0.5 text-green-500" />
                                  <span>{metric}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {guidance.riskFactors && (
                          <div>
                            <h4 className="font-medium text-sm mb-2 flex items-center">
                              <AlertTriangle className="h-4 w-4 mr-1 text-yellow-500" />
                              Risk Considerations
                            </h4>
                            <ul className="space-y-1">
                              {guidance.riskFactors.map((risk, index) => (
                                <li key={index} className="text-sm text-muted-foreground flex items-start">
                                  <AlertTriangle className="h-3 w-3 mr-2 mt-0.5 text-yellow-500" />
                                  <span>{risk}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="flex space-x-2 pt-3 border-t border-border/50">
                          <Button size="sm" variant="outline">
                            <Plus className="h-3 w-3 mr-2" />
                            Add to Action Plan
                          </Button>
                          <Button size="sm" variant="outline">
                            <Calendar className="h-3 w-3 mr-2" />
                            Schedule Follow-up
                          </Button>
                          <Button size="sm" variant="outline">
                            <FileText className="h-3 w-3 mr-2" />
                            Generate Email
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat" className="space-y-4 mt-6">
            <div className="h-96 border rounded-lg p-4 bg-muted/20">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  {chatMessages.length === 0 && (
                    <div className="text-center text-muted-foreground">
                      <Bot className="h-8 w-8 mx-auto mb-2" />
                      <p>Hi! I'm your AI Sales Assistant. Ask me anything about enhancing your event!</p>
                    </div>
                  )}
                  
                  {chatMessages.map((message, index) => (
                    <div key={index} className={cn(
                      "flex",
                      message.role === 'user' ? "justify-end" : "justify-start"
                    )}>
                      <div className={cn(
                        "max-w-xs lg:max-w-md px-3 py-2 rounded-lg",
                        message.role === 'user'
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}>
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-muted px-3 py-2 rounded-lg">
                        <div className="flex items-center space-x-1">
                          <Bot className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Will send automatically...</span>
                          <div className="flex space-x-1">
                            <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
            
            <div className="space-y-2">
              {/* Auto-send toggle */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSendEnabled}
                      onChange={(e) => setAutoSendEnabled(e.target.checked)}
                      className="w-3 h-3"
                    />
                    <span className="text-muted-foreground">Auto-send after pause</span>
                  </label>
                </div>
                {isTyping && (
                  <span className="text-muted-foreground animate-pulse">
                    Auto-sending in {Math.ceil(autoSendDelayRef.current / 1000)}s...
                  </span>
                )}
              </div>

              <div className="flex space-x-2">
                <Input
                  placeholder={autoSendEnabled
                    ? "Just start typing - I'll send automatically when you pause..."
                    : "Ask about event enhancements, budget optimization, or guest experience..."
                  }
                  value={userInput}
                  onChange={handleInputChange}
                  onKeyPress={(e) => e.key === 'Enter' && handleManualSend()}
                  className="flex-1"
                />
                <Button
                  onClick={handleManualSend}
                  disabled={!userInput.trim()}
                  variant={autoSendEnabled ? "outline" : "default"}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="glass-panel">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Potential Revenue Increase</p>
                      <p className="text-2xl font-bold text-green-500">
                        ${suggestions.reduce((sum, s) => sum + s.estimatedCost, 0).toLocaleString()}
                      </p>
                    </div>
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Guest Satisfaction Boost</p>
                      <p className="text-2xl font-bold text-blue-500">+25%</p>
                    </div>
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Applied Suggestions</p>
                      <p className="text-2xl font-bold text-purple-500">{appliedSuggestions.length}</p>
                    </div>
                    <Zap className="h-6 w-6 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="text-lg">AI Analysis Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <p><strong>Event Profile:</strong> Corporate leadership summit with 250 attendees</p>
                  <p><strong>Optimization Potential:</strong> High - Multiple enhancement opportunities identified</p>
                  <p><strong>Risk Assessment:</strong> Low - All suggestions align with venue capabilities</p>
                  <p><strong>Echo System Status:</strong> All recommendations pre-approved for safety and logistics</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
