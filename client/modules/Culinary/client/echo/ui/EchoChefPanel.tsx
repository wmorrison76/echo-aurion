import React, { useState } from "react";
import type {
  ChefBrainSuggestion,
  ServiceContext,
} from "../brain/echoChefBrain";
import type { GeneratedRecipe } from "../services/llmProvider";

interface EchoChefPanelProps {
  apiEndpoint?: string;
  defaultMode?: "suggest" | "generate";
}

interface ApiResponseSuggest {
  mode: "suggest";
  suggestions: ChefBrainSuggestion[];
  generationError?: string;
}

interface ApiResponseGenerate {
  mode: "generate";
  suggestions: ChefBrainSuggestion[];
  recipeDraft: GeneratedRecipe;
  neighbors: any[];
}

type ApiResponse = ApiResponseSuggest | ApiResponseGenerate;

const SERVICE_OPTIONS: { value: ServiceContext; label: string }[] = [
  { value: "a_la_carte", label: "À la carte" },
  { value: "banquet_plated", label: "Banquet – Plated" },
  { value: "banquet_buffet", label: "Banquet – Buffet" },
  { value: "reception", label: "Reception / Passed" },
  { value: "room_service", label: "Room Service" },
];

const HOLDING_METHODS = [
  { value: "pass_plate", label: "Pass Plate" },
  { value: "hotel_pan", label: "Hotel Pan" },
  { value: "hot_box", label: "Hot Box" },
  { value: "room_temp_pass", label: "Room Temp Pass" },
  { value: "action_station", label: "Action Station" },
];

