import { HeroSection } from "../components/HeroSection";
import { FeatureGrid } from "../components/FeatureGrid";
import { GuardianShowcase } from "../components/GuardianShowcase";
import { LandingAuthModal } from "../components/LandingAuthModal";
export function LandingPage() {
  return (
    <div className="w-full h-full flex flex-col overflow-auto bg-background">
      {" "}
      {/* Landing Page Content */}{" "}
      <div className="flex-1">
        {" "}
        <HeroSection /> <FeatureGrid /> <GuardianShowcase />{" "}
        {/* Footer Section */}{" "}
        <div className="w-full py-12 px-6 sm:px-10 bg-background border-t border-border/40">
          {" "}
          <div className="max-w-7xl mx-auto text-center space-y-3">
            {" "}
            <p className="text-sm text-muted-foreground">
              {" "}
              © 2025 EchoAurum™ - LUCCCA Hospitality Cloud{" "}
            </p>{" "}
            <p className="text-xs text-muted-foreground/60">
              {" "}
              Precision 0.000005 • Latency SLO 200ms • Zelda Cold Snapshots{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {/* Auth Modal Overlay */} <LandingAuthModal />{" "}
    </div>
  );
}
