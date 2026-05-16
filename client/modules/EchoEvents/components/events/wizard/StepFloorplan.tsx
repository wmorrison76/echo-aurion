/** * Step 4: Floorplan Designer * Visual layout designer for event space planning */ import {
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, LayoutGrid } from "lucide-react";
interface StepFloorplanProps {
  onNext: () => void;
}
export function StepFloorplan({ onNext }: StepFloorplanProps) {
  return (
    <>
      {" "}
      <CardHeader>
        {" "}
        <CardTitle className="flex items-center gap-2">
          {" "}
          <LayoutGrid className="h-5 w-5" /> Floorplan Designer{" "}
        </CardTitle>{" "}
        <p className="text-sm text-muted-foreground mt-2">
          {" "}
          Design the layout for your event space and arrange furniture and
          stations{" "}
        </p>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-6">
        {" "}
        {/* Canvas Placeholder */}{" "}
        <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg h-96 flex items-center justify-center bg-slate-50 dark:bg-surface">
          {" "}
          <div className="text-center">
            {" "}
            <LayoutGrid className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />{" "}
            <p className="text-muted-foreground"> Floorplan Canvas </p>{" "}
            <p className="text-xs text-muted-foreground mt-2">
              {" "}
              Drag and drop furniture to design your event layout{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
        {/* Furniture Library */}{" "}
        <div>
          {" "}
          <h3 className="text-sm font-semibold mb-3">
            Available Furniture
          </h3>{" "}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {" "}
            {[
              "Round Table",
              "Rectangular Table",
              "Bar",
              "Stage",
              "Lounge Area",
              "Food Station",
            ].map((item) => (
              <div
                key={item}
                className="p-3 rounded-lg border border-slate-200 dark:border-border hover:border-primary/50 cursor-move text-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {" "}
                {item}{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </div>{" "}
        {/* Warnings */}{" "}
        <div className="space-y-2">
          {" "}
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 flex gap-2">
            {" "}
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />{" "}
            <div>
              {" "}
              <p className="text-sm font-medium text-amber-900 dark:text-amber-300">
                {" "}
                Capacity Check{" "}
              </p>{" "}
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                {" "}
                Ensure your layout accommodates 200 guests with proper
                spacing{" "}
              </p>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        {/* Action Buttons */}{" "}
        <div className="flex justify-end gap-3 pt-4 border-t">
          {" "}
          <Button onClick={onNext} size="lg" className="gap-2">
            {" "}
            Continue →{" "}
          </Button>{" "}
        </div>{" "}
      </CardContent>{" "}
    </>
  );
}