export const EchoChefPanel: React.FC<EchoChefPanelProps> = ({
  apiEndpoint = "/api/echo-chef",
  defaultMode = "suggest",
}) => {
  const [prompt, setPrompt] = useState("");
  const [dietaryTags, setDietaryTags] = useState<string[]>([]);
  const [serviceContext, setServiceContext] =
    useState<ServiceContext>("banquet_plated");
  const [guestCount, setGuestCount] = useState<number | undefined>(200);
  const [holdingMethod, setHoldingMethod] = useState<
    | "pass_plate"
    | "hotel_pan"
    | "hot_box"
    | "room_temp_pass"
    | "action_station"
    | undefined
  >("hotel_pan");
  const [courseName, setCourseName] = useState("");
  const [mode, setMode] = useState<"suggest" | "generate">(defaultMode);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ChefBrainSuggestion[]>([]);
  const [recipeDraft, setRecipeDraft] = useState<GeneratedRecipe | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleTag = (tag: string) => {
    setDietaryTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setRecipeDraft(null);

    try {
      const body = {
        userPrompt: prompt,
        dietaryTags,
        serviceContext,
        guestCount,
        holdingMethod,
        courseName: courseName || undefined,
        mode,
      };

      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`Request failed with ${res.status}`);
      }

      const data = (await res.json()) as ApiResponse;
      setSuggestions(data.suggestions || []);

      if (data.mode === "generate" && "recipeDraft" in data) {
        setRecipeDraft(data.recipeDraft);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-4 text-white">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
        <div>
          <h2 className="text-xl font-semibold">EchoChef · Banquet Brain</h2>
          <p className="text-xs text-white/60">
            Menu intelligence for banquet service, buffet, à la carte, and more.
            Queries your Pinecone recipe knowledge base.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-white/60">Mode:</span>
          <button
            type="button"
            onClick={() => setMode("suggest")}
            className={`px-2 py-1 rounded-full border text-xs ${
              mode === "suggest"
                ? "bg-[#c8a97e] text-black border-[#c8a97e]/80"
                : "bg-white/5 text-white/70 border-white/20"
            }`}
          >
            Suggestions
          </button>
          <button
            type="button"
            onClick={() => setMode("generate")}
            className={`px-2 py-1 rounded-full border text-xs ${
              mode === "generate"
                ? "bg-[#c8a97e] text-black border-[#c8a97e]/80"
                : "bg-white/5 text-white/70 border-white/20"
            }`}
          >
            + Draft
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs uppercase tracking-wide text-white/60 mb-1">
            What are you serving?
          </label>
          <textarea
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a97e]/60"
            rows={3}
            placeholder="e.g. Main course for 200 guests, gluten-free option, needs to hold 45 minutes in hot box before service..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-white/60 mb-1">
              Service Context
            </label>
            <select
              className="w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a97e]/60"
              value={serviceContext}
              onChange={(e) =>
                setServiceContext(e.target.value as ServiceContext)
              }
            >
              {SERVICE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wide text-white/60 mb-1">
              Guest Count
            </label>
            <input
              type="number"
              min={1}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a97e]/60"
              value={guestCount ?? ""}
              onChange={(e) =>
                setGuestCount(
                  e.target.value ? parseInt(e.target.value, 10) : undefined,
                )
              }
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wide text-white/60 mb-1">
              Holding Method
            </label>
            <select
              className="w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a97e]/60"
              value={holdingMethod || ""}
              onChange={(e) =>
                setHoldingMethod((e.target.value as any) || undefined)
              }
            >
              <option value="">Select holding method</option>
              {HOLDING_METHODS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wide text-white/60 mb-1">
              Course Name
            </label>
            <input
              type="text"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a97e]/60"
              placeholder="e.g. Main Course, First Course"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-[11px] uppercase tracking-wide text-white/60 mb-1">
              Dietary Filters
            </label>
            <div className="flex flex-wrap gap-1">
              {[
                "gluten_free",
                "vegetarian",
                "vegan",
                "dairy_free",
                "nut_free",
              ].map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2 py-1 rounded-full border text-[11px] ${
                    dietaryTags.includes(tag)
                      ? "bg-amber-500/80 border-[#c8a97e] text-black"
                      : "bg-white/5 border-white/20 text-white/80 hover:bg-white/10"
                  }`}
                >
                  {tag.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="px-4 py-2 rounded-full text-xs font-medium bg-[#c8a97e] hover:bg-[#c8a97e] text-black disabled:bg-white/10 disabled:text-white/40 transition"
          >
            {isLoading
              ? "Echo is thinking..."
              : mode === "generate"
                ? "Ask Echo & Generate Recipe"
                : "Ask Echo for Suggestions"}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-3 text-xs text-red-300 bg-red-900/30 border border-red-500/40 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-semibold text-white">Echo Suggestions</h3>
          {suggestions.map((s, idx) => (
            <div
              key={idx}
              className="rounded-xl bg-white/5 border border-white/10 p-3"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wide text-white/50 font-semibold">
                  {s.type === "existing_recipe"
                    ? "✓ Existing Recipe"
                    : s.type === "variation"
                      ? "⚡ Echo Variation"
                      : "✨ New Concept"}
                </span>
                {s.beoNotes && (
                  <div className="text-[10px] text-white/60 text-right space-y-0.5">
                    {s.beoNotes.course && <div>{s.beoNotes.course}</div>}
                    {s.beoNotes.stationName && (
                      <div>Station: {s.beoNotes.stationName}</div>
                    )}
                  </div>
                )}
              </div>
              <h4 className="text-sm font-semibold mb-1">{s.title}</h4>
              <p className="text-white/80 text-xs mb-2">{s.description}</p>

              {s.recommendedChanges && s.recommendedChanges.length > 0 && (
                <ul className="list-disc pl-4 text-white/70 text-xs mb-2">
                  {s.recommendedChanges.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              )}

              {s.serviceNotes && (
                <p className="text-[11px] text-white/60 italic border-l border-[#c8a97e]/40 pl-2">
                  {s.serviceNotes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {recipeDraft && (
        <div className="mt-6 rounded-2xl bg-gradient-to-br from-[#c8a97e]/30/20 to-white/5 border border-[#c8a97e]/40 p-4">
          <h3 className="text-sm font-semibold mb-2">
            📋 Echo Recipe Draft · {recipeDraft.title}
          </h3>
          <p className="text-white/80 text-xs mb-3">
            {recipeDraft.description}
          </p>

          <div className="flex items-center gap-4 text-xs text-white/70 mb-3 pb-3 border-b border-white/10">
            <span>
              <strong>Yield:</strong> {recipeDraft.yield.amount}{" "}
              {recipeDraft.yield.unit}
              {recipeDraft.yield.perGuest ? " (per guest)" : ""}
            </span>
            {recipeDraft.serviceContext && (
              <span>
                <strong>Service:</strong> {recipeDraft.serviceContext}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="font-semibold text-xs mb-2 text-[#c8a97e]">
                Ingredients
              </h4>
              <ul className="space-y-1 text-xs">
                {recipeDraft.ingredients.map((ing, i) => (
                  <li key={i} className="text-white/80">
                    {ing.section && (
                      <span className="text-white/50 mr-1">
                        [{ing.section}]
                      </span>
                    )}
                    <span>
                      {ing.quantity} {ing.unit} {ing.name}
                      {ing.notes ? (
                        <span className="text-white/60 ml-1">
                          ({ing.notes})
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-xs mb-2 text-[#c8a97e]">
                Steps
              </h4>
              <ol className="space-y-1 list-decimal pl-5 text-xs">
                {recipeDraft.steps.map((step, i) => (
                  <li key={i} className="text-white/80">
                    {step.instruction}
                    {step.timingMinutes && (
                      <span className="text-white/60 ml-1">
                        ({step.timingMinutes} min)
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {recipeDraft.miseEnPlace && recipeDraft.miseEnPlace.length > 0 && (
            <div className="mb-3">
              <h4 className="font-semibold text-xs mb-1 text-[#c8a97e]">
                Mise en Place
              </h4>
              <p className="text-xs text-white/80">
                {recipeDraft.miseEnPlace.join(" • ")}
              </p>
            </div>
          )}

          {recipeDraft.holdingGuidelines &&
            recipeDraft.holdingGuidelines.length > 0 && (
              <div className="mb-3 bg-white/5 rounded-lg p-2">
                <h4 className="font-semibold text-xs mb-1 text-yellow-300">
                  ⏱️ Holding Guidelines
                </h4>
                <ul className="list-disc pl-4 text-xs text-white/80 space-y-0.5">
                  {recipeDraft.holdingGuidelines.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </div>
            )}

          {recipeDraft.platingNotes && (
            <p className="text-xs text-white/70 border-l-2 border-[#c8a97e]/60 pl-2">
              <strong className="text-[#c8a97e]">Plating Notes:</strong>{" "}
              {recipeDraft.platingNotes}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
