import { useMemo, useState } from "react";
import {
  Building,
  Calendar,
  CreditCard,
  FileText,
  Monitor,
  Palette,
  Smartphone,
  Type,
  Upload,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ServerNotesPreview from "@/components/ServerNotesPreview";
import {
  layoutPresets,
  colorSchemes,
  createEmptyServerNote,
  type LayoutPreset,
  type ColorScheme,
  type ServerNote,
} from "../../shared/server-notes";

export type ServerNotesConfigProps = {
  config: ServerNote;
  onUpdate: (patch: Partial<ServerNote>) => void;
};

export function ServerNotesConfig({
  config,
  onUpdate,
}: ServerNotesConfigProps) {
  const [dragOver, setDragOver] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLayout, setPreviewLayout] = useState<LayoutPreset | null>(null);
  const usingCustom = config.colorScheme.id === "custom";
  const [customColors, setCustomColors] = useState<ColorScheme>(() =>
    usingCustom
      ? config.colorScheme
      : {
          ...colorSchemes.find((scheme) => scheme.id === "custom")!,
          primary: "#1f2937",
          secondary: "#4b5563",
          accent: "#9ca3af",
          background: "#ffffff",
          text: "#111827",
        },
  );

  const handleLayoutChange = (preset: LayoutPreset) => {
    const next = { ...config, layout: preset };
    if (
      preset.standardLayout.preferredOrientation &&
      preset.standardLayout.preferredOrientation !== config.orientation
    ) {
      next.orientation = preset.standardLayout.preferredOrientation;
    }
    onUpdate(next);
  };

  const updateColorScheme = (scheme: ColorScheme) => {
    onUpdate({ ...config, colorScheme: scheme });
  };

  const updateCustomColor = (key: keyof ColorScheme, value: string) => {
    const next = { ...customColors, [key]: value } as ColorScheme;
    setCustomColors(next);
    if (usingCustom) {
      updateColorScheme({ ...next, id: "custom", name: next.name || "Custom" });
    }
  };

  const availableLayouts = useMemo(() => layoutPresets, []);

  const controlPanelClass =
    "overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-[0_28px_85px_-58px_rgba(15,23,42,0.35)] backdrop-blur-lg transition-shadow dark:border-[#c8a97e]/20 dark:bg-slate-950/70";
  const subsectionSurfaceClass =
    "rounded-xl border border-white/60 bg-white/75 p-3.5 shadow-sm backdrop-blur-sm transition dark:border-[#c8a97e]/25 dark:bg-slate-950/50";

  const handleLogoFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const allow = Math.max(0, 2 - config.logos.length);
    const slice = Array.from(files).slice(0, allow);
    slice.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        onUpdate({ ...config, logos: [...config.logos, dataUrl] });
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="space-y-6">
      <Card className={controlPanelClass}>
        <CardHeader className="space-y-2 border-b border-white/60 px-5 py-4 dark:border-[#c8a97e]/20">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Type className="h-4 w-4" /> Layout Preset
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-4">
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {availableLayouts.map((preset) => {
              const active = config.layout.id === preset.id;
              return (
                <div
                  key={preset.id}
                  className={`${subsectionSurfaceClass} ${
                    active
                      ? "border-primary/70 bg-primary/10 shadow-md"
                      : "hover:border-primary/40"
                  }`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleLayoutChange(preset)}
                  onKeyDown={(event) =>
                    event.key === "Enter" && handleLayoutChange(preset)
                  }
                >
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-[13px] font-semibold leading-tight">
                        {preset.name}
                      </h4>
                      <p className="mt-1 text-[11px] leading-snug text-muted-foreground line-clamp-3">
                        {preset.description}
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <ServerNotesPreview
                        layout={preset}
                        color={config.colorScheme}
                        pageFormat={config.pageFormat}
                        variant="icon"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-4"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPreviewLayout(preset);
                          setPreviewOpen(true);
                        }}
                      >
                        Preview
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className={controlPanelClass}>
        <CardHeader className="space-y-2 border-b border-white/60 px-5 py-4 dark:border-[#c8a97e]/20">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Palette className="h-4 w-4" /> Color Scheme
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 px-5 pb-5 pt-4">
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {colorSchemes.map((scheme) => (
              <button
                key={scheme.id}
                type="button"
                className={`${subsectionSurfaceClass} w-full text-left ${
                  config.colorScheme.id === scheme.id
                    ? "border-primary/70 bg-primary/10 shadow-md"
                    : "hover:border-primary/40"
                }`}
                onClick={() => updateColorScheme(scheme)}
              >
                <div className="flex gap-1">
                  <span
                    className="h-4 w-4 rounded"
                    style={{ background: scheme.primary }}
                  />
                  <span
                    className="h-4 w-4 rounded"
                    style={{ background: scheme.secondary }}
                  />
                  <span
                    className="h-4 w-4 rounded"
                    style={{ background: scheme.accent }}
                  />
                </div>
                <div className="mt-2 text-[13px] font-medium leading-tight">
                  {scheme.name}
                </div>
              </button>
            ))}
          </div>

          <div
            className={`${subsectionSurfaceClass} ${
              usingCustom ? "border-primary/70 bg-primary/10 shadow-md" : ""
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
              <div className="font-semibold">Custom Palette</div>
              <Button
                variant={usingCustom ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  updateColorScheme({
                    ...customColors,
                    id: "custom",
                    name: customColors.name || "Custom",
                  })
                }
              >
                {usingCustom ? "Active" : "Use Custom"}
              </Button>
            </div>
            <div className="mt-3 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  ["primary", "Primary"],
                  ["secondary", "Secondary"],
                  ["accent", "Accent"],
                  ["background", "Background"],
                  ["text", "Text"],
                ] as [keyof ColorScheme, string][]
              ).map(([key, label]) => (
                <div key={key} className="space-y-1.5 text-[11px]">
                  <Label className="leading-snug text-[11px]">{label}</Label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={customColors[key]}
                      className="h-8 w-8 rounded border border-white/60 bg-white"
                      onChange={(event) =>
                        updateCustomColor(key, event.target.value)
                      }
                    />
                    <Input
                      value={customColors[key]}
                      onChange={(event) =>
                        updateCustomColor(key, event.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={controlPanelClass}>
        <CardHeader className="space-y-2 border-b border-white/60 px-5 py-4 dark:border-[#c8a97e]/20">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4" /> Page Format & Orientation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-5 pt-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={config.pageFormat === "standard" ? "default" : "outline"}
              onClick={() => onUpdate({ ...config, pageFormat: "standard" })}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" /> Standard (8.5" × 11")
            </Button>
            <Button
              variant={
                config.pageFormat === "index-card" ? "default" : "outline"
              }
              onClick={() => onUpdate({ ...config, pageFormat: "index-card" })}
              className="flex items-center gap-2"
            >
              <CreditCard className="h-4 w-4" /> Index Cards (3" × 5")
            </Button>
          </div>

          {config.pageFormat === "standard" ? (
            <div className="flex gap-2">
              <Button
                variant={
                  config.orientation === "vertical" ? "default" : "outline"
                }
                onClick={() => onUpdate({ ...config, orientation: "vertical" })}
                size="sm"
                className="flex items-center gap-2"
              >
                <Smartphone className="h-4 w-4" /> Portrait
              </Button>
              <Button
                variant={
                  config.orientation === "horizontal" ? "default" : "outline"
                }
                onClick={() =>
                  onUpdate({ ...config, orientation: "horizontal" })
                }
                size="sm"
                className="flex items-center gap-2"
              >
                <Monitor className="h-4 w-4" /> Landscape
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                variant={config.cardsPerPage === 1 ? "default" : "outline"}
                onClick={() => onUpdate({ ...config, cardsPerPage: 1 })}
                size="sm"
              >
                1 Card Per Page
              </Button>
              <Button
                variant={config.cardsPerPage === 2 ? "default" : "outline"}
                onClick={() => onUpdate({ ...config, cardsPerPage: 2 })}
                size="sm"
              >
                2 Cards Per Page
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={controlPanelClass}>
        <CardHeader className="space-y-2 border-b border-white/60 px-5 py-4 dark:border-[#c8a97e]/20">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Building className="h-4 w-4" /> Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-5 pt-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="company-name" className="text-xs">
                Company Name
              </Label>
              <Input
                id="company-name"
                value={config.companyName}
                onChange={(event) =>
                  onUpdate({ ...config, companyName: event.target.value })
                }
                placeholder="Restaurant name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="outlet-name" className="text-xs">
                Outlet Name
              </Label>
              <Input
                id="outlet-name"
                value={config.outletName}
                onChange={(event) =>
                  onUpdate({ ...config, outletName: event.target.value })
                }
                placeholder="Location or concept"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Restaurant Logos (max 2)</Label>
            <div
              className={`${subsectionSurfaceClass} border-2 border-dashed ${
                dragOver ? "border-primary/60 bg-primary/10" : ""
              } text-center`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                handleLogoFiles(event.dataTransfer.files);
              }}
            >
              {config.logos.length < 2 ? (
                <div className="space-y-3">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drag & drop logo files here, or click to browse
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    id="server-notes-logo-upload"
                    onChange={(event) => handleLogoFiles(event.target.files)}
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      document
                        .getElementById("server-notes-logo-upload")
                        ?.click()
                    }
                  >
                    Browse files
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Maximum logos uploaded.
                </p>
              )}
            </div>
            {config.logos.length > 0 && (
              <div className="flex gap-3">
                {config.logos.map((logo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={logo}
                      alt={`Logo ${index + 1}`}
                      className="h-16 w-16 rounded border border-white/60 bg-white object-contain dark:border-[#c8a97e]/25"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -right-2 -top-2 h-6 w-6"
                      onClick={() => {
                        const next = [...config.logos];
                        next.splice(index, 1);
                        onUpdate({ ...config, logos: next });
                      }}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className={controlPanelClass}>
        <CardHeader className="space-y-2 border-b border-white/60 px-5 py-4 dark:border-[#c8a97e]/20">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Calendar className="h-4 w-4" /> Document Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-5 pt-4">
          <div className="space-y-1.5">
            <Label htmlFor="document-title" className="text-xs">
              Document Title
            </Label>
            <Input
              id="document-title"
              value={config.title}
              onChange={(event) =>
                onUpdate({ ...config, title: event.target.value })
              }
              placeholder="Seasonal menu briefing"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="distribution-date" className="text-xs">
              Distribution Date
            </Label>
            <Input
              id="distribution-date"
              type="date"
              value={config.distributionDate.slice(0, 10)}
              onChange={(event) =>
                onUpdate({ ...config, distributionDate: event.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="document-notes" className="text-xs">
              Distribution Notes
            </Label>
            <Textarea
              id="document-notes"
              placeholder="Optional notes shared with service team or attachments to include..."
              value={config.distributionNotes ?? ""}
              onChange={(event) =>
                onUpdate({ ...config, distributionNotes: event.target.value })
              }
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewLayout?.name}</DialogTitle>
          </DialogHeader>
          {previewLayout && (
            <ServerNotesPreview
              layout={previewLayout}
              color={config.colorScheme}
              pageFormat={config.pageFormat}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
