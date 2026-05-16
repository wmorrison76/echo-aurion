import { Link } from "react-router-dom";
const footerLinks = [
  {
    title: "EchoAurum Platform",
    links: [
      { label: "CFO Console", href: "/console" },
      { label: "Invoice & Payments", href: "/purchasing" },
      { label: "Echo Ai³ Console", href: "/console#forecast-studio" },
      { label: "Forecast Studio", href: "/console#forecast-studio" },
      { label: "CPA Portal", href: "/console#cpa-portal" },
    ],
  },
  {
    title: "Compliance",
    links: [
      { label: "SOC 2 Type II", href: "#security" },
      { label: "PCI DSS v4", href: "#security" },
      { label: "Argus Immutable Ledger", href: "#security" },
      { label: "Zelda Snapshots", href: "#security" },
    ],
  },
  {
    title: "Connect",
    links: [
      { label: "NetSuite & Sage", href: "#integrations" },
      { label: "OPERA & Toast", href: "#integrations" },
      { label: "Vendor Exchange", href: "/purchasing" },
      { label: "Echo Ai³", href: "#platform" },
    ],
  },
];
export function SiteFooter() {
  return (
    <footer
      data-loc="client/components/layout/SiteFooter.tsx:36:5"
      className="relative mt-24 border-t border-border/40 bg-gradient-to-b from-surface to-surface-variant/80"
    >
      {" "}
      <div
        data-loc="client/components/layout/SiteFooter.tsx:37:7"
        className="absolute inset-x-0 -top-8 mx-auto h-16 w-64 rounded-full bg-aurum-500/40 blur-3xl"
      />{" "}
      <div
        data-loc="client/components/layout/SiteFooter.tsx:38:7"
        className="relative mx-auto max-w-7xl px-6 py-16 sm:px-10"
      >
        {" "}
        <div
          data-loc="client/components/layout/SiteFooter.tsx:39:9"
          className="grid gap-12 lg:grid-cols-[1.2fr_1fr]"
        >
          {" "}
          <div
            data-loc="client/components/layout/SiteFooter.tsx:40:11"
            className="max-w-xl"
          >
            {" "}
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-aurum-300">
              {" "}
              EchoAurum™{" "}
            </p>{" "}
            <h2 className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">
              {" "}
              Financial intelligence for LUCCCA hospitality ecosystems.{" "}
            </h2>{" "}
            <p className="mt-4 text-base text-muted-foreground">
              {" "}
              EchoAurum unifies EchoLedger², EchoStratus Ai³, and EchoSentinel
              to deliver a single source of financial truth—real-time cash
              ladder, AI variance narratives, and compliance baked into every
              journal.{" "}
            </p>{" "}
            <div
              data-loc="client/components/layout/SiteFooter.tsx:53:13"
              className="mt-6 flex flex-wrap items-center gap-3 text-xs font-medium text-muted-foreground"
            >
              {" "}
              <span className="rounded-full border border-border/60 bg-surface-variant px-3 py-1">
                {" "}
                0.000005 precision ledgers{" "}
              </span>{" "}
              <span className="rounded-full border border-border/60 bg-surface-variant px-3 py-1">
                {" "}
                Zelda • Argus • Phoenix guardians{" "}
              </span>{" "}
              <span className="rounded-full border border-border/60 bg-surface-variant px-3 py-1">
                {" "}
                Built for SOC 2 Type II{" "}
              </span>{" "}
            </div>{" "}
          </div>{" "}
          <div
            data-loc="client/components/layout/SiteFooter.tsx:65:11"
            className="grid gap-8 sm:grid-cols-3"
          >
            {" "}
            {footerLinks.map((group) => (
              <div key={group.title}>
                {" "}
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {" "}
                  {group.title}{" "}
                </p>{" "}
                <ul className="mt-4 space-y-2">
                  {" "}
                  {group.links.map((link) => {
                    const isAnchor = link.href.startsWith("#");
                    return (
                      <li key={link.label}>
                        {" "}
                        {isAnchor ? (
                          <a
                            href={link.href}
                            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {" "}
                            {link.label}{" "}
                          </a>
                        ) : (
                          <Link
                            to={link.href}
                            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {" "}
                            {link.label}{" "}
                          </Link>
                        )}{" "}
                      </li>
                    );
                  })}{" "}
                </ul>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </div>{" "}
        <div
          data-loc="client/components/layout/SiteFooter.tsx:99:9"
          className="mt-12 flex flex-col gap-4 border-t border-border/40 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
        >
          {" "}
          <p>
            {" "}
            © {new Date().getFullYear()} EchoAurum™ • LUCCCA Hospitality
            Cloud{" "}
          </p>{" "}
          <div className="flex flex-wrap items-center gap-3">
            {" "}
            <span>Precision 0.000005</span> <span>Latency SLO &lt; 200ms</span>{" "}
            <span>Zelda Cold Snapshots</span>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </footer>
  );
}
