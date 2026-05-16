import React, { useMemo, useState } from "react";
import { osBus } from "@/lib/os-bus";
import { listGroups } from "@/lib/group-store";
import type { GroupBooking } from "@/../shared/types/group";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated?: (event: any) => void;
}

function getOrgIdForRequest(): string {
  if (typeof window === "undefined") return "default";
  const orgRaw = localStorage.getItem("auth_org");
  if (orgRaw) {
    try {
      const parsed = JSON.parse(orgRaw);
      const id = String(parsed?.id || "").trim();
      if (id) return id;
    } catch {
      // ignore
    }
  }
  const userRaw = localStorage.getItem("auth_user");
  if (userRaw) {
    try {
      const parsed = JSON.parse(userRaw);
      const id = String(parsed?.org_id || "").trim();
      if (id) return id;
    } catch {
      // ignore
    }
  }
  return "default";
}

export function CreateEventModal({
  isOpen,
  onClose,
  onEventCreated,
}: CreateEventModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    eventTypeCode: "OTH",
    status: "pending",
    date: "",
    time: "",
    venue: "",
    guestCount: "",
    notes: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const groups = useMemo(() => listGroups(), []);
  const selectedGroup: GroupBooking | undefined = useMemo(
    () => groups.find((g) => g.groupId === selectedGroupId),
    [groups, selectedGroupId],
  );

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (value: string, field: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError("Event name is required");
      return;
    }
    if (!formData.date) {
      setError("Event date is required");
      return;
    }

    setIsLoading(true);
    try {
      const orgId = getOrgIdForRequest();

      const startTime = formData.time || "09:00";
      const startDateTime = `${formData.date}T${startTime}:00Z`;
      const [startHour, startMin] = startTime.split(":");
      const endHour = String(Number.parseInt(startHour, 10) + 1).padStart(
        2,
        "0",
      );
      const endDateTime = `${formData.date}T${endHour}:${startMin}:00Z`;

      // Use first available outlet from calendar API
      const outletsResponse = await fetch("/api/calendar/outlets", {
        headers: { "X-Org-ID": orgId },
      });
      const outletsData = await outletsResponse.json().catch(() => ({}));
      const outlets = Array.isArray(outletsData?.data) ? outletsData.data : [];
      const outletId = outlets?.[0]?.id;
      if (!outletId) {
        throw new Error(
          "No calendar outlet configured. Create an outlet before creating events.",
        );
      }

      const payload = {
        title: formData.title.trim(),
        outlet_id: outletId,
        start_time: startDateTime,
        end_time: endDateTime,
        location_room: formData.venue.trim() || null,
        guest_count: formData.guestCount
          ? Number.parseInt(formData.guestCount, 10)
          : 0,
        department: "Events",
        status: formData.status,
        event_type_code: formData.eventTypeCode,
        severity: "normal",
        notes: formData.notes.trim() || null,
        groupId: selectedGroup?.groupId || null,
        groupName: selectedGroup?.groupName || null,
      };

      const response = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Org-ID": orgId },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Failed to create event");
      }

      const created = data?.data?.event;
      if (!created?.id) {
        throw new Error("Unexpected response format");
      }

      osBus.emit("calendar:event_created", {
        eventId: created.id,
        source: "EchoEventStudio",
        event: created,
      });

      if (onEventCreated) onEventCreated(created);
      window.dispatchEvent(
        new CustomEvent("echo-event-created", { detail: { event: created } }),
      );

      setFormData({
        title: "",
        eventTypeCode: "OTH",
        status: "pending",
        date: "",
        time: "",
        venue: "",
        guestCount: "",
        notes: "",
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Create a calendar event backed by `calendar_events`.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-900 dark:text-red-100">
              {error}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="title">Event Name</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={handleInputChange}
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Event Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => handleSelectChange(v, "status")}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Confirmed</SelectItem>
                  <SelectItem value="possible">
                    Possible (Soft-Block)
                  </SelectItem>
                  <SelectItem value="conflict">Conflict</SelectItem>
                  <SelectItem value="locked">Locked</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventTypeCode">Event Type</Label>
              <Select
                value={formData.eventTypeCode}
                onValueChange={(v) => handleSelectChange(v, "eventTypeCode")}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WED">Wedding</SelectItem>
                  <SelectItem value="COR">Corporate</SelectItem>
                  <SelectItem value="BAN">Banquet</SelectItem>
                  <SelectItem value="SEM">Seminar</SelectItem>
                  <SelectItem value="OTH">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="venue">Room / Venue</Label>
              <Input
                id="venue"
                value={formData.venue}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guestCount">Guest Count</Label>
              <Input
                id="guestCount"
                type="number"
                value={formData.guestCount}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={handleInputChange}
              disabled={isLoading}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="groupId">Group / Booking (optional)</Label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              disabled={isLoading}
              id="groupId"
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground disabled:opacity-50"
            >
              <option value="">— No group —</option>
              {groups.map((g) => (
                <option key={g.groupId} value={g.groupId}>
                  {g.groupName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating…" : "Create Event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
