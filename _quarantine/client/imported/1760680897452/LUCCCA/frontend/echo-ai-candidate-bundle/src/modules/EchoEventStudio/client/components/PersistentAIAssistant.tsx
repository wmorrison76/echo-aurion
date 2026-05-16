import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bot,
  Send,
  Lightbulb,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles,
  Brain,
  Target,
  MessageSquare,
  Zap,
  Coffee,
  Utensils,
  Wine,
  Building2,
  Shield,
  X,
  Minimize2,
  Maximize2,
  ChevronUp,
  ChevronDown,
  Navigation,
  ArrowRight,
  FileText,
  Users2,
  ChefHat,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocation, useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: {
    eventType?: 'corporate' | 'wedding' | 'social' | 'conference';
    guestCount?: number;
    budget?: number;
    suggestions?: Suggestion[];
    navigation?: NavigationSuggestion[];
  };
}

interface Suggestion {
  id: string;
  type: 'menu' | 'logistics' | 'upsell' | 'compliance' | 'navigation';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  reasoning: string;
  action?: string;
  route?: string;
}

interface NavigationSuggestion {
  title: string;
  description: string;
  route: string;
  icon: string;
  priority: number;
}

interface EventContext {
  type: 'corporate' | 'wedding' | 'social' | 'conference' | null;
  guestCount: number;
  budget: number;
  timeOfDay: 'breakfast' | 'lunch' | 'dinner' | 'cocktail' | null;
  restrictions: string[];
  company?: string;
  isAlcoholAllowed?: boolean;
  currentPage?: string;
  menuSelected?: boolean;
  beoInProgress?: boolean;
}

const contextualSuggestions = {
  corporate: {
    alcoholPolicy: false,
    menuFocus: ['professional', 'efficient', 'dietary-inclusive'],
    timingPreference: ['lunch', 'breakfast'],
    budgetConsciousness: 'high',
    suggestions: [
      'Consider breakfast or lunch service for corporate events',
      'Offer vegetarian and gluten-free options prominently',
      'Suggest networking break stations instead of formal dining',
      'Recommend professional presentation setup',
      'Focus on efficiency and minimal disruption to business flow'
    ]
  },
  wedding: {
    alcoholPolicy: true,
    menuFocus: ['elegant', 'memorable', 'photo-worthy'],
    timingPreference: ['dinner', 'cocktail'],
    budgetConsciousness: 'medium',
    suggestions: [
      'Signature cocktails personalized to couple',
      'Elegant plated service or premium buffet',
      'Special dietary accommodations for diverse guest list',
      'Late-night snack service for dancing',
      'Champagne toast coordination'
    ]
  },
  social: {
    alcoholPolicy: true,
    menuFocus: ['fun', 'interactive', 'casual'],
    timingPreference: ['dinner', 'cocktail'],
    budgetConsciousness: 'medium',
    suggestions: [
      'Interactive food stations',
      'Signature cocktails matching theme',
      'Shareable appetizers and small plates',
      'Casual service style',
      'Entertainment-friendly menu timing'
    ]
  }
};

const pageContexts = {
  '/beo-reo': {
    name: 'BEO/REO Management',
    features: ['menu selection', 'BEO generation', 'contract creation'],
    aiCapabilities: ['menu optimization', 'pricing calculation', 'legal compliance']
  },
  '/menu-digitization': {
    name: 'Menu Digitization',
    features: ['menu parsing', 'item extraction', 'pricing analysis'],
    aiCapabilities: ['OCR processing', 'menu structure analysis', 'dietary information extraction']
  },
  '/sales-meeting': {
    name: 'Sales Meeting',
    features: ['client collaboration', 'digital whiteboard', 'proposal creation'],
    aiCapabilities: ['real-time suggestions', 'proposal optimization', 'client insights']
  },
  '/guest-experience': {
    name: 'Guest Experience',
    features: ['guest profiles', 'preference tracking', 'personalization'],
    aiCapabilities: ['preference prediction', 'experience optimization', 'satisfaction analysis']
  }
};

