import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BookOpen,
  Utensils,
  Settings,
  Users,
  TrendingUp,
  HelpCircle,
  X,
} from "lucide-react";

const MAIN_HELP_SECTIONS = [
  {
    id: "overview",
    icon: BookOpen,
    title: "System Overview",
    content: [
      {
        subtitle: "What is EchoRecipe Pro?",
        text: "EchoRecipe Pro is an integrated recipe development and restaurant operations platform designed for modern culinary enterprises. It combines recipe engineering, menu design, production management, and R&D capabilities in a unified system.",
      },
      {
        subtitle: "Core Modules",
        text: "Recipe Management: Create, edit, and organize recipes. Gallery: Visual documentation and styling guides. Menu Design Studio: Create and test menu layouts. Dish Assembly: Map plating procedures and components. Server Notes: Guest communication and procedure documentation. Operations: Production workflows and timelines. R&D Labs: Experimental development and innovation. Inventory & Supplies: Stock and purchasing management. Nutrition & Allergens: Compliance and dietary information. HACCP Compliance: Food safety protocols. Costing: Plate economics and margin analysis. Supplier Management: Vendor and sourcing management.",
      },
      {
        subtitle: "Architecture Philosophy",
        text: "The system is built on a modular architecture allowing independent use of each component or integrated workflows. Data flows between modules maintain consistency: recipes inform menus, menus drive production, production feeds inventory, R&D experiments become recipes.",
      },
    ],
  },
  {
    id: "recipe-management",
    icon: Utensils,
    title: "Recipe Management",
    content: [
      {
        subtitle: "Creating Recipes",
        text: "Click 'Add Recipe' to start. Define recipe basics (name, category, yields), then build ingredient lists with precise measurements. Include technique notes, timing information, and plating instructions. Use the recipe editor to structure multi-step procedures.",
      },
      {
        subtitle: "Recipe Components",
        text: "Each recipe contains: Ingredients list with quantities and units. Step-by-step procedure with timing. Yield and serving information. Required equipment and stations. Plating diagram and presentation notes. Nutritional and allergen information. Cost breakdown and pricing. Variation options and substitutions.",
      },
      {
        subtitle: "Search & Discovery",
        text: "Use the Recipe Search tab to find recipes by keyword, category, ingredient, or tag. Filter by dietary requirements, allergen status, or cooking method. Save favorite recipes and create custom collections.",
      },
      {
        subtitle: "Recipe Versioning",
        text: "Each recipe change creates a new version. Track modifications over time. Compare versions to see what changed. Archive old versions for reference. Communicate version updates to kitchen staff.",
      },
    ],
  },
  {
    id: "menu-design",
    icon: Utensils,
    title: "Menu Design & Plating",
    content: [
      {
        subtitle: "Menu Design Studio",
        text: "Build and test menu layouts visually. Assign recipes to courses and sections. Control presentation, pricing, and descriptions. Preview how your menu looks to guests. Test menu balance and flow.",
      },
      {
        subtitle: "Dish Assembly",
        text: "Define plating procedures with component maps. Specify positioning, arrangement, and presentation techniques. Link recipes to dish components. Create plating guides for consistency. Document special presentations or techniques.",
      },
      {
        subtitle: "Visual Documentation",
        text: "Use the Gallery to upload and organize dish photography. Tag images with recipe versions, dates, and contexts. Create mood boards and styling guides. Reference photos for consistent presentation.",
      },
      {
        subtitle: "Menu Economics",
        text: "Automatically calculate plate costs based on ingredient data. View margin percentages and contribution profits. Analyze pricing against food costs. Make data-driven menu adjustments.",
      },
    ],
  },
  {
    id: "operations-production",
    icon: Settings,
    title: "Operations & Production",
    content: [
      {
        subtitle: "Production Planning",
        text: "Use Production module to plan daily prep and service. Schedule recipe execution based on yield requirements. Assign stations and staff. Track timing and dependencies. Manage mise en place efficiently.",
      },
      {
        subtitle: "Server Notes",
        text: "Document information guests and servers should know about dishes. Include allergy alerts, heat levels, preparation times, customization options. Keep descriptions accurate and compelling. Update with seasonal changes.",
      },
      {
        subtitle: "Operations Documentation",
        text: "Maintain detailed operational procedures: opening checklists, service protocols, emergency procedures, cleaning schedules. Document station setup, equipment operation, and safety procedures. Keep documentation current.",
      },
      {
        subtitle: "HACCP Compliance",
        text: "Track critical control points for food safety. Document temperature controls, time limits, and sanitation procedures. Maintain records for compliance audits. Update procedures based on regulations.",
      },
    ],
  },
  {
    id: "data-management",
    icon: TrendingUp,
    title: "Data & Analytics",
    content: [
      {
        subtitle: "Inventory Management",
        text: "Track ingredient stock levels in real-time. Set reorder points and quantities. Monitor usage across recipes. Forecast needs based on menu and production. Identify waste and optimize purchasing.",
      },
      {
        subtitle: "Nutrition & Allergens",
        text: "Maintain comprehensive nutritional data for ingredients. Calculate per-serving nutrition for complete dishes. Track and communicate allergen information clearly. Support dietary requirement labeling.",
      },
      {
        subtitle: "Costing Analysis",
        text: "View detailed cost breakdowns for each plate. Understand which ingredients drive costs. Analyze margin performance by menu item. Make optimization decisions with confidence. Track costing trends over time.",
      },
      {
        subtitle: "Supplier Management",
        text: "Maintain vendor information and pricing. Track supplier performance and reliability. Compare pricing across suppliers. Document ordering procedures and lead times. Manage contracts and agreements.",
      },
    ],
  },
  {
    id: "collaboration",
    icon: Users,
    title: "Collaboration & Access",
    content: [
      {
        subtitle: "Multi-Location Support",
        text: "Share recipes and procedures across multiple restaurant locations. Synchronize updates centrally while allowing local customization. Manage location-specific variations. Maintain consistency in brand delivery.",
      },
      {
        subtitle: "Role-Based Access",
        text: "Different user roles have appropriate permissions: Admin: Full system access. Chef/R&D Director: Develop recipes and experiments. Manager: Oversee operations and costs. Staff: View and execute recipes. Vendors: Limited supplier portal access.",
      },
      {
        subtitle: "Team Communication",
        text: "Leave comments and notes on recipes. Tag team members for attention. Maintain discussion history on changes. Communicate updates through the system.",
      },
      {
        subtitle: "Data Synchronization",
        text: "Changes propagate across connected locations in real-time. Manage sync conflicts thoughtfully. Archive old versions while maintaining current standards.",
      },
    ],
  },
  {
    id: "rd-integration",
    icon: HelpCircle,
    title: "R&D Integration",
    content: [
      {
        subtitle: "From Lab to Kitchen",
        text: "R&D Labs experiments become recipes through structured workflow. Successful experiments link to recipe records. Implementation notes capture lab-to-kitchen modifications. Track which experiments informed menu items.",
      },
      {
        subtitle: "Recipe Deployment",
        text: "Deploy recipes to specific outlets and locations. Schedule rollouts with confirmation workflows. Maintain deployment history. Roll back if issues arise.",
      },
      {
        subtitle: "Continuous Innovation",
        text: "Use R&D Labs for seasonal menu development. Test new techniques and ingredients before service. Gather team feedback on experimental dishes. Implement successful concepts into operational recipes.",
      },
    ],
  },
  {
    id: "advanced-features",
    icon: Settings,
    title: "Advanced Features",
    content: [
      {
        subtitle: "Custom Fields & Tags",
        text: "Add custom fields to recipes for your specific needs. Create custom tags for categorization. Build custom reports based on your data. Tailor the system to your operation.",
      },
      {
        subtitle: "Import & Export",
        text: "Import recipe data from CSV or JSON files. Export recipes for backup or sharing. Use imports for batch updates. Maintain external records alongside the system.",
      },
      {
        subtitle: "API & Integrations",
        text: "Connect with external systems via APIs. Sync with POS systems for consistency. Integrate with supplier ordering systems. Automate workflows through webhooks.",
      },
      {
        subtitle: "Mobile Access",
        text: "Access recipes on mobile devices in the kitchen. View plating guides during service. Check ingredient information quickly. Document real-time changes on mobile.",
      },
    ],
  },
];

