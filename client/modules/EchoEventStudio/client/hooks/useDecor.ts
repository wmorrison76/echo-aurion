import { useEffect, useState } from "react";
export interface DecorData {
  palette: string[];
  materials: string[];
}
export function useDecor(session: string): DecorData | null {
  const [data, setData] = useState<DecorData | null>(null);
  useEffect(() => {
    const fetchDecor = async () => {
      try {
        const response = await fetch("/api/decor/recognize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session }),
        });
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (err) {
        console.error("Failed to fetch decor data:", err);
      }
    };
    if (session) {
      fetchDecor();
    }
  }, [session]);
  return data;
}
