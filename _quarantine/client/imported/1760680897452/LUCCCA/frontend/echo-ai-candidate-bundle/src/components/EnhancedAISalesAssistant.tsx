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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Bot, Send, Lightbulb, TrendingUp, Users, DollarSign, Calendar, AlertTriangle, CheckCircle, Clock, Sparkles, Brain, Target, MessageSquare, Zap, Coffee, Utensils, Wine, Building2, Shield, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  };
}

interface Suggestion {
  id: string;
  type: 'menu' | 'pricing' | 'upsell' | 'timing' | 'logistics';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  reasoning: string;
  action?: string;
}

interface EventContext {
  type: 'corporate' | 'wedding' | 'social' | 'conference' | null;
  guestCount: number;
  budget: number;
  timeOfDay: 'breakfast' | 'lunch' | 'dinner' | 'cocktail' | null;
  restrictions: string[];
  company?: string;
  isAlcoholAllowed?: boolean;
}

const contextualSuggestions = {
  corporate: {
    alcoholPolicy: false, // Default no alcohol for corporate
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
    alcoholPolicy: true, // Usually allowed for weddings
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
    alcoholPolicy: true, // Usually allowed
    menuFocus: ['fun', 'interactive', 'casual'],
    timingPreference: ['dinner', 'cocktail'],
    budgetConsciousness: 'medium',
    suggestions: [
      'Interactive food stations',
      'Signature cocktails matching theme',
      'Shareable appetizers and small plates',
      'Casual service style',
      'Entertainment-friendly setup'
    ]
  }
};

