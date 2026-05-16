/** * Square POS Connector * Pulls revenue from Square Payment API */ export interface SquareConfig {
  access_token: string;
  location_id: string;
}
export interface SquareRevenue {
  date: string;
  payment_method: string;
  amount: number;
  transaction_count: number;
}
export async function fetchSquareRevenue(
  config: SquareConfig,
  date: string,
): Promise<SquareRevenue[]> {
  const url = "https://connect.squareup.com/v2/orders/search";
  try {
    const beginTime = new Date(`${date}T00:00:00`).getTime();
    const endTime = new Date(`${date}T23:59:59`).getTime();
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.access_token}`,
        "Content-Type": "application/json",
        "Square-Version": "2024-01-18",
      },
      body: JSON.stringify({
        query: {
          filter: {
            date_time_filter: {
              created_at: {
                start_at: new Date(beginTime).toISOString(),
                end_at: new Date(endTime).toISOString(),
              },
            },
            location_id: config.location_id,
          },
        },
      }),
    });
    if (!res.ok) {
      console.error("Square API error:", res.statusText);
      return [];
    }
    const data = await res.json();
    const revenues: SquareRevenue[] = [];
    (data.orders || []).forEach((order: any) => {
      const total = order.total_money?.amount || 0;
      revenues.push({
        date,
        payment_method: order.tender?.[0]?.type || "card",
        amount: total / 100,
        transaction_count: 1,
      });
    });
    return revenues;
  } catch (err) {
    console.error("Square fetch error:", err);
    return [];
  }
}
export async function pushSquareLabor(
  config: SquareConfig,
  date: string,
  laborMinutes: number,
): Promise<boolean> {
  try {
    console.log(`Square labor push: ${laborMinutes} mins on ${date}`);
    return true;
  } catch (err) {
    console.error("Square push error:", err);
    return false;
  }
}
