import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Brackets,
  Building2,
  MapPinned,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { Store, id, type GLGroup, type ProductGLMapping } from "@/lib/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import type { InventoryItem } from "@shared/inventory";
import type { Outlet } from "@shared/purchasing";
import { cn } from "@/lib/utils";
const initialFormState = () => ({
  mode: "pattern" as ProductGLMapping["mode"],
  label: "",
  itemId: null as string | null,
  itemName: "",
  pattern: "",
  outletIds: [] as string[],
  targetGlCode: "",
  targetGlName: "",
  groupId: "",
  notes: "",
});
type MappingFormState = ReturnType<typeof initialFormState>;
type MappingSummary = {
  mapping: ProductGLMapping;
  matchCount: number;
  matchedItemNames: string[];
  outletsLabel: string;
};
const matchesItem = (mapping: ProductGLMapping, item: InventoryItem) => {
  if (mapping.mode === "item") {
    if (!mapping.itemId) return false;
    if (mapping.itemId !== item.id) return false;
  } else {
    const pattern = mapping.pattern?.toLowerCase().trim();
    if (!pattern) return false;
    const haystack =
      `${item.name} ${item.glCode ?? ""} ${item.glName ?? ""}`.toLowerCase();
    if (!haystack.includes(pattern)) return false;
  }
  if (mapping.outletIds.length && !mapping.outletIds.includes(item.outletId)) {
    return false;
  }
  return true;
};
const relativeTime = (iso: string) => {
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return "unknown";
  const diffMs = Date.now() - time;
  const diffMinutes = Math.round(diffMs / 60000);
  if (Math.abs(diffMinutes) < 1) return "just now";
  if (Math.abs(diffMinutes) < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
};
export function ProductGLMappingManager() {
  const [mappings, setMappings] = useState<ProductGLMapping[]>(() =>
    Store.listGLMappings(),
  );
  const [items, setItems] = useState<InventoryItem[]>(() => Store.listItems());
  const [outlets, setOutlets] = useState<Outlet[]>(() => Store.listOutlets());
  const [groups, setGroups] = useState<GLGroup[]>(() => Store.listGLGroups());
  const [filter, setFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<MappingFormState>(initialFormState);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const { toast } = useToast();
  useEffect(() => {
    const handleMappingSave = () => {
      setMappings(Store.listGLMappings());
      setItems(Store.listItems());
    };
    const handleItemsChanged = () => setItems(Store.listItems());
    const handleGroupsChanged = () => setGroups(Store.listGLGroups());
    const handleOutletsChanged = () => setOutlets(Store.listOutlets());
    window.addEventListener(
      "echo:gl-mappings:save",
      handleMappingSave as EventListener,
    );
    window.addEventListener(
      "echo:item:save",
      handleItemsChanged as EventListener,
    );
    window.addEventListener(
      "echo:item:bulk-update",
      handleItemsChanged as EventListener,
    );
    window.addEventListener(
      "echo:gl-groups:save",
      handleGroupsChanged as EventListener,
    );
    window.addEventListener(
      "echo:outlet:save",
      handleOutletsChanged as EventListener,
    );
    return () => {
      window.removeEventListener(
        "echo:gl-mappings:save",
        handleMappingSave as EventListener,
      );
      window.removeEventListener(
        "echo:item:save",
        handleItemsChanged as EventListener,
      );
      window.removeEventListener(
        "echo:item:bulk-update",
        handleItemsChanged as EventListener,
      );
      window.removeEventListener(
        "echo:gl-groups:save",
        handleGroupsChanged as EventListener,
      );
      window.removeEventListener(
        "echo:outlet:save",
        handleOutletsChanged as EventListener,
      );
    };
  }, []);
  const itemMap = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    for (const item of items) {
      map.set(item.id, item);
    }
    return map;
  }, [items]);
  const outletMap = useMemo(() => {
    const map = new Map<string, Outlet>();
    for (const outlet of outlets) {
      map.set(outlet.id, outlet);
    }
    return map;
  }, [outlets]);
  const mappingSummaries = useMemo<MappingSummary[]>(() => {
    return mappings.map((mapping) => {
      const matched = items.filter((item) => matchesItem(mapping, item));
      const outletNames = mapping.outletIds
        .map((outletId) => outletMap.get(outletId)?.name)
        .filter(Boolean) as string[];
      return {
        mapping,
        matchCount: matched.length,
        matchedItemNames: matched.slice(0, 4).map((item) => item.name),
        outletsLabel: mapping.outletIds.length
          ? outletNames.join(",") || `${mapping.outletIds.length} outlets`
          : "All outlets",
      };
    });
  }, [items, mappings, outletMap]);
  const filteredSummaries = useMemo(() => {
    if (!filter.trim()) return mappingSummaries;
    const needle = filter.toLowerCase();
    return mappingSummaries.filter(({ mapping, outletsLabel }) => {
      const haystacks = [
        mapping.label,
        mapping.pattern ?? "",
        mapping.targetGlCode ?? "",
        mapping.targetGlName ?? "",
        outletsLabel,
      ];
      return haystacks.some((value) => value.toLowerCase().includes(needle));
    });
  }, [filter, mappingSummaries]);
  const handleToggleOutlet = (outletId: string) => {
    setForm((prev) => {
      const exists = prev.outletIds.includes(outletId);
      const outletIds = exists
        ? prev.outletIds.filter((id) => id !== outletId)
        : [...prev.outletIds, outletId];
      return { ...prev, outletIds };
    });
  };
  const handleSubmit = () => {
    if (form.mode === "item" && !form.itemId) {
      toast({
        title: "Select an item",
        description: "Choose which catalog item to override.",
        variant: "destructive",
      });
      return;
    }
    if (form.mode === "pattern" && !form.pattern.trim()) {
      toast({
        title: "Pattern required",
        description: "Provide a keyword to match incoming items.",
        variant: "destructive",
      });
      return;
    }
    if (!form.targetGlCode.trim() && !form.groupId) {
      toast({
        title: "Set a target",
        description: "Assign a GL code or group so the override has an effect.",
        variant: "destructive",
      });
      return;
    }
    const now = new Date().toISOString();
    const mapping: ProductGLMapping = {
      id: id(),
      label:
        form.label.trim() ||
        (form.mode === "item"
          ? form.itemName || "Item override"
          : `Pattern: ${form.pattern.trim()}`),
      mode: form.mode,
      itemId: form.mode === "item" ? form.itemId : null,
      pattern: form.mode === "pattern" ? form.pattern.trim() : null,
      outletIds: form.outletIds,
      targetGlCode: form.targetGlCode.trim() || null,
      targetGlName: form.targetGlName.trim() || null,
      groupId: form.groupId || null,
      notes: form.notes.trim() || null,
      createdAt: now,
      updatedAt: now,
    };
    const saved = Store.upsertGLMapping(mapping);
    setMappings(Store.listGLMappings());
    setItems(Store.listItems());
    setDialogOpen(false);
    setForm(initialFormState());
    toast({ title: "Override added", description: saved.label });
  };
  const handleDelete = (idToDelete: string) => {
    Store.deleteGLMapping(idToDelete);
    setMappings(Store.listGLMappings());
    setItems(Store.listItems());
    toast({ title: "Override removed" });
  };
  const handleReapply = () => {
    Store.applyGLMappings();
    setItems(Store.listItems());
    toast({ title: "Overrides re-applied" });
  };
  const selectedGroup = form.groupId
    ? groups.find((group) => group.id === form.groupId)
    : null;
  return (
    <Card className="border">
      {" "}
      <CardHeader className="flex flex-col gap-2">
        {" "}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {" "}
          <MapPinned className="h-4 w-4" />{" "}
          <span>
            {" "}
            {mappings.length} active overrides • {items.length} catalog
            items{" "}
          </span>{" "}
        </div>{" "}
        <CardTitle>Product GL Overrides</CardTitle>{" "}
        <CardDescription>
          {" "}
          Route minibar, commissary, and retail items to the correct division
          without disturbing kitchen food cost. Overrides cascade instantly to
          inventory and reporting.{" "}
        </CardDescription>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-4">
        {" "}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {" "}
          <div className="relative grow">
            {" "}
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />{" "}
            <Input
              placeholder="Filter overrides"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="pl-9"
            />{" "}
          </div>{" "}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReapply}
            className="gap-2"
          >
            {" "}
            <RefreshCw className="h-4 w-4" /> Reapply overrides{" "}
          </Button>{" "}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            {" "}
            <DialogTrigger asChild>
              {" "}
              <Button
                className="gap-2"
                onClick={() => setForm(initialFormState())}
              >
                {" "}
                <Plus className="h-4 w-4" /> New override{" "}
              </Button>{" "}
            </DialogTrigger>{" "}
            <DialogContent className="max-w-2xl">
              {" "}
              <DialogHeader>
                {" "}
                <DialogTitle>Create GL override</DialogTitle>{" "}
                <DialogDescription>
                  {" "}
                  Match incoming items by keyword or direct selection, then
                  re-route them to the correct GL grouping.{" "}
                </DialogDescription>{" "}
              </DialogHeader>{" "}
              <div className="space-y-4">
                {" "}
                <div className="grid gap-3 sm:grid-cols-2">
                  {" "}
                  <div className="space-y-1">
                    {" "}
                    <Label htmlFor="override-label">Friendly label</Label>{" "}
                    <Input
                      id="override-label"
                      value={form.label}
                      onChange={(event) =>
                        setForm({ ...form, label: event.target.value })
                      }
                      placeholder="Rooms division minibar"
                    />{" "}
                  </div>{" "}
                  <div className="space-y-1">
                    {" "}
                    <Label>Mode</Label>{" "}
                    <Select
                      value={form.mode}
                      onValueChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          mode: value as ProductGLMapping["mode"],
                          itemId: value === "item" ? prev.itemId : null,
                          itemName: value === "item" ? prev.itemName : "",
                          pattern: value === "pattern" ? prev.pattern : "",
                        }))
                      }
                    >
                      {" "}
                      <SelectTrigger>
                        {" "}
                        <SelectValue placeholder="Select mode" />{" "}
                      </SelectTrigger>{" "}
                      <SelectContent>
                        {" "}
                        <SelectItem value="pattern">
                          Pattern match
                        </SelectItem>{" "}
                        <SelectItem value="item">Specific item</SelectItem>{" "}
                      </SelectContent>{" "}
                    </Select>{" "}
                  </div>{" "}
                </div>{" "}
                {form.mode === "item" ? (
                  <div className="space-y-1">
                    {" "}
                    <Label>Catalog item</Label>{" "}
                    <Popover
                      open={itemPickerOpen}
                      onOpenChange={setItemPickerOpen}
                    >
                      {" "}
                      <PopoverTrigger asChild>
                        {" "}
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-between",
                            !form.itemId && "text-muted-foreground",
                          )}
                        >
                          {" "}
                          {form.itemName || "Select item"}{" "}
                        </Button>{" "}
                      </PopoverTrigger>{" "}
                      <PopoverContent className="p-0" align="start">
                        {" "}
                        <Command>
                          {" "}
                          <CommandInput placeholder="Search items" />{" "}
                          <CommandList>
                            {" "}
                            <CommandEmpty>No items found.</CommandEmpty>{" "}
                            <CommandGroup>
                              {" "}
                              {items.map((item) => (
                                <CommandItem
                                  key={item.id}
                                  value={item.name}
                                  onSelect={() => {
                                    setForm((prev) => ({
                                      ...prev,
                                      itemId: item.id,
                                      itemName: item.name,
                                    }));
                                    setItemPickerOpen(false);
                                  }}
                                >
                                  {" "}
                                  {item.name}{" "}
                                </CommandItem>
                              ))}{" "}
                            </CommandGroup>{" "}
                          </CommandList>{" "}
                        </Command>{" "}
                      </PopoverContent>{" "}
                    </Popover>{" "}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {" "}
                    <Label htmlFor="override-pattern">Match keyword</Label>{" "}
                    <Input
                      id="override-pattern"
                      value={form.pattern}
                      onChange={(event) =>
                        setForm({ ...form, pattern: event.target.value })
                      }
                      placeholder="mini bar"
                    />{" "}
                  </div>
                )}{" "}
                <div className="space-y-1">
                  {" "}
                  <Label>Applies to outlets</Label>{" "}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {" "}
                    {outlets.map((outlet) => {
                      const checked = form.outletIds.includes(outlet.id);
                      return (
                        <label
                          key={outlet.id}
                          className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                        >
                          {" "}
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() =>
                              handleToggleOutlet(outlet.id)
                            }
                          />{" "}
                          <span>{outlet.name}</span>{" "}
                        </label>
                      );
                    })}{" "}
                    {!outlets.length && (
                      <div className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                        {" "}
                        Add outlets in Purchasing to target overrides by
                        location.{" "}
                      </div>
                    )}{" "}
                  </div>{" "}
                  <p className="text-xs text-muted-foreground">
                    {" "}
                    Leave empty to apply to every outlet.{" "}
                  </p>{" "}
                </div>{" "}
                <div className="grid gap-3 sm:grid-cols-2">
                  {" "}
                  <div className="space-y-1">
                    {" "}
                    <Label htmlFor="override-gl-code">GL code</Label>{" "}
                    <Input
                      id="override-gl-code"
                      value={form.targetGlCode}
                      onChange={(event) =>
                        setForm({ ...form, targetGlCode: event.target.value })
                      }
                      placeholder="5311-Minibar"
                    />{" "}
                  </div>{" "}
                  <div className="space-y-1">
                    {" "}
                    <Label>Assign to group</Label>{" "}
                    <Select
                      value={form.groupId || "none"}
                      onValueChange={(value) =>
                        setForm({
                          ...form,
                          groupId: value === "none" ? "" : value,
                          targetGlName:
                            value === "none" ? form.targetGlName : "",
                        })
                      }
                    >
                      {" "}
                      <SelectTrigger>
                        {" "}
                        <SelectValue placeholder="Optional group" />{" "}
                      </SelectTrigger>{" "}
                      <SelectContent>
                        {" "}
                        <SelectItem value="none">No group</SelectItem>{" "}
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {" "}
                            {group.name}{" "}
                          </SelectItem>
                        ))}{" "}
                      </SelectContent>{" "}
                    </Select>{" "}
                    {selectedGroup && (
                      <p className="text-xs text-muted-foreground">
                        {" "}
                        Codes linked: {selectedGroup.codes.length}{" "}
                      </p>
                    )}{" "}
                  </div>{" "}
                </div>{" "}
                <div className="space-y-1">
                  {" "}
                  <Label htmlFor="override-gl-name">Override label</Label>{" "}
                  <Input
                    id="override-gl-name"
                    value={form.targetGlName}
                    onChange={(event) =>
                      setForm({ ...form, targetGlName: event.target.value })
                    }
                    placeholder="Rooms Division"
                    disabled={Boolean(form.groupId)}
                  />{" "}
                  <p className="text-xs text-muted-foreground">
                    {" "}
                    {form.groupId
                      ? "Group name is applied automatically."
                      : "Optional descriptor if no group is selected."}{" "}
                  </p>{" "}
                </div>{" "}
                <div className="space-y-1">
                  {" "}
                  <Label htmlFor="override-notes">
                    Notes (audit trail)
                  </Label>{" "}
                  <Input
                    id="override-notes"
                    value={form.notes}
                    onChange={(event) =>
                      setForm({ ...form, notes: event.target.value })
                    }
                    placeholder="Reason for override"
                  />{" "}
                </div>{" "}
              </div>{" "}
              <DialogFooter className="pt-2">
                {" "}
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  {" "}
                  Cancel{" "}
                </Button>{" "}
                <Button onClick={handleSubmit}>Save override</Button>{" "}
              </DialogFooter>{" "}
            </DialogContent>{" "}
          </Dialog>{" "}
        </div>{" "}
        <div className="rounded-lg border">
          {" "}
          <Table>
            {" "}
            <TableHeader>
              {" "}
              <TableRow>
                {" "}
                <TableHead className="w-[220px]">Label</TableHead>{" "}
                <TableHead>Scope</TableHead> <TableHead>Target</TableHead>{" "}
                <TableHead>Outlets</TableHead>{" "}
                <TableHead className="w-[120px] text-right">Matches</TableHead>{" "}
                <TableHead className="w-[120px] text-right">Updated</TableHead>{" "}
                <TableHead className="w-[80px] text-right"></TableHead>{" "}
              </TableRow>{" "}
            </TableHeader>{" "}
            <TableBody>
              {" "}
              {filteredSummaries.map(
                ({ mapping, matchCount, matchedItemNames, outletsLabel }) => {
                  const rowItem =
                    mapping.mode === "item" && mapping.itemId
                      ? itemMap.get(mapping.itemId)
                      : null;
                  const targetGroup = mapping.groupId
                    ? groups.find((group) => group.id === mapping.groupId)
                    : null;
                  return (
                    <TableRow key={mapping.id} className="align-top">
                      {" "}
                      <TableCell className="text-sm font-medium">
                        {" "}
                        <div className="flex flex-col gap-1">
                          {" "}
                          <span>{mapping.label}</span>{" "}
                          {mapping.notes && (
                            <span className="text-xs text-muted-foreground">
                              {" "}
                              {mapping.notes}{" "}
                            </span>
                          )}{" "}
                        </div>{" "}
                      </TableCell>{" "}
                      <TableCell className="text-sm">
                        {" "}
                        <div className="flex flex-col gap-1">
                          {" "}
                          <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                            {" "}
                            <Brackets className="h-3.5 w-3.5" />{" "}
                            {mapping.mode === "item"
                              ? "Specific item"
                              : "Pattern"}{" "}
                          </div>{" "}
                          {mapping.mode === "item" ? (
                            rowItem ? (
                              <span>{rowItem.name}</span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-destructive">
                                {" "}
                                <AlertTriangle className="h-3.5 w-3.5" /> Item
                                missing{" "}
                              </span>
                            )
                          ) : (
                            <span>{mapping.pattern}</span>
                          )}{" "}
                        </div>{" "}
                      </TableCell>{" "}
                      <TableCell className="text-sm">
                        {" "}
                        <div className="flex flex-wrap items-center gap-2">
                          {" "}
                          {mapping.targetGlCode && (
                            <Badge variant="outline">
                              {mapping.targetGlCode}
                            </Badge>
                          )}{" "}
                          {targetGroup && (
                            <Badge variant="secondary">
                              {targetGroup.name}
                            </Badge>
                          )}{" "}
                          {!targetGroup && mapping.targetGlName && (
                            <Badge variant="secondary">
                              {mapping.targetGlName}
                            </Badge>
                          )}{" "}
                        </div>{" "}
                      </TableCell>{" "}
                      <TableCell className="text-sm">
                        {" "}
                        <div className="flex items-center gap-2">
                          {" "}
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />{" "}
                          <span className="line-clamp-2 text-xs text-muted-foreground">
                            {" "}
                            {outletsLabel}{" "}
                          </span>{" "}
                        </div>{" "}
                      </TableCell>{" "}
                      <TableCell className="text-right text-sm">
                        {" "}
                        <div className="flex flex-col items-end">
                          {" "}
                          <span>{matchCount}</span>{" "}
                          {matchCount > 0 && (
                            <span className="text-[11px] text-muted-foreground">
                              {" "}
                              {matchedItemNames.join(",")}{" "}
                            </span>
                          )}{" "}
                        </div>{" "}
                      </TableCell>{" "}
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {" "}
                        {relativeTime(mapping.updatedAt)}{" "}
                      </TableCell>{" "}
                      <TableCell className="text-right">
                        {" "}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(mapping.id)}
                        >
                          {" "}
                          Remove{" "}
                        </Button>{" "}
                      </TableCell>{" "}
                    </TableRow>
                  );
                },
              )}{" "}
              {!filteredSummaries.length && (
                <TableRow>
                  {" "}
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-sm text-muted-foreground"
                  >
                    {" "}
                    No overrides yet. Create one to reclassify minibar or retail
                    items automatically.{" "}
                  </TableCell>{" "}
                </TableRow>
              )}{" "}
            </TableBody>{" "}
          </Table>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
