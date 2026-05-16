import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Store, QUICK_COUNT_EVENT_NAME, id } from "@/lib/store";
import type { Outlet } from "@shared/purchasing";
import type {
  QuickCountTemplate,
  ParSuggestion,
  StorageBin,
} from "@shared/inventory";
const UNASSIGNED_BIN_VALUE = "__unassigned__";
export function QuickCountPlanner() {
  const [outlets, setOutlets] = useState<Outlet[]>(() => Store.listOutlets());
  const [selectedOutletId, setSelectedOutletId] = useState<string>(
    () => outlets[0]?.id ?? "",
  );
  const [templatesVersion, setTemplatesVersion] = useState(0);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  useEffect(() => {
    const refreshOutlets = () => {
      const next = Store.listOutlets();
      setOutlets(next);
      if (
        next.length &&
        !next.some((outlet) => outlet.id === selectedOutletId)
      ) {
        setSelectedOutletId(next[0].id);
      }
      if (!next.length) {
        setSelectedOutletId("");
      }
    };
    const refreshTemplates = () => setTemplatesVersion((value) => value + 1);
    window.addEventListener(
      "echo:outlet:save",
      refreshOutlets as EventListener,
    );
    window.addEventListener(QUICK_COUNT_EVENT_NAME, refreshTemplates);
    return () => {
      window.removeEventListener(
        "echo:outlet:save",
        refreshOutlets as EventListener,
      );
      window.removeEventListener(QUICK_COUNT_EVENT_NAME, refreshTemplates);
    };
  }, [selectedOutletId]);
  const templates = useMemo(
    () =>
      selectedOutletId ? Store.listQuickCountTemplates(selectedOutletId) : [],
    [selectedOutletId, templatesVersion],
  );
  useEffect(() => {
    if (!selectedTemplateId && templates.length) {
      setSelectedTemplateId(templates[0].id);
    } else if (
      selectedTemplateId &&
      !templates.some((template) => template.id === selectedTemplateId)
    ) {
      setSelectedTemplateId(templates[0]?.id ?? "");
    }
  }, [selectedTemplateId, templates]);
  const currentTemplate =
    templates.find((template) => template.id === selectedTemplateId) ?? null;
  const bins = useMemo(
    () => Store.listStorageBins(),
    [templatesVersion, selectedOutletId],
  );
  const binsByItem = useMemo(() => {
    const map = new Map<string, StorageBin>();
    for (const bin of bins) {
      if (bin.itemId) map.set(bin.itemId, bin);
    }
    return map;
  }, [bins]);
  const itemsByOutlet = useMemo(() => {
    const items = Store.listItems();
    return items.reduce<
      Record<string, { id: string; name: string; gl?: string | null }[]>
    >((acc, item) => {
      if (!acc[item.outletId]) acc[item.outletId] = [];
      acc[item.outletId].push({
        id: item.id,
        name: item.name,
        gl: item.glCode ?? null,
      });
      return acc;
    }, {});
  }, [templatesVersion]);
  const suggestions = useMemo<ParSuggestion[]>(() => {
    if (!selectedOutletId) return [];
    return Store.getParSuggestions(selectedOutletId);
  }, [selectedOutletId, templatesVersion]);
  const handleCreateTemplate = () => {
    if (!selectedOutletId) return;
    const name = newTemplateName.trim() || "Daily quick count";
    const template: QuickCountTemplate = {
      id: id(),
      outletId: selectedOutletId,
      name,
      cadence: "daily",
      daysOfWeek: null,
      notes: null,
      items: [],
      lastRunAt: null,
    };
    Store.saveQuickCountTemplate(template);
    setNewTemplateName("");
    setSelectedTemplateId(template.id);
    setTemplatesVersion((value) => value + 1);
  };
  const handleTemplateUpdate = (patch: Partial<QuickCountTemplate>) => {
    if (!currentTemplate) return;
    Store.saveQuickCountTemplate({ ...currentTemplate, ...patch });
    setTemplatesVersion((value) => value + 1);
  };
  const handleTemplateItemUpdate = (
    itemId: string,
    patch: { parQty?: number | null; binId?: string | null },
  ) => {
    if (!currentTemplate) return;
    const items = currentTemplate.items.map((item) =>
      item.itemId === itemId ? { ...item, ...patch } : item,
    );
    handleTemplateUpdate({ items });
  };
  const handleAddItemToTemplate = (itemId: string) => {
    if (!currentTemplate) return;
    if (currentTemplate.items.some((item) => item.itemId === itemId)) return;
    const bin = binsByItem.get(itemId);
    const items = [
      ...currentTemplate.items,
      { itemId, binId: bin?.id ?? null, parQty: bin?.parQty ?? null },
    ];
    handleTemplateUpdate({ items });
  };
  const handleRemoveItemFromTemplate = (itemId: string) => {
    if (!currentTemplate) return;
    const items = currentTemplate.items.filter(
      (item) => item.itemId !== itemId,
    );
    handleTemplateUpdate({ items });
  };
  const handleApplySuggestion = (suggestion: ParSuggestion) => {
    const bin = binsByItem.get(suggestion.itemId);
    if (bin) {
      Store.assignBin(bin.id, { parQty: suggestion.recommendedPar });
    }
    if (
      currentTemplate &&
      currentTemplate.items.some((item) => item.itemId === suggestion.itemId)
    ) {
      handleTemplateItemUpdate(suggestion.itemId, {
        parQty: suggestion.recommendedPar,
      });
    }
    setTemplatesVersion((value) => value + 1);
  };
  const handleAttachTemplateItem = (suggestion: ParSuggestion) => {
    if (!currentTemplate) return;
    handleAddItemToTemplate(suggestion.itemId);
    handleApplySuggestion(suggestion);
  };
  const handleRunTemplate = () => {
    if (!currentTemplate) return;
    Store.markQuickCountRun(currentTemplate.id);
    setTemplatesVersion((value) => value + 1);
  };
  const outletOptions = outlets.map((outlet) => ({
    value: outlet.id,
    label: outlet.name,
  }));
  const templateOptions = templates.map((template) => ({
    value: template.id,
    label: template.name,
  }));
  const outletItems = itemsByOutlet[selectedOutletId] ?? [];
  const outletSelectValue = selectedOutletId || undefined;
  const templateSelectValue = selectedTemplateId || undefined;
  return (
    <Card className="border-2">
      {" "}
      <CardHeader className="border-b bg-muted/40">
        {" "}
        <CardTitle>Quick counts &amp; AI pars</CardTitle>{" "}
        <CardDescription>
          {" "}
          Build spot-check templates, auto-track cadence, and let AI tune pars
          using receipt and count trends.{" "}
        </CardDescription>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-6 pt-6">
        {" "}
        <div className="grid gap-4 md:grid-cols-[320px_1fr]">
          {" "}
          <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
            {" "}
            <div className="space-y-2">
              {" "}
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Outlet
              </Label>{" "}
              <Select
                value={outletSelectValue}
                onValueChange={(value) => setSelectedOutletId(value)}
              >
                {" "}
                <SelectTrigger>
                  {" "}
                  <SelectValue placeholder="Select outlet" />{" "}
                </SelectTrigger>{" "}
                <SelectContent>
                  {" "}
                  {outletOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {" "}
                      {option.label}{" "}
                    </SelectItem>
                  ))}{" "}
                </SelectContent>{" "}
              </Select>{" "}
            </div>{" "}
            <div className="space-y-2">
              {" "}
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Template
              </Label>{" "}
              <Select
                value={templateSelectValue}
                onValueChange={(value) => setSelectedTemplateId(value)}
              >
                {" "}
                <SelectTrigger>
                  {" "}
                  <SelectValue placeholder="Select template" />{" "}
                </SelectTrigger>{" "}
                <SelectContent>
                  {" "}
                  {templateOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {" "}
                      {option.label}{" "}
                    </SelectItem>
                  ))}{" "}
                </SelectContent>{" "}
              </Select>{" "}
            </div>{" "}
            <div className="space-y-2">
              {" "}
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                New template
              </Label>{" "}
              <Input
                value={newTemplateName}
                onChange={(event) => setNewTemplateName(event.target.value)}
                placeholder="e.g., Daily beverage count"
              />{" "}
              <Button
                className="w-full"
                onClick={handleCreateTemplate}
                disabled={!selectedOutletId}
              >
                {" "}
                Create template{" "}
              </Button>{" "}
            </div>{" "}
            {currentTemplate && (
              <div className="space-y-2 text-xs text-muted-foreground">
                {" "}
                <div className="flex items-center justify-between">
                  {" "}
                  <span>Cadence</span>{" "}
                  <Badge variant="outline" className="uppercase tracking-wide">
                    {" "}
                    {currentTemplate.cadence}{" "}
                  </Badge>{" "}
                </div>{" "}
                <div className="flex items-center justify-between">
                  {" "}
                  <span>Last run</span>{" "}
                  <span>
                    {currentTemplate.lastRunAt
                      ? new Date(currentTemplate.lastRunAt).toLocaleString()
                      : "Not yet"}
                  </span>{" "}
                </div>{" "}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={handleRunTemplate}
                >
                  {" "}
                  Mark quick count complete{" "}
                </Button>{" "}
              </div>
            )}{" "}
          </div>{" "}
          <div className="space-y-6">
            {" "}
            <Card className="border">
              {" "}
              <CardHeader className="pb-3">
                {" "}
                <CardTitle className="text-base">Template items</CardTitle>{" "}
                <CardDescription>
                  {" "}
                  Assign priority SKUs for spot checks. Link bins to drive
                  shelf-to-sheet workflows.{" "}
                </CardDescription>{" "}
              </CardHeader>{" "}
              <CardContent className="space-y-4">
                {" "}
                {!currentTemplate && (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    {" "}
                    Select or create a template to populate quick count
                    items.{" "}
                  </div>
                )}{" "}
                {currentTemplate && (
                  <>
                    {" "}
                    <div className="flex flex-wrap items-center gap-2">
                      {" "}
                      <Select
                        onValueChange={(value) =>
                          handleAddItemToTemplate(value)
                        }
                      >
                        {" "}
                        <SelectTrigger className="w-full text-left md:w-[320px]">
                          {" "}
                          <SelectValue placeholder="Add item from outlet" />{" "}
                        </SelectTrigger>{" "}
                        <SelectContent>
                          {" "}
                          {outletItems.map((candidate) => {
                            const suffix = candidate.gl
                              ? candidate.gl.slice(-4)
                              : null;
                            return (
                              <SelectItem
                                key={candidate.id}
                                value={candidate.id}
                              >
                                {" "}
                                {suffix
                                  ? `GL ${suffix} · ${candidate.name}`
                                  : candidate.name}{" "}
                              </SelectItem>
                            );
                          })}{" "}
                        </SelectContent>{" "}
                      </Select>{" "}
                      <Badge variant="outline">
                        {currentTemplate.items.length} items
                      </Badge>{" "}
                    </div>{" "}
                    <ScrollArea className="max-h-[320px] rounded-lg border">
                      {" "}
                      <Table>
                        {" "}
                        <TableHeader>
                          {" "}
                          <TableRow>
                            {" "}
                            <TableHead>Item</TableHead>{" "}
                            <TableHead>Bin</TableHead>{" "}
                            <TableHead className="text-right">Par</TableHead>{" "}
                            <TableHead className="text-right w-[120px]">
                              Actions
                            </TableHead>{" "}
                          </TableRow>{" "}
                        </TableHeader>{" "}
                        <TableBody>
                          {" "}
                          {currentTemplate.items.map((line) => {
                            const item = outletItems.find(
                              (entry) => entry.id === line.itemId,
                            );
                            const glSuffix = item?.gl
                              ? item.gl.slice(-4)
                              : null;
                            const bin = line.binId
                              ? bins.find((entry) => entry.id === line.binId)
                              : binsByItem.get(line.itemId);
                            const selectBinValue =
                              line.binId ?? bin?.id ?? UNASSIGNED_BIN_VALUE;
                            return (
                              <TableRow key={line.itemId}>
                                {" "}
                                <TableCell className="text-sm font-medium">
                                  {" "}
                                  {glSuffix
                                    ? `GL ${glSuffix} · ${item?.name ?? "Unknown"}`
                                    : (item?.name ?? "Unknown")}{" "}
                                </TableCell>{" "}
                                <TableCell className="text-sm text-muted-foreground">
                                  {" "}
                                  <Select
                                    value={selectBinValue}
                                    onValueChange={(value) =>
                                      handleTemplateItemUpdate(line.itemId, {
                                        binId:
                                          value === UNASSIGNED_BIN_VALUE
                                            ? null
                                            : value,
                                      })
                                    }
                                  >
                                    {" "}
                                    <SelectTrigger className="h-8 w-[180px] text-left text-xs">
                                      {" "}
                                      <SelectValue placeholder="Select bin" />{" "}
                                    </SelectTrigger>{" "}
                                    <SelectContent>
                                      {" "}
                                      <SelectItem value={UNASSIGNED_BIN_VALUE}>
                                        Unassigned
                                      </SelectItem>{" "}
                                      {bins
                                        .filter(
                                          (candidate) =>
                                            candidate.itemId === line.itemId ||
                                            !candidate.itemId,
                                        )
                                        .map((candidate) => (
                                          <SelectItem
                                            key={candidate.id}
                                            value={candidate.id}
                                          >
                                            {" "}
                                            {candidate.label}{" "}
                                          </SelectItem>
                                        ))}{" "}
                                    </SelectContent>{" "}
                                  </Select>{" "}
                                </TableCell>{" "}
                                <TableCell className="text-right">
                                  {" "}
                                  <Input
                                    type="number"
                                    className="h-8 w-24 text-right"
                                    defaultValue={line.parQty ?? ""}
                                    onBlur={(event) => {
                                      const value = event.target.value.trim();
                                      handleTemplateItemUpdate(line.itemId, {
                                        parQty: value.length
                                          ? Number(value)
                                          : null,
                                      });
                                    }}
                                  />{" "}
                                </TableCell>{" "}
                                <TableCell className="text-right">
                                  {" "}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      handleRemoveItemFromTemplate(line.itemId)
                                    }
                                  >
                                    {" "}
                                    Remove{" "}
                                  </Button>{" "}
                                </TableCell>{" "}
                              </TableRow>
                            );
                          })}{" "}
                          {!currentTemplate.items.length && (
                            <TableRow>
                              {" "}
                              <TableCell
                                colSpan={4}
                                className="text-center text-sm text-muted-foreground"
                              >
                                {" "}
                                No items yet. Add items from the outlet
                                list.{" "}
                              </TableCell>{" "}
                            </TableRow>
                          )}{" "}
                        </TableBody>{" "}
                      </Table>{" "}
                    </ScrollArea>{" "}
                  </>
                )}{" "}
              </CardContent>{" "}
            </Card>{" "}
            <Card className="border">
              {" "}
              <CardHeader className="pb-3">
                {" "}
                <CardTitle className="text-base">
                  AI par suggestions
                </CardTitle>{" "}
                <CardDescription>
                  {" "}
                  Recommendations blend recent receipts, counts, and anomalies.
                  Apply to bins or templates instantly.{" "}
                </CardDescription>{" "}
              </CardHeader>{" "}
              <CardContent className="space-y-3">
                {" "}
                {!suggestions.length && (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    {" "}
                    No recommendations yet. Capture more counts or receipts to
                    build a signal.{" "}
                  </div>
                )}{" "}
                {suggestions.map((suggestion) => {
                  const item = outletItems.find(
                    (entry) => entry.id === suggestion.itemId,
                  );
                  const glSuffix = item?.gl ? item.gl.slice(-4) : null;
                  const bin = binsByItem.get(suggestion.itemId);
                  const varianceTag = suggestion.variancePct >= 0 ? "+" : "";
                  return (
                    <div
                      key={`${suggestion.itemId}-${varianceTag}${suggestion.recommendedPar}`}
                      className="rounded-lg border border-border bg-card p-4"
                    >
                      {" "}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        {" "}
                        <div>
                          {" "}
                          <div className="text-sm font-semibold">
                            {" "}
                            {glSuffix
                              ? `GL ${glSuffix} · ${item?.name ?? "Unknown item"}`
                              : (item?.name ?? "Unknown item")}{" "}
                          </div>{" "}
                          <div className="text-xs text-muted-foreground">
                            {" "}
                            {suggestion.rationale}{" "}
                          </div>{" "}
                        </div>{" "}
                        <div className="flex flex-wrap items-center gap-2">
                          {" "}
                          <Badge variant="outline">
                            {" "}
                            {varianceTag} {suggestion.variancePct}%{" "}
                          </Badge>{" "}
                          <Badge variant="secondary">
                            Suggested: {suggestion.recommendedPar}
                          </Badge>{" "}
                          {bin && (
                            <Badge variant="outline">Bin: {bin.label}</Badge>
                          )}{" "}
                        </div>{" "}
                      </div>{" "}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {" "}
                        <Button
                          size="sm"
                          onClick={() => handleApplySuggestion(suggestion)}
                        >
                          {" "}
                          Apply par{" "}
                        </Button>{" "}
                        {currentTemplate &&
                          !currentTemplate.items.some(
                            (item) => item.itemId === suggestion.itemId,
                          ) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleAttachTemplateItem(suggestion)
                              }
                            >
                              {" "}
                              Add to template{" "}
                            </Button>
                          )}{" "}
                      </div>{" "}
                    </div>
                  );
                })}{" "}
              </CardContent>{" "}
            </Card>{" "}
          </div>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
