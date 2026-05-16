/** * BEO Header Section * * Displays BEO specifications: * - BEO number, event name, date * - Guest counts (current, guaranteed, forecast) * - Contact information * - Salesperson * - Status */ import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BEODetailResponse } from "@/hooks/useBEODetail";
interface BEOHeaderSectionProps {
  beo: BEODetailResponse;
}
export function BEOHeaderSection({ beo }: BEOHeaderSectionProps) {
  const eventDate = new Date(beo.eventDate);
  return (
    <Card className="bg-slate-800 border-border p-6">
      {" "}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        {" "}
        {/* BEO Number */}{" "}
        <div>
          {" "}
          <label className="text-xs font-semibold text-slate-400 uppercase">
            {" "}
            BEO #{" "}
          </label>{" "}
          <p className="text-white font-mono mt-1">{beo.beoNumber}</p>{" "}
        </div>{" "}
        {/* Event Date */}{" "}
        <div>
          {" "}
          <label className="text-xs font-semibold text-slate-400 uppercase">
            {" "}
            Date{" "}
          </label>{" "}
          <p className="text-white mt-1">
            {" "}
            {eventDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}{" "}
          </p>{" "}
        </div>{" "}
        {/* Guest Count */}{" "}
        <div>
          {" "}
          <label className="text-xs font-semibold text-slate-400 uppercase">
            {" "}
            Guests{" "}
          </label>{" "}
          <p className="text-white mt-1">{beo.guestCount}</p>{" "}
          <p className="text-xs text-slate-400">
            {" "}
            Guaranteed: {beo.guaranteedGuests}{" "}
          </p>{" "}
        </div>{" "}
        {/* Status */}{" "}
        <div>
          {" "}
          <label className="text-xs font-semibold text-slate-400 uppercase">
            {" "}
            Status{" "}
          </label>{" "}
          <div className="mt-1">
            {" "}
            <Badge variant="outline">{beo.status}</Badge>{" "}
          </div>{" "}
        </div>{" "}
        {/* Client */}{" "}
        <div className="md:col-span-2">
          {" "}
          <label className="text-xs font-semibold text-slate-400 uppercase">
            {" "}
            Client{" "}
          </label>{" "}
          <p className="text-white mt-1">{beo.clientName || "N/A"}</p>{" "}
          {beo.clientEmail && (
            <p className="text-xs text-slate-400">{beo.clientEmail}</p>
          )}{" "}
          {beo.clientPhone && (
            <p className="text-xs text-slate-400">{beo.clientPhone}</p>
          )}{" "}
        </div>{" "}
        {/* Salesperson */}{" "}
        <div className="md:col-span-2">
          {" "}
          <label className="text-xs font-semibold text-slate-400 uppercase">
            {" "}
            Salesperson{" "}
          </label>{" "}
          <p className="text-white mt-1">{beo.salespersonName || "N/A"}</p>{" "}
        </div>{" "}
      </div>{" "}
    </Card>
  );
}
