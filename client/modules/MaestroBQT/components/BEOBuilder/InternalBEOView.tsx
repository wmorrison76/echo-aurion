/**
 * Internal BEO View Component
 * Staff-facing document (no pricing, logistics-focused)
 * TripleSeat-style: Clean separation from guest proposal
 */

import React from "react";
import {
  Calendar,
  Users,
  MapPin,
  ChefHat,
  Clock,
  Package,
  AlertCircle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/glass";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { GenesisBEO } from "../../types/genesis-integration";
import type { Event } from "../../types";

interface InternalBEOViewProps {
  beo: GenesisBEO;
  event?: Event | null;
  onEdit?: () => void;
  onPrint?: () => void;
}

export function InternalBEOView({
  beo,
  event,
  onEdit,
  onPrint,
}: InternalBEOViewProps) {
  // Format date
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format time
  const formatTime = (timeStr?: string): string => {
    if (!timeStr) return "—";
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="min-h-screen bg-white print:bg-white">
      {/* Header - Internal Use Only */}
      <div className="border-b-2 border-gray-300 bg-gray-50 print:bg-gray-50 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              Internal BEO
            </h1>
            <p className="text-sm text-gray-600">
              For Staff Use Only - Logistics & Operations
            </p>
          </div>
          <Badge
            variant="outline"
            className="bg-amber-100 text-amber-900 border-amber-300"
          >
            BEO #{beo.id}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(event?.startDateTime || beo.createdAt)}</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            <span>Status: {beo.status.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Event Information */}
      <div className="p-6 space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Event Information
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Event ID</p>
              <p className="text-base text-gray-900">{beo.eventId}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">
                Venue Location
              </p>
              <p className="text-base text-gray-900">
                {event?.metadata?.venue || event?.metadata?.property || "—"}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Date</p>
              <p className="text-base text-gray-900">
                {formatDate(event?.startDateTime || beo.createdAt)}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Time</p>
              <p className="text-base text-gray-900">
                {event?.startDateTime
                  ? new Date(event.startDateTime).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : "—"}
              </p>
            </div>
          </div>
        </section>

        <Separator />

        {/* Functions / Service Moments */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Functions & Service Moments
          </h2>
          {beo.functions && beo.functions.length > 0 ? (
            <div className="space-y-4">
              {beo.functions.map((func) => (
                <Card key={func.id} className="border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-lg">{func.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {func.moments.map((moment) => (
                      <div
                        key={moment.id}
                        className="border-l-2 border-primary pl-4 py-2"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900">
                            {moment.name}
                          </h3>
                          {moment.time && (
                            <span className="text-sm text-gray-600">
                              {formatTime(moment.time)}
                            </span>
                          )}
                        </div>
                        {moment.menuItems.length > 0 && (
                          <ul className="space-y-1 text-sm text-gray-700">
                            {moment.menuItems.map((item) => (
                              <li
                                key={item.id}
                                className="flex items-center gap-2"
                              >
                                <ChefHat className="w-3 h-3 text-gray-400" />
                                <span>
                                  {item.name}{" "}
                                  {item.quantity > 1 && `(x${item.quantity})`}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">
              No functions defined yet.
            </p>
          )}
        </section>

        <Separator />

        {/* Logistics Notes */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Logistics & Operations Notes
          </h2>
          <Card className="border-gray-200 bg-gray-50">
            <CardContent className="p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {/* Internal notes would go here */}
                Production routing: Commissary → Kitchen → Service
                {"\n"}
                Special equipment requirements: None
                {"\n"}
                Staffing notes: Standard banquet crew
              </p>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Production Routing */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-primary" />
            Production Routing
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-base">Commissary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">Batch prep items</p>
                <p className="text-xs text-gray-600 mt-2">
                  Transfer: Morning shift
                </p>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-base">Kitchen</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">Final prep & plating</p>
                <p className="text-xs text-gray-600 mt-2">Service: Evening</p>
              </CardContent>
            </Card>
            <Card className="border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle className="text-base">Butcher</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">Protein fabrication</p>
                <p className="text-xs text-gray-600 mt-2">
                  Transfer: Pre-service
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-300 text-xs text-gray-500 text-center">
          <p>Internal BEO - For Staff Use Only</p>
          <p className="mt-1">Generated on {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

export default InternalBEOView;
