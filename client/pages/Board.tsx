import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Clock,
  FilePlus2,
  Layers,
  NotebookPen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import EchoOrb, { orbHostClass } from "@/components/echo/EchoOrb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const PROJECT_ACTIVITY_KEY = "dashboard.project.activity.v1";
const NOTES_STORAGE_KEY = "dashboard.session.notes.v1";
const PROFILE_STORAGE_KEY = "dashboard.profile.v1";
const NEW_PROJECT_INTENT_KEY = "studio.intent";
const GENERAL_NOTE_TARGET = "__general__";

type ProjectActivity = {
  lastOpened?: number;
  runs?: number;
};

type DashboardProject = {
  id: string;
  name: string;
  sourcePath: string;
  summary: string;
  lastOpened?: number;
  runs: number;
};

type SessionNote = {
  id: string;
  projectId: string | null;
  content: string;
  createdAt: number;
};

type Profile = {
  displayName: string;
};

declare global {
  interface Window {
    __LUCCCA_USER__?: {
      displayName?: string;
      firstName?: string;
    };
  }
}

const projectSources = import.meta.glob("/client/projects/**/*.tsx", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

const HAS_WINDOW = typeof window !== "undefined";

export default function Board() {
  const navigate = useNavigate();
  const profile = React.useMemo<Profile>(() => deriveInitialProfile(), []);
  const [activity, setActivity] = React.useState<
    Record<string, ProjectActivity>
  >(() =>
    readJson(PROJECT_ACTIVITY_KEY, {} as Record<string, ProjectActivity>),
  );
  const [notes, setNotes] = React.useState<SessionNote[]>(() =>
    readJson(NOTES_STORAGE_KEY, [] as SessionNote[]),
  );
  const [noteDraft, setNoteDraft] = React.useState("");
  const [noteProject, setNoteProject] =
    React.useState<string>(GENERAL_NOTE_TARGET);

  const projects = React.useMemo<DashboardProject[]>(() => {
    const entries = Object.entries(projectSources).map(([path, source]) => {
      const id = normalizeProjectId(path);
      const name = titleFromSlug(id);
      const summary = extractSummary(source);
      const tracker = activity[id] ?? {};
      return {
        id,
        name,
        sourcePath: path.replace(/^\//, ""),
        summary,
        lastOpened: tracker.lastOpened,
        runs: tracker.runs ?? 0,
      } satisfies DashboardProject;
    });
    entries.sort((a, b) => {
      const aLast = a.lastOpened ?? 0;
      const bLast = b.lastOpened ?? 0;
      if (bLast !== aLast) return bLast - aLast;
      return a.name.localeCompare(b.name);
    });
    return entries;
  }, [activity]);

  const projectLookup = React.useMemo(() => {
    return Object.fromEntries(projects.map((project) => [project.id, project]));
  }, [projects]);

  const sortedNotes = React.useMemo(() => {
    return [...notes].sort((a, b) => b.createdAt - a.createdAt);
  }, [notes]);

  const selectedProjectLabel = noteProjectLabel(noteProject, projectLookup);
  const greeting = getTimeOfDayGreeting(new Date());
  const displayName = (profile.displayName || "William Morrison").trim();
  const firstName = displayName.split(/\s+/)[0] || "William";
  const lastSessionAt =
    sortedNotes[0]?.createdAt ?? latestActivityTime(activity);

  React.useEffect(() => {
    if (!HAS_WINDOW) return;
    writeJson(PROJECT_ACTIVITY_KEY, activity);
  }, [activity]);

  React.useEffect(() => {
    if (!HAS_WINDOW) return;
    writeJson(NOTES_STORAGE_KEY, notes);
  }, [notes]);

  const handleOpenProject = React.useCallback(
    (projectId: string) => {
      const project = projectLookup[projectId];
      if (!project) return;
      setActivity((prev) => {
        const runs = (prev[projectId]?.runs ?? 0) + 1;
        const next: Record<string, ProjectActivity> = {
          ...prev,
          [projectId]: { lastOpened: Date.now(), runs },
        };
        writeJson(PROJECT_ACTIVITY_KEY, next);
        return next;
      });
      if (HAS_WINDOW) {
        try {
          const shortName = projectId.split("/").pop() ?? projectId;
          window.localStorage.setItem("studio.projectName", shortName);
          window.localStorage.setItem(
            "studio.destPath",
            `client/projects/${projectId}.tsx`,
          );
          window.localStorage.setItem("studio.projectFullPath", projectId);
          window.sessionStorage?.setItem(
            "studio.entrypoint",
            JSON.stringify({ from: "board", at: Date.now() }),
          );
        } catch (err) {
          console.error("Failed to persist studio state", err);
        }
      }
      navigate("/studio?task=Coder&tab=code");
    },
    [navigate, projectLookup],
  );

  const handleStartNewProject = React.useCallback(() => {
    if (HAS_WINDOW) {
      try {
        window.localStorage.setItem(
          NEW_PROJECT_INTENT_KEY,
          JSON.stringify({ kind: "new-project", createdAt: Date.now() }),
        );
      } catch (err) {
        console.error("Failed to persist new project intent", err);
      }
    }
    navigate("/studio?task=Planner&tab=seed");
  }, [navigate]);

  const handleOpenPlanner = React.useCallback(() => {
    navigate("/studio?task=Planner&tab=seed");
  }, [navigate]);

  const handleOpenBlueprint = React.useCallback(() => {
    navigate("/studio?task=Blueprint&tab=design");
  }, [navigate]);

  const handleAddNote = React.useCallback(() => {
    const trimmed = noteDraft.trim();
    if (!trimmed) return;
    const projectId = noteProject === GENERAL_NOTE_TARGET ? null : noteProject;
    const note: SessionNote = {
      id: createId(),
      projectId,
      content: trimmed,
      createdAt: Date.now(),
    };
    setNotes((prev) => [note, ...prev]);
    setNoteDraft("");
  }, [noteDraft, noteProject]);

  const quickActions = React.useMemo(() => {
    return [
      {
        id: "new-project",
        title: "New Project",
        description: "Create a fresh workspace or connect an existing module.",
        icon: FilePlus2,
        onActivate: handleStartNewProject,
      },
      {
        id: "planner",
        title: "Planner",
        description: "Outline scope for EchoCoder before execution.",
        icon: NotebookPen,
        onActivate: handleOpenPlanner,
      },
      {
        id: "blueprint",
        title: "Blueprint",
        description: "Review LUCCCA blueprint structures and templates.",
        icon: Layers,
        onActivate: handleOpenBlueprint,
      },
    ];
  }, [handleStartNewProject, handleOpenPlanner, handleOpenBlueprint]);

  const noteTargets = React.useMemo(() => {
    const base = [
      { value: GENERAL_NOTE_TARGET, label: "General note" },
      ...projects.map((project) => ({
        value: project.id,
        label: project.name,
      })),
    ];
    return base;
  }, [projects]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background">
      <div className="container py-10 space-y-8">
        <Card className="border border-border/60 bg-background/70 shadow-lg backdrop-blur">
          <CardContent className="flex flex-col gap-8 px-6 py-8 md:flex-row md:items-center md:justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" aria-hidden />
                <span>{greeting}</span>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                  Hello {firstName}
                </h1>
                <p className="mt-2 max-w-xl text-base text-muted-foreground">
                  Welcome back to LUCCCA.{" "}
                  {lastSessionAt
                    ? `Your last session wrapped ${formatRelative(lastSessionAt)}.`
                    : "Start a new workflow when you are ready."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleStartNewProject}>New project</Button>
                <Button variant="outline" onClick={handleOpenPlanner}>
                  Open planner
                </Button>
                <Button variant="ghost" onClick={handleOpenBlueprint}>
                  Blueprint overview
                </Button>
              </div>
            </div>
            <div
              className={`${orbHostClass} mx-auto h-[140px] w-[140px] md:mx-0`}
            >
              <EchoOrb
                bare
                className="h-full w-full"
                showRings={false}
                glowParticles={320}
                radius={1.8}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card className="border border-border/60 bg-background/65 shadow-md">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-xl">Active projects</CardTitle>
                <CardDescription>
                  Recently opened LUCCCA workspaces and sandboxes.
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className="mt-2 uppercase tracking-wide text-xs"
              >
                {projects.length} total
              </Badge>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-border/70 p-10 text-center text-sm text-muted-foreground">
                  No project files detected yet. Use the Planner to create your
                  first module.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {projects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onOpen={handleOpenProject}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border border-border/60 bg-background/65 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Quick actions</CardTitle>
                <CardDescription>
                  Jump directly to planning, coding, or blueprint references.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {quickActions.map((action) => (
                  <ActionRow key={action.id} action={action} />
                ))}
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-background/65 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Last session notes</CardTitle>
                <CardDescription>
                  Capture decisions, blockers, and follow-ups for the next run.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <Select value={noteProject} onValueChange={setNoteProject}>
                    <SelectTrigger aria-label="Select project for note">
                      <SelectValue placeholder="Choose a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {noteTargets.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    value={noteDraft}
                    onChange={(event) => setNoteDraft(event.target.value)}
                    rows={4}
                    placeholder={`Notes for ${selectedProjectLabel}`}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setNoteDraft("")}
                      disabled={!noteDraft.trim()}
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      onClick={handleAddNote}
                      disabled={!noteDraft.trim()}
                    >
                      Save note
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Recent notes
                  </h3>
                  <ScrollArea className="mt-3 h-60 pr-2">
                    <div className="space-y-3">
                      {sortedNotes.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                          No notes captured yet. Add context above to keep your
                          session history.
                        </div>
                      ) : (
                        sortedNotes
                          .slice(0, 8)
                          .map((note) => (
                            <SessionNoteItem
                              key={note.id}
                              note={note}
                              projectLookup={projectLookup}
                            />
                          ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

type ActionConfig = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  onActivate: () => void;
};

function ActionRow({ action }: { action: ActionConfig }) {
  const Icon = action.icon;
  return (
    <button
      type="button"
      onClick={action.onActivate}
      className="group flex w-full items-center gap-4 rounded-lg border border-border/60 bg-background/70 px-4 py-3 text-left transition hover:border-border hover:bg-background"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-background/70 text-foreground/80 transition group-hover:border-primary group-hover:text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="flex-1">
        <span className="text-sm font-semibold leading-tight text-foreground">
          {action.title}
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {action.description}
        </span>
      </span>
      <ArrowRight
        className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground"
        aria-hidden
      />
    </button>
  );
}

function ProjectCard({
  project,
  onOpen,
}: {
  project: DashboardProject;
  onOpen: (projectId: string) => void;
}) {
  const now = Date.now();
  const recentlyActive =
    project.lastOpened && now - project.lastOpened < 4 * 60 * 60 * 1000;
  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-border/60 bg-background/70 p-4 shadow-sm transition hover:border-border hover:shadow-md">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-base font-semibold leading-snug text-foreground">
              {project.name}
            </h3>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {project.sourcePath}
            </p>
          </div>
          <Badge
            variant={recentlyActive ? "default" : "outline"}
            className="text-[10px] uppercase tracking-wide"
          >
            {recentlyActive
              ? "Active"
              : `${project.runs} run${project.runs === 1 ? "" : "s"}`}
          </Badge>
        </div>
        <p className="text-sm leading-snug text-muted-foreground line-clamp-3">
          {project.summary}
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {project.lastOpened
            ? formatRelative(project.lastOpened)
            : "Not opened yet"}
        </span>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onOpen(project.id)}
          className="ml-3"
        >
          Open
          <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function SessionNoteItem({
  note,
  projectLookup,
}: {
  note: SessionNote;
  projectLookup: Record<string, DashboardProject>;
}) {
  const label = note.projectId
    ? (projectLookup[note.projectId]?.name ?? note.projectId)
    : "General";
  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-background/70 p-4">
      <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-wide text-muted-foreground">
        <span>{formatTimestamp(note.createdAt)}</span>
        <Badge
          variant="outline"
          className="text-[10px] uppercase tracking-wide"
        >
          {label}
        </Badge>
      </div>
      <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
        {note.content}
      </p>
    </div>
  );
}

function normalizeProjectId(path: string): string {
  return path.replace(/^\/client\/projects\//, "").replace(/\.(tsx|ts)$/i, "");
}

function titleFromSlug(slug: string): string {
  const parts = slug.split("/").map((segment) =>
    segment
      .replace(/[-_]/g, " ")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/\s+/g, " ")
      .trim(),
  );
  const words = parts
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1));
  return words.join(" › ") || "Untitled Project";
}

function extractSummary(source: string): string {
  const lines = source.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("//")) {
      return line.replace(/^\/\//, "").trim();
    }
    if (line.startsWith("/*")) {
      const stripped = line
        .replace(/^\/\*+/, "")
        .replace(/\*+\/$/, "")
        .trim();
      if (stripped) return stripped;
      continue;
    }
    if (line.startsWith("import")) continue;
    if (line.startsWith("export")) continue;
    if (line.startsWith("return")) break;
    const sanitized = line
      .replace(/[{}<>]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (sanitized) return sanitized;
  }
  return "Primary project entry point.";
}

function getTimeOfDayGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  if (hour >= 17 && hour < 21) return "Good Evening";
  if (hour >= 21 || hour < 1) return "Late Night";
  return "Working late tonight";
}

function formatRelative(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) {
    const minutes = Math.round(diff / 60_000);
    return `${minutes}m ago`;
  }
  if (diff < 86_400_000) {
    const hours = Math.round(diff / 3_600_000);
    return `${hours}h ago`;
  }
  const days = Math.round(diff / 86_400_000);
  if (days <= 7) {
    return `${days}d ago`;
  }
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function noteProjectLabel(
  value: string,
  lookup: Record<string, DashboardProject>,
): string {
  if (value === GENERAL_NOTE_TARGET) return "General notes";
  return lookup[value]?.name ?? value;
}

function latestActivityTime(
  activity: Record<string, ProjectActivity>,
): number | null {
  const timestamps = Object.values(activity)
    .map((entry) => entry.lastOpened ?? 0)
    .filter(Boolean);
  if (timestamps.length === 0) return null;
  return Math.max(...timestamps);
}

function createId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}

function readJson<T>(key: string, fallback: T): T {
  if (!HAS_WINDOW) return fallback;
  try {
    const value = window.localStorage.getItem(key);
    if (!value) return fallback;
    return JSON.parse(value) as T;
  } catch (err) {
    console.warn(`Failed to read ${key} from storage`, err);
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!HAS_WINDOW) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to write ${key} to storage`, err);
  }
}

function deriveInitialProfile(): Profile {
  if (HAS_WINDOW) {
    const stored = readJson<Profile | null>(PROFILE_STORAGE_KEY, null);
    if (stored) return stored;
    const session = window.__LUCCCA_USER__;
    if (session?.displayName) return { displayName: session.displayName };
    if (session?.firstName) return { displayName: session.firstName };
  }
  return { displayName: "William Morrison" };
}