export default function EnhancedAISalesAssistant({ 
  isOpen, 
  onClose,
  initialContext 
}: {
  isOpen: boolean;
  onClose: () => void;
  initialContext?: Partial<EventContext>;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [eventContext, setEventContext] = useState<EventContext>({
    type: null,
    guestCount: 0,
    budget: 0,
    timeOfDay: null,
    restrictions: [],
    isAlcoholAllowed: undefined,
    ...initialContext
  });
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Welcome message with context gathering
      const welcomeMessage: Message = {
        id: 'welcome',
        type: 'assistant',
        content: 'Hi! I\'m your AI Sales Assistant. I\'ll help you create the perfect event proposal. Let me ask a few quick questions to provide the most relevant suggestions.',
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      
      // Ask context questions
      setTimeout(() => {
        askContextQuestion();
      }, 1000);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const askContextQuestion = () => {
    let question = '';
    let suggestions: Suggestion[] = [];

    if (!eventContext.type) {
      question = 'What type of event are you planning? This helps me provide appropriate suggestions.';
      suggestions = [
        {
          id: 'corp',
          type: 'logistics',
          title: 'Corporate Event',
          description: 'Business meetings, conferences, team building',
          impact: 'high',
          confidence: 95,
          reasoning: 'Corporate events have specific requirements for professionalism and efficiency',
          action: 'corporate'
        },
        {
          id: 'wedding',
          type: 'logistics',
          title: 'Wedding Reception',
          description: 'Wedding ceremonies and receptions',
          impact: 'high',
          confidence: 95,
          reasoning: 'Weddings require elegant, memorable experiences',
          action: 'wedding'
        },
        {
          id: 'social',
          type: 'logistics',
          title: 'Social Event',
          description: 'Parties, celebrations, family gatherings',
          impact: 'high',
          confidence: 95,
          reasoning: 'Social events focus on enjoyment and interaction',
          action: 'social'
        }
      ];
    } else if (eventContext.guestCount === 0) {
      question = 'How many guests are you expecting? This helps me recommend appropriate service styles and portions.';
    } else if (eventContext.budget === 0) {
      question = 'What\'s your estimated budget range? I can suggest options that maximize value within your range.';
    } else {
      // All context gathered, provide suggestions
      provideTailoredSuggestions();
      return;
    }

    const contextMessage: Message = {
      id: `context-${Date.now()}`,
      type: 'assistant',
      content: question,
      timestamp: new Date(),
      context: {
        suggestions
      }
    };

    setMessages(prev => [...prev, contextMessage]);
  };

  const handleContextSelection = (action: string, value?: any) => {
    let updatedContext = { ...eventContext };
    let response = '';

    switch (action) {
      case 'corporate':
        updatedContext.type = 'corporate';
        updatedContext.isAlcoholAllowed = false; // Default for corporate
        response = 'Corporate event selected. I\'ll focus on professional, efficient solutions that support your business objectives.';
        break;
      case 'wedding':
        updatedContext.type = 'wedding';
        updatedContext.isAlcoholAllowed = true; // Default for wedding
        response = 'Wedding reception selected. I\'ll suggest elegant, memorable options perfect for your special day.';
        break;
      case 'social':
        updatedContext.type = 'social';
        updatedContext.isAlcoholAllowed = true; // Default for social
        response = 'Social event selected. I\'ll recommend fun, interactive options that encourage mingling and enjoyment.';
        break;
      default:
        response = 'Thank you for that information.';
    }

    setEventContext(updatedContext);
    
    // Add user selection and AI response
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: response.split('.')[0], // Take first part as user selection
      timestamp: new Date()
    };

    const aiResponse: Message = {
      id: `ai-${Date.now()}`,
      type: 'assistant',
      content: response,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage, aiResponse]);

    // Continue context gathering
    setTimeout(() => {
      askContextQuestion();
    }, 1500);
  };

  const provideTailoredSuggestions = () => {
    const contextType = eventContext.type;
    if (!contextType) return;

    const suggestions = generateContextualSuggestions(eventContext);
    
    let message = `Perfect! Based on your ${contextType} event for ${eventContext.guestCount} guests, here are my personalized recommendations:`;

    const aiMessage: Message = {
      id: `suggestions-${Date.now()}`,
      type: 'assistant',
      content: message,
      timestamp: new Date(),
      context: {
        eventType: contextType,
        guestCount: eventContext.guestCount,
        budget: eventContext.budget,
        suggestions
      }
    };

    setMessages(prev => [...prev, aiMessage]);
  };

  const generateContextualSuggestions = (context: EventContext): Suggestion[] => {
    const suggestions: Suggestion[] = [];
    const contextData = contextualSuggestions[context.type!];

    // Menu suggestions based on event type
    if (context.type === 'corporate') {
      suggestions.push({
        id: 'corp-menu',
        type: 'menu',
        title: 'Professional Lunch Service',
        description: 'Efficient box lunches or buffet with healthy, diverse options',
        impact: 'high',
        confidence: 92,
        reasoning: 'Corporate events benefit from quick, professional service that doesn\'t disrupt business flow',
        action: 'add_corporate_menu'
      });

      // NO alcohol suggestion for corporate
      suggestions.push({
        id: 'corp-beverage',
        type: 'menu',
        title: 'Premium Beverage Service',
        description: 'Coffee, tea, fresh juices, and sparkling water station',
        impact: 'medium',
        confidence: 88,
        reasoning: 'Professional beverage options support networking and keep attendees alert',
        action: 'add_beverage_station'
      });
    } else if (context.type === 'wedding') {
      suggestions.push({
        id: 'wedding-menu',
        type: 'menu',
        title: 'Elegant Plated Dinner',
        description: 'Three-course plated service with vegetarian and gluten-free options',
        impact: 'high',
        confidence: 95,
        reasoning: 'Weddings call for elegant, memorable dining experiences',
        action: 'add_wedding_menu'
      });

      if (context.isAlcoholAllowed !== false) {
        suggestions.push({
          id: 'wedding-bar',
          type: 'menu',
          title: 'Signature Cocktail & Wine Service',
          description: 'Custom cocktails plus premium wine and beer selection',
          impact: 'high',
          confidence: 90,
          reasoning: 'Alcohol service enhances celebration atmosphere for weddings',
          action: 'add_bar_service'
        });
      }
    }

    // Pricing suggestions
    if (context.budget > 0) {
      const budgetPerPerson = context.budget / context.guestCount;
      
      if (budgetPerPerson > 100) {
        suggestions.push({
          id: 'premium-upgrade',
          type: 'upsell',
          title: 'Premium Service Upgrade',
          description: 'Enhanced presentation, premium ingredients, dedicated service staff',
          impact: 'medium',
          confidence: 75,
          reasoning: 'Budget allows for premium upgrades that significantly enhance guest experience',
          action: 'suggest_premium'
        });
      }
    }

    // Guest count logistics
    if (context.guestCount > 100) {
      suggestions.push({
        id: 'service-style',
        type: 'logistics',
        title: 'Efficient Buffet Service',
        description: 'Multiple stations to ensure smooth flow for large groups',
        impact: 'high',
        confidence: 87,
        reasoning: 'Large guest counts require efficient service to prevent long lines',
        action: 'suggest_buffet'
      });
    }

    return suggestions;
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

    // Simulate AI processing
    setTimeout(() => {
      const aiResponse = generateAIResponse(inputMessage, eventContext);
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        type: 'assistant',
        content: aiResponse.content,
        timestamp: new Date(),
        context: aiResponse.context
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const generateAIResponse = (userInput: string, context: EventContext) => {
    const input = userInput.toLowerCase();
    
    // Detect inappropriate requests (like wine for corporate)
    if (input.includes('wine') || input.includes('alcohol') || input.includes('bar')) {
      if (context.type === 'corporate') {
        return {
          content: 'For corporate events, I recommend focusing on premium non-alcoholic beverages like artisanal coffee, fresh juices, and sparkling water. Many companies have policies limiting alcohol at business events. Would you like me to suggest some premium beverage alternatives?',
          context: {
            suggestions: [
              {
                id: 'coffee-bar',
                type: 'menu',
                title: 'Artisanal Coffee Bar',
                description: 'Premium coffee station with various brewing methods',
                impact: 'medium',
                confidence: 85,
                reasoning: 'Professional and appropriate for corporate settings',
                action: 'add_coffee_bar'
              }
            ]
          }
        };
      }
    }

    // Budget-related questions
    if (input.includes('budget') || input.includes('cost') || input.includes('price')) {
      return {
        content: `Based on your ${context.type} event for ${context.guestCount} guests, I can optimize your budget by suggesting the right service style and menu options. What's your target budget range?`,
        context: {}
      };
    }

    // Menu-related questions
    if (input.includes('menu') || input.includes('food') || input.includes('catering')) {
      const suggestions = generateContextualSuggestions(context);
      return {
        content: 'Here are some menu suggestions tailored to your event type and guest count:',
        context: { suggestions: suggestions.filter(s => s.type === 'menu') }
      };
    }

    // Default response
    return {
      content: 'I\'d be happy to help with that! Could you provide more specific details about what you\'re looking for?',
      context: {}
    };
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
              <Bot className="h-5 w-5 text-white" />
            </div>
            Enhanced AI Sales Assistant
            <Badge className="bg-green-100 text-green-700">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
              Active
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Intelligent, context-aware assistance for hospitality sales. I understand event types, industry standards, and appropriate recommendations.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-[60vh]">
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-6">
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
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg p-3",
                      message.type === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p className="text-sm">{message.content}</p>
                    
                    {/* Suggestions */}
                    {message.context?.suggestions && (
                      <div className="mt-3 space-y-2">
                        {message.context.suggestions.map((suggestion) => (
                          <Card
                            key={suggestion.id}
                            className="cursor-pointer hover:bg-primary/5 transition-colors"
                            onClick={() => handleContextSelection(suggestion.action || '', suggestion)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start gap-2">
                                <div className={cn(
                                  "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                                  suggestion.impact === 'high' ? "bg-green-500" :
                                  suggestion.impact === 'medium' ? "bg-yellow-500" : "bg-blue-500"
                                )} />
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm">{suggestion.title}</h4>
                                  <p className="text-xs text-muted-foreground mt-1">{suggestion.description}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="outline" className="text-xs">
                                      {suggestion.confidence}% confidence
                                    </Badge>
                                    <Badge variant="outline" className="text-xs capitalize">
                                      {suggestion.impact} impact
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground mt-2">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  
                  {message.type === 'user' && (
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <Users className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              
              {isTyping && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-100" />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-200" />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-6 pt-0 border-t">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me about menus, pricing, service styles, or event recommendations..."
                className="flex-1"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              AI understands: Corporate policies, dietary restrictions, service styles, budget optimization
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
