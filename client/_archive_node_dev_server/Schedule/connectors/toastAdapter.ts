/** * Toast POS Connector * Pulls revenue and item mix from Toast API */ export interface ToastConfig {
  api_key: string;
  location_id: string;
  base_url?: string;
}
export interface ToastRevenue {
  date: string;
  service: string;
  amount: number;
  item_count: number;
}
export async function fetchToastRevenue(
  config: ToastConfig,
  date: string,
): Promise<ToastRevenue[]> {
  const baseUrl = config.base_url || "https://api.toasttab.com";
  const url = `${baseUrl}/v1/locations/${config.location_id}/revenue?date=${date}`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.api_key}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      console.error("Toast API error:", res.statusText);
      return [];
    }
    const data = await res.json();
    return (data.revenues || []).map((r: any) => ({
      date: r.date,
      service: r.service || "dining",
      amount: Number(r.totalAmount || 0),
      item_count: r.itemCount || 0,
    }));
  } catch (err) {
    console.error("Toast fetch error:", err);
    return [];
  }
}
export async function pushToastLabor(
  config: ToastConfig,
  date: string,
  laborMinutes: number,
): Promise<boolean> {
  const baseUrl = config.base_url || "https://api.toasttab.com";
  const url = `${baseUrl}/v1/locations/${config.location_id}/labor`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ date, labor_minutes: laborMinutes }),
    });
    return res.ok;
  } catch (err) {
    console.error("Toast push error:", err);
    return false;
  }
}
