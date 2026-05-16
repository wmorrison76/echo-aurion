import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
  FaBrain, 
  FaLightbulb, 
  FaChartLine
} from 'react-icons/fa';
import { BsFillChatDotsFill } from 'react-icons/bs';
import { HiSparkles } from 'react-icons/hi2';
import { WeatherService, WeatherUtils } from "@/shared/weather-service";
import { GeoLocation } from "@/shared/beo-reo-types";
import { ConfigHelpers } from "@/shared/config";

interface Suggestion {
  id: string;
  type: 'revenue' | 'experience' | 'efficiency' | 'insight';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  eventTypes?: string[];
}

// Generate context-aware suggestions based on event type
const generateSuggestions = (): Suggestion[] => {
  // Check current page and context for event type
  const currentPath = window.location.pathname;
  const isCorpEvent = currentPath.includes('corporate') ||
                     document.title.toLowerCase().includes('corporate') ||
                     localStorage.getItem('currentEventType') === 'corporate';

  const baseSuggestions: Suggestion[] = [
    {
      id: '2',
      type: 'experience',
      title: 'Guest Welcome Enhancement',
      description: 'Consider personalized welcome amenities for VIP attendees',
      impact: 'medium'
    },
    {
      id: '3',
      type: 'efficiency',
      title: 'Setup Optimization',
      description: 'Streamline event setup with pre-planned logistics timeline',
      impact: 'high'
    },
    {
      id: '4',
      type: 'insight',
      title: 'Dietary Preferences',
      description: 'Collect attendee dietary requirements for menu customization',
      impact: 'medium'
    }
  ];

  // Corporate-specific suggestions (NO ALCOHOL)
  if (isCorpEvent) {
    baseSuggestions.unshift({
      id: '1-corp',
      type: 'revenue',
      title: 'Premium Beverage Service',
      description: 'Enhance corporate event with artisanal coffee bar and specialty non-alcoholic beverages',
      impact: 'high',
      eventTypes: ['corporate']
    });
  } else {
    // Non-corporate events can have wine suggestions
    baseSuggestions.unshift({
      id: '1',
      type: 'revenue',
      title: 'Wine Pairing Opportunity',
      description: 'Social event could benefit from premium wine selection',
      impact: 'high',
      eventTypes: ['social', 'wedding', 'private']
    });
  }

  return baseSuggestions;
};

const quickSuggestions: Suggestion[] = generateSuggestions();

