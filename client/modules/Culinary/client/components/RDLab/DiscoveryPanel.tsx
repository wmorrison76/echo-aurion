import {
  useMemo,
  useState,
  useCallback,
  Dispatch,
  SetStateAction,
  FormEvent,
} from "react";

import { textureAtlas } from "@/data/textureReference";
import {
  flavorConstellationLibrary,
  futureFoodDrivers,
} from "@/data/flavorMatrix";
import { useRDLabStore } from "@/stores/rdLabStore";
import { cn } from "@/lib/utils";

export function DiscoveryPanel() {
  const {
    experiments,
    focusExperimentId,
    setFocusExperiment,
    searchQuery,
    setSearchQuery,
    createExperiment,
  } = useRDLabStore();

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return experiments;
    const query = searchQuery.toLowerCase();
    return experiments.filter((exp) =>
      [
        exp.title,
        exp.owner,
        exp.notes,
        exp.hypothesis,
        exp.tags.join(" "),
        exp.variablesUnderTest.join(" "),
        exp.sensoryTargets.join(" "),
        exp.textureObjectives.join(" "),
        exp.flavorConstellations.join(" "),
        exp.futureFoodAngles.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [experiments, searchQuery]);

  const [draftTitle, setDraftTitle] = useState("");
  const [draftOwner, setDraftOwner] = useState("Lab Team");
  const [draftHypothesis, setDraftHypothesis] = useState("");
  const [draftVariables, setDraftVariables] = useState("");
  const [draftTargets, setDraftTargets] = useState("");
  const [draftEquipment, setDraftEquipment] = useState("");
  const [draftTags, setDraftTags] = useState("");
  const [draftLaunchWindow, setDraftLaunchWindow] = useState("");
  const [draftTextureObjectives, setDraftTextureObjectives] = useState("");
  const [draftFlavorConstellations, setDraftFlavorConstellations] =
    useState("");
  const [draftFutureAngles, setDraftFutureAngles] = useState("");

  const pushDraftLine = useCallback(
    (setter: Dispatch<SetStateAction<string>>, value: string) => {
      setter((prev) => {
        const trimmed = prev.trim();
        return trimmed.length ? `${trimmed}\n${value}` : value;
      });
    },
    [],
  );

  const splitList = (value: string) =>
    value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);

  const handleCreateExperiment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = draftTitle.trim();
    const hypothesis = draftHypothesis.trim();
    if (!title || !hypothesis) return;
    const owner = draftOwner.trim() || "Lab Team";
    const experimentId = createExperiment({
      title,
      hypothesis,
      owner,
      tags: splitList(draftTags),
      variablesUnderTest: splitList(draftVariables),
      sensoryTargets: splitList(draftTargets),
      equipment: splitList(draftEquipment),
      textureObjectives: splitList(draftTextureObjectives),
      flavorConstellations: splitList(draftFlavorConstellations),
      futureFoodAngles: splitList(draftFutureAngles),
      testPlan: ["Bench validation queued"],
      notes: hypothesis,
      launchWindow: draftLaunchWindow.trim(),
    });
    setFocusExperiment(experimentId);
    setSearchQuery("");
    setDraftTitle("");
    setDraftHypothesis("");
    setDraftVariables("");
    setDraftTargets("");
    setDraftEquipment("");
    setDraftTags("");
    setDraftLaunchWindow("");
    setDraftTextureObjectives("");
    setDraftFlavorConstellations("");
    setDraftFutureAngles("");
  };

  const isCreateDisabled = !draftTitle.trim() || !draftHypothesis.trim();

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto pr-1">
      <div className="rounded-2xl border border-border dark:border-[#c8a97e]/20 bg-input dark:bg-amber-500/5 p-4 backdrop-blur">
        <div className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground dark:text-[#c8a97e]/80/80">
          Discovery Queue
        </div>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search textures, owners, status"
          className="mt-3 w-full rounded-xl border border-border dark:border-[#c8a97e]/15 bg-card dark:bg-slate-900/40 px-3 py-2 text-sm text-foreground dark:text-white/80 shadow-sm outline-none ring-0 transition focus:border-sky-500 dark:focus:border-[#c8a97e] focus:bg-card dark:focus:bg-white"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.35em] text-accent dark:text-white/80/70">
          <span className="chalk-breath">Textures {textureAtlas.length}</span>
          <span className="chalk-breath">
            Constellations {flavorConstellationLibrary.length}
          </span>
          <span className="chalk-breath">
            Drivers {futureFoodDrivers.length}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-border dark:border-[#c8a97e]/20 bg-muted dark:bg-[#c8a97e]/08 p-4 backdrop-blur">
        <div className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground dark:text-[#c8a97e]/80/80">
          Rapid prototyping
        </div>
        <p className="mt-1 text-[11px] text-foreground dark:text-[#c8a97e]/80/70">
          Spin up a fresh experiment with hypothesis, variables, and target
          service window before you hit the bench.
        </p>
        <form
          onSubmit={handleCreateExperiment}
          className="mt-3 space-y-3 text-xs text-foreground dark:text-[#c8a97e]/80/80"
        >
          <div className="grid gap-2 md:grid-cols-2">
            <input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder="Working title"
              className="rounded-lg border border-border dark:border-[#c8a97e]/15 bg-card dark:bg-slate-950/60 px-3 py-2 text-sm text-foreground dark:text-white/80 shadow-sm outline-none transition focus:border-sky-400 dark:focus:border-[#c8a97e] focus:bg-card dark:focus:bg-white"
            />
            <input
              value={draftOwner}
              onChange={(event) => setDraftOwner(event.target.value)}
              placeholder="Lab owner / lead"
              className="rounded-lg border border-border dark:border-[#c8a97e]/15 bg-card dark:bg-slate-950/60 px-3 py-2 text-sm text-foreground dark:text-white/80 shadow-sm outline-none transition focus:border-sky-400 dark:focus:border-[#c8a97e] focus:bg-card dark:focus:bg-white"
            />
          </div>
          <textarea
            value={draftHypothesis}
            onChange={(event) => setDraftHypothesis(event.target.value)}
            placeholder="Hypothesis: what will this technique unlock?"
            rows={3}
            className="w-full rounded-lg border border-border dark:border-[#c8a97e]/15 bg-card dark:bg-slate-950/60 px-3 py-2 text-sm text-foreground dark:text-white/80 shadow-sm outline-none transition focus:border-sky-400 dark:focus:border-[#c8a97e] focus:bg-card dark:focus:bg-white"
          />
          <div className="grid gap-2 md:grid-cols-2">
            <textarea
              value={draftVariables}
              onChange={(event) => setDraftVariables(event.target.value)}
              placeholder="Variables under test (comma or newline separated)"
              rows={2}
              className="w-full rounded-lg border border-border dark:border-[#c8a97e]/15 bg-card dark:bg-slate-950/60 px-3 py-2 text-sm text-foreground dark:text-white/80 shadow-sm outline-none transition focus:border-sky-400 dark:focus:border-[#c8a97e] focus:bg-card dark:focus:bg-white"
            />
            <textarea
              value={draftTargets}
              onChange={(event) => setDraftTargets(event.target.value)}
              placeholder="Sensory targets (comma or newline separated)"
              rows={2}
              className="w-full rounded-lg border border-border dark:border-[#c8a97e]/15 bg-card dark:bg-slate-950/60 px-3 py-2 text-sm text-foreground dark:text-white/80 shadow-sm outline-none transition focus:border-sky-400 dark:focus:border-[#c8a97e] focus:bg-card dark:focus:bg-white"
            />
          </div>
          <textarea
            value={draftEquipment}
            onChange={(event) => setDraftEquipment(event.target.value)}
            placeholder="Key instrumentation (comma or newline separated)"
            rows={2}
            className="w-full rounded-lg border border-border dark:border-[#c8a97e]/15 bg-card dark:bg-slate-950/60 px-3 py-2 text-sm text-foreground dark:text-white/80 shadow-sm outline-none transition focus:border-sky-400 dark:focus:border-[#c8a97e] focus:bg-card dark:focus:bg-white"
          />
          <div className="grid gap-2 md:grid-cols-2">
            <textarea
              value={draftTextureObjectives}
              onChange={(event) =>
                setDraftTextureObjectives(event.target.value)
              }
              placeholder="Texture objectives (comma or newline separated)"
              rows={2}
              className="w-full rounded-lg border border-border dark:border-[#c8a97e]/15 bg-card dark:bg-slate-950/60 px-3 py-2 text-sm text-foreground dark:text-white/80 shadow-sm outline-none transition focus:border-emerald-400 dark:focus:border-emerald-400 focus:bg-card dark:focus:bg-white"
            />
            <textarea
              value={draftFlavorConstellations}
              onChange={(event) =>
                setDraftFlavorConstellations(event.target.value)
              }
              placeholder="Flavor constellations (comma or newline separated)"
              rows={2}
              className="w-full rounded-lg border border-border dark:border-[#c8a97e]/15 bg-card dark:bg-slate-950/60 px-3 py-2 text-sm text-foreground dark:text-white/80 shadow-sm outline-none transition focus:border-rose-400 dark:focus:border-rose-400 focus:bg-card dark:focus:bg-white"
            />
          </div>
          <textarea
            value={draftFutureAngles}
            onChange={(event) => setDraftFutureAngles(event.target.value)}
            placeholder="Future-of-food angles (comma or newline separated)"
            rows={2}
            className="w-full rounded-lg border border-border dark:border-[#c8a97e]/15 bg-card dark:bg-slate-950/60 px-3 py-2 text-sm text-foreground dark:text-white/80 shadow-sm outline-none transition focus:border-indigo-400 dark:focus:border-indigo-400 focus:bg-card dark:focus:bg-white"
          />
          <div className="grid gap-2 md:grid-cols-2">
            <input
              value={draftTags}
              onChange={(event) => setDraftTags(event.target.value)}
              placeholder="Tags (comma separated)"
              className="rounded-lg border border-border dark:border-[#c8a97e]/15 bg-card dark:bg-slate-950/60 px-3 py-2 text-sm text-foreground dark:text-white/80 shadow-sm outline-none transition focus:border-sky-400 dark:focus:border-[#c8a97e] focus:bg-card dark:focus:bg-white"
            />
            <input
              value={draftLaunchWindow}
              onChange={(event) => setDraftLaunchWindow(event.target.value)}
              placeholder="Launch window or service"
              className="rounded-lg border border-border dark:border-[#c8a97e]/15 bg-card dark:bg-slate-950/60 px-3 py-2 text-sm text-foreground dark:text-white/80 shadow-sm outline-none transition focus:border-sky-400 dark:focus:border-[#c8a97e] focus:bg-card dark:focus:bg-white"
            />
          </div>
          <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.3em] text-muted-foreground dark:text-[#c8a97e]/80/70">
            <span>
              Use quick adds below or split entries with commas or new lines.
            </span>
            <button
              type="submit"
              disabled={isCreateDisabled}
              className={`rounded-full px-4 py-2 text-[11px] font-semibold transition ${
                isCreateDisabled
                  ? "cursor-not-allowed border border-border dark:border-[#c8a97e]/15 bg-muted dark:bg-slate-950/50 text-muted-foreground dark:text-[#c8a97e]/40"
                  : "border border-sky-400/50 bg-sky-500/80 text-white shadow-sm hover:bg-sky-500 dark:border-[#c8a97e]/50 dark:bg-amber-500/80"
              }`}
            >
              Add to bench
            </button>
          </div>
        </form>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-border dark:border-[#c8a97e]/15 bg-card dark:bg-slate-950/40 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-border dark:border-[#c8a97e]/15 px-4 py-3 text-[11px] uppercase tracking-[0.3em] text-muted-foreground dark:text-[#c8a97e]/60">
          <span>Active experiments</span>
          <span>{filtered.length}</span>
        </div>
        <div className="overflow-y-auto px-2 py-3 pr-1">
          {filtered.map((experiment) => {
            const isActive = experiment.id === focusExperimentId;
            return (
              <button
                key={experiment.id}
                type="button"
                onClick={() => setFocusExperiment(experiment.id)}
                className={cn(
                  "group relative flex w-full flex-col gap-2 rounded-xl border px-3 py-3 text-left transition",
                  isActive
                    ? "border-sky-400/60 bg-sky-500/10 text-foreground dark:text-white/80 shadow-[0_0_24px_rgba(56,189,248,0.35)] dark:border-[#c8a97e]/60 dark:bg-[#c8a97e]/12"
                    : "border-transparent bg-muted dark:bg-slate-900/40 text-foreground dark:text-[#c8a97e]/50 hover:border-accent dark:hover:border-[#c8a97e]/40 hover:bg-input dark:hover:text-amber-50",
                )}
              >
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.25em]">
                  <span>{experiment.status}</span>
                  <span>{experiment.lastUpdated}</span>
                </div>
                <div className="text-sm font-semibold tracking-tight">
                  {experiment.title}
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground dark:text-[#c8a97e]/80/70">
                  {experiment.hypothesis}
                </p>
                <div className="mt-1 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground dark:text-[#c8a97e]/50">
                  <span>Variables:</span>
                  {experiment.variablesUnderTest.slice(0, 3).map((variable) => (
                    <span
                      key={variable}
                      className="rounded-full border border-border dark:border-[#c8a97e]/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em]"
                    >
                      {variable}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.35em] text-muted-foreground dark:text-[#c8a97e]/60">
                  {experiment.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-muted dark:bg-[#c8a97e]/08 px-2 py-1"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-muted-foreground dark:text-[#c8a97e]/80/70">
                  <span>Lead: {experiment.owner}</span>
                  <span>Launch: {experiment.launchWindow}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-border dark:border-[#c8a97e]/20 bg-muted dark:bg-slate-950/60 p-4 text-xs leading-relaxed text-foreground backdrop-blur dark:text-white/80/80">
        <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-foreground dark:text-[#c8a97e]/80">
          Texture Reference Index
        </div>
        <div className="space-y-3">
          {textureAtlas.map((texture) => (
            <div
              key={texture.id}
              className="rounded-xl border border-border dark:border-[#c8a97e]/15 bg-input dark:bg-amber-500/5 p-3"
            >
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.35em] text-muted-foreground dark:text-[#c8a97e]/80/70">
                <span>{texture.family}</span>
                <span>{texture.descriptors.join(" • ")}</span>
              </div>
              <div className="mt-2 text-[13px] font-semibold uppercase tracking-[0.35em] text-foreground dark:text-white/80">
                Pairing Targets
              </div>
              <div className="mt-1 text-[12px] leading-relaxed text-foreground dark:text-white/80/80">
                {texture.idealPairings.join(", ")}
              </div>
              <div className="mt-2 text-[12px] font-semibold uppercase tracking-[0.35em] text-muted-foreground dark:text-[#c8a97e]/80/70">
                Techniques
              </div>
              <div className="text-[12px] text-foreground dark:text-[#c8a97e]/80/80">
                {texture.suggestedTechniques.join(" · ")}
              </div>
              {texture.platingNotes ? (
                <div className="mt-2 text-[11px] italic text-muted-foreground/80 dark:text-[#c8a97e]/80/70">
                  {texture.platingNotes}
                </div>
              ) : null}
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    pushDraftLine(
                      setDraftTextureObjectives,
                      `${texture.family}: ${texture.descriptors.join(" / ")} finish`,
                    )
                  }
                  className="rounded-full border border-border dark:border-[#c8a97e]/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground dark:text-[#c8a97e]/80/80 transition hover:border-accent dark:hover:border-[#c8a97e] hover:text-foreground dark:hover:text-amber-50"
                >
                  Add texture cue
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-border dark:border-[#c8a97e]/20 bg-muted dark:bg-slate-950/60 p-4 text-xs leading-relaxed text-foreground backdrop-blur dark:text-white/80/80">
        <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-foreground dark:text-[#c8a97e]/80">
          Flavor Constellation Library
        </div>
        <div className="space-y-3">
          {flavorConstellationLibrary.map((constellation) => (
            <div
              key={constellation.id}
              className="rounded-xl border border-border dark:border-[#c8a97e]/15 bg-input dark:bg-amber-500/5 p-3"
            >
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.35em] text-muted-foreground dark:text-[#c8a97e]/80/70">
                <span>{constellation.name}</span>
                <span>{constellation.futureAngle}</span>
              </div>
              <div className="mt-2 text-[12px] font-semibold uppercase tracking-[0.35em] text-foreground dark:text-white/80">
                Texture hook
              </div>
              <p className="text-[12px] text-foreground dark:text-white/80/80">
                {constellation.textureHook}
              </p>
              <div className="mt-2 text-[12px] font-semibold uppercase tracking-[0.35em] text-foreground dark:text-[#c8a97e]/80/80">
                Flavor drivers
              </div>
              <ul className="mt-1 space-y-1 text-[12px] text-foreground dark:text-white/80/80">
                {constellation.flavorDrivers.map((driver) => (
                  <li key={driver}>{driver}</li>
                ))}
              </ul>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    pushDraftLine(
                      setDraftFlavorConstellations,
                      `${constellation.name}: ${constellation.flavorDrivers.slice(0, 2).join(" + ")}`,
                    )
                  }
                  className="rounded-full border border-border dark:border-[#c8a97e]/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground dark:text-[#c8a97e]/80/80 transition hover:border-accent dark:hover:border-[#c8a97e] hover:text-foreground dark:hover:text-amber-50"
                >
                  Add constellation
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-border dark:border-[#c8a97e]/20 bg-muted dark:bg-slate-950/60 p-4 text-xs leading-relaxed text-foreground backdrop-blur dark:text-white/80/80">
        <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-foreground dark:text-[#c8a97e]/80">
          Future-of-Food Drivers
        </div>
        <div className="space-y-3">
          {futureFoodDrivers.map((driver) => (
            <div
              key={driver.id}
              className="rounded-xl border border-border dark:border-[#c8a97e]/15 bg-input dark:bg-amber-500/5 p-3"
            >
              <div className="text-[12px] font-semibold uppercase tracking-[0.35em] text-foreground dark:text-white/80">
                {driver.theme}
              </div>
              <p className="mt-1 text-[12px] text-foreground dark:text-white/80/80">
                {driver.insight}
              </p>
              <div className="mt-2 text-[11px] italic text-muted-foreground dark:text-[#c8a97e]/80/70">
                {driver.signal}
              </div>
              <div className="mt-2 text-[11px] text-foreground dark:text-white/80">
                <strong>Action:</strong> {driver.action}
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    pushDraftLine(
                      setDraftFutureAngles,
                      `${driver.theme}: ${driver.insight}`,
                    )
                  }
                  className="rounded-full border border-border dark:border-[#c8a97e]/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground dark:text-[#c8a97e]/80/80 transition hover:border-accent dark:hover:border-[#c8a97e] hover:text-foreground dark:hover:text-amber-50"
                >
                  Add driver
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
