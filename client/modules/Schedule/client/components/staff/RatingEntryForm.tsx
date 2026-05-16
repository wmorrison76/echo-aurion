import React from "react";
import { Button } from "@/components/ui/button"; // Builder.io widget registration
export const RatingEntryForm: React.FC<{
  employee_id: string;
  outlet_id: string;
  shift_date: string;
  onSaved?: () => void;
}> = ({ employee_id, outlet_id, shift_date, onSaved }) => {
  const [punctuality, setP] = React.useState(5);
  const [quality, setQ] = React.useState(5);
  const [teamwork, setT] = React.useState(5);
  const [guest, setG] = React.useState<number | undefined>(undefined);
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  async function save() {
    setSaving(true);
    try {
      await fetch("/api/staff/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id,
          outlet_id,
          shift_date,
          punctuality,
          quality,
          teamwork,
          guest_feedback: guest,
          notes,
        }),
      });
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="bg-gray-900 text-white rounded-2xl p-4 space-y-2">
      {" "}
      <div className="font-semibold">Post-Shift Rating</div>{" "}
      <div className="grid grid-cols-2 gap-3">
        {" "}
        {[
          ["Punctuality", punctuality, setP],
          ["Quality", quality, setQ],
          ["Teamwork", teamwork, setT],
        ].map(([label, val, setter]: any) => (
          <label key={label} className="text-sm">
            {" "}
            <div className="text-gray-300">{label}</div>{" "}
            <input
              type="range"
              min={1}
              max={5}
              value={val}
              onChange={(e) => setter(Number(e.target.value))}
              className="w-full"
            />{" "}
          </label>
        ))}{" "}
        <label className="text-sm">
          {" "}
          <div className="text-gray-300">Guest Feedback (optional)</div>{" "}
          <input
            type="number"
            min={1}
            max={5}
            value={guest ?? ""}
            onChange={(e) =>
              setG(e.target.value ? Number(e.target.value) : undefined)
            }
            className="bg-gray-800 rounded px-2 py-1 w-full"
          />{" "}
        </label>{" "}
        <label className="col-span-2 text-sm">
          {" "}
          <div className="text-gray-300">Notes</div>{" "}
          <textarea
            className="bg-gray-800 rounded px-2 py-1 w-full"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />{" "}
        </label>{" "}
      </div>{" "}
      <Button
        onClick={save}
        disabled={saving}
        className="bg-primary hover:opacity-90 rounded-xl px-3 py-2 text-sm"
      >
        {" "}
        {saving ? "Saving…" : "Save Rating"}{" "}
      </Button>{" "}
    </div>
  );
};

// Builder widget registration (no hooks at module scope)
if (typeof window !== "undefined") {
  try {
    (window as any)?.LUCCCA?.registerWidget?.(
      "RatingEntryForm",
      RatingEntryForm,
    );
  } catch {
    // ignore
  }
}
