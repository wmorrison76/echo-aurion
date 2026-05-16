import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Play } from "lucide-react";
import InteractionPanel from "@/components/figma/InteractionPanel";
import AnimationTimeline from "@/components/figma/AnimationTimeline";
import DevicePreview from "@/components/figma/DevicePreview";

export default function PrototypeViewer() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/5 p-4 md:p-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Button asChild variant="ghost" size="sm" className="px-0 text-muted-foreground hover:text-foreground">
              <Link to="/figma-design">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Figma Design Environment
              </Link>
            </Button>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Play className="h-8 w-8 text-cyan-500" />
                Prototype Viewer
              </h1>
              <p className="text-sm text-muted-foreground max-w-3xl">
                Review interactive states, device previews, and recorded flows in one place.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="xl:col-span-2 h-[760px]">
            <DevicePreview />
          </div>
          <div className="h-[760px]">
            <InteractionPanel />
          </div>
          <div className="h-[760px]">
            <AnimationTimeline />
          </div>
        </div>

        <Card className="border-primary/20 bg-background/75 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-sm">Prototype Notes</CardTitle>
            <CardDescription>
              This viewer is wired to the same local prototype data used inside the design environment.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Use it to validate interactions before sharing the prototype with the team.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
