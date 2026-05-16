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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useCollaboration } from "@/context/CollaborationContext";
import type { IngredientRow } from "@/types/ingredients";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useMemo, useState } from "react";

const TASK_STATUSES: { value: "todo" | "in_progress" | "done"; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

type TeamWorkflowPanelProps = {
  className?: string;
  ingredients: IngredientRow[];
  onCaptureVersion: () => void;
};

const NO_LINK_VALUE = "__none";

export function TeamWorkflowPanel({ className, ingredients, onCaptureVersion }: TeamWorkflowPanelProps) {
  const collaboration = useCollaboration();
  const ingredientOptions = useMemo(() => {
    const set = new Set<string>();
    ingredients.forEach((row) => {
      if (row.type === "divider") return;
      const name = row.item.trim();
      if (name) set.add(name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [ingredients]);

  const [taskForm, setTaskForm] = useState({
    title: "",
    assignee: "",
    dueDate: "",
    relatedIngredient: "",
  });
  const [threadForm, setThreadForm] = useState({
    topic: "",
    relatedIngredient: "",
    author: "",
    message: "",
  });
  const [replyDrafts, setReplyDrafts] = useState<Record<string, { author: string; message: string }>>({});

  const pendingCount = collaboration.pendingActions.filter((action) => action.status === "pending").length;

  const handleAddTask = () => {
    if (!taskForm.title.trim()) return;
    collaboration.addTask({
      title: taskForm.title.trim(),
      assignee: taskForm.assignee.trim(),
      dueDate: taskForm.dueDate.trim() || undefined,
      relatedIngredient: taskForm.relatedIngredient || undefined,
    });
    setTaskForm({ title: "", assignee: "", dueDate: "", relatedIngredient: "" });
  };

  const handleCreateThread = () => {
    if (!threadForm.topic.trim() || !threadForm.message.trim()) return;
    const id = collaboration.createFeedbackThread({
      topic: threadForm.topic.trim(),
      relatedIngredient: threadForm.relatedIngredient || undefined,
      author: threadForm.author.trim() || "Unassigned",
      message: threadForm.message.trim(),
    });
    if (id) {
      setThreadForm({ topic: "", relatedIngredient: "", author: "", message: "" });
    }
  };

  const groupedTasks = useMemo(() => {
    return TASK_STATUSES.map((status) => ({
      status: status.value,
      label: status.label,
      items: collaboration.tasks.filter((task) => task.status === status.value),
    }));
  }, [collaboration.tasks]);

  return (
    <section className={cn("space-y-6", className)}>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Collaboration & sync</CardTitle>
          <CardDescription>
            Manage team assignments, capture feedback, and keep offline work queued safely.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={collaboration.isOffline ? "destructive" : "secondary"}>
              {collaboration.isOffline ? "Offline mode" : "Online"}
            </Badge>
            {pendingCount > 0 && (
              <Badge variant="outline">{pendingCount} change{pendingCount > 1 ? "s" : ""} queued</Badge>
            )}
            {collaboration.lastSyncedAt && !collaboration.isOffline && (
              <span className="text-xs text-muted-foreground">
                Synced {formatDistanceToNow(collaboration.lastSyncedAt, { addSuffix: true })}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Team tasks</CardTitle>
          <CardDescription>
            Assign workstreams, monitor progress, and keep prep aligned with lab testing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(16rem,1fr),repeat(3,minmax(10rem,1fr))]">
            <Input
              value={taskForm.title}
              onChange={(event) => setTaskForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Task title"
            />
            <Input
              value={taskForm.assignee}
              onChange={(event) => setTaskForm((prev) => ({ ...prev, assignee: event.target.value }))}
              placeholder="Assignee"
            />
            <Input
              type="date"
              value={taskForm.dueDate}
              onChange={(event) => setTaskForm((prev) => ({ ...prev, dueDate: event.target.value }))}
            />
            <Select
              value={taskForm.relatedIngredient || NO_LINK_VALUE}
              onValueChange={(value) =>
                setTaskForm((prev) => ({
                  ...prev,
                  relatedIngredient: value === NO_LINK_VALUE ? "" : value,
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Link ingredient" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_LINK_VALUE}>No link</SelectItem>
                {ingredientOptions.map((ingredient) => (
                  <SelectItem key={ingredient} value={ingredient}>
                    {ingredient}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              onClick={handleAddTask}
              disabled={!taskForm.title.trim()}
              className="w-full sm:w-auto"
            >
              Add task
            </Button>
          </div>
          <Separator />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {groupedTasks.map((group) => (
              <div key={group.status} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </h4>
                  <Badge variant="outline">{group.items.length}</Badge>
                </div>
                <div className="space-y-2">
                  {group.items.length === 0 ? (
                    <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                      Nothing here yet.
                    </div>
                  ) : (
                    group.items.map((task) => (
                      <div key={task.id} className="rounded-md border bg-muted/40 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold">{task.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {task.assignee} · Updated {formatDistanceToNow(task.updatedAt, { addSuffix: true })}
                            </div>
                            {task.relatedIngredient && (
                              <div className="mt-1 text-[11px] text-muted-foreground">
                                Linked to {task.relatedIngredient}
                              </div>
                            )}
                          </div>
                          <Select
                            value={task.status}
                            onValueChange={(value) => collaboration.updateTaskStatus(task.id, value as typeof task.status)}
                          >
                            <SelectTrigger className="h-8 w-[7.5rem] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TASK_STATUSES.map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          {task.dueDate && <span>Due {task.dueDate}</span>}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => collaboration.assignTask(task.id, task.assignee === "Riley" ? "Jordan" : "Riley")}
                            className="h-7 px-2 text-[11px]"
                          >
                            Reassign
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Feedback threads</CardTitle>
          <CardDescription>
            Capture observations and get sign-off on changes before publishing to production.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(16rem,1fr),minmax(12rem,0.6fr),minmax(12rem,0.6fr)]">
            <Input
              value={threadForm.topic}
              onChange={(event) => setThreadForm((prev) => ({ ...prev, topic: event.target.value }))}
              placeholder="Feedback topic"
            />
            <Select
              value={threadForm.relatedIngredient || NO_LINK_VALUE}
              onValueChange={(value) =>
                setThreadForm((prev) => ({
                  ...prev,
                  relatedIngredient: value === NO_LINK_VALUE ? "" : value,
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Link ingredient" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_LINK_VALUE}>No link</SelectItem>
                {ingredientOptions.map((ingredient) => (
                  <SelectItem key={ingredient} value={ingredient}>
                    {ingredient}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={threadForm.author}
              onChange={(event) => setThreadForm((prev) => ({ ...prev, author: event.target.value }))}
              placeholder="Posted by"
            />
          </div>
          <Textarea
            value={threadForm.message}
            onChange={(event) => setThreadForm((prev) => ({ ...prev, message: event.target.value }))}
            placeholder="What needs review?"
            rows={3}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              onClick={handleCreateThread}
              disabled={!threadForm.topic.trim() || !threadForm.message.trim()}
              className="w-full sm:w-auto"
            >
              Start thread
            </Button>
          </div>
          <Separator />
          <ScrollArea className="max-h-[24rem] w-full space-y-3">
            {collaboration.feedback.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No feedback threads yet.
              </div>
            ) : (
              collaboration.feedback.map((thread) => {
                const replyDraft = replyDrafts[thread.id] ?? { author: "", message: "" };
                return (
                  <div key={thread.id} className="rounded-lg border bg-muted/40 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold">{thread.topic}</div>
                        <div className="text-xs text-muted-foreground">
                          {thread.relatedIngredient ? `Linked to ${thread.relatedIngredient}` : "General"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={thread.status === "resolved" ? "secondary" : "outline"}>
                          {thread.status === "resolved" ? "Resolved" : "Open"}
                        </Badge>
                        {thread.status === "open" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => collaboration.resolveFeedbackThread(thread.id)}
                            className="h-7 px-2 text-[11px]"
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 space-y-2">
                      {thread.messages.map((message) => (
                        <div key={message.id} className="rounded-md bg-background/80 p-2 text-xs shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{message.author}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(message.createdAt, { addSuffix: true })}
                              {message.offline ? " · queued" : ""}
                            </span>
                          </div>
                          <div className="mt-1 leading-relaxed text-muted-foreground">
                            {message.message}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 space-y-2 border-t pt-3">
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(12rem,0.6fr),1fr]">
                        <Input
                          value={replyDraft.author}
                          onChange={(event) =>
                            setReplyDrafts((prev) => ({
                              ...prev,
                              [thread.id]: { ...replyDraft, author: event.target.value },
                            }))
                          }
                          placeholder="Reply as"
                        />
                        <Textarea
                          rows={2}
                          value={replyDraft.message}
                          onChange={(event) =>
                            setReplyDrafts((prev) => ({
                              ...prev,
                              [thread.id]: { ...replyDraft, message: event.target.value },
                            }))
                          }
                          placeholder="Add update"
                        />
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <Button
                          type="button"
                          size="sm"
                          disabled={!replyDraft.message.trim()}
                          onClick={() => {
                            collaboration.addFeedbackMessage({
                              threadId: thread.id,
                              author: replyDraft.author.trim() || "Unassigned",
                              message: replyDraft.message.trim(),
                            });
                            setReplyDrafts((prev) => ({
                              ...prev,
                              [thread.id]: { author: "", message: "" },
                            }));
                          }}
                          className="w-full sm:w-auto"
                        >
                          Reply
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Version history</CardTitle>
          <CardDescription>
            Automatic snapshots keep changes recoverable. Capture manual versions before sending updates downstream.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              {collaboration.versions.length} versions tracked · {collaboration.pendingActions.length} actions logged
            </div>
            <Button type="button" variant="outline" onClick={onCaptureVersion}>
              Capture version
            </Button>
          </div>
          {collaboration.versions.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No versions captured yet. Use the button above to store the current recipe state.
            </div>
          ) : (
            <div className="space-y-2">
              {collaboration.versions.slice(0, 6).map((version) => (
                <div key={version.id} className="rounded-md border bg-muted/30 p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold">{version.summary}</div>
                    <div className="flex items-center gap-2">
                      {version.auto && <Badge variant="outline">Auto</Badge>}
                      {version.offline && <Badge variant="destructive">Offline</Badge>}
                    </div>
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    Saved {formatDistanceToNow(version.createdAt, { addSuffix: true })}
                    {version.createdBy ? ` by ${version.createdBy}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
