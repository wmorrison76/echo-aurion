import React, { useEffect, useMemo, useState } from "react";
import { Layers } from "lucide-react";
import { id, type GLGroup, Store } from "@/lib/store";
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
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
const PROTECTED_GROUP_IDS = new Set([
  "kitchen-cost",
  "beverage-cost",
  "paper-plastic",
]);
type GroupDraft = {
  id: string;
  name: string;
  description: string;
  codesText: string;
  aliasesText: string;
};
const toDraft = (group: GLGroup): GroupDraft => ({
  id: group.id,
  name: group.name,
  description: group.description ?? "",
  codesText: group.codes.join("\n"),
  aliasesText: (group.aliases ?? []).join(","),
});
const sanitizeDraft = (draft: GroupDraft, fallbackName: string): GLGroup => {
  const codes = draft.codesText
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .filter(Boolean);
  const aliases = draft.aliasesText
    .split(/,|\n/)
    .map((value) => value.trim())
    .filter(Boolean);
  const name = draft.name.trim() || fallbackName;
  return {
    id: draft.id,
    name,
    codes: Array.from(new Set(codes)),
    description: draft.description.trim() || undefined,
    aliases: aliases.length ? Array.from(new Set(aliases)) : undefined,
  };
};
export function GLGroupManager() {
  const [groups, setGroups] = useState<GLGroup[]>(() => Store.listGLGroups());
  const [selectedId, setSelectedId] = useState<string | null>(
    () => Store.listGLGroups()[0]?.id ?? null,
  );
  const [draft, setDraft] = useState<GroupDraft | null>(() => {
    const initial = Store.listGLGroups()[0];
    return initial ? toDraft(initial) : null;
  });
  const { toast } = useToast();
  useEffect(() => {
    const handle = () => setGroups(Store.listGLGroups());
    window.addEventListener("echo:gl-groups:save", handle as EventListener);
    return () =>
      window.removeEventListener(
        "echo:gl-groups:save",
        handle as EventListener,
      );
  }, []);
  useEffect(() => {
    if (!selectedId) {
      setDraft(null);
      return;
    }
    const next = groups.find((group) => group.id === selectedId);
    setDraft(next ? toDraft(next) : null);
  }, [groups, selectedId]);
  useEffect(() => {
    if (selectedId) return;
    if (groups.length) {
      setSelectedId(groups[0].id);
    }
  }, [groups, selectedId]);
  const sortedGroups = useMemo(
    () => groups.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [groups],
  );
  const totalCodes = useMemo(
    () => groups.reduce((acc, group) => acc + group.codes.length, 0),
    [groups],
  );
  const handleCreateGroup = () => {
    const newGroup: GLGroup = {
      id: id(),
      name: "New GL Group",
      codes: [],
      description: "",
      aliases: [],
    };
    const nextGroups = [...groups, newGroup];
    Store.saveGLGroups(nextGroups);
    const reloaded = Store.listGLGroups();
    setGroups(reloaded);
    setSelectedId(newGroup.id);
  };
  const handleSaveGroup = () => {
    if (!draft) return;
    const sanitized = sanitizeDraft(draft, "Untitled Group");
    const nextGroups = groups.map((group) =>
      group.id === sanitized.id ? sanitized : group,
    );
    Store.saveGLGroups(nextGroups);
    const reloaded = Store.listGLGroups();
    setGroups(reloaded);
    setSelectedId(sanitized.id);
    toast({ title: "GL group saved", description: sanitized.name });
  };
  const handleDeleteGroup = () => {
    if (!draft) return;
    if (PROTECTED_GROUP_IDS.has(draft.id)) {
      toast({
        title: "Protected group",
        description: "Default groups cannot be removed.",
        variant: "destructive",
      });
      return;
    }
    const remaining = groups.filter((group) => group.id !== draft.id);
    Store.saveGLGroups(remaining);
    const reloaded = Store.listGLGroups();
    setGroups(reloaded);
    setSelectedId(reloaded[0]?.id ?? null);
    toast({ title: "GL group removed" });
  };
  return (
    <Card className="border">
      {" "}
      <CardHeader className="flex flex-col gap-2">
        {" "}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {" "}
          <Layers className="h-4 w-4" />{" "}
          <span>
            {groups.length} groups • {totalCodes} codes tracked
          </span>{" "}
        </div>{" "}
        <CardTitle>GL Code Collections</CardTitle>{" "}
        <CardDescription>
          {" "}
          Bundle raw GL codes into divisions or reporting buckets. Renaming a
          group updates every mapped item instantly.{" "}
        </CardDescription>{" "}
      </CardHeader>{" "}
      <CardContent>
        {" "}
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          {" "}
          <div className="space-y-3">
            {" "}
            <div className="flex items-center justify-between">
              {" "}
              <h3 className="text-sm font-medium text-muted-foreground">
                {" "}
                Available groups{" "}
              </h3>{" "}
              <Button size="sm" variant="outline" onClick={handleCreateGroup}>
                {" "}
                New group{" "}
              </Button>{" "}
            </div>{" "}
            <div className="space-y-2">
              {" "}
              {sortedGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setSelectedId(group.id)}
                  className={cn(
                    "w-full rounded-md border px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    selectedId === group.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/60",
                  )}
                >
                  {" "}
                  <div className="flex items-center justify-between gap-3">
                    {" "}
                    <div>
                      {" "}
                      <div className="font-medium text-foreground">
                        {" "}
                        {group.name}{" "}
                      </div>{" "}
                      {group.description && (
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {" "}
                          {group.description}{" "}
                        </div>
                      )}{" "}
                    </div>{" "}
                    <Badge variant="secondary" className="shrink-0">
                      {" "}
                      {group.codes.length}{" "}
                    </Badge>{" "}
                  </div>{" "}
                </button>
              ))}{" "}
              {!sortedGroups.length && (
                <div className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                  {" "}
                  No GL groups yet. Create one to start organizing codes.{" "}
                </div>
              )}{" "}
            </div>{" "}
          </div>{" "}
          <div className="space-y-4">
            {" "}
            {!draft ? (
              <div className="flex h-full min-h-[240px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                {" "}
                Select a group to review and edit its details.{" "}
              </div>
            ) : (
              <div className="space-y-4">
                {" "}
                <div className="grid gap-3">
                  {" "}
                  <div className="grid gap-1">
                    {" "}
                    <Label htmlFor="group-name">Display name</Label>{" "}
                    <Input
                      id="group-name"
                      value={draft.name}
                      onChange={(event) =>
                        setDraft({ ...draft, name: event.target.value })
                      }
                      placeholder="Rooms Division"
                    />{" "}
                  </div>{" "}
                  <div className="grid gap-1">
                    {" "}
                    <Label htmlFor="group-description">Description</Label>{" "}
                    <Textarea
                      id="group-description"
                      value={draft.description}
                      onChange={(event) =>
                        setDraft({ ...draft, description: event.target.value })
                      }
                      placeholder="Used for minibar and guest amenity costs"
                      className="min-h-[90px]"
                    />{" "}
                  </div>{" "}
                  <div className="grid gap-1">
                    {" "}
                    <Label htmlFor="group-codes">
                      {" "}
                      GL codes (one per line or comma separated){" "}
                    </Label>{" "}
                    <Textarea
                      id="group-codes"
                      value={draft.codesText}
                      onChange={(event) =>
                        setDraft({ ...draft, codesText: event.target.value })
                      }
                      className="min-h-[120px] font-mono text-xs"
                      placeholder="5310-Retail\n5311-Minibar"
                    />{" "}
                  </div>{" "}
                  <div className="grid gap-1">
                    {" "}
                    <Label htmlFor="group-aliases">
                      {" "}
                      Search aliases (comma separated){" "}
                    </Label>{" "}
                    <Input
                      id="group-aliases"
                      value={draft.aliasesText}
                      onChange={(event) =>
                        setDraft({ ...draft, aliasesText: event.target.value })
                      }
                      placeholder="rooms division, minibar, retail"
                    />{" "}
                  </div>{" "}
                </div>{" "}
                <div className="flex flex-wrap items-center gap-2">
                  {" "}
                  <Button onClick={handleSaveGroup}>Save group</Button>{" "}
                  <Button
                    variant="outline"
                    onClick={() => {
                      const stored = Store.listGLGroups().find(
                        (group) => group.id === draft.id,
                      );
                      if (stored) {
                        setDraft(toDraft(stored));
                      }
                    }}
                  >
                    {" "}
                    Reset changes{" "}
                  </Button>{" "}
                  <Button
                    variant="destructive"
                    className="ml-auto"
                    onClick={handleDeleteGroup}
                  >
                    {" "}
                    Remove group{" "}
                  </Button>{" "}
                </div>{" "}
              </div>
            )}{" "}
          </div>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
