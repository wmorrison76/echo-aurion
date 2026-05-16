import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { HelpCircle, BookOpen, Play } from "lucide-react";
import { EnterpriseHelpCenter } from "./EnterpriseHelpCenter";

export function EnterpriseHelpButton() {
  const [showHelpCenter, setShowHelpCenter] = useState(false);

  if (showHelpCenter) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="w-11/12 h-5/6 max-w-6xl">
          <EnterpriseHelpCenter />
          <Button
            onClick={() => setShowHelpCenter(false)}
            variant="outline"
            className="mt-4 mx-auto block"
          >
            Close Help Center
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <Button
        variant="ghost"
        size="icon"
        className="text-slate-400 hover:text-white hover:bg-slate-700"
        title="Help & Learning Center"
      >
        <HelpCircle className="w-5 h-5" />
      </Button>
      <DropdownMenuContent
        align="end"
        className="w-72 bg-slate-800 border-slate-700"
      >
        <DropdownMenuLabel className="text-white">
          Enterprise Features Help
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-700" />

        <DropdownMenuItem
          onClick={() => setShowHelpCenter(true)}
          className="cursor-pointer text-slate-200 hover:bg-slate-700"
        >
          <BookOpen className="w-4 h-4 mr-2" />
          <span>Open Help Center</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-slate-700" />

        <DropdownMenuLabel className="text-slate-400 text-xs">
          Quick Links - Tier 1
        </DropdownMenuLabel>

        <DropdownMenuItem
          className="cursor-pointer text-slate-200 hover:bg-slate-700"
          disabled
        >
          <div className="flex items-center gap-2 text-xs">
            <Play className="w-3 h-3" />
            Batch Operations Guide
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="cursor-pointer text-slate-200 hover:bg-slate-700"
          disabled
        >
          <div className="flex items-center gap-2 text-xs">
            <Play className="w-3 h-3" />
            SEO Generator Guide
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="cursor-pointer text-slate-200 hover:bg-slate-700"
          disabled
        >
          <div className="flex items-center gap-2 text-xs">
            <Play className="w-3 h-3" />
            Analytics Dashboard Guide
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-slate-700" />

        <DropdownMenuLabel className="text-slate-400 text-xs">
          Walkthroughs
        </DropdownMenuLabel>

        <DropdownMenuItem
          className="cursor-pointer text-slate-200 hover:bg-slate-700"
          disabled
        >
          <div className="flex items-center gap-2 text-xs">
            <Play className="w-3 h-3 text-blue-400" />
            First Time: Batch Publishing
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="cursor-pointer text-slate-200 hover:bg-slate-700"
          disabled
        >
          <div className="flex items-center gap-2 text-xs">
            <Play className="w-3 h-3 text-blue-400" />
            Generate SEO Metadata
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-slate-700" />

        <DropdownMenuLabel className="text-slate-400 text-xs">
          Resources
        </DropdownMenuLabel>

        <DropdownMenuItem
          className="cursor-pointer text-slate-200 hover:bg-slate-700"
          disabled
        >
          <div className="flex items-center gap-2 text-xs">
            <BookOpen className="w-3 h-3" />
            API Documentation
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="cursor-pointer text-slate-200 hover:bg-slate-700"
          disabled
        >
          <div className="flex items-center gap-2 text-xs">
            <BookOpen className="w-3 h-3" />
            Troubleshooting Guide
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