interface EchoRecipeProHelpModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EchoRecipeProHelpModal({
  isOpen,
  onOpenChange,
}: EchoRecipeProHelpModalProps) {
  const [activeSection, setActiveSection] = useState("overview");

  if (!isOpen) return null;

  const currentSection = MAIN_HELP_SECTIONS.find((s) => s.id === activeSection);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="w-full max-w-4xl h-[90vh] bg-slate-950 rounded-lg shadow-2xl border border-[#c8a97e]/15 flex flex-col overflow-hidden"
        style={{
          boxShadow:
            "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(34, 211, 238, 0.1)",
        }}
      >
        {/* Header */}
        <div className="border-b border-[#c8a97e]/15 px-6 py-4 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-[#c8a97e]" />
            <div>
              <h2 className="text-lg font-bold text-[#c8a97e]">
                EchoRecipe Pro - Help Guide
              </h2>
              <p className="text-xs text-slate-400">
                System features, workflows, and best practices
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 p-0 hover:bg-[#c8a97e]/08"
          >
            <X className="h-5 w-5 text-[#c8a97e]" />
          </Button>
        </div>

        {/* Content area with 2-panel layout */}
        <div className="flex-1 flex overflow-hidden gap-0">
          {/* Left panel - Topics */}
          <div className="w-64 border-r border-[#c8a97e]/15 bg-slate-900/30 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="space-y-1 p-4">
                {MAIN_HELP_SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const isActive = section.id === activeSection;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left ${
                        isActive
                          ? "bg-[#c8a97e]/15 text-[#c8a97e] border-l-2 border-[#c8a97e]"
                          : "text-slate-300 hover:bg-slate-800/50 hover:text-[#c8a97e]"
                      }`}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{section.title}</span>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Right panel - Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {currentSection && (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      {currentSection.icon && (
                        <currentSection.icon className="h-5 w-5 text-[#c8a97e]" />
                      )}
                      <h3 className="text-xl font-bold text-[#c8a97e]">
                        {currentSection.title}
                      </h3>
                    </div>

                    <div className="space-y-6">
                      {currentSection.content.map((item, idx) => (
                        <div key={idx} className="space-y-2">
                          <h4 className="font-semibold text-[#c8a97e]/80 text-base">
                            {item.subtitle}
                          </h4>
                          <p className="text-sm text-slate-300 leading-relaxed break-words whitespace-normal">
                            {item.text}
                          </p>
                          {idx < currentSection.content.length - 1 && (
                            <div className="h-px bg-[#c8a97e]/08 mt-4" />
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#c8a97e]/15 px-6 py-3 bg-slate-900/50 flex items-center justify-between text-xs text-slate-400">
          <p>
            Need help with R&D Labs? Use the R&D Labs help button in the
            workspace.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
