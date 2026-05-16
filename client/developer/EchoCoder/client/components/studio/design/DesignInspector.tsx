import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
export interface DesignInspectorBlock {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  props?: Record<string, any>;
}

export interface DesignInspectorProps {
  block: DesignInspectorBlock | null;
  onPositionChange: (changes: Partial<Pick<DesignInspectorBlock, "x" | "y" | "w" | "h">>) => void;
  onPropsChange: (changes: Record<string, any>) => void;
  onLayer: (action: "front" | "back" | "up" | "down") => void;
  onAlign: (mode: "left" | "center" | "right" | "top" | "middle" | "bottom") => void;
  onEffect: (effect: "drop-shadow" | "glow" | "clear-shadow") => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onBeginInlineEdit: () => void;
}

const numericFields: Array<{ key: "x" | "y" | "w" | "h"; label: string; min?: number; max?: number }> = [
  { key: "x", label: "X", min: 0 },
  { key: "y", label: "Y", min: 0 },
  { key: "w", label: "Width", min: 40 },
  { key: "h", label: "Height", min: 40 },
];

export function DesignInspector({
  block,
  onPositionChange,
  onPropsChange,
  onLayer,
  onAlign,
  onEffect,
  onDuplicate,
  onDelete,
  onBeginInlineEdit,
}: DesignInspectorProps) {
  const [outlineColor, setOutlineColor] = useState("#00e5ff");
  const [textColor, setTextColor] = useState("#e2e8f0");
  const [backgroundColor, setBackgroundColor] = useState("#0f172a");

  useEffect(() => {
    if (!block) return;
    if (block.props?.outlineColor) {
      setOutlineColor(String(block.props.outlineColor));
    }
    if (block.props?.color) {
      setTextColor(String(block.props.color));
    }
    if (block.props?.bg) {
      setBackgroundColor(String(block.props.bg));
    }
  }, [block]);

  if (!block) {
    return (
      <div className="text-sm text-muted-foreground">
        Select a block on the canvas to edit its properties.
      </div>
    );
  }

  const { type, props = {} } = block;
  const textEditable = ["Text", "Heading", "Section", "Button", "List", "Tabs", "Accordion"].includes(type);

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Selected</div>
        <div className="text-lg font-semibold leading-tight">{type}</div>
        <div className="text-xs text-muted-foreground">#{block.id}</div>
      </div>

      <section className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Layout</div>
        <div className="grid grid-cols-2 gap-2">
          {numericFields.map(({ key, label, min }) => (
            <label key={key} className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</span>
              <Input
                type="number"
                value={Number(block[key]).toFixed(0)}
                min={min}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isNaN(value)) return;
                  onPositionChange({ [key]: value });
                }}
                className="h-8 text-xs"
              />
            </label>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="ghost" size="sm" onClick={() => onAlign("left")}>
            Align left
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onAlign("center")}>
            Center
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onAlign("right")}>
            Align right
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onAlign("top")}>
            Align top
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onAlign("middle")}>
            Middle
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onAlign("bottom")}>
            Align bottom
          </Button>
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Appearance</div>
        <div className="grid gap-2">
          <ToggleSwitch
            label="Border"
            checked={(props.bordered ?? true) !== false}
            onCheckedChange={(checked) => onPropsChange({ bordered: checked })}
          />
          <ToggleSwitch
            label="Outline"
            checked={!!props.outline}
            onCheckedChange={(checked) => {
              onPropsChange({ outline: checked });
              if (checked) {
                onPropsChange({ outlineColor });
              }
            }}
            extra={
              <input
                type="color"
                className="h-6 w-12 cursor-pointer rounded border bg-background"
                value={outlineColor}
                onChange={(event) => {
                  setOutlineColor(event.target.value);
                  onPropsChange({ outlineColor: event.target.value, outline: true });
                }}
              />
            }
          />
          <ToggleSwitch
            label="Drop shadow"
            checked={Boolean(props.boxShadow?.includes("rgba"))}
            onCheckedChange={(checked) => onEffect(checked ? "drop-shadow" : "clear-shadow")}
          />
          <ToggleSwitch
            label="Glow"
            checked={Boolean(props.boxShadow?.includes("0 0"))}
            onCheckedChange={(checked) => onEffect(checked ? "glow" : "clear-shadow")}
          />
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 text-xs">
            <Label htmlFor="bg-color" className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Background
            </Label>
            <input
              id="bg-color"
              type="color"
              className="h-6 w-12 cursor-pointer rounded border bg-background"
              value={backgroundColor}
              onChange={(event) => {
                setBackgroundColor(event.target.value);
                onPropsChange({ bg: event.target.value });
              }}
            />
          </div>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 text-xs">
            <Label htmlFor="text-color" className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Text
            </Label>
            <input
              id="text-color"
              type="color"
              className="h-6 w-12 cursor-pointer rounded border bg-background"
              value={textColor}
              onChange={(event) => {
                setTextColor(event.target.value);
                onPropsChange({ color: event.target.value });
              }}
            />
          </div>
          {textEditable ? (
            <Button variant="secondary" size="sm" onClick={onBeginInlineEdit}>
              Edit text...
            </Button>
          ) : null}
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Layer</div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={() => onLayer("front")}>
            Bring to front
          </Button>
          <Button variant="outline" size="sm" onClick={() => onLayer("back")}>
            Send to back
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onLayer("up")}>
            Raise layer
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onLayer("down")}>
            Lower layer
          </Button>
        </div>
      </section>

      <Separator />

      <section className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Actions</div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onDuplicate}>
            Duplicate
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </section>
    </div>
  );
}

interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  description?: React.ReactNode;
  extra?: React.ReactNode;
}

function ToggleSwitch({ label, checked, onCheckedChange, description, extra }: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded border border-border/60 px-3 py-2">
      <div className="space-y-1 text-left">
        <div className="text-xs font-medium leading-tight">{label}</div>
        {description ? <div className="text-[11px] text-muted-foreground">{description}</div> : null}
      </div>
      <div className="flex items-center gap-2">
        {extra}
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </div>
  );
}

export default DesignInspector;
