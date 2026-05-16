import { useEffect, useState } from "react";

interface Props {
  weekStartISO: string;
}

export default function Notes({ weekStartISO }: Props) {
  const key = `shiftflow:notes:${weekStartISO}`;
  const [value, setValue] = useState("");
  useEffect(() => {
    const v = localStorage.getItem(key) ?? "";
    setValue(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartISO]);

  useEffect(() => {
    localStorage.setItem(key, value);
  }, [key, value]);

  return (
    <div className="glass-panel p-3">
      <textarea
        className="w-full h-20 rounded-md border bg-background/60 p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        placeholder="Reminders, holidays, break policy, etc."
        value={value}
        onChange={(e)=>setValue(e.target.value)}
      />
    </div>
  );
}
