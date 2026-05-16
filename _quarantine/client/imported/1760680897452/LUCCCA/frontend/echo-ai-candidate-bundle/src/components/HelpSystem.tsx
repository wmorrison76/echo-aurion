import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HelpCircle,
  Search,
  Keyboard,
  FileText,
  Users,
  Settings,
  ChefHat,
  Building,
  Star,
  CheckCircle,
  Play,
  Book,
  Lightbulb,
  Zap,
  Shield,
  Bot,
} from "lucide-react";

// ----- removed interface HelpSystemProps; using plain JS props -----

const helpTopics = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Learn the basics of the hospitality CRM system",
    category: "Beginner",
    icon: Play,
    items: [
      {
        question: "How do I create my first BEO/REO?",
        answer:
          "Click the 'Create BEO/REO' button in the top right corner. Fill in the basic event details like name, date, venue, and guest count. For beginners, use Simple Mode which guides you through essential fields only.",
      },
      {
        question: "What's the difference between BEO and REO?",
        answer:
          "BEO (Banquet Event Order) is for banquet and catering events with food service. REO (Room Event Order) is for meeting rooms and conference spaces without extensive catering needs.",
      },
      {
        question: "How do I upload and parse a menu?",
        answer:
          "Click 'Parse Menu' in the BEO/REO section. Select your outlet, upload a PDF/image of your menu, and our system will automatically extract menu items, prices, and dietary information.",
      },
      {
        question: "What are the AI features in the system?",
        answer:
          "The system includes AI Sales Assistant for event personalization suggestions and Echo AI for system monitoring. The Sales Assistant helps optimize events while Echo ensures system security and performance.",
      },
    ],
  },
  {
    id: "ai-sales-assistant",
    title: "AI Sales Assistant",
    description: "AI-powered event personalization and sales optimization",
    category: "AI Features",
    icon: Bot,
    items: [
      {
        question: "How does the AI Sales Assistant work?",
        answer:
          "The AI analyzes your event details (guest count, venue, client industry) and suggests personalized enhancements like networking areas, photography services, and custom experiences to increase satisfaction and revenue.",
      },
      {
        question: "What types of suggestions does it provide?",
        answer:
          "The AI provides four types of suggestions: Enhancements (tech upgrades, AV), Personalization (custom touches), Upsells (additional services), and Experience improvements (interactive elements).",
      },
      {
        question: "How accurate are the AI recommendations?",
        answer:
          "Our AI has a 90-95% accuracy rate based on event type and client preferences. Each suggestion includes a confidence score, cost estimate, and reasoning to help you make informed decisions.",
      },
      {
        question: "Can I chat with the AI Sales Assistant?",
        answer:
          "Yes! Use the Chat tab to ask specific questions about event enhancements, budget optimization, or guest experience improvements. The AI provides real-time personalized advice.",
      },
    ],
  },
  {
    id: "echo-ai-system",
    title: "Echo AI System Administrator",
    description: "Advanced system monitoring, security, and optimization",
    category: "AI Features",
    icon: Shield,
    items: [
      {
        question: "What is Echo AI and what does it do?",
        answer:
          "Echo AI is our system administrator that continuously monitors performance, security, and data integrity. It ensures optimal system operation, prevents issues, and maintains high availability.",
      },
      {
        question: "How does Echo protect the system?",
        answer:
          "Echo performs real-time security monitoring, tracks user activities, monitors resource usage, and automatically responds to potential threats. It maintains a security score and alerts for any anomalies.",
      },
      {
        question: "Can I see what Echo is monitoring?",
        answer:
          "Yes! Click the Echo AI button (shield icon) in the top navigation to see system health, security events, performance metrics, and AI service status. Administrators get full access to all monitoring data.",
      },
      {
        question: "How does Echo work with the Sales Assistant?",
        answer:
          "Echo ensures that all AI Sales Assistant suggestions are safe, feasible, and align with venue capabilities. It also monitors AI performance and learning to maintain high accuracy.",
      },
    ],
  },
  {
    id: "smart-search",
    title: "Smart Global Search",
    description: "Powerful search across all your hospitality data",
    category: "Feature",
    icon: Search,
    items: [
      {
        question: "How do I access the global search?",
        answer:
          "Press Ctrl+K anywhere in the system or click the search bar in the top navigation. You can also press '/' as a quick shortcut to open search.",
      },
      {
        question: "What can I search for?",
        answer:
          "Search across contacts, events, BEO/REO orders, venues, menus, and even system actions. The search uses fuzzy matching to find results even with partial or misspelled queries.",
      },
      {
        question: "How does recent search history work?",
        answer:
          "Your recent searches are automatically saved and displayed when you open search without typing. This helps you quickly repeat common searches.",
      },
      {
        question: "What are Quick Actions in search?",
        answer:
          "Quick Actions let you perform common tasks directly from search, like creating new events or opening AI tools. They're shown when you first open search.",
      },
    ],
  },
  {
    id: "echo-help-tutorials",
    title: "EchoHelp Interactive Tutorials",
    description: "Step-by-step guided tutorials with visual walkthroughs",
    category: "Feature",
    icon: HelpCircle,
    items: [
      {
        question: "What is EchoHelp and how do I use it?",
        answer:
          "EchoHelp provides interactive, step-by-step tutorials that guide you through any process in the system. Click the help icon next to Echo AI or press Ctrl+Shift+H to access tutorials.",
      },
      {
        question: "How do the visual walkthroughs work?",
        answer:
          "EchoHelp highlights the exact elements you need to click, shows floating arrows pointing to targets, and provides contextual explanations at each step. It's like having a personal trainer for the software.",
      },
      {
        question: "Can I skip steps or go back?",
        answer:
          "Yes! Each tutorial allows you to go back to previous steps, skip optional steps, or exit the tutorial at any time. Your progress is tracked so you can resume where you left off.",
      },
      {
        question: "What tutorials are available?",
        answer:
          "We have tutorials for creating BEOs, using AI features, menu management, and all major system functions. Tutorials are categorized by difficulty level and estimated completion time.",
      },
    ],
  },
  {
    id: "event-templates",
    title: "Event Templates & Workflows",
    description: "Pre-built event templates to accelerate planning",
    category: "Feature",
    icon: FileText,
    items: [
      {
        question: "How do event templates save time?",
        answer:
          "Templates provide pre-configured event setups for common event types like corporate conferences, weddings, and galas. They include typical requirements, timelines, checklists, and vendor recommendations.",
      },
      {
        question: "Can I customize templates before using them?",
        answer:
          "Absolutely! After selecting a template, you can modify guest counts, budgets, features, venues, and any other details to match your specific requirements before creating the event.",
      },
      {
        question: "What's included in each template?",
        answer:
          "Templates include estimated budgets, guest ranges, required vendors, setup checklists, planning timelines, and typical features for that event type. Everything you need to get started quickly.",
      },
      {
        question: "How do I access event templates?",
        answer:
          "Click 'Event Templates' when creating a new BEO/REO, or access them from the main navigation. You can browse by category, difficulty level, or search for specific event types.",
      },
    ],
  },
  {
    id: "user-preferences",
    title: "User Preferences & Customization",
    description: "Personalize your experience and workflow",
    category: "Feature",
    icon: Settings,
    items: [
      {
        question: "How do I customize my experience?",
        answer:
          "Access Settings (Ctrl+Shift+S) to customize themes, layout preferences, notification settings, keyboard shortcuts, and AI behavior. All preferences are automatically saved.",
      },
      {
        question: "Can I change the theme and appearance?",
        answer:
          "Yes! You can switch between light/dark themes, adjust font sizes, enable high contrast mode, and even choose accent colors. Use the theme toggle in the top navigation or go to Settings.",
      },
      {
        question: "What keyboard shortcuts can I customize?",
        answer:
          "Most navigation and action shortcuts can be personalized. The system includes shortcuts for search (Ctrl+K), navigation (Alt+1-6), and all major functions. Press '?' to see all available shortcuts.",
      },
      {
        question: "How does auto-save work?",
        answer:
          "Your work is automatically saved every 30 seconds by default. You can adjust this interval in preferences or disable auto-save if you prefer manual saving. Your preferences themselves are saved instantly.",
      },
    ],
  },
  {
    id: "menu-management",
    title: "Menu Management",
    description: "Upload, parse, and manage catering menus",
    category: "Feature",
    icon: ChefHat,
    items: [
      {
        question: "What file types can I upload for menu parsing?",
        answer:
          "We support PDF, JPG, JPEG, and PNG files up to 10MB. For best results, use high-quality scans with clear text.",
      },
      {
        question: "How accurate is the menu parsing?",
        answer:
          "Our OCR and AI parsing typically achieves 90-95% accuracy. Always review parsed items before saving. You can edit prices, descriptions, and dietary information.",
      },
      {
        question: "Can I manage multiple outlets?",
        answer:
          "Yes! Each outlet can have its own menus, pricing, staff, and capabilities. Use the Outlets tab in the Menu Parser to add and manage different kitchen operations.",
      },
    ],
  },
  {
    id: "event-spaces",
    title: "Event Spaces",
    description: "Manage venues, capacities, and booking details",
    category: "Feature",
    icon: Building,
    items: [
      {
        question: "How do I add a new event space?",
        answer:
          "In the Menu Parser dialog, go to the Event Spaces tab and click 'Add Space'. Include capacity details, dimensions, features, and pricing information.",
      },
      {
        question: "What capacity information should I include?",
        answer:
          "Enter seated, standing, classroom, theater, and cocktail capacities. This helps match events to appropriate spaces and prevents overbooking.",
      },
      {
        question: "How do setup and breakdown times work?",
        answer:
          "Setup and breakdown times are automatically added to your event duration for scheduling. A 4-hour event with 2-hour setup needs 6 hours total space reservation.",
      },
    ],
  },
  {
    id: "advanced-features",
    title: "Advanced Features",
    description: "Power user features and customization",
    category: "Advanced",
    icon: Zap,
    items: [
      {
        question: "What does Advanced Mode enable?",
        answer:
          "Advanced Mode shows additional fields like outlet selection, service styles, budget tracking, and detailed menu integration. It also displays extra statistics and management options.",
      },
      {
        question: "How do I integrate with existing systems?",
        answer:
          "The system provides APIs for integration with POS systems, accounting software, and other hospitality tools. Contact your administrator for integration setup.",
      },
      {
        question: "Can I customize the workflow?",
        answer:
          "Yes, administrators can customize approval workflows, required fields, and department notifications to match your organization's processes.",
      },
    ],
  },
];

