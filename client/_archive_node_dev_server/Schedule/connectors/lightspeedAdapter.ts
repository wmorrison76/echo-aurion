/** * Lightspeed POS Connector * Pulls revenue from Lightspeed Restaurant API */ export interface LightspeedConfig {
  api_key: string;
  merchant_id: string;
  base_url?: string;
}
export interface LightspeedRevenue {
  date: string;
  register: string;
  amount: number;
  transaction_count: number;
}
export async function fetchLightspeedRevenue(
  config: LightspeedConfig,
  date: string,
): Promise<LightspeedRevenue[]> {
  const baseUrl = config.base_url || "https://api.lightspeedapp.com";
  const url = `${baseUrl}/restaurant/1.0/merchants/${config.merchant_id}/sales?date=${date}`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.api_key}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      console.error("Lightspeed API error:", res.statusText);
      return [];
    }
    const data = await res.json();
    return (data.sales || []).map((s: any) => ({
      date,
      register: s.register_id || "default",
      amount: Number(s.gross_sales || 0),
      transaction_count: s.transaction_count || 0,
    }));
  } catch (err) {
    console.error("Lightspeed fetch error:", err);
    return [];
  }
}
export async function pushLightspeedLabor(
  config: LightspeedConfig,
  date: string,
  laborMinutes: number,
): Promise<boolean> {
  const baseUrl = config.base_url || "https://api.lightspeedapp.com";
  const url = `${baseUrl}/restaurant/1.0/merchants/${config.merchant_id}/labor`;
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
    console.error("Lightspeed push error:", err);
    return false;
  }
}
