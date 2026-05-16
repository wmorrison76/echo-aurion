import { useEffect, useState, type FormEvent } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface NewProjectPayload {
  name: string;
  vision: string;
  textureFocus: string;
  flavorNotes: string;
  launchTarget: string;
}

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: NewProjectPayload) => void;
}

const fieldClass =
  "w-full rounded-xl border border-white/20 bg-white/80 px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-sky-400 focus:bg-white focus:text-slate-900 dark:border-[#c8a97e]/25 dark:bg-slate-950/70 dark:text-white/80 dark:focus:border-[#c8a97e]";

export function NewProjectDialog({ open, onOpenChange, onSubmit }: NewProjectDialogProps) {
  const [name, setName] = useState("");
  const [vision, setVision] = useState("");
  const [textureFocus, setTextureFocus] = useState("");
  const [flavorNotes, setFlavorNotes] = useState("");
  const [launchTarget, setLaunchTarget] = useState("");

  useEffect(() => {
    if (!open) {
      setVision("");
      setTextureFocus("");
      setFlavorNotes("");
      setLaunchTarget("");
      return;
    }
    setName((prev) => prev || "Untitled Lab");
  }, [open]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onSubmit({
      name: trimmedName,
      vision: vision.trim(),
      textureFocus: textureFocus.trim(),
      flavorNotes: flavorNotes.trim(),
      launchTarget: launchTarget.trim(),
    });
    setName("");
    setVision("");
    setTextureFocus("");
    setFlavorNotes("");
    setLaunchTarget("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-xl overflow-hidden border border-[#c8a97e]/15 bg-[#050a15]/95 text-white/80">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-[0.18em] uppercase text-white/80">
            Launch new R&D project
          </DialogTitle>
          <DialogDescription className="text-sm text-[#c8a97e]/80/80">
            Define the north star for this lab so every experiment inherits the same intent.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 text-sm text-white/80/80">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#c8a97e]/80/80">
              Project name
            </label>
            <input
              className={`${fieldClass} mt-1`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Velvet textures initiative"
              required
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#c8a97e]/80/80">
              Vision / north star
            </label>
            <textarea
              className={`${fieldClass} mt-1 min-h-[96px] whitespace-pre-wrap`}
              value={vision}
              onChange={(event) => setVision(event.target.value)}
              placeholder="Prototype a regenerative dessert program that leans on low-waste custards."
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#c8a97e]/80/80">
                Texture agenda
              </label>
              <input
                className={`${fieldClass} mt-1`}
                value={textureFocus}
                onChange={(event) => setTextureFocus(event.target.value)}
                placeholder="Satin custards, sparkling solids, hyper-aerated foams"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#c8a97e]/80/80">
                Flavor architecture
              </label>
              <input
                className={`${fieldClass} mt-1`}
                value={flavorNotes}
                onChange={(event) => setFlavorNotes(event.target.value)}
                placeholder="Koji smoke, maple brine, forest citrus"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#c8a97e]/80/80">
              Launch window or milestone
            </label>
            <input
              className={`${fieldClass} mt-1`}
              value={launchTarget}
              onChange={(event) => setLaunchTarget(event.target.value)}
              placeholder="Spring tasting menu preview — Week 9"
            />
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="submit"
              className="rounded-full border border-[#c8a97e]/40 bg-amber-500/80 px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-amber-500"
            >
              Capture Blueprint
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
