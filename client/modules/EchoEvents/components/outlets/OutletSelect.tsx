import React, { useEffect, useMemo, useState } from "react";

type OutletOption = {
  id: string;
  name: string;
  location?: string;
  timezone?: string;
};

interface OutletSelectProps {
  value: OutletOption | null;
  onChange: (outlet: OutletOption | null) => void;
}

const FALLBACK_OUTLETS: OutletOption[] = [
  { id: "restaurant-main", name: "Restaurant - Main" },
  { id: "banquet-ballroom", name: "Banquet - Ballroom" },
];

export const OutletSelect: React.FC<OutletSelectProps> = ({
  value,
  onChange,
}) => {
  const [outlets, setOutlets] = useState<OutletOption[]>(FALLBACK_OUTLETS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/outlets", {
          headers: { "Content-Type": "application/json" },
        });
        const json = await res.json();
        const list: OutletOption[] = Array.isArray(json?.outlets)
          ? json.outlets
          : [];
        if (!cancelled && list.length > 0) setOutlets(list);
      } catch {
        // Keep fallback outlets
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedId = value?.id ?? "";
  const options = useMemo(() => outlets, [outlets]);

  return (
    <div>
      <label className="block text-xs font-medium mb-1">
        Outlet{loading ? " (loading…)" : ""}
      </label>
      <select
        className="w-full border rounded px-2 py-1 text-sm"
        value={selectedId}
        onChange={(e) => {
          const id = e.target.value;
          if (!id) return onChange(null);
          const found = options.find((o) => o.id === id);
          return onChange(found ?? { id, name: id });
        }}
      >
        <option value="">Select outlet…</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
};
