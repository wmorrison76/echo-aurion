import React, { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Eye, Search, UserPlus } from "lucide-react";
export interface ProspectClaimPayload {
  name: string;
  company: string;
  email: string;
  phone?: string;
  location?: string;
  notes?: string;
}
export interface ClaimProspectResult {
  success: boolean;
  message: string;
}
export interface ProspectContactSummary {
  id: number;
  name: string;
  email: string;
  company: string;
  ownerName: string;
  ownerSince: string;
  createdAt: string;
  status: string;
  lastContact: string;
  activityCount: number;
}
interface ProspectClaimPanelProps {
  contacts: ProspectContactSummary[];
  onClaim: (payload: ProspectClaimPayload) => ClaimProspectResult;
  currentUser: string;
  onInspectContact?: (contactId: number) => void;
}
const initialFormState: ProspectClaimPayload = {
  name: "",
  company: "",
  email: "",
  phone: "",
  location: "",
  notes: "",
};
const formatDate = (value: string) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
};
const initialsFor = (value: string) => {
  if (!value) return "PR";
  return value
    .split("")
    .map((segment) => segment.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
};
export default function ProspectClaimPanel({
  contacts,
  onClaim,
  currentUser,
  onInspectContact,
}: ProspectClaimPanelProps) {
  const [form, setForm] = useState(initialFormState);
  const [searchTerm, setSearchTerm] = useState("");
  const [feedback, setFeedback] = useState<ClaimProspectResult | null>(null);
  const sortedDirectory = useMemo(() => {
    return [...contacts].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [contacts]);
  const matches = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return sortedDirectory.slice(0, 5);
    }
    return sortedDirectory
      .filter((contact) => {
        const haystack =
          `${contact.name} ${contact.company} ${contact.email}`.toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 5);
  }, [sortedDirectory, searchTerm]);
  const isSubmitDisabled =
    !form.name?.trim() || !form.company?.trim() || !form.email?.trim();
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitDisabled) return;
    const payload: ProspectClaimPayload = {
      name: form.name.trim(),
      company: form.company.trim(),
      email: form.email.trim(),
      phone: form.phone?.trim() || "",
      location: form.location?.trim() || "",
      notes: form.notes?.trim() || "",
    };
    const result = onClaim(payload);
    setFeedback(result);
    if (result.success) {
      setForm(initialFormState);
      setSearchTerm("");
    }
  };
  return (
    <Card className="border border-border/40 bg-background shadow-sm dark:border-slate-800 dark:bg-surface">
      {" "}
      <CardHeader className="pb-4">
        {" "}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {" "}
          <div>
            {" "}
            <CardTitle className="text-lg font-semibold text-foreground">
              Claim a Prospect
            </CardTitle>{" "}
            <CardDescription>
              {" "}
              Reserve ownership before outreach. Search existing records to
              avoid duplicate follow-ups.{" "}
            </CardDescription>{" "}
          </div>{" "}
          <Badge
            variant="outline"
            className="flex items-center gap-2 text-xs uppercase"
          >
            {" "}
            <UserPlus className="h-3.5 w-3.5" /> You will appear as primary
            owner ({currentUser}){" "}
          </Badge>{" "}
        </div>{" "}
      </CardHeader>{" "}
      <CardContent className="grid gap-6 lg:grid-cols-5">
        {" "}
        <div className="space-y-3 lg:col-span-2">
          {" "}
          <Label htmlFor="prospect-search">Search directory</Label>{" "}
          <div className="relative">
            {" "}
            <Input
              id="prospect-search"
              placeholder="Search by name, company, or email"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-10 w-full rounded-lg border border-border/40 bg-background pl-10 dark:border-slate-800 dark:bg-surface"
            />{" "}
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />{" "}
          </div>{" "}
          <ScrollArea className="h-44 rounded-lg border border-border/40 bg-background p-3 dark:border-slate-800 dark:bg-surface">
            {" "}
            {matches.length > 0 ? (
              <div className="space-y-3">
                {" "}
                {matches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-start gap-3 rounded-lg border border-border/30 bg-background p-3 shadow-sm dark:border-slate-800 dark:bg-surface"
                  >
                    {" "}
                    <Avatar className="h-9 w-9">
                      {" "}
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {" "}
                        {initialsFor(match.name)}{" "}
                      </AvatarFallback>{" "}
                    </Avatar>{" "}
                    <div className="flex-1 space-y-1">
                      {" "}
                      <div className="flex items-center justify-between gap-3">
                        {" "}
                        <p className="text-sm font-semibold text-foreground">
                          {match.name}
                        </p>{" "}
                        <Badge
                          variant="outline"
                          className="capitalize text-[0.65rem]"
                        >
                          {" "}
                          {match.status}{" "}
                        </Badge>{" "}
                      </div>{" "}
                      <p className="text-xs text-muted-foreground">
                        {match.company}
                      </p>{" "}
                      <p className="text-xs text-muted-foreground">
                        {" "}
                        Owned by{" "}
                        <span className="font-medium text-foreground">
                          {match.ownerName}
                        </span>{" "}
                        since {formatDate(match.ownerSince)}{" "}
                      </p>{" "}
                      <p className="text-xs text-muted-foreground">
                        Activity entries: {match.activityCount}
                      </p>{" "}
                    </div>{" "}
                    {onInspectContact ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="mt-1 h-8 w-8"
                        onClick={() => onInspectContact(match.id)}
                        title="Open contact record"
                      >
                        {" "}
                        <Eye className="h-4 w-4" />{" "}
                      </Button>
                    ) : null}{" "}
                  </div>
                ))}{" "}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {" "}
                No matching records. Claiming this prospect will assign
                ownership to you.{" "}
              </p>
            )}{" "}
          </ScrollArea>{" "}
        </div>{" "}
        <div className="lg:col-span-3">
          {" "}
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            {" "}
            <div className="space-y-1 sm:col-span-1">
              {" "}
              <Label htmlFor="prospect-name">Full name *</Label>{" "}
              <Input
                id="prospect-name"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Alex Morgan"
              />{" "}
            </div>{" "}
            <div className="space-y-1 sm:col-span-1">
              {" "}
              <Label htmlFor="prospect-company">Company *</Label>{" "}
              <Input
                id="prospect-company"
                value={form.company}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, company: event.target.value }))
                }
                placeholder="Grand Hotels Co."
              />{" "}
            </div>{" "}
            <div className="space-y-1 sm:col-span-1">
              {" "}
              <Label htmlFor="prospect-email">Email *</Label>{" "}
              <Input
                id="prospect-email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder="alex@example.com"
              />{" "}
            </div>{" "}
            <div className="space-y-1 sm:col-span-1">
              {" "}
              <Label htmlFor="prospect-phone">Phone</Label>{" "}
              <Input
                id="prospect-phone"
                value={form.phone}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, phone: event.target.value }))
                }
                placeholder="+1 (555) 123-4567"
              />{" "}
            </div>{" "}
            <div className="space-y-1 sm:col-span-1">
              {" "}
              <Label htmlFor="prospect-location">Location</Label>{" "}
              <Input
                id="prospect-location"
                value={form.location}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, location: event.target.value }))
                }
                placeholder="San Francisco, CA"
              />{" "}
            </div>{" "}
            <div className="space-y-1 sm:col-span-2">
              {" "}
              <Label htmlFor="prospect-notes">Quick notes</Label>{" "}
              <Textarea
                id="prospect-notes"
                rows={3}
                value={form.notes}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder="Context, referral source, or discovery notes"
              />{" "}
            </div>{" "}
            {feedback ? (
              <div
                className={`sm:col-span-2 rounded-md border px-3 py-2 text-sm ${feedback.success ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600" : "border-red-500/30 bg-red-500/5 text-red-600"}`}
              >
                {" "}
                {feedback.message}{" "}
              </div>
            ) : null}{" "}
            <div className="sm:col-span-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              {" "}
              <p className="text-xs text-muted-foreground">
                {" "}
                The record will appear instantly in the directory with your
                ownership stamp.{" "}
              </p>{" "}
              <Button
                type="submit"
                disabled={isSubmitDisabled}
                className="sm:w-auto"
              >
                {" "}
                Claim prospect{" "}
              </Button>{" "}
            </div>{" "}
          </form>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
