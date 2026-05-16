/**
 * BEO Inbox Component - Enhanced UI/UX
 * Professional, modern design matching industry standards
 */

import React from "react";
import {
  Inbox,
  FileText,
  Calendar,
  Users,
  Building2,
  Copy,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { osBus } from "@/lib/os-bus";
import { getBeo, listBeosByEvent } from "@/lib/beo-store";
import type { BEODocument } from "@/../shared/types/beo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/glass";

export default function BEOInbox() {
  const [latest, setLatest] = React.useState<BEODocument | null>(null);
  const [eventBeos, setEventBeos] = React.useState<BEODocument[]>([]);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    const unsub = osBus.on("beo:created", ({ beoId, eventId }) => {
      const doc = getBeo(beoId);
      setLatest(doc);
      setEventBeos(listBeosByEvent(eventId));
    });
    const unsubUpdate = osBus.on("beo:updated", ({ beoId, eventId }) => {
      const doc = getBeo(beoId);
      setLatest(doc);
      setEventBeos(listBeosByEvent(eventId));
    });
    return () => {
      unsub();
      unsubUpdate();
    };
  }, []);

  const handleCopy = async () => {
    if (latest) {
      try {
        await navigator.clipboard?.writeText(JSON.stringify(latest, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card className="border-border/20 bg-background/40 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Inbox className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-foreground">
              BEO Inbox
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Receives new BEOs from EchoEventStudio
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {latest ? (
          <>
            {/* Latest BEO Card */}
            <div className="p-4 rounded-lg border border-border/20 bg-background/60 hover:bg-background/80 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-foreground">
                    {latest.beoNumber}
                  </span>
                  {latest.revisionNumber && (
                    <Badge variant="outline" className="text-xs">
                      Rev {latest.revisionNumber}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-foreground/50">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDate(latest.updatedAt)}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-foreground/50" />
                  <span className="text-foreground/80 font-medium">
                    {latest.title}
                  </span>
                </div>
                {latest.outletName && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-foreground/50" />
                    <span className="text-foreground/70">
                      {latest.outletName}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-4 pt-2 border-t border-border/20">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-foreground/50" />
                    <span className="text-xs text-foreground/70">
                      EXP: {latest.exp ?? "—"} | GTD: {latest.gtd ?? "—"} | SET:{" "}
                      {latest.set ?? "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/20">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="flex-1"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy JSON
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Event BEO History */}
            {eventBeos.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Event BEO History
                </h3>
                <div className="space-y-2">
                  {eventBeos.map((b) => (
                    <div
                      key={b.beoId}
                      className="p-3 rounded-lg border border-border/20 bg-background/40 hover:bg-background/60 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-foreground">
                          {b.beoNumber}
                        </span>
                        {b.revisionNumber && (
                          <Badge variant="outline" className="text-xs">
                            Rev {b.revisionNumber}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-foreground/70">{b.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-8 text-center">
            <Inbox className="w-12 h-12 text-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-foreground/60 mb-1">
              No BEO received yet
            </p>
            <p className="text-xs text-foreground/50">
              Create an event in EchoEventStudio to generate a BEO
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
