/** * POS System Connectors * Integrations for Toast, Square, and Lightspeed POS systems * Pulls daily sales, tips, and guest count data */ import axios from "axios";
const TOAST_URL = "https://api.toasttab.com";
const SQUARE_URL = "https://connect.squareup.com/v2";
const LIGHTSPEED_URL = "https://api.lightspeedapp.com/API/Account";
export interface POSData {
  outlet: string;
  date: string;
  revenue: number;
  tips: number;
  covers?: number;
} /** * Pull data from Toast POS */
export async function pullToast(org_id: string): Promise<POSData[]> {
  const token = process.env.TOAST_API_TOKEN;
  if (!token) {
    console.warn("Toast API token not configured");
    return [];
  }
  try {
    const response = await axios.get(`${TOAST_URL}/reports/netSales`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      params: {
        startDate: new Date(Date.now() - 86400000).toISOString().split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
      },
    });
    return (response.data.items || []).map((item: any) => ({
      outlet: item.restaurantId || "default",
      date: item.businessDate,
      revenue: item.netSales || 0,
      tips: item.creditTips || 0,
      covers: item.covers || undefined,
    }));
  } catch (error) {
    console.error("Toast API error:", error);
    return [];
  }
} /** * Pull data from Square */
export async function pullSquare(org_id: string): Promise<POSData[]> {
  const token = process.env.SQUARE_API_TOKEN;
  if (!token) {
    console.warn("Square API token not configured");
    return [];
  }
  try {
    const response = await axios.get(`${SQUARE_URL}/payments`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      params: {
        begin_time: new Date(Date.now() - 86400000 * 7)
          .toISOString()
          .replace(/\D/g, "")
          .slice(0, 15),
      },
    });
    const paymentsByDate = new Map<string, any>();
    (response.data.payments || []).forEach((payment: any) => {
      const date = payment.created_at.slice(0, 10);
      const key = `${date}`;
      if (!paymentsByDate.has(key)) {
        paymentsByDate.set(key, {
          revenue: 0,
          tips: 0,
          outlet: payment.location_id || "default",
        });
      }
      const entry = paymentsByDate.get(key);
      entry.revenue += (payment.amount_money?.amount || 0) / 100;
      entry.tips += (payment.tip_money?.amount || 0) / 100;
    });
    return Array.from(paymentsByDate.entries()).map(([date, data]) => ({
      outlet: data.outlet,
      date,
      revenue: data.revenue,
      tips: data.tips,
    }));
  } catch (error) {
    console.error("Square API error:", error);
    return [];
  }
} /** * Pull data from Lightspeed */
export async function pullLightspeed(org_id: string): Promise<POSData[]> {
  const token = process.env.LIGHTSPEED_API_TOKEN;
  const accountId = process.env.LIGHTSPEED_ACCOUNT_ID;
  if (!token || !accountId) {
    console.warn("Lightspeed credentials not configured");
    return [];
  }
  try {
    const response = await axios.get(
      `${LIGHTSPEED_URL}/${accountId}/Sale.json`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        params: {
          load_relations: ["Employee", "Register"],
          limit: 500,
          offset: 0,
        },
      },
    );
    const salesByDate = new Map<string, any>();
    (response.data.Sale || []).forEach((sale: any) => {
      const date =
        sale.completedTime?.slice(0, 10) ||
        new Date().toISOString().slice(0, 10);
      const key = date;
      if (!salesByDate.has(key)) {
        salesByDate.set(key, {
          revenue: 0,
          tips: 0,
          outlet: sale.registerID || "default",
        });
      }
      const entry = salesByDate.get(key);
      entry.revenue += parseFloat(sale.total || "0");
      entry.tips += parseFloat(sale.tipAmount || "0");
    });
    return Array.from(salesByDate.entries()).map(([date, data]) => ({
      outlet: data.outlet,
      date,
      revenue: data.revenue,
      tips: data.tips,
    }));
  } catch (error) {
    console.error("Lightspeed API error:", error);
    return [];
  }
}