export default function PersistentAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [eventContext, setEventContext] = useState<EventContext>({
    type: null,
    guestCount: 0,
    budget: 0,
    timeOfDay: null,
    restrictions: [],
    isAlcoholAllowed: undefined
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize with welcome message when first opened
  useEffect(() => {
    const hasInitialized = localStorage.getItem('ai-assistant-initialized');
    if (!hasInitialized && messages.length === 0) {
      const welcomeMessage: Message = {
        id: `welcome-${Date.now()}`,
        type: 'assistant',
        content: `Hi! I'm your intelligent hospitality assistant. I understand event planning, menu optimization, and legal requirements. I'll follow you through the system and provide contextual help based on what you're working on.`,
        timestamp: new Date(),
        context: {
          suggestions: [
            {
              id: 'get-started',
              type: 'navigation',
              title: 'Start with Menu Selection',
              description: 'Upload and parse a menu to begin creating BEO/REO documents',
              impact: 'high',
              confidence: 95,
              reasoning: 'Menu selection is typically the first step in event planning',
              route: '/beo-reo'
            }
          ]
        }
      };
      setMessages([welcomeMessage]);
      localStorage.setItem('ai-assistant-initialized', 'true');
    }
  }, [messages.length]);

  // Update context when page changes
  useEffect(() => {
    setEventContext(prev => ({
      ...prev,
      currentPage: location.pathname
    }));

    // Add page change notification
    if (messages.length > 0) {
      const pageContext = pageContexts[location.pathname as keyof typeof pageContexts];
      if (pageContext) {
        const contextMessage: Message = {
          id: `context-${Date.now()}`,
          type: 'assistant',
          content: `I see you're now on the ${pageContext.name} page. I can help you with ${pageContext.features.join(', ')}. What would you like to work on?`,
          timestamp: new Date(),
          context: {
            navigation: generateNavigationSuggestions(location.pathname)
          }
        };
        setMessages(prev => [...prev, contextMessage]);
      }
    }
  }, [location.pathname]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateNavigationSuggestions = (currentPath: string): NavigationSuggestion[] => {
    const suggestions: NavigationSuggestion[] = [];
    
    switch (currentPath) {
      case '/beo-reo':
        suggestions.push(
          {
            title: 'Parse a Menu',
            description: 'Upload and digitize menu documents',
            route: '/menu-digitization',
            icon: 'ChefHat',
            priority: 1
          },
          {
            title: 'Schedule Sales Meeting',
            description: 'Collaborate with clients on proposals',
            route: '/sales-meeting', 
            icon: 'Users2',
            priority: 2
          }
        );
        break;
      case '/menu-digitization':
        suggestions.push(
          {
            title: 'Create BEO/REO',
            description: 'Generate event orders from parsed menus',
            route: '/beo-reo',
            icon: 'FileText',
            priority: 1
          }
        );
        break;
      case '/sales-meeting':
        suggestions.push(
          {
            title: 'Generate BEO',
            description: 'Convert meeting notes to formal event orders',
            route: '/beo-reo',
            icon: 'FileText',
            priority: 1
          }
        );
        break;
    }
    
    return suggestions;
  };

  const generateContextualResponse = (userInput: string, context: EventContext) => {
    const input = userInput.toLowerCase();
    let response = '';
    let suggestions: Suggestion[] = [];

    // Handle navigation requests
    if (input.includes('beo') || input.includes('event order')) {
      response = "I can help you create BEO/REO documents. First, you'll need to select a menu and items, then I'll generate a comprehensive event order with pricing, timeline, and legal terms.";
      suggestions.push({
        id: 'nav-beo',
        type: 'navigation',
        title: 'Go to BEO/REO Page',
        description: 'Navigate to create event orders',
        impact: 'high',
        confidence: 95,
        reasoning: 'Direct request for BEO functionality',
        route: '/beo-reo'
      });
    }
    else if (input.includes('menu') || input.includes('parse')) {
      response = "I can help you parse and digitize menus. Upload a PDF, image, or document and I'll extract all items, prices, and dietary information for use in BEO creation.";
      suggestions.push({
        id: 'nav-menu',
        type: 'navigation', 
        title: 'Go to Menu Digitization',
        description: 'Upload and parse menu documents',
        impact: 'high',
        confidence: 95,
        reasoning: 'Direct request for menu functionality',
        route: '/menu-digitization'
      });
    }
    // Handle alcohol questions with corporate policy awareness
    else if (input.includes('wine') || input.includes('alcohol') || input.includes('bar')) {
      if (context.type === 'corporate' || input.includes('corporate')) {
        response = 'For corporate events, I recommend focusing on premium non-alcoholic beverages like artisanal coffee, fresh juices, and sparkling water. Many companies have policies limiting alcohol at business events. Would you like me to suggest some premium beverage alternatives?';
        suggestions.push({
          id: 'corp-beverages',
          type: 'menu',
          title: 'Premium Non-Alcoholic Options',
          description: 'Coffee bars, specialty juices, and sparkling water stations',
          impact: 'medium',
          confidence: 90,
          reasoning: 'Corporate events typically prefer professional beverage options',
          action: 'suggest_beverages'
        });
      } else {
        response = 'I can help you plan alcohol service! What type of event are you planning? This helps me suggest appropriate options and ensure we meet all legal requirements.';
      }
    }
    // Budget optimization
    else if (input.includes('budget') || input.includes('cost') || input.includes('price')) {
      response = `Based on your event context, I can optimize costs through menu selection, service style recommendations, and identifying potential savings. What's your target budget range?`;
      suggestions.push({
        id: 'budget-optimization',
        type: 'upsell',
        title: 'Budget Optimization Analysis',
        description: 'Analyze menu options for best value and cost savings',
        impact: 'high',
        confidence: 85,
        reasoning: 'Budget optimization can significantly impact event profitability',
        action: 'analyze_budget'
      });
    }
    // Legal and compliance
    else if (input.includes('legal') || input.includes('contract') || input.includes('liability')) {
      response = 'I can help ensure your BEO includes all necessary legal terms, liability clauses, cancellation policies, and insurance requirements. This creates a legally binding contract that protects both parties.';
      suggestions.push({
        id: 'legal-compliance',
        type: 'compliance',
        title: 'Legal Contract Review',
        description: 'Ensure all legal requirements are met in BEO contracts',
        impact: 'high',
        confidence: 95,
        reasoning: 'Legal compliance is essential for enforceable contracts',
        action: 'review_legal'
      });
    }
    // Guest experience optimization
    else if (input.includes('guest') || input.includes('experience') || input.includes('dietary')) {
      response = 'I can help optimize the guest experience through menu personalization, dietary accommodation tracking, and service style recommendations based on your event type and guest profile.';
      if (context.type === 'corporate') {
        suggestions.push({
          id: 'corp-experience',
          type: 'logistics',
          title: 'Professional Service Setup',
          description: 'Efficient service that supports business objectives',
          impact: 'medium',
          confidence: 88,
          reasoning: 'Corporate events require professional, unobtrusive service',
          action: 'setup_professional'
        });
      }
    }
    // Default contextual response
    else {
      const pageContext = pageContexts[context.currentPage as keyof typeof pageContexts];
      if (pageContext) {
        response = `I'm here to help with ${pageContext.name}. I can assist with ${pageContext.aiCapabilities.join(', ')}. What specific aspect would you like help with?`;
      } else {
        response = "I'd be happy to help! Could you provide more details about what you're working on? I can assist with menu selection, BEO creation, legal compliance, pricing optimization, and guest experience planning.";
      }
    }

    return { content: response, suggestions };
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Generate AI response
    setTimeout(() => {
      const aiResponse = generateContextualResponse(inputMessage, eventContext);
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        type: 'assistant',
        content: aiResponse.content,
        timestamp: new Date(),
        context: {
          eventType: eventContext.type,
          guestCount: eventContext.guestCount,
          budget: eventContext.budget,
          suggestions: aiResponse.suggestions
        }
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    if (suggestion.route) {
      navigate(suggestion.route);
    }
    
    // Add a follow-up message
    const followUpMessage: Message = {
      id: `followup-${Date.now()}`,
      type: 'assistant',
      content: `Great! I've ${suggestion.route ? 'navigated you to the right page' : 'noted your selection'}. ${suggestion.reasoning} How can I help you get started?`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, followUpMessage]);
  };

  const handleNavigationClick = (suggestion: NavigationSuggestion) => {
    navigate(suggestion.route);
    
    const navMessage: Message = {
      id: `nav-${Date.now()}`,
      type: 'assistant',
      content: `Perfect! I've taken you to ${suggestion.title}. ${suggestion.description}. I'm here to help you through the process.`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, navMessage]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Floating AI button when closed
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-br from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          size="icon"
        >
          <Bot className="h-6 w-6 text-white" />
        </Button>
        {messages.length > 0 && (
          <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-bold">!</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "fixed z-50 transition-all duration-300 ease-in-out",
      isMinimized 
        ? "bottom-6 right-6 w-80 h-16" 
        : "bottom-6 right-6 w-96 h-[600px]"
    )}>
      <Card className="h-full shadow-2xl border-2 border-primary/20">
        {/* Header */}
        <CardHeader className="pb-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-white/20 rounded-full">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium">AI Assistant</CardTitle>
                <CardDescription className="text-xs text-blue-100">
                  Intelligent hospitality support
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white hover:bg-white/20"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white hover:bg-white/20"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <>
            {/* Messages Area */}
            <CardContent className="p-0 flex-1">
              <ScrollArea className="h-[440px] p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3",
                        message.type === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      {message.type === 'assistant' && (
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <Bot className="h-3 w-3 text-white" />
                        </div>
                      )}
                      
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg p-3 text-sm",
                          message.type === 'user'
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <p>{message.content}</p>
                        
                        {/* Suggestions */}
                        {message.context?.suggestions && (
                          <div className="mt-3 space-y-2">
                            {message.context.suggestions.map((suggestion) => (
                              <div
                                key={suggestion.id}
                                className="cursor-pointer p-2 border rounded-lg hover:bg-background/50 transition-colors"
                                onClick={() => handleSuggestionClick(suggestion)}
                              >
                                <div className="flex items-start gap-2">
                                  <div className={cn(
                                    "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                                    suggestion.impact === 'high' ? "bg-green-500" :
                                    suggestion.impact === 'medium' ? "bg-yellow-500" : "bg-blue-500"
                                  )} />
                                  <div className="flex-1">
                                    <h4 className="font-medium text-xs">{suggestion.title}</h4>
                                    <p className="text-xs text-muted-foreground mt-1">{suggestion.description}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant="outline" className="text-xs">
                                        {suggestion.confidence}% confidence
                                      </Badge>
                                      {suggestion.route && (
                                        <div className="flex items-center text-xs text-primary">
                                          <ArrowRight className="h-3 w-3 mr-1" />
                                          Navigate
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Navigation Suggestions */}
                        {message.context?.navigation && (
                          <div className="mt-3 space-y-2">
                            {message.context.navigation.map((navSuggestion, index) => (
                              <div
                                key={index}
                                className="cursor-pointer p-2 border rounded-lg hover:bg-background/50 transition-colors"
                                onClick={() => handleNavigationClick(navSuggestion)}
                              >
                                <div className="flex items-center gap-2">
                                  <Navigation className="h-3 w-3 text-primary" />
                                  <div className="flex-1">
                                    <h4 className="font-medium text-xs">{navSuggestion.title}</h4>
                                    <p className="text-xs text-muted-foreground">{navSuggestion.description}</p>
                                  </div>
                                  <ArrowRight className="h-3 w-3 text-primary" />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="text-xs text-muted-foreground mt-2">
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                      
                      {message.type === 'user' && (
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <Users className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {isTyping && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot className="h-3 w-3 text-white" />
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse" />
                          <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse delay-100" />
                          <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse delay-200" />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>

            {/* Input Area */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about menus, BEOs, legal terms, or navigation..."
                  className="flex-1 text-sm"
                  disabled={isTyping}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isTyping}
                  size="icon"
                  className="h-9 w-9"
                >
                  <Send className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                I understand: Corporate policies, legal terms, menu optimization, navigation
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