const keyboardShortcuts = [
  { keys: ["Ctrl", "K"], description: "Global smart search" },
  { keys: ["/"], description: "Focus search (alternative)" },
  { keys: ["Ctrl", "B"], description: "Toggle sidebar" },
  { keys: ["Ctrl", "N"], description: "Create new BEO/REO" },
  { keys: ["Ctrl", "D"], description: "Go to dashboard" },
  { keys: ["Ctrl", "E"], description: "Go to events" },
  { keys: ["Ctrl", "C"], description: "Go to contacts" },
  { keys: ["Ctrl", "A"], description: "Go to analytics" },
  { keys: ["Ctrl", "Shift", "A"], description: "Open AI Sales Assistant" },
  { keys: ["Ctrl", "Shift", "E"], description: "Open Echo AI System" },
  { keys: ["Ctrl", "Shift", "H"], description: "Open EchoHelp tutorials" },
  { keys: ["Ctrl", "Shift", "S"], description: "Go to settings" },
  { keys: ["Ctrl", ","], description: "Open user preferences" },
  { keys: ["Alt", "1-6"], description: "Navigate sidebar items" },
  { keys: ["Escape"], description: "Close dialogs" },
  { keys: ["Tab"], description: "Navigate between fields" },
  { keys: ["Enter"], description: "Submit forms" },
  { keys: ["?"], description: "Show this help dialog" },
];

