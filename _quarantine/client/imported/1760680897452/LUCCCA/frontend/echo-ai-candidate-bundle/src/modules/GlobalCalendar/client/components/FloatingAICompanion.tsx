import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  FaRobot,
  FaBrain,
  FaLightbulb,
  FaChartLine,
  FaUserFriends,
  FaCalendarAlt,
  FaMagic,
  FaShieldAlt,
  FaComments
} from 'react-icons/fa';
import { BsFillChatDotsFill } from 'react-icons/bs';
import { HiSparkles } from 'react-icons/hi2';
import { RiAiGenerate } from 'react-icons/ri';

interface Suggestion {
  id: string;
  type: 'revenue' | 'experience' | 'efficiency' | 'insight';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  category: string;
}

const mockSuggestions: Suggestion[] = [
  {
    id: '1',
    type: 'revenue',
    title: 'Premium Wine Pairing',
    description: 'Add wine pairing to Corporate Conference - potential $850 uplift',
    impact: 'high',
    category: 'Upsell'
  },
  {
    id: '2',
    type: 'experience',
    title: 'Welcome Reception',
    description: 'Consider pre-event networking for better guest engagement',
    impact: 'medium',
    category: 'Enhancement'
  },
  {
    id: '3',
    type: 'efficiency',
    title: 'Setup Optimization',
    description: 'Suggest earlier setup for complex AV requirements',
    impact: 'medium',
    category: 'Operations'
  }
];

export default function FloatingAICompanion() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(mockSuggestions);
  const [currentSuggestion, setCurrentSuggestion] = useState(0);
  const [isThinking, setIsThinking] = useState(false);

  // Cycle through suggestions
  useEffect(() => {
    if (suggestions.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentSuggestion(prev => (prev + 1) % suggestions.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [suggestions.length]);

  // Simulate AI thinking periodically
  useEffect(() => {
    const thinkingInterval = setInterval(() => {
      setIsThinking(true);
      setTimeout(() => setIsThinking(false), 2000);
    }, 15000);

    return () => clearInterval(thinkingInterval);
  }, []);

  const getCurrentSuggestion = () => suggestions[currentSuggestion];
  const suggestion = getCurrentSuggestion();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'revenue': return <FaChartLine className="h-3 w-3" />;
      case 'experience': return <FaUserFriends className="h-3 w-3" />;
      case 'efficiency': return <FaCalendarAlt className="h-3 w-3" />;
      default: return <FaLightbulb className="h-3 w-3" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
      default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[900] flex flex-col items-end space-y-3">
      {/* Suggestion Card - only show when expanded */}
      {isExpanded && suggestion && (
        <Card className="w-80 glass-panel apple-button border-primary/30 shadow-xl animate-in slide-in-from-bottom-5 duration-300">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                {getTypeIcon(suggestion.type)}
                <span className="text-sm font-medium text-primary">{suggestion.category}</span>
                <Badge className={cn("text-xs", getImpactColor(suggestion.impact))}>
                  {suggestion.impact} impact
                </Badge>
              </div>
              <HiSparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
            </div>
            
            <h4 className="font-semibold text-foreground mb-2">{suggestion.title}</h4>
            <p className="text-sm text-muted-foreground mb-4">{suggestion.description}</p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <RiAiGenerate className="h-3 w-3" />
                <span>AI Generated</span>
              </div>
              <div className="flex space-x-2">
                <Button size="sm" variant="ghost" className="h-7 text-xs apple-button">
                  Skip
                </Button>
                <Button size="sm" className="h-7 text-xs bg-primary hover:bg-primary/90 apple-button">
                  Apply
                </Button>
              </div>
            </div>

            {/* Progress indicator */}
            <div className="flex items-center justify-center mt-3 space-x-1">
              {suggestions.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    index === currentSuggestion 
                      ? "bg-primary scale-110" 
                      : "bg-muted-foreground/30"
                  )}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Companion Button */}
      <div className="relative">
        <Button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "ai-companion-float h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-white/20 dark:border-white/10",
            isExpanded && "scale-110",
            isThinking && "animate-pulse"
          )}
          title="AI Companion - Click for suggestions"
        >
          <div className="relative">
            {isThinking ? (
              <FaBrain className="h-6 w-6 text-white animate-pulse" />
            ) : (
              <BsFillChatDotsFill className="h-6 w-6 text-white" />
            )}
            
            {/* Activity indicator */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-bounce flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>
          </div>
        </Button>

        {/* Thinking bubbles */}
        {isThinking && (
          <div className="absolute -top-8 -left-8 flex space-x-1 animate-in fade-in duration-300">
            <div className="w-2 h-2 bg-blue-400 rounded-full thinking-dot-1" />
            <div className="w-2 h-2 bg-blue-400 rounded-full thinking-dot-2" />
            <div className="w-2 h-2 bg-blue-400 rounded-full thinking-dot-3" />
          </div>
        )}

        {/* Status badges */}
        <div className="absolute -top-2 -left-2 flex flex-col space-y-1">
          <Badge className="bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0.5 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800">
            <FaShieldAlt className="h-2.5 w-2.5 mr-1" />
            Active
          </Badge>
          
          {suggestions.length > 0 && (
            <Badge className="bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 border border-orange-200 animate-pulse dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800">
              <FaMagic className="h-2.5 w-2.5 mr-1" />
              {suggestions.length}
            </Badge>
          )}
        </div>

        {/* Glowing ring effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 animate-ping" />
        <div 
          className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-600/10 animate-ping" 
          style={{ animationDelay: '1s' }}
        />
      </div>
    </div>
  );
}
