import React from "react";

import { post } from "@/lib/api-client";
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
import type { ProspectStage } from "@shared/types/prospect";

interface CreateProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProspectCreated?: (prospect: any) => void;
  createProspect?: (payload: any) => Promise<{ prospect?: any }>;
}

export function CreateProspectModal({
  isOpen,
  onClose,
  onProspectCreated,
  createProspect,
}: CreateProspectModalProps) {
  const [formData, setFormData] = React.useState({
    name: "",
    contact: "",
    email: "",
    phone: "",
    eventType: "conference",
    eventDate: "",
    description: "",
    status: "prospect" as ProspectStage,
    estimatedValue: "",
  });

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (value: string, field: "eventType" | "status") => {
    setFormData((prev) => ({ ...prev, [field]: value as any }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      contact: "",
      email: "",
      phone: "",
      eventType: "conference",
      eventDate: "",
      description: "",
      status: "prospect",
      estimatedValue: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) return setError("Company name is required");
    if (!formData.contact.trim()) return setError("Contact name is required");
    if (!formData.email.trim()) return setError("Email is required");
    if (!formData.eventDate.trim()) return setError("Event date is required");

    setIsLoading(true);
    try {
      const eventTypeCodeMap: Record<string, string> = {
        conference: "SEM",
        "corporate-gala": "COR",
        fundraiser: "BAN",
        wedding: "WED",
        "product-launch": "COR",
        other: "OTH",
      };

      const estimated = formData.estimatedValue.trim();
      const estimatedRevenue = estimated
        ? Number.parseInt(estimated, 10)
        : undefined;

      const payload = {
        name: formData.name.trim(),
        contact_name: formData.contact.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        event_type_code: eventTypeCodeMap[formData.eventType] || "OTH",
        event_date: formData.eventDate,
        status: formData.status,
        description: formData.description.trim(),
        estimated_revenue: Number.isFinite(estimatedRevenue as any)
          ? estimatedRevenue
          : undefined,
      };

      const create =
        createProspect ??
        ((body: any) => post<{ prospect?: any }>("/api/prospects", body));
      const data = await create(payload);

      if (data?.prospect) {
        onProspectCreated?.(data.prospect);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("prospect-created", {
              detail: {
                prospectId: data.prospect.id,
                name: data.prospect.name,
              },
            }),
          );
        }
      }

      resetForm();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create prospect",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        className="max-w-2xl [&>button]:hidden"
        style={{ zIndex: 99999999, position: "fixed" } as React.CSSProperties}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Add New Prospect</DialogTitle>
          <DialogDescription>
            Create a new prospect and track it through your sales pipeline
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error ? (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          ) : null}

          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Company Information</h3>
            <div>
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Acme Corporation"
                value={formData.name}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact">Contact Name *</Label>
                <Input
                  id="contact"
                  placeholder="e.g., John Smith"
                  value={formData.contact}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="+1-555-0000"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@company.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Event Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="eventType">Event Type</Label>
                <Select
                  value={formData.eventType}
                  onValueChange={(value) =>
                    handleSelectChange(value, "eventType")
                  }
                >
                  <SelectTrigger id="eventType" disabled={isLoading}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conference">Conference</SelectItem>
                    <SelectItem value="corporate-gala">
                      Corporate Gala
                    </SelectItem>
                    <SelectItem value="fundraiser">Fundraiser</SelectItem>
                    <SelectItem value="wedding">Wedding</SelectItem>
                    <SelectItem value="product-launch">
                      Product Launch
                    </SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="eventDate">Event Date *</Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={formData.eventDate}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="status">Stage</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleSelectChange(value, "status")}
                >
                  <SelectTrigger id="status" disabled={isLoading}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="negotiation">Negotiation</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="beo_created">BEO Created</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="estimatedValue">Est. Value ($)</Label>
                <Input
                  id="estimatedValue"
                  type="number"
                  placeholder="50000"
                  value={formData.estimatedValue}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Additional Information</h3>
            <div>
              <Label htmlFor="description">Notes</Label>
              <Textarea
                id="description"
                placeholder="Any additional notes about this prospect..."
                value={formData.description}
                onChange={handleInputChange}
                disabled={isLoading}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Add Prospect"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
