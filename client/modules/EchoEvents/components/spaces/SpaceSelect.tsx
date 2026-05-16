import React, { useEffect, useMemo, useState } from "react";

type SpaceOption = {
  id: string;
  name: string;
  capacity?: number;
  setup_time_minutes?: number;
  teardown_time_minutes?: number;
};

interface SpaceSelectProps {
  outletId?: string;
  value: SpaceOption | null;
  onChange: (space: SpaceOption | null) => void;
}

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

function fallbackSpaces(outletId?: string): SpaceOption[] {
  if (outletId === "banquet-ballroom") {
    return [
      { id: "ballroom-a", name: "Ballroom A" },
      { id: "ballroom-b", name: "Ballroom B" },
    ];
  }
  if (outletId === "restaurant-main") {
    return [
      { id: "dining-room", name: "Dining Room" },
      { id: "terrace", name: "Terrace" },
    ];
  }
  return [
    { id: "main-space", name: "Main Space" },
    { id: "secondary-space", name: "Secondary Space" },
  ];
}

export const SpaceSelect: React.FC<SpaceSelectProps> = ({
  outletId,
  value,
  onChange,
}) => {
  const [spaces, setSpaces] = useState<SpaceOption[]>(fallbackSpaces(outletId));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!outletId) {
        setSpaces(fallbackSpaces(undefined));
        return;
      }

      // Rooms API currently expects outlet_id to be a UUID. If this outlet id
      // isn't a UUID (e.g. "main"), fall back to local placeholders.
      if (!isUuid(outletId)) {
        setSpaces(fallbackSpaces(outletId));
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(
          `/api/rooms?outlet_id=${encodeURIComponent(outletId)}`,
          {
            headers: { "Content-Type": "application/json" },
          },
        );
        const json = await res.json();
        const list = Array.isArray(json?.rooms) ? json.rooms : [];
        const mapped: SpaceOption[] = list.map((room: any) => ({
          id: String(room.id),
          name: String(room.name ?? room.id),
          capacity:
            typeof room.capacity === "number" ? room.capacity : undefined,
          setup_time_minutes:
            typeof room.setup_time_minutes === "number"
              ? room.setup_time_minutes
              : undefined,
          teardown_time_minutes:
            typeof room.teardown_time_minutes === "number"
              ? room.teardown_time_minutes
              : undefined,
        }));

        if (!cancelled && mapped.length > 0) setSpaces(mapped);
        if (!cancelled && mapped.length === 0)
          setSpaces(fallbackSpaces(outletId));
      } catch {
        if (!cancelled) setSpaces(fallbackSpaces(outletId));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [outletId]);

  const options = useMemo(() => spaces, [spaces]);
  const selectedId = value?.id ?? "";

  return (
    <div>
      <label className="block text-xs font-medium mb-1">
        Space{loading ? " (loading…)" : ""}
      </label>
      <select
        className="w-full border rounded px-2 py-1 text-sm"
        value={selectedId}
        onChange={(e) => {
          const id = e.target.value;
          if (!id) return onChange(null);
          const found = options.find((o) => o.id === id);
          return onChange(found ?? null);
        }}
      >
        <option value="">Select space…</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
};
