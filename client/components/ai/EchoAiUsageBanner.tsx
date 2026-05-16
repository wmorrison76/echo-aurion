import { useEffect, useMemo, useState } from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EchoAiUsageBannerProps {
  storageKey: string;
  title?: string;
  checklist: string[];
  contextLabel?: string;
}

export default function EchoAiUsageBanner({
  storageKey,
  title = "EchoAI^3 Usage Checklist",
  checklist,
  contextLabel = "Review the items below to keep operations accurate.",
}: EchoAiUsageBannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(storageKey) === "reviewed");
  }, [storageKey]);

  const checklistItems = useMemo(() => checklist.slice(0, 8), [checklist]);

  if (dismissed) return null;

  return (
    <>
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-400 flex items-center justify-center text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{title}</p>
              <p className="text-xs text-slate-500">{contextLabel}</p>
            </div>
          </div>
          <Button
            size="sm"
            className="rounded-full bg-slate-900 text-white hover:bg-slate-800"
            onClick={() => setIsOpen(true)}
          >
            Review
          </Button>
        </div>
      </div>

      <Dialog
        open={isOpen}
        onOpenChange={(next) => {
          setIsOpen(next);
          if (!next) {
            localStorage.setItem(storageKey, "reviewed");
            setDismissed(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              {title}
            </DialogTitle>
            <DialogDescription>{contextLabel}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {checklistItems.map((item) => (
              <div
                key={item}
                className="flex items-start gap-2 rounded-lg border border-slate-200/70 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-3">
            <Button
              className="rounded-full bg-slate-900 text-white hover:bg-slate-800"
              onClick={() => {
                localStorage.setItem(storageKey, "reviewed");
                setDismissed(true);
                setIsOpen(false);
              }}
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
