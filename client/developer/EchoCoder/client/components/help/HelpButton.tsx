import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { HelpCircle, BookOpen, Zap, MessageCircle } from "lucide-react";
import { HelpGuideViewer } from "./HelpGuideViewer";

interface HelpButtonProps {
  defaultGuideId?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  label?: string;
}

export function HelpButton({
  defaultGuideId,
  variant = "outline",
  size = "icon",
  label,
}: HelpButtonProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<string | undefined>(
    defaultGuideId,
  );

  const quickGuides = [
    {
      id: "echocoder-first-module",
      title: "Generate Your First Module",
      icon: <Zap className="h-4 w-4" />,
    },
    {
      id: "echocoder-fixing",
      title: "Fix a Module",
      icon: <Zap className="h-4 w-4" />,
    },
    {
      id: "getting-started-overview",
      title: "System Overview",
      icon: <BookOpen className="h-4 w-4" />,
    },
  ];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className="rounded-full"
            title="Help & Guides"
          >
            <HelpCircle className="h-4 w-4" />
            {label && <span className="ml-2">{label}</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={() => {
              setSelectedGuide(undefined);
              setShowHelp(true);
            }}
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Browse All Guides
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            Quick Access
          </div>

          {quickGuides.map((guide) => (
            <DropdownMenuItem
              key={guide.id}
              onClick={() => {
                setSelectedGuide(guide.id);
                setShowHelp(true);
              }}
            >
              {guide.icon}
              <span className="ml-2">{guide.title}</span>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => {
              window.open("https://www.builder.io/c/docs", "_blank");
            }}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Support
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <HelpGuideViewer
        guideId={selectedGuide}
        open={showHelp}
        onOpenChange={setShowHelp}
      />
    </>
  );
}

export default HelpButton;
