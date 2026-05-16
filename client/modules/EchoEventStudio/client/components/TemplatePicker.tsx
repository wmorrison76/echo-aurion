import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TEMPLATES } from "@/lib/templates";
export default function TemplatePicker({
  onPick,
}: {
  onPick: (name: string) => void;
}) {
  return (
    <Dialog>
      {" "}
      <DialogTrigger asChild>
        {" "}
        <Button variant="secondary" size="sm" className="w-full">
          {" "}
          Open Template Picker{" "}
        </Button>{" "}
      </DialogTrigger>{" "}
      <DialogContent className="max-w-2xl">
        {" "}
        <DialogHeader>
          {" "}
          <DialogTitle>Templates</DialogTitle>{" "}
        </DialogHeader>{" "}
        <ScrollArea className="h-96 pr-2">
          {" "}
          <div className="grid grid-cols-2 gap-3">
            {" "}
            {TEMPLATES.map((t) => (
              <Card
                key={t.name}
                className="border-muted/50 hover:border-primary/60 transition-colors"
              >
                {" "}
                <CardHeader className="pb-2">
                  {" "}
                  <div className="text-sm font-medium">{t.name}</div>{" "}
                </CardHeader>{" "}
                <CardContent>
                  {" "}
                  <div className="text-xs text-muted-foreground mb-2">
                    {" "}
                    {t.items.length} objects{" "}
                  </div>{" "}
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => onPick(t.name)}
                  >
                    {" "}
                    Load{" "}
                  </Button>{" "}
                </CardContent>{" "}
              </Card>
            ))}{" "}
          </div>{" "}
        </ScrollArea>{" "}
      </DialogContent>{" "}
    </Dialog>
  );
}
