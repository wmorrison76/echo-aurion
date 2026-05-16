import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { CheckedState } from "@radix-ui/react-checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Store, id } from "@/lib/store";
import type { Vendor, VendorOrderingMode, Outlet } from "@shared/purchasing";
const ORDERING_MODE_LABELS: Record<
  VendorOrderingMode,
  { label: string; description: string }
> = {
  direct: {
    label: "Direct",
    description: "Build POs inside Echo and route for approval.",
  },
  punchout: {
    label: "Punchout",
    description: "Launch vendor storefront with cXML/OCI handoff.",
  },
  email: {
    label: "Email",
    description: "Send PDF orders to vendor contacts via email.",
  },
  portal: {
    label: "Portal",
    description: "Track orders via vendor-managed portal workflows.",
  },
};
type CodeDraft = { outletId: string; code: string; label: string };
const ensureDraft = (draft?: CodeDraft): CodeDraft => ({
  outletId: draft?.outletId ?? "",
  code: draft?.code ?? "",
  label: draft?.label ?? "",
});
type EditableVendorField =
  | "contactEmail"
  | "portalUrl"
  | "accountNumber"
  | "notes";
type EditableOutletField = "shortCode";
export function VendorManagementPanel() {
  const { toast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>(() => Store.listVendors());
  const [outlets, setOutlets] = useState<Outlet[]>(() => Store.listOutlets());
  const [search, setSearch] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [vendorForm, setVendorForm] = useState({
    name: "",
    contactEmail: "",
    portalUrl: "",
    accountNumber: "",
    notes: "",
    orderingModes: [] as VendorOrderingMode[],
  });
  const [newOutletName, setNewOutletName] = useState("");
  const [codeDrafts, setCodeDrafts] = useState<Record<string, CodeDraft>>({});
  const refreshVendors = useCallback(() => {
    setVendors(Store.listVendors());
  }, []);
  const refreshOutlets = useCallback(() => {
    setOutlets(Store.listOutlets());
  }, []);
  useEffect(() => {
    const handleVendor = () => refreshVendors();
    const handleOutlet = () => refreshOutlets();
    window.addEventListener("echo:vendor:save", handleVendor as any);
    window.addEventListener("echo:outlet:save", handleOutlet as any);
    return () => {
      window.removeEventListener("echo:vendor:save", handleVendor as any);
      window.removeEventListener("echo:outlet:save", handleOutlet as any);
    };
  }, [refreshVendors, refreshOutlets]);
  const visibleVendors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter((vendor) => {
      if (vendor.name.toLowerCase().includes(q)) return true;
      if (
        vendor.accountNumber &&
        vendor.accountNumber.toLowerCase().includes(q)
      )
        return true;
      if (vendor.portalUrl && vendor.portalUrl.toLowerCase().includes(q))
        return true;
      const codes = vendor.codes || [];
      return codes.some((code) => {
        const codeLower = code.code.toLowerCase();
        if (codeLower.includes(q)) return true;
        const labelLower = (code.label || "").toLowerCase();
        return labelLower.includes(q);
      });
    });
  }, [vendors, search]);
  useEffect(() => {
    if (!vendors.length) return;
    if (
      !selectedVendorId ||
      !vendors.find((vendor) => vendor.id === selectedVendorId)
    ) {
      const fallback = visibleVendors[0]?.id ?? vendors[0]?.id;
      if (fallback) setSelectedVendorId(fallback);
    }
  }, [vendors, visibleVendors, selectedVendorId]);
  useEffect(() => {
    if (!search.trim()) return;
    if (!visibleVendors.length) return;
    if (!visibleVendors.find((vendor) => vendor.id === selectedVendorId)) {
      setSelectedVendorId(visibleVendors[0].id);
    }
  }, [search, visibleVendors, selectedVendorId]);
  const activeVendor = useMemo(
    () => vendors.find((vendor) => vendor.id === selectedVendorId) ?? null,
    [vendors, selectedVendorId],
  );
  useEffect(() => {
    if (!activeVendor) return;
    setCodeDrafts((prev) => {
      if (prev[activeVendor.id]) return prev;
      return {
        ...prev,
        [activeVendor.id]: ensureDraft({
          outletId: activeVendor.defaultOutletId ?? "",
          code: "",
          label: "",
        }),
      };
    });
  }, [activeVendor]);
  const activeDraft = ensureDraft(codeDrafts[activeVendor?.id ?? ""]);
  const codeCountsByOutlet = useMemo(() => {
    const map = new Map<string, number>();
    for (const vendor of vendors) {
      for (const code of vendor.codes || []) {
        if (!code.outletId) continue;
        map.set(code.outletId, (map.get(code.outletId) ?? 0) + 1);
      }
    }
    return map;
  }, [vendors]);
  const handleCreateVendor = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = vendorForm.name.trim();
    if (!name) {
      toast({
        title: "Vendor name required",
        description: "Enter the vendor's display name before saving.",
        variant: "destructive",
      });
      return;
    }
    const payload: Vendor = {
      id: id(),
      name,
      contactEmail: vendorForm.contactEmail.trim() || null,
      portalUrl: vendorForm.portalUrl.trim() || null,
      accountNumber: vendorForm.accountNumber.trim() || null,
      notes: vendorForm.notes.trim() || null,
      orderingModes: vendorForm.orderingModes,
      defaultOutletId: null,
      codes: [],
    };
    Store.saveVendor(payload);
    refreshVendors();
    setVendorForm({
      name: "",
      contactEmail: "",
      portalUrl: "",
      accountNumber: "",
      notes: "",
      orderingModes: [],
    });
    setCodeDrafts((prev) => ({ ...prev, [payload.id]: ensureDraft() }));
    setSelectedVendorId(payload.id);
    toast({
      title: "Vendor added",
      description: `${payload.name} is ready for ordering configuration.`,
    });
  };
  const handleAddOutlet = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newOutletName.trim();
    if (!name) {
      toast({
        title: "Outlet name required",
        description: "Provide an outlet name to create it.",
        variant: "destructive",
      });
      return;
    }
    const duplicate = outlets.find(
      (outlet) => outlet.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      toast({
        title: "Outlet already exists",
        description: `${duplicate.name} is already configured.`,
      });
      setNewOutletName("");
      return;
    }
    const payload: Outlet = {
      id: id(),
      name,
      shortCode: null,
      contactEmail: null,
      phone: null,
      address: null,
      tags: undefined,
      defaultGlGroupId: null,
    };
    Store.saveOutlet(payload);
    refreshOutlets();
    setNewOutletName("");
    toast({
      title: "Outlet added",
      description: `${payload.name} is ready for inventory and routing.`,
    });
  };
  const handleOrderingModeToggle = (
    vendorId: string,
    mode: VendorOrderingMode,
    checked: CheckedState,
  ) => {
    const vendor = vendors.find((entry) => entry.id === vendorId);
    if (!vendor) return;
    const modes = new Set(vendor.orderingModes || []);
    if (checked === true) modes.add(mode);
    else modes.delete(mode);
    Store.saveVendor({ ...vendor, orderingModes: Array.from(modes) });
    refreshVendors();
  };
  const handleDefaultOutletChange = (vendorId: string, value: string) => {
    const vendor = vendors.find((entry) => entry.id === vendorId);
    if (!vendor) return;
    const next = value && value !== "no-default" ? value : null;
    if (vendor.defaultOutletId === next) return;
    Store.saveVendor({ ...vendor, defaultOutletId: next });
    refreshVendors();
  };
  const handleVendorFieldBlur =
    (vendorId: string, field: EditableVendorField) =>
    (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const vendor = vendors.find((entry) => entry.id === vendorId);
      if (!vendor) return;
      const value = event.target.value.trim();
      const nextValue = value.length ? value : null;
      if ((vendor[field] ?? null) === nextValue) return;
      Store.saveVendor({ ...vendor, [field]: nextValue });
      refreshVendors();
    };
  const handleOutletFieldBlur =
    (outletId: string, field: EditableOutletField) =>
    (event: FocusEvent<HTMLInputElement>) => {
      const outlet = outlets.find((entry) => entry.id === outletId);
      if (!outlet) return;
      const value = event.target.value.trim();
      const nextValue = value.length ? value : null;
      if ((outlet[field] ?? null) === nextValue) return;
      Store.saveOutlet({ ...outlet, [field]: nextValue });
      refreshOutlets();
    };
  const handleDraftChange = (vendorId: string, patch: Partial<CodeDraft>) => {
    setCodeDrafts((prev) => ({
      ...prev,
      [vendorId]: ensureDraft({ ...prev[vendorId], ...patch }),
    }));
  };
  const handleAddVendorCode = (vendorId: string) => {
    const vendor = vendors.find((entry) => entry.id === vendorId);
    if (!vendor) return;
    const draft = ensureDraft(codeDrafts[vendorId]);
    const codeValue = draft.code.trim();
    if (!codeValue) {
      toast({
        title: "Code required",
        description: "Enter the vendor's outlet code or identifier.",
        variant: "destructive",
      });
      return;
    }
    const outletId = draft.outletId ? draft.outletId : null;
    const existing = (vendor.codes || []).find(
      (entry) =>
        entry.code.toLowerCase() === codeValue.toLowerCase() &&
        (entry.outletId || null) === outletId,
    );
    if (existing) {
      toast({
        title: "Code already linked",
        description: "Use a different code or update the existing mapping.",
        variant: "destructive",
      });
      return;
    }
    const outletName = outletId
      ? (outlets.find((outlet) => outlet.id === outletId)?.name ?? null)
      : null;
    const nextCodes = [
      ...(vendor.codes || []),
      {
        id: id(),
        outletId,
        outletName,
        code: codeValue,
        label: draft.label.trim() ? draft.label.trim() : null,
        keywords: draft.label.trim() ? [draft.label.trim()] : null,
        priority: (vendor.codes?.length || 0) + 1,
      },
    ];
    Store.saveVendor({ ...vendor, codes: nextCodes });
    refreshVendors();
    setCodeDrafts((prev) => ({
      ...prev,
      [vendorId]: ensureDraft({
        outletId: draft.outletId,
        code: "",
        label: "",
      }),
    }));
    toast({
      title: "Code saved",
      description: outletName
        ? `Invoices containing ${codeValue} will map to ${outletName}.`
        : `Invoices containing ${codeValue} will match this vendor.`,
    });
  };
  const handleRemoveVendorCode = (vendorId: string, codeId: string) => {
    const vendor = vendors.find((entry) => entry.id === vendorId);
    if (!vendor) return;
    const nextCodes = (vendor.codes || []).filter(
      (entry) => entry.id !== codeId,
    );
    Store.saveVendor({ ...vendor, codes: nextCodes });
    refreshVendors();
  };
  return (
    <div className="space-y-6">
      {" "}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        {" "}
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Add vendor</CardTitle>{" "}
            <CardDescription>
              {" "}
              Capture ordering channels and portal details before wiring
              punchout connections.{" "}
            </CardDescription>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <form onSubmit={handleCreateVendor} className="space-y-4">
              {" "}
              <div className="grid gap-3 sm:grid-cols-2">
                {" "}
                <label className="grid gap-1 text-xs">
                  {" "}
                  <span className="text-muted-foreground">
                    Vendor name
                  </span>{" "}
                  <Input
                    value={vendorForm.name}
                    onChange={(event) =>
                      setVendorForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Sysco, US Foods, Amazon Business"
                    required
                  />{" "}
                </label>{" "}
                <label className="grid gap-1 text-xs">
                  {" "}
                  <span className="text-muted-foreground">
                    Contact email
                  </span>{" "}
                  <Input
                    value={vendorForm.contactEmail}
                    onChange={(event) =>
                      setVendorForm((prev) => ({
                        ...prev,
                        contactEmail: event.target.value,
                      }))
                    }
                    placeholder="orders@example.com"
                    type="email"
                  />{" "}
                </label>{" "}
                <label className="grid gap-1 text-xs">
                  {" "}
                  <span className="text-muted-foreground">Portal URL</span>{" "}
                  <Input
                    value={vendorForm.portalUrl}
                    onChange={(event) =>
                      setVendorForm((prev) => ({
                        ...prev,
                        portalUrl: event.target.value,
                      }))
                    }
                    placeholder="https://vendor-portal.com"
                  />{" "}
                </label>{" "}
                <label className="grid gap-1 text-xs">
                  {" "}
                  <span className="text-muted-foreground">Account #</span>{" "}
                  <Input
                    value={vendorForm.accountNumber}
                    onChange={(event) =>
                      setVendorForm((prev) => ({
                        ...prev,
                        accountNumber: event.target.value,
                      }))
                    }
                    placeholder="Optional house account number"
                  />{" "}
                </label>{" "}
              </div>{" "}
              <label className="grid gap-1 text-xs">
                {" "}
                <span className="text-muted-foreground">Notes</span>{" "}
                <Textarea
                  value={vendorForm.notes}
                  onChange={(event) =>
                    setVendorForm((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Portal credentials, delivery windows, or internal routing notes."
                  rows={3}
                />{" "}
              </label>{" "}
              <div className="space-y-2">
                {" "}
                <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {" "}
                  Ordering channels{" "}
                </div>{" "}
                <div className="flex flex-wrap gap-3">
                  {" "}
                  {Object.entries(ORDERING_MODE_LABELS).map(([value, meta]) => {
                    const mode = value as VendorOrderingMode;
                    const checked = vendorForm.orderingModes.includes(mode);
                    return (
                      <label
                        key={mode}
                        className="flex items-start gap-2 rounded-md border px-3 py-2 text-xs"
                      >
                        {" "}
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(state) => {
                            setVendorForm((prev) => {
                              const next = new Set(prev.orderingModes);
                              if (state === true) next.add(mode);
                              else next.delete(mode);
                              return {
                                ...prev,
                                orderingModes: Array.from(next),
                              };
                            });
                          }}
                        />{" "}
                        <span>
                          {" "}
                          <span className="font-semibold text-foreground">
                            {meta.label}
                          </span>{" "}
                          <span className="block text-muted-foreground">
                            {meta.description}
                          </span>{" "}
                        </span>{" "}
                      </label>
                    );
                  })}{" "}
                </div>{" "}
              </div>{" "}
              <div className="flex justify-end">
                {" "}
                <Button type="submit">Add vendor</Button>{" "}
              </div>{" "}
            </form>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Outlets</CardTitle>{" "}
            <CardDescription>
              {" "}
              Configure receiving locations so invoices and transfers route
              accurately.{" "}
            </CardDescription>{" "}
          </CardHeader>{" "}
          <CardContent className="space-y-4">
            {" "}
            <form onSubmit={handleAddOutlet} className="flex flex-wrap gap-2">
              {" "}
              <Input
                value={newOutletName}
                onChange={(event) => setNewOutletName(event.target.value)}
                placeholder="Add outlet (Main Kitchen, Elate Cafe)"
                className="min-w-[220px] flex-1"
              />{" "}
              <Button type="submit">Add outlet</Button>{" "}
            </form>{" "}
            <div className="rounded-lg border">
              {" "}
              <Table>
                {" "}
                <TableHeader>
                  {" "}
                  <TableRow>
                    {" "}
                    <TableHead>Outlet</TableHead>{" "}
                    <TableHead className="w-[140px]">Short code</TableHead>{" "}
                    <TableHead className="w-[120px] text-right">
                      Vendor codes
                    </TableHead>{" "}
                  </TableRow>{" "}
                </TableHeader>{" "}
                <TableBody>
                  {" "}
                  {outlets.map((outlet) => (
                    <TableRow key={outlet.id}>
                      {" "}
                      <TableCell className="font-medium">
                        {outlet.name}
                      </TableCell>{" "}
                      <TableCell>
                        {" "}
                        <Input
                          defaultValue={outlet.shortCode ?? ""}
                          placeholder="MK"
                          onBlur={handleOutletFieldBlur(outlet.id, "shortCode")}
                          className="h-8"
                        />{" "}
                      </TableCell>{" "}
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {" "}
                        {codeCountsByOutlet.get(outlet.id) ?? 0}{" "}
                      </TableCell>{" "}
                    </TableRow>
                  ))}{" "}
                  {!outlets.length && (
                    <TableRow>
                      {" "}
                      <TableCell
                        colSpan={3}
                        className="text-center text-sm text-muted-foreground"
                      >
                        {" "}
                        No outlets yet. Add at least one to route invoices and
                        inventory.{" "}
                      </TableCell>{" "}
                    </TableRow>
                  )}{" "}
                </TableBody>{" "}
              </Table>{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Vendor directory</CardTitle>{" "}
          <CardDescription>
            {" "}
            Map vendor account numbers, portal links, and outlet codes for
            automated routing.{" "}
          </CardDescription>{" "}
        </CardHeader>{" "}
        <CardContent className="space-y-5">
          {" "}
          <div className="flex flex-wrap items-center gap-3">
            {" "}
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search vendors or codes"
              className="max-w-sm"
            />{" "}
            <div className="text-xs text-muted-foreground">
              {" "}
              {visibleVendors.length} vendor
              {visibleVendors.length === 1 ? "" : "s"} shown{" "}
            </div>{" "}
          </div>{" "}
          <div className="space-y-4">
            {" "}
            {visibleVendors.map((vendor) => {
              const isActive = vendor.id === activeVendor?.id;
              const orderingModes = vendor.orderingModes || [];
              return (
                <div
                  key={vendor.id}
                  className={cn(
                    "rounded-lg border px-4 py-4 transition",
                    isActive
                      ? "border-primary shadow"
                      : "hover:border-primary/50",
                  )}
                >
                  {" "}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {" "}
                    <div>
                      {" "}
                      <div className="text-sm font-semibold">
                        {vendor.name}
                      </div>{" "}
                      <div className="flex flex-wrap items-center gap-2 text-[0.7rem] text-muted-foreground">
                        {" "}
                        {vendor.portalUrl && (
                          <span>{vendor.portalUrl}</span>
                        )}{" "}
                        {vendor.accountNumber && (
                          <Badge variant="secondary">
                            Acct {vendor.accountNumber}
                          </Badge>
                        )}{" "}
                        <span>
                          {" "}
                          {(vendor.codes || []).length} code
                          {(vendor.codes || []).length === 1 ? "" : "s"}{" "}
                        </span>{" "}
                      </div>{" "}
                    </div>{" "}
                    <Button
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedVendorId(vendor.id)}
                    >
                      {" "}
                      {isActive ? "Selected" : "Manage"}{" "}
                    </Button>{" "}
                  </div>{" "}
                  {isActive && (
                    <div className="mt-4 space-y-4">
                      {" "}
                      <div className="grid gap-3 sm:grid-cols-2">
                        {" "}
                        <label className="grid gap-1 text-xs">
                          {" "}
                          <span className="text-muted-foreground">
                            Contact email
                          </span>{" "}
                          <Input
                            defaultValue={vendor.contactEmail ?? ""}
                            placeholder="orders@example.com"
                            type="email"
                            onBlur={handleVendorFieldBlur(
                              vendor.id,
                              "contactEmail",
                            )}
                          />{" "}
                        </label>{" "}
                        <label className="grid gap-1 text-xs">
                          {" "}
                          <span className="text-muted-foreground">
                            Portal URL
                          </span>{" "}
                          <Input
                            defaultValue={vendor.portalUrl ?? ""}
                            placeholder="https://vendor-portal.com"
                            onBlur={handleVendorFieldBlur(
                              vendor.id,
                              "portalUrl",
                            )}
                          />{" "}
                        </label>{" "}
                        <label className="grid gap-1 text-xs">
                          {" "}
                          <span className="text-muted-foreground">
                            Account #
                          </span>{" "}
                          <Input
                            defaultValue={vendor.accountNumber ?? ""}
                            placeholder="Optional"
                            onBlur={handleVendorFieldBlur(
                              vendor.id,
                              "accountNumber",
                            )}
                          />{" "}
                        </label>{" "}
                        <label className="grid gap-1 text-xs">
                          {" "}
                          <span className="text-muted-foreground">
                            Default outlet
                          </span>{" "}
                          <Select
                            value={vendor.defaultOutletId ?? "no-default"}
                            onValueChange={(value) =>
                              handleDefaultOutletChange(vendor.id, value)
                            }
                          >
                            {" "}
                            <SelectTrigger className="h-9 text-left text-xs">
                              {" "}
                              <SelectValue placeholder="Select outlet" />{" "}
                            </SelectTrigger>{" "}
                            <SelectContent>
                              {" "}
                              <SelectItem value="no-default">
                                No default
                              </SelectItem>{" "}
                              {outlets.map((outlet) => (
                                <SelectItem key={outlet.id} value={outlet.id}>
                                  {" "}
                                  {outlet.name}{" "}
                                </SelectItem>
                              ))}{" "}
                            </SelectContent>{" "}
                          </Select>{" "}
                        </label>{" "}
                      </div>{" "}
                      <label className="grid gap-1 text-xs">
                        {" "}
                        <span className="text-muted-foreground">
                          Notes
                        </span>{" "}
                        <Textarea
                          defaultValue={vendor.notes ?? ""}
                          rows={3}
                          placeholder="Credentials, delivery windows, rep contacts."
                          onBlur={handleVendorFieldBlur(vendor.id, "notes")}
                        />{" "}
                      </label>{" "}
                      <div className="space-y-2">
                        {" "}
                        <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                          {" "}
                          Ordering channels{" "}
                        </div>{" "}
                        <div className="flex flex-wrap gap-3">
                          {" "}
                          {Object.entries(ORDERING_MODE_LABELS).map(
                            ([value, meta]) => {
                              const mode = value as VendorOrderingMode;
                              const checked = orderingModes.includes(mode);
                              return (
                                <label
                                  key={mode}
                                  className="flex items-start gap-2 rounded-md border px-3 py-2 text-xs"
                                >
                                  {" "}
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(state) =>
                                      handleOrderingModeToggle(
                                        vendor.id,
                                        mode,
                                        state,
                                      )
                                    }
                                  />{" "}
                                  <span>
                                    {" "}
                                    <span className="font-semibold text-foreground">
                                      {meta.label}
                                    </span>{" "}
                                    <span className="block text-muted-foreground">
                                      {meta.description}
                                    </span>{" "}
                                  </span>{" "}
                                </label>
                              );
                            },
                          )}{" "}
                        </div>{" "}
                      </div>{" "}
                      <div className="space-y-3">
                        {" "}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          {" "}
                          <div className="text-sm font-semibold">
                            Outlet codes
                          </div>{" "}
                          <div className="text-xs text-muted-foreground">
                            {" "}
                            Codes help identify which outlet receives an invoice
                            when the vendor code appears.{" "}
                          </div>{" "}
                        </div>{" "}
                        <div className="grid gap-2 md:grid-cols-[minmax(0,220px)_minmax(0,180px)_minmax(0,1fr)_auto]">
                          {" "}
                          <Select
                            value={activeDraft.outletId || "any-outlet"}
                            onValueChange={(value) =>
                              handleDraftChange(vendor.id, {
                                outletId: value === "any-outlet" ? "" : value,
                              })
                            }
                          >
                            {" "}
                            <SelectTrigger className="h-9 text-xs">
                              {" "}
                              <SelectValue placeholder="Select outlet" />{" "}
                            </SelectTrigger>{" "}
                            <SelectContent>
                              {" "}
                              <SelectItem value="any-outlet">
                                Any outlet
                              </SelectItem>{" "}
                              {outlets.map((outlet) => (
                                <SelectItem key={outlet.id} value={outlet.id}>
                                  {" "}
                                  {outlet.name}{" "}
                                </SelectItem>
                              ))}{" "}
                            </SelectContent>{" "}
                          </Select>{" "}
                          <Input
                            value={activeDraft.code}
                            onChange={(event) =>
                              handleDraftChange(vendor.id, {
                                code: event.target.value,
                              })
                            }
                            placeholder="Vendor account or ship-to code"
                          />{" "}
                          <Input
                            value={activeDraft.label}
                            onChange={(event) =>
                              handleDraftChange(vendor.id, {
                                label: event.target.value,
                              })
                            }
                            placeholder="Optional label or keyword"
                          />{" "}
                          <Button
                            type="button"
                            onClick={() => handleAddVendorCode(vendor.id)}
                          >
                            {" "}
                            Add{" "}
                          </Button>{" "}
                        </div>{" "}
                        <div className="rounded-lg border">
                          {" "}
                          <Table>
                            {" "}
                            <TableHeader>
                              {" "}
                              <TableRow>
                                {" "}
                                <TableHead>Outlet</TableHead>{" "}
                                <TableHead>Code</TableHead>{" "}
                                <TableHead>Label</TableHead>{" "}
                                <TableHead className="w-[80px] text-right">
                                  Actions
                                </TableHead>{" "}
                              </TableRow>{" "}
                            </TableHeader>{" "}
                            <TableBody>
                              {" "}
                              {(vendor.codes || []).map((code) => {
                                const outletName = code.outletId
                                  ? outlets.find(
                                      (outlet) => outlet.id === code.outletId,
                                    )?.name ||
                                    code.outletName ||
                                    "Unknown"
                                  : "Any";
                                return (
                                  <TableRow key={code.id}>
                                    {" "}
                                    <TableCell>{outletName}</TableCell>{" "}
                                    <TableCell className="font-mono text-sm">
                                      {code.code}
                                    </TableCell>{" "}
                                    <TableCell className="text-sm text-muted-foreground">
                                      {" "}
                                      {code.label || "—"}{" "}
                                    </TableCell>{" "}
                                    <TableCell className="text-right">
                                      {" "}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleRemoveVendorCode(
                                            vendor.id,
                                            code.id,
                                          )
                                        }
                                      >
                                        {" "}
                                        Remove{" "}
                                      </Button>{" "}
                                    </TableCell>{" "}
                                  </TableRow>
                                );
                              })}{" "}
                              {!(vendor.codes || []).length && (
                                <TableRow>
                                  {" "}
                                  <TableCell
                                    colSpan={4}
                                    className="text-center text-sm text-muted-foreground"
                                  >
                                    {" "}
                                    No codes yet. Link account IDs or ship-to
                                    numbers to auto route invoices.{" "}
                                  </TableCell>{" "}
                                </TableRow>
                              )}{" "}
                            </TableBody>{" "}
                          </Table>{" "}
                        </div>{" "}
                      </div>{" "}
                    </div>
                  )}{" "}
                </div>
              );
            })}{" "}
            {!visibleVendors.length && (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                {" "}
                No vendors match your search. Clear filters or add a new vendor
                above.{" "}
              </div>
            )}{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>{" "}
    </div>
  );
}
