import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
  FaQuestionCircle,
  FaBook,
  FaVideo,
  FaComments,
  FaChevronUp,
  FaChevronDown
} from 'react-icons/fa';
import { HiExternalLink } from 'react-icons/hi';

interface HelpLink {
  id: string;
  title: string;
  description: string;
  icon: any;
  url: string;
  type: 'help' | 'docs' | 'video' | 'support';
}

const helpLinks: HelpLink[] = [
  {
    id: 'help',
    title: 'Help Center',
    description: 'Get answers to common questions',
    icon: FaQuestionCircle,
    url: '#help',
    type: 'help'
  },
  {
    id: 'docs',
    title: 'Documentation',
    description: 'Complete guides and API reference',
    icon: FaBook,
    url: '#docs',
    type: 'docs'
  },
  {
    id: 'tutorials',
    title: 'Video Tutorials',
    description: 'Step-by-step video guides',
    icon: FaVideo,
    url: '#tutorials',
    type: 'video'
  },
  {
    id: 'support',
    title: 'Contact Support',
    description: 'Get help from our team',
    icon: FaComments,
    url: '#support',
    type: 'support'
  }
];

export default function BottomRightLinks() {
  const [isExpanded, setIsExpanded] = useState(false);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'help': return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20';
      case 'docs': return 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20';
      case 'video': return 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20';
      case 'support': return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-900/20';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[800] flex flex-col items-end space-y-2">
      {/* Expanded Links */}
      {isExpanded && (
        <Card className="w-64 glass-panel apple-button shadow-xl animate-in slide-in-from-bottom-3 duration-200">
          <CardContent className="p-3">
            <div className="space-y-2">
              {helpLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    className="flex items-start space-x-3 p-2 rounded-lg hover:bg-white/10 dark:hover:bg-black/10 transition-all duration-200 group"
                  >
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
                      getTypeColor(link.type)
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1">
                        <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          {link.title}
                        </h4>
                        <HiExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {link.description}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
            
            {/* Powered by section */}
            <div className="border-t border-border/50 pt-2 mt-3">
              <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                <span>Powered by</span>
                <div className="flex items-center space-x-1">
                  <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-sm flex items-center justify-center">
                    <span className="text-white text-xs font-bold">E</span>
                  </div>
                  <span className="font-medium">EchoCRM</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toggle Button */}
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "h-12 w-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 hover:from-slate-200 hover:to-slate-300 dark:hover:from-slate-700 dark:hover:to-slate-800 shadow-lg hover:shadow-xl transition-all duration-200 border border-slate-200 dark:border-slate-700",
          isExpanded && "rotate-180"
        )}
        title={isExpanded ? "Hide help links" : "Show help links"}
      >
        <div className="relative">
          {isExpanded ? (
            <FaChevronDown className="h-4 w-4 text-slate-700 dark:text-slate-300" />
          ) : (
            <FaQuestionCircle className="h-4 w-4 text-slate-700 dark:text-slate-300" />
          )}
        </div>
      </Button>
    </div>
  );
}