const quickTips = [
  { title: "Global Search (Ctrl+K)", description: "Instantly search across all data - contacts, events, menus, and actions", icon: Search },
  { title: "Event Templates", description: "Use professional templates to jumpstart corporate events, weddings, and galas", icon: FileText },
  { title: "AI Sales Suggestions", description: "Let AI analyze your events and suggest revenue-boosting enhancements", icon: Star },
  { title: "EchoHelp Tutorials", description: "Interactive step-by-step guidance with visual walkthroughs for any feature", icon: HelpCircle },
  { title: "Keyboard Shortcuts", description: "Navigate faster with shortcuts - Alt+1-6 for sidebar, Ctrl+B to toggle", icon: Keyboard },
  { title: "Echo Monitoring", description: "Echo AI continuously monitors system health and security for you", icon: Shield },
  { title: "Smart Preferences", description: "Customize themes, shortcuts, and workflows to match your style", icon: Settings },
  { title: "Auto-Save", description: "Your work is automatically saved every 30 seconds", icon: CheckCircle },
];

export default function HelpSystem({ currentPage }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("topics");

  const filteredTopics = helpTopics.filter(
    (topic) =>
      topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.items.some(
        (item) =>
          item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.answer.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  const contextualHelp = () => {
    switch (currentPage) {
      case "beo-reo":
        return helpTopics.find((t) => t.id === "ai-sales-assistant");
      case "menu":
        return helpTopics.find((t) => t.id === "menu-management");
      default:
        return helpTopics.find((t) => t.id === "getting-started");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 apple-button"
          title="Help & Documentation (Press ? for shortcuts)"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="glass-panel max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center">
            <Book className="h-6 w-6 mr-2" />
            Help & Documentation
          </DialogTitle>
          <DialogDescription>
            Find answers, learn features, and get the most out of your hospitality CRM
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="topics">Help Topics</TabsTrigger>
            <TabsTrigger value="shortcuts">Shortcuts</TabsTrigger>
            <TabsTrigger value="tips">Quick Tips</TabsTrigger>
            <TabsTrigger value="contextual">Page Help</TabsTrigger>
          </TabsList>

          <TabsContent value="topics" className="space-y-4 mt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search help topics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTopics.map((topic) => (
                <Card key={topic.id} className="glass-panel">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <topic.icon className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{topic.title}</CardTitle>
                      </div>
                      <Badge variant="outline">{topic.category}</Badge>
                    </div>
                    <CardDescription>{topic.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {topic.items.map((item, index) => (
                        <AccordionItem key={index} value={`item-${index}`}>
                          <AccordionTrigger className="text-left text-sm">
                            {item.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-sm text-muted-foreground">
                            {item.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="shortcuts" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {keyboardShortcuts.map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                >
                  <span className="text-sm text-muted-foreground">
                    {shortcut.description}
                  </span>
                  <div className="flex items-center space-x-1">
                    {shortcut.keys.map((key, keyIndex) => (
                      <div key={keyIndex} className="flex items-center">
                        <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-background border border-border rounded">
                          {key}
                        </kbd>
                        {keyIndex < shortcut.keys.length - 1 && (
                          <span className="mx-1 text-muted-foreground">+</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Keyboard className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-blue-700 dark:text-blue-300">
                  Pro Tip
                </span>
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-200">
                Press{" "}
                <kbd className="px-1 py-0.5 text-xs bg-blue-100 dark:bg-blue-800 rounded">
                  ?
                </kbd>{" "}
                anywhere in the application to quickly access keyboard shortcuts.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="tips" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickTips.map((tip, index) => (
                <Card key={index} className="glass-panel">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <tip.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">{tip.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {tip.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="glass-panel border-amber-500/50 bg-amber-500/10">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-700 dark:text-amber-300 mb-2">
                      Need More Help?
                    </h4>
                    <p className="text-sm text-amber-600 dark:text-amber-200 mb-3">
                      Our support team is here to help you get the most out of the system.
                    </p>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50">
                        Contact Support
                      </Button>
                      <Button size="sm" variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50">
                        Schedule Training
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contextual" className="space-y-4 mt-6">
            {(() => {
              const help = contextualHelp();
              if (!help) return null;
              const IconComponent = help.icon;
              return (
                <Card className="glass-panel">
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <IconComponent className="h-5 w-5 text-primary" />
                      <CardTitle>{help.title}</CardTitle>
                    </div>
                    <CardDescription>{help.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {help.items.map((item, index) => (
                        <AccordionItem key={index} value={`contextual-${index}`}>
                          <AccordionTrigger className="text-left">
                            {item.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground">
                            {item.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="glass-panel text-center">
                <CardContent className="p-4">
                  <Users className="h-8 w-8 mx-auto text-primary mb-2" />
                  <h4 className="font-medium mb-1">User Levels</h4>
                  <p className="text-xs text-muted-foreground">
                    Features adapt to your role: Staff, Manager, or Admin
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-panel text-center">
                <CardContent className="p-4">
                  <Settings className="h-8 w-8 mx-auto text-primary mb-2" />
                  <h4 className="font-medium mb-1">Accessibility</h4>
                  <p className="text-xs text-muted-foreground">
                    Full keyboard navigation and screen reader support
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-panel text-center">
                <CardContent className="p-4">
                  <Shield className="h-8 w-8 mx-auto text-primary mb-2" />
                  <h4 className="font-medium mb-1">Auto-Save</h4>
                  <p className="text-xs text-muted-foreground">
                    Your work is automatically saved every 30 seconds
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