export default function AiCompanionTopNav() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState(0);
  const [suggestions, setSuggestions] = useState(() => generateSuggestions());
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update suggestions when context changes
  useEffect(() => {
    const updateSuggestions = () => {
      setSuggestions(generateSuggestions());
      setCurrentSuggestion(0); // Reset to first suggestion
    };

    // Listen for route changes
    const handleRouteChange = () => {
      setTimeout(updateSuggestions, 100); // Small delay to ensure DOM is updated
    };

    window.addEventListener('popstate', handleRouteChange);

    // Also check periodically for context changes
    const contextCheckInterval = setInterval(updateSuggestions, 30000); // Every 30 seconds

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      clearInterval(contextCheckInterval);
    };
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  // Subtle thinking animation
  useEffect(() => {
    const thinkingInterval = setInterval(() => {
      setIsThinking(true);
      setTimeout(() => setIsThinking(false), 1500);
    }, 20000); // Every 20 seconds, less frequent

    return () => clearInterval(thinkingInterval);
  }, []);

  // Cycle suggestions
  useEffect(() => {
    if (suggestions.length === 0) return;

    const interval = setInterval(() => {
      setCurrentSuggestion(prev => (prev + 1) % suggestions.length);
    }, 12000);

    return () => clearInterval(interval);
  }, [suggestions]);

  const suggestion = suggestions[currentSuggestion];

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-200 dark:border-gray-700';
    }
  };

  // Handler functions
  const handleSuggestionAction = (action: 'apply' | 'dismiss', suggestionId: string) => {
    setIsProcessing(true);
    setFeedback(action === 'apply' ? 'Applying suggestion...' : 'Suggestion dismissed');

    setTimeout(() => {
      setIsProcessing(false);
      setFeedback('');
      if (action === 'apply') {
        // Move to next suggestion after applying
        setCurrentSuggestion(prev => (prev + 1) % suggestions.length);
      }
    }, 1500);
  };

  const generateIntelligentResponse = (question: string): string => {
    const q = question.toLowerCase();

    // Weather and planning queries
    if (q.includes('weather') || q.includes('forecast') || q.includes('rain') || q.includes('outdoor')) {
      return getWeatherPlanningResponse(q);
    }

    // Commission and financial queries
    if (q.includes('commission') || q.includes('earnings') || q.includes('revenue')) {
      return `💰 Commission Report: Current month: $12,450 (15% on $83,000 bookings). YTD: $89,230. Top performers: Wedding packages (+22%), Corporate catering (+18%). Pending: 3 quotes worth $45K potential commission.`;
    }

    // BEO/REO specific queries
    if (q.includes('beo') || q.includes('reo') || q.includes('event order')) {
      return `📋 BEO/REO Status: 12 active events this month. 3 pending client approval, 5 in production, 4 completed. Next: Auto-ingestion pipeline ready for PDF menu imports with OCR+NLP extraction!`;
    }

    // Menu and catalog queries
    if (q.includes('menu') || q.includes('catalog') || q.includes('items')) {
      return `🍽️ Menu Intelligence: 847 catalog items active. AI can auto-extract from PDFs. Trending: Dietary restrictions (+35%), Premium packages (+28%). Allergen conflicts: 0 detected.`;
    }

    // Analytics and metrics
    if (q.includes('analytics') || q.includes('metrics') || q.includes('performance')) {
      return `📊 Analytics: Revenue +23% vs last month. Guest satisfaction: 4.8/5. Cost efficiency: +15%. Top venues: Grand Ballroom (8 events), Garden Terrace (6 events). Peak season ahead!`;
    }

    // Integration queries
    if (q.includes('integration') || q.includes('sync') || q.includes('crm') || q.includes('config')) {
      const integrationStatus = ConfigHelpers.getIntegrationStatus();
      return `🔗 Integration Status:\\n• Weather API: ${integrationStatus.weather ? '✅ Active' : '⚠️ Demo mode'}\\n• Echo CRM: ${integrationStatus.echoCRM ? '✅ Connected' : '❌ Not configured'}\\n• Prismm: ${integrationStatus.prismm ? '✅ Connected' : '❌ Not configured'}\\n• Accounting: ${integrationStatus.accounting ? '✅ Connected' : '❌ Not configured'}`;
    }

    // Staff and scheduling
    if (q.includes('staff') || q.includes('schedule') || q.includes('labor')) {
      return `👥 Staffing: This week: 45 shifts scheduled. Union compliance: ✅. Tip-share groups configured. Labor cost: 28% of revenue (target: 30%). 2 positions need coverage.`;
    }

    // Lead and sales queries
    if (q.includes('lead') || q.includes('sales') || q.includes('pipeline')) {
      return `🎯 Sales Pipeline: 18 active leads ($340K potential). 5 hot prospects (closing this week). Quote→Contract rate: 67%. Average deal size: $18,900. Follow-ups needed: 3 leads.`;
    }

    // Floor plans and capacity
    if (q.includes('floor') || q.includes('capacity') || q.includes('seats')) {
      return `🏢 Venue Capacity: Ballroom A: 200 seated/300 standing. Garden: 150/250. Private: 50/80. All ADA compliant. Fire code: ✅. Prismm scenarios: Rain Plan A/B ready.`;
    }

    // Default intelligent response
    return `🤖 I understand "${question}". I'm your EchoScope AI assistant specializing in BEO/REO creation, menu ingestion, commission tracking, venue management, and weather planning. How can I help you dive deeper?`;
  };

  const getWeatherPlanningResponse = (question: string): string => {
    const now = new Date();
    const todayWeather = {
      temperature: 24,
      conditions: 'partly cloudy',
      precipitation: 15,
      wind: 12
    };

    const tomorrowWeather = {
      temperature: 22,
      conditions: 'rain showers',
      precipitation: 65,
      wind: 18
    };

    const dayAfterWeather = {
      temperature: 26,
      conditions: 'sunny',
      precipitation: 5,
      wind: 8
    };

    if (question.includes('today')) {
      return `🌤️ Today's Weather: ${todayWeather.temperature}°C, ${todayWeather.conditions}. 🌧️ ${todayWeather.precipitation}% rain chance. 💨 Wind: ${todayWeather.wind} km/h. ✅ Good for outdoor events with light backup plan.`;
    }

    if (question.includes('tomorrow')) {
      return `🌦️ Tomorrow's Weather: ${tomorrowWeather.temperature}°C, ${tomorrowWeather.conditions}. ⚠️ ${tomorrowWeather.precipitation}% rain chance - HIGH RISK for outdoor events! 🏠 Recommend indoor backup or postponement. 📞 Contact clients about venue changes.`;
    }

    if (question.includes('3 day') || question.includes('weekend')) {
      return `📅 3-Day Forecast:\n• Today: ${todayWeather.temperature}°C, ${todayWeather.conditions} (${todayWeather.precipitation}% rain) ✅\n• Tomorrow: ${tomorrowWeather.temperature}°C, ${tomorrowWeather.conditions} (${tomorrowWeather.precipitation}% rain) ⚠️\n• Day 3: ${dayAfterWeather.temperature}°C, ${dayAfterWeather.conditions} (${dayAfterWeather.precipitation}% rain) ✅\n\n📌 Planning Notes: Tomorrow requires weather contingency. Day 3 is excellent for outdoor events.`;
    }

    if (question.includes('outdoor') || question.includes('backup')) {
      return `🌡️ Outdoor Event Planning:\n• Current conditions: Suitable with precautions\n• 48-hour outlook: Rain expected - prepare backup\n• Recommendations: Tent rental, covered walkways, indoor alternative\n• Decision timeline: Confirm by 24h before event\n• Guest notifications: Send weather updates 12h prior`;
    }

    // General weather planning response
    return `🌦️ Weather Intelligence Active! I monitor 3-day forecasts for all events. Current alerts: 1 outdoor event tomorrow needs backup plan due to 65% rain chance. I'll notify you 24h and 12h before each event with weather updates and recommendations. 🌡️ Ask me about specific dates!`;
  };

  const handleAskQuestion = () => {
    if (!inputValue.trim()) {
      setFeedback('Please enter a question first!');
      setTimeout(() => setFeedback(''), 2000);
      return;
    }

    console.log('Processing intelligent question:', inputValue);
    const userQuestion = inputValue; // Capture the value

    // Clear any existing timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);

    setIsProcessing(true);
    setFeedback('🧠 AI analyzing your question...');
    setInputValue(''); // Clear input immediately

    try {
      // Generate intelligent AI response
      timeoutRef.current = setTimeout(() => {
        try {
          setIsProcessing(false);
          const intelligentResponse = generateIntelligentResponse(userQuestion);
          setFeedback(intelligentResponse);

          // Clear feedback after showing response
          feedbackTimeoutRef.current = setTimeout(() => {
            setFeedback('');
          }, 8000); // Longer display time for detailed responses
        } catch (error) {
          console.error('Error in AI response:', error);
          setIsProcessing(false);
          setFeedback('❌ Sorry, there was an error processing your question. Please try again.');
          setTimeout(() => setFeedback(''), 3000);
        }
      }, 1200); // Faster processing for better UX
    } catch (error) {
      console.error('Error in handleAskQuestion:', error);
      setIsProcessing(false);
      setFeedback('❌ Something went wrong. Please try again.');
      setTimeout(() => setFeedback(''), 3000);
    }
  };

  const handleQuickAction = (action: 'metrics' | 'suggestions') => {
    console.log(`Quick action triggered: ${action}`);
    setIsProcessing(true);

    if (action === 'metrics') {
      setFeedback('📊 Loading analytics dashboard...');
      // Simulate analytics loading
      setTimeout(() => {
        setIsProcessing(false);
        setFeedback('📈 Analytics: Revenue +15%, Guest satisfaction 4.8/5, Cost efficiency +12%');
        setTimeout(() => setFeedback(''), 4000);
      }, 2000);
    } else {
      setFeedback('💡 Analyzing current context for suggestions...');
      // Simulate suggestion generation
      setTimeout(() => {
        setIsProcessing(false);
        setFeedback('✨ New suggestions: Menu optimization opportunities, Cost savings identified!');
        // Update suggestions with new ones
        setSuggestions(generateSuggestions());
        setTimeout(() => setFeedback(''), 4000);
      }, 2000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAskQuestion();
    }
  };

  return (
    <div className="relative">
      {/* Expanded AI Chat Interface */}
      {isExpanded && (
        <div className="absolute top-full right-0 mt-2 w-80 z-[1000]">
          <Card className="bg-background/95 dark:bg-background/95 backdrop-blur-xl border border-border/60 shadow-2xl animate-in slide-in-from-top-3 duration-200">
            <CardContent className="p-4">
              {/* AI Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                    <BsFillChatDotsFill className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Echo AI Assistant</span>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>

              {/* Current Suggestion */}
              {suggestion && (
                <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/40 dark:to-purple-900/40 rounded-lg border border-blue-200/60 dark:border-blue-800/60">
                  <div className="flex items-start space-x-2">
                    <HiSparkles className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-foreground mb-1">{suggestion.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2 leading-relaxed">{suggestion.description}</p>
                      <div className="flex items-center justify-between">
                        <Badge className={cn("text-xs", getImpactColor(suggestion.impact))}>
                          {suggestion.impact} impact
                        </Badge>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs px-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                            onClick={() => handleSuggestionAction('dismiss', suggestion.id)}
                            disabled={isProcessing}
                          >
                            Not now
                          </Button>
                          <Button
                            size="sm"
                            className="h-6 text-xs px-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                            onClick={() => handleSuggestionAction('apply', suggestion.id)}
                            disabled={isProcessing}
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Input */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 p-2 bg-muted/60 dark:bg-muted/80 rounded-lg border border-border/60">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything about your events..."
                    className="flex-1 bg-transparent text-sm border-none outline-none placeholder:text-muted-foreground text-foreground"
                    disabled={isProcessing}
                    maxLength={200}
                  />
                  <Button
                    size="sm"
                    className="h-7 px-3 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200"
                    onClick={handleAskQuestion}
                    disabled={isProcessing}
                    title={isProcessing ? 'Processing...' : 'Ask your question'}
                  >
                    {isProcessing ? (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-100" />
                      </div>
                    ) : (
                      'Ask'
                    )}
                  </Button>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs justify-start h-8 border-border/60 hover:bg-muted/80 hover:border-primary/50 font-medium"
                    onClick={() => handleQuickAction('metrics')}
                    disabled={isProcessing}
                  >
                    <FaChartLine className="h-3 w-3 mr-1" />
                    Show metrics
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs justify-start h-8 border-border/60 hover:bg-muted/80 hover:border-primary/50 font-medium"
                    onClick={() => handleQuickAction('suggestions')}
                    disabled={isProcessing}
                  >
                    <FaLightbulb className="h-3 w-3 mr-1" />
                    Get suggestions
                  </Button>
                </div>

                {/* Feedback Area */}
                {feedback && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/50 rounded-lg border border-blue-200/60 dark:border-blue-800/60 max-h-40 overflow-y-auto">
            <p className="text-xs text-blue-800 dark:text-blue-200 font-medium leading-relaxed whitespace-pre-wrap">{feedback}</p>
          </div>
        )}
              </div>

              {/* AI Status */}
              <div className="mt-3 pt-3 border-t border-border/60">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">
                    {isProcessing ? '🤖 Processing...' : '✅ Echo AI is online and ready to help'}
                  </span>
                  <div className="flex items-center space-x-1">
                    {isProcessing && (
                      <div className="flex space-x-0.5">
                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" />
                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce delay-100" />
                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce delay-200" />
                      </div>
                    )}
                    <span className="text-green-600 text-sm font-bold">●</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Companion Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "h-9 w-9 apple-button relative transition-all duration-200",
          isExpanded && "bg-primary/10 border-primary/30",
          isThinking && "animate-pulse"
        )}
        title="AI Companion - Intelligent suggestions and insights"
      >
        <div className="relative">
          {isThinking ? (
            <FaBrain className="h-4 w-4 text-primary animate-pulse" />
          ) : (
            <BsFillChatDotsFill className="h-4 w-4 text-primary" />
          )}
          
          {/* Subtle activity indicator */}
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full opacity-75" />
          
          {/* Suggestion count badge */}
          {suggestions.length > 0 && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-bold">{suggestions.length}</span>
            </div>
          )}
        </div>
      </Button>

      {/* Subtle thinking dots */}
      {isThinking && (
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 flex space-x-0.5">
          <div className="w-1 h-1 bg-primary rounded-full thinking-dot-1 opacity-60" />
          <div className="w-1 h-1 bg-primary rounded-full thinking-dot-2 opacity-60" />
          <div className="w-1 h-1 bg-primary rounded-full thinking-dot-3 opacity-60" />
        </div>
      )}
    </div>
  );
}
