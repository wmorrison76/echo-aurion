import { DollarSign } from "lucide-react";
export function HeroSection() {
  return (
    <div className="w-full py-16 px-6 sm:px-10 bg-gradient-to-br from-background via-background to-aurum-500/5 border-b border-border/40">
      {" "}
      <div className="max-w-7xl mx-auto">
        {" "}
        <div className="flex flex-col gap-8">
          {" "}
          {/* Main Title & Description */}{" "}
          <div className="space-y-6">
            {" "}
            <div className="flex items-start gap-4">
              {" "}
              <div className="h-14 w-14 rounded-xl bg-aurum-500/20 border border-aurum-500/40 flex items-center justify-center flex-shrink-0">
                {" "}
                <DollarSign className="h-7 w-7 text-aurum-400" />{" "}
              </div>{" "}
              <div className="space-y-2">
                {" "}
                <h1 className="text-5xl sm:text-6xl font-bold text-foreground tracking-tight">
                  {" "}
                  EchoAurum<span className="text-aurum-400">™</span>{" "}
                </h1>{" "}
                <p className="text-lg sm:text-xl text-muted-foreground">
                  {" "}
                  Financial intelligence for LUCCCA hospitality ecosystems.{" "}
                </p>{" "}
              </div>{" "}
            </div>{" "}
            {/* Description */}{" "}
            <p className="text-base text-muted-foreground max-w-3xl leading-relaxed">
              {" "}
              EchoAurum unifies EchoSaging, EchoVendor API, and Enchantment to
              deliver a single source of financial truth—real-time cash ladders,
              AI variance narratives, and compliance built into every
              journal.{" "}
            </p>{" "}
          </div>{" "}
          {/* Specs */}{" "}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            {" "}
            <div className="space-y-1">
              {" "}
              <div className="text-sm font-semibold text-aurum-300">
                {" "}
                Precision Ledgers{" "}
              </div>{" "}
              <div className="text-2xl font-bold text-foreground">
                0.000005
              </div>{" "}
              <div className="text-xs text-muted-foreground">
                {" "}
                Precision ledgers - Zelda + Phoenix guardians{" "}
              </div>{" "}
            </div>{" "}
            <div className="space-y-1">
              {" "}
              <div className="text-sm font-semibold text-aurum-300">
                {" "}
                Latency SLO{" "}
              </div>{" "}
              <div className="text-2xl font-bold text-foreground">
                200ms
              </div>{" "}
              <div className="text-xs text-muted-foreground">
                {" "}
                Zelda Cold Snapshots{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
