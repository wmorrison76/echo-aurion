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
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const SHORTCUTS = [
  {
    category: "File",
    shortcuts: [
      { label: "New Design", key: "Cmd+N" },
      { label: "Open", key: "Cmd+O" },
      { label: "Save", key: "Cmd+S" },
      { label: "Save As", key: "Cmd+Shift+S" },
      { label: "Export PDF", key: "Cmd+E" },
      { label: "Print", key: "Cmd+P" },
    ],
  },
  {
    category: "Edit",
    shortcuts: [
      { label: "Undo", key: "Cmd+Z" },
      { label: "Redo", key: "Cmd+Shift+Z" },
      { label: "Cut", key: "Cmd+X" },
      { label: "Copy", key: "Cmd+C" },
      { label: "Paste", key: "Cmd+V" },
      { label: "Duplicate", key: "Cmd+D" },
      { label: "Delete", key: "Delete" },
      { label: "Select All", key: "Cmd+A" },
    ],
  },
  {
    category: "Alignment",
    shortcuts: [
      { label: "Align Left", key: "Alt+L" },
      { label: "Align Center", key: "Alt+C" },
      { label: "Align Right", key: "Alt+R" },
      { label: "Align Top", key: "Alt+T" },
      { label: "Align Middle", key: "Alt+M" },
      { label: "Align Bottom", key: "Alt+B" },
      { label: "Distribute Horizontally", key: "Alt+Shift+H" },
      { label: "Distribute Vertically", key: "Alt+Shift+V" },
    ],
  },
  {
    category: "Canvas",
    shortcuts: [
      { label: "Grid Toggle", key: "Cmd+'" },
      { label: "Zoom In", key: "Cmd++" },
      { label: "Zoom Out", key: "Cmd+-" },
      { label: "Zoom to 100%", key: "Cmd+0" },
      { label: "Zoom to Fit", key: "Cmd+1" },
      { label: "Bring Forward", key: "Ctrl+↑" },
      { label: "Send Backward", key: "Ctrl+↓" },
      { label: "Bring to Front", key: "Ctrl+Shift+↑" },
      { label: "Send to Back", key: "Ctrl+Shift+↓" },
    ],
  },
  {
    category: "Groups & Components",
    shortcuts: [
      { label: "Group", key: "Cmd+G" },
      { label: "Ungroup", key: "Cmd+Shift+G" },
      { label: "Create Component", key: "Cmd+Shift+K" },
    ],
  },
];

interface KeyboardShortcutsDialogProps {
  children?: React.ReactNode;
}

export function KeyboardShortcutsDialog({ children }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm" className="gap-2">
            <HelpCircle className="h-4 w-4" />
            Keyboard Shortcuts
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Quick reference for all available keyboard shortcuts in Menu Design Studio.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={SHORTCUTS[0].category} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            {SHORTCUTS.map((category) => (
              <TabsTrigger key={category.category} value={category.category} className="text-xs">
                {category.category}
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="h-96 w-full mt-4">
            {SHORTCUTS.map((category) => (
              <TabsContent key={category.category} value={category.category} className="p-4">
                <div className="space-y-3">
                  {category.shortcuts.map((shortcut, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {shortcut.label}
                      </span>
                      <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </ScrollArea>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800 mt-4">
            <p className="text-xs text-blue-900 dark:text-blue-100">
              <strong>Tip:</strong> Use Cmd on Mac or Ctrl on Windows/Linux for most shortcuts.
            </p>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
