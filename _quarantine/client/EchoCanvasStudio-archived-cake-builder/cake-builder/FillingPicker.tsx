import * as React from "react";
import { cn } from "@/lib/utils";

export type FillingOption = {
  id: string;
  label: string;
  img: string;
};

const OPTIONS: FillingOption[] = [
  { id: "vanilla-buttercream", label: "Vanilla Buttercream", img: "https://cdn.builder.io/api/v1/image/assets%2Faccc7891edf04665961a321335d9540b%2Fc8b49cd4e9c94a2bb11bd51b63496952?format=webp&width=600" },
  { id: "strawberry-jam", label: "Strawberry Jam", img: "https://cdn.builder.io/api/v1/image/assets%2Faccc7891edf04665961a321335d9540b%2F8fbc0edcb2ec4563b925e099047927f8?format=webp&width=600" },
];

export default function FillingPicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const toggle = (id: string) => {
    const set = new Set(value);
    if (set.has(id)) set.delete(id); else set.add(id);
    onChange(Array.from(set));
  };
  return (
    <div className="grid grid-cols-2 gap-2">
      {OPTIONS.map((opt) => {
        const active = value.includes(opt.id);
        return (
          <button key={opt.id} type="button" onClick={() => toggle(opt.id)}
            className={cn("border rounded-md overflow-hidden text-left", active ? "ring-2 ring-primary" : "")}
          >
            <img src={opt.img} alt={opt.label} className="w-full h-20 object-cover" />
            <div className="px-2 py-1 text-xs">{opt.label}</div>
          </button>
        );
      })}
    </div>
  );
}
