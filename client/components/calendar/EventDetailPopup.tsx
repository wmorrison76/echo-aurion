import React, { useState, useCallback, useEffect } from "react";
import { format, parseISO, formatDistanceToNow, isValid } from "date-fns";
import {
  X,
  Calendar,
  MapPin,
  Users,
  Clock,
  FileText,
  History,
  ChevronRight,
  Download,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/glass";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  guest_count?: number;
  location_room?: string;
  department?: string;
  status?: string;
  beo_id?: string;
  outlet_id?: string;
  description?: string;
  venue?: string;
}

interface BEOData {
  id: string;
  beoNumber: string;
  status: string;
  contentData: Record<string, any>;
  pdfUrl?: string;
  createdAt: string;
  approvedAt?: string;
  createdByUserId: string;
}

interface BEOVersion {
  versionNumber: number;
  changeType: string;
  changeSummary?: string;
  changedByName?: string;
  createdAt: string;
}

interface ChangeFeedEntry {
  id: string;
  changeType: string;
  changeSummary?: string;
  changedByName: string;
  createdAt: string;
}

interface EventDetailPopupProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (event: CalendarEvent) => void;
  className?: string;
}

export function EventDetailPopup({
  event,
  isOpen,
  onClose,
  onEdit,
  className,
}: EventDetailPopupProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [beoData, setBeoData] = useState<BEOData | null>(null);
  const [beoVersions, setBeoVersions] = useState<BEOVersion[]>([]);
  const [changeFeed, setChangeFeed] = useState<ChangeFeedEntry[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [isLoadingBEO, setIsLoadingBEO] = useState(false);

  // Load BEO data when event changes
  useEffect(() => {
    if (!event?.beo_id || !isOpen) return;

    const loadBEOData = async () => {
      setIsLoadingBEO(true);
      try {
        // Fetch BEO data
        const beoRes = await fetch(`/api/beo/${event.beo_id}`);
        if (beoRes.ok) {
          setBeoData(await beoRes.json());
        }

        // Fetch BEO versions
        const versionsRes = await fetch(`/api/beo/${event.beo_id}/versions`);
        if (versionsRes.ok) {
          const versions = await versionsRes.json();
          setBeoVersions(Array.isArray(versions) ? versions : []);
        }

        // Fetch change feed
        const changeFeedRes = await fetch(`/api/beo/${event.beo_id}/changes`);
        if (changeFeedRes.ok) {
          const feed = await changeFeedRes.json();
          setChangeFeed(Array.isArray(feed) ? feed : []);
        }
      } catch (err) {
        console.error("Error loading BEO data:", err);
      } finally {
        setIsLoadingBEO(false);
      }
    };

    loadBEOData();
  }, [event?.beo_id, isOpen]);

  if (!event) return null;

  const eventDate = parseISO(event.date);
  const isValidDate = isValid(eventDate);
  const getStatusColor = (status?: string) => {
    switch (status) {
      case "confirmed":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
      case "pending":
        return "bg-amber-500/20 text-amber-400 border-amber-500/50";
      case "tentative":
        return "bg-blue-500/20 text-blue-400 border-blue-500/50";
      case "cancelled":
        return "bg-red-500/20 text-red-400 border-red-500/50";
      default:
        return "bg-glass-secondary/20 text-white border-glass-secondary/50";
    }
  };

  const handleDownloadPDF = useCallback(() => {
    if (beoData?.pdfUrl) {
      const link = document.createElement("a");
      link.href = beoData.pdfUrl;
      link.download = `BEO-${beoData.beoNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [beoData?.pdfUrl, beoData?.beoNumber]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader className="border-b border-glass-secondary pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-white">
                {event.title}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {event.status && (
                  <Badge
                    variant="outline"
                    className={cn("text-xs", getStatusColor(event.status))}
                  >
                    {event.status}
                  </Badge>
                )}
                {event.department && (
                  <Badge variant="outline" className="text-xs">
                    {event.department}
                  </Badge>
                )}
              </div>
            </div>
            <DialogClose className="text-glass-muted hover:text-white" />
          </div>
        </DialogHeader>

        {/* Quick Info */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {isValidDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-blue-400" />
              <span className="text-glass-foreground">
                {format(eventDate, "MMM d, yyyy")}
              </span>
            </div>
          )}
          {event.start_time && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-blue-400" />
              <span className="text-glass-foreground">
                {event.start_time}
                {event.end_time && ` - ${event.end_time}`}
              </span>
            </div>
          )}
          {event.guest_count && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-blue-400" />
              <span className="text-glass-foreground">
                {event.guest_count} guest{event.guest_count !== 1 ? "s" : ""}
              </span>
            </div>
          )}
          {event.location_room && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-blue-400" />
              <span className="text-glass-foreground">
                {event.location_room}
              </span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-glass-secondary/20 border border-glass-secondary/30">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="beo" disabled={!event.beo_id && !beoData}>
              BEO {beoData && <FileText className="h-4 w-4 ml-1" />}
            </TabsTrigger>
            <TabsTrigger
              value="changes"
              disabled={!beoData || changeFeed.length === 0}
            >
              Changes {changeFeed.length > 0 && `(${changeFeed.length})`}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {event.description && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-2">
                  Description
                </h3>
                <p className="text-sm text-glass-foreground">
                  {event.description}
                </p>
              </div>
            )}

            {event.venue && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-2">Venue</h3>
                <p className="text-sm text-glass-foreground">{event.venue}</p>
              </div>
            )}

            <div className="flex items-center gap-2 pt-4 border-t border-glass-secondary/30">
              {onEdit && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onEdit(event)}
                >
                  Edit Event
                </Button>
              )}
            </div>
          </TabsContent>

          {/* BEO Tab */}
          <TabsContent value="beo" className="space-y-4">
            {isLoadingBEO ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400" />
              </div>
            ) : beoData ? (
              <>
                {/* BEO Header */}
                <div className="bg-glass-secondary/10 rounded-lg p-4 border border-glass-secondary/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-glass-muted">BEO Number</p>
                      <p className="text-lg font-semibold text-white">
                        {beoData.beoNumber}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-xs", getStatusColor(beoData.status))}
                    >
                      {beoData.status}
                    </Badge>
                  </div>
                </div>

                {/* BEO Content Summary */}
                {beoData.contentData && (
                  <div className="space-y-3">
                    {beoData.contentData.guestCount && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-glass-muted">Guest Count:</span>
                        <span className="text-white font-semibold">
                          {beoData.contentData.guestCount}
                        </span>
                      </div>
                    )}
                    {beoData.contentData.serviceType && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-glass-muted">Service Type:</span>
                        <span className="text-white font-semibold">
                          {beoData.contentData.serviceType}
                        </span>
                      </div>
                    )}
                    {beoData.contentData.budget && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-glass-muted">Budget:</span>
                        <span className="text-white font-semibold">
                          ${beoData.contentData.budget}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* PDF Download */}
                {beoData.pdfUrl && (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={handleDownloadPDF}
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                )}

                {/* Version History */}
                {beoVersions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-3">
                      Version History
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {beoVersions.map((version) => (
                        <button
                          key={version.versionNumber}
                          onClick={() =>
                            setSelectedVersion(version.versionNumber)
                          }
                          className={cn(
                            "w-full text-left p-2 rounded border transition-colors",
                            selectedVersion === version.versionNumber
                              ? "bg-blue-500/20 border-blue-500/50"
                              : "bg-glass-secondary/10 border-glass-secondary/30 hover:bg-glass-secondary/20",
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-mono text-glass-muted">
                                v{version.versionNumber}
                              </p>
                              <p className="text-sm text-white">
                                {version.changeSummary || version.changeType}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-glass-muted" />
                          </div>
                          <p className="text-xs text-glass-muted/60 mt-1">
                            {version.changedByName} •{" "}
                            {formatDistanceToNow(parseISO(version.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-8 w-8 text-glass-muted/50 mx-auto mb-2" />
                <p className="text-sm text-glass-muted">
                  No BEO created for this event
                </p>
              </div>
            )}
          </TabsContent>

          {/* Changes Tab */}
          <TabsContent value="changes" className="space-y-4">
            {isLoadingBEO ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400" />
              </div>
            ) : changeFeed.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {changeFeed.map((entry) => (
                  <Card
                    key={entry.id}
                    className="border-glass-secondary/30 bg-glass-secondary/10"
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {entry.changeType === "created" && (
                            <div className="h-6 w-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                              <Plus className="h-3 w-3 text-emerald-400" />
                            </div>
                          )}
                          {entry.changeType === "updated" && (
                            <div className="h-6 w-6 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center">
                              <Edit className="h-3 w-3 text-blue-400" />
                            </div>
                          )}
                          {entry.changeType === "approved" && (
                            <div className="h-6 w-6 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center">
                              <CheckCircle className="h-3 w-3 text-amber-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">
                            {entry.changeSummary || entry.changeType}
                          </p>
                          <p className="text-xs text-glass-muted mt-1">
                            {entry.changedByName} •{" "}
                            {formatDistanceToNow(parseISO(entry.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <History className="h-8 w-8 text-glass-muted/50 mx-auto mb-2" />
                <p className="text-sm text-glass-muted">No changes yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Import icons we need
import { Plus, Edit, CheckCircle } from "lucide-react";
