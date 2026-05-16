/** * Data Pipeline Service * Orchestrates data ingestion from multiple POS systems into property_summary * Handles validation, error recovery, and audit logging */ import { supabase } from "../lib/db";
import { fetchSquareRevenue, SquareConfig } from "../connectors/squareAdapter";
import { fetchToastRevenue, ToastConfig } from "../connectors/toastAdapter";
import {
  fetchLightspeedRevenue,
  LightspeedConfig,
} from "../connectors/lightspeedAdapter";
export interface PropertySummaryData {
  org_id: string;
  outlet_id: string;
  report_date: string;
  labor_cost: number;
  revenue: number;
  tips: number;
}
export interface DataPipelineConfig {
  org_id: string;
  outlet_id: string;
  pos_system: "square" | "toast" | "lightspeed" | "manual";
  pos_config?: SquareConfig | ToastConfig | LightspeedConfig;
}
export interface PipelineResult {
  success: boolean;
  records_processed: number;
  records_failed: number;
  errors: string[];
  data: PropertySummaryData[];
}
export async function validatePropertySummaryData(
  data: PropertySummaryData,
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  if (!data.org_id || data.org_id.trim() === "") {
    errors.push("org_id is required");
  }
  if (!data.outlet_id || data.outlet_id.trim() === "") {
    errors.push("outlet_id is required");
  }
  if (!data.report_date || !/^\d{4}-\d{2}-\d{2}$/.test(data.report_date)) {
    errors.push("report_date must be in YYYY-MM-DD format");
  }
  if (typeof data.labor_cost !== "number" || data.labor_cost < 0) {
    errors.push("labor_cost must be a non-negative number");
  }
  if (typeof data.revenue !== "number" || data.revenue < 0) {
    errors.push("revenue must be a non-negative number");
  }
  if (typeof data.tips !== "number" || data.tips < 0) {
    errors.push("tips must be a non-negative number");
  }
  return { valid: errors.length === 0, errors };
}
export async function ingestFromSquare(
  config: DataPipelineConfig,
  date: string,
  laborCost: number,
): Promise<PipelineResult> {
  const result: PipelineResult = {
    success: false,
    records_processed: 0,
    records_failed: 0,
    errors: [],
    data: [],
  };
  try {
    if (!config.pos_config || !("access_token" in config.pos_config)) {
      result.errors.push("Square configuration missing");
      return result;
    }
    const squareConfig = config.pos_config as SquareConfig;
    const revenues = await fetchSquareRevenue(squareConfig, date);
    let totalRevenue = 0;
    revenues.forEach((rev) => {
      totalRevenue += rev.amount;
    });
    const data: PropertySummaryData = {
      org_id: config.org_id,
      outlet_id: config.outlet_id,
      report_date: date,
      labor_cost: laborCost,
      revenue: totalRevenue,
      tips: 0,
    };
    const validation = await validatePropertySummaryData(data);
    if (!validation.valid) {
      result.records_failed++;
      result.errors.push(`Validation failed: ${validation.errors.join(",")}`);
      return result;
    }
    const { error } = await supabase
      .from("property_summary")
      .insert([data])
      .select();
    if (error) {
      result.records_failed++;
      result.errors.push(`Database insert failed: ${error.message}`);
      return result;
    }
    result.records_processed++;
    result.data.push(data);
    result.success = true;
  } catch (err) {
    result.errors.push(`Square ingestion error: ${String(err)}`);
  }
  return result;
}
export async function ingestFromToast(
  config: DataPipelineConfig,
  date: string,
  laborCost: number,
): Promise<PipelineResult> {
  const result: PipelineResult = {
    success: false,
    records_processed: 0,
    records_failed: 0,
    errors: [],
    data: [],
  };
  try {
    if (!config.pos_config || !("api_key" in config.pos_config)) {
      result.errors.push("Toast configuration missing");
      return result;
    }
    const toastConfig = config.pos_config as ToastConfig;
    const revenues = await fetchToastRevenue(toastConfig, date);
    let totalRevenue = 0;
    revenues.forEach((rev) => {
      totalRevenue += rev.amount;
    });
    const data: PropertySummaryData = {
      org_id: config.org_id,
      outlet_id: config.outlet_id,
      report_date: date,
      labor_cost: laborCost,
      revenue: totalRevenue,
      tips: 0,
    };
    const validation = await validatePropertySummaryData(data);
    if (!validation.valid) {
      result.records_failed++;
      result.errors.push(`Validation failed: ${validation.errors.join(",")}`);
      return result;
    }
    const { error } = await supabase
      .from("property_summary")
      .insert([data])
      .select();
    if (error) {
      result.records_failed++;
      result.errors.push(`Database insert failed: ${error.message}`);
      return result;
    }
    result.records_processed++;
    result.data.push(data);
    result.success = true;
  } catch (err) {
    result.errors.push(`Toast ingestion error: ${String(err)}`);
  }
  return result;
}
export async function ingestFromLightspeed(
  config: DataPipelineConfig,
  date: string,
  laborCost: number,
): Promise<PipelineResult> {
  const result: PipelineResult = {
    success: false,
    records_processed: 0,
    records_failed: 0,
    errors: [],
    data: [],
  };
  try {
    if (!config.pos_config || !("merchant_id" in config.pos_config)) {
      result.errors.push("Lightspeed configuration missing");
      return result;
    }
    const lightspeedConfig = config.pos_config as LightspeedConfig;
    const revenues = await fetchLightspeedRevenue(lightspeedConfig, date);
    let totalRevenue = 0;
    revenues.forEach((rev) => {
      totalRevenue += rev.amount;
    });
    const data: PropertySummaryData = {
      org_id: config.org_id,
      outlet_id: config.outlet_id,
      report_date: date,
      labor_cost: laborCost,
      revenue: totalRevenue,
      tips: 0,
    };
    const validation = await validatePropertySummaryData(data);
    if (!validation.valid) {
      result.records_failed++;
      result.errors.push(`Validation failed: ${validation.errors.join(",")}`);
      return result;
    }
    const { error } = await supabase
      .from("property_summary")
      .insert([data])
      .select();
    if (error) {
      result.records_failed++;
      result.errors.push(`Database insert failed: ${error.message}`);
      return result;
    }
    result.records_processed++;
    result.data.push(data);
    result.success = true;
  } catch (err) {
    result.errors.push(`Lightspeed ingestion error: ${String(err)}`);
  }
  return result;
}
export async function ingestPropertySummary(
  config: DataPipelineConfig,
  date: string,
  laborCost: number,
): Promise<PipelineResult> {
  switch (config.pos_system) {
    case "square":
      return await ingestFromSquare(config, date, laborCost);
    case "toast":
      return await ingestFromToast(config, date, laborCost);
    case "lightspeed":
      return await ingestFromLightspeed(config, date, laborCost);
    case "manual":
      return {
        success: true,
        records_processed: 0,
        records_failed: 0,
        errors: [],
        data: [],
      };
    default:
      return {
        success: false,
        records_processed: 0,
        records_failed: 0,
        errors: [`Unknown POS system: ${config.pos_system}`],
        data: [],
      };
  }
}
export async function insertPropertySummaryManual(
  data: PropertySummaryData,
): Promise<PipelineResult> {
  const result: PipelineResult = {
    success: false,
    records_processed: 0,
    records_failed: 0,
    errors: [],
    data: [],
  };
  try {
    const validation = await validatePropertySummaryData(data);
    if (!validation.valid) {
      result.records_failed++;
      result.errors = validation.errors;
      return result;
    }
    const { data: insertedData, error } = await supabase
      .from("property_summary")
      .insert([data])
      .select();
    if (error) {
      result.records_failed++;
      result.errors.push(`Database error: ${error.message}`);
      return result;
    }
    result.success = true;
    result.records_processed = 1;
    result.data = [data];
  } catch (err) {
    result.records_failed++;
    result.errors.push(`Error: ${String(err)}`);
  }
  return result;
}
export async function getPropertySummary(
  org_id: string,
  outlet_id?: string,
  startDate?: string,
  endDate?: string,
): Promise<PropertySummaryData[]> {
  try {
    let query = supabase
      .from("property_summary")
      .select("*")
      .eq("org_id", org_id);
    if (outlet_id) {
      query = query.eq("outlet_id", outlet_id);
    }
    if (startDate) {
      query = query.gte("report_date", startDate);
    }
    if (endDate) {
      query = query.lte("report_date", endDate);
    }
    const { data, error } = await query.order("report_date", {
      ascending: false,
    });
    if (error) {
      console.error("Error fetching property summary:", error);
      return [];
    }
    return data as PropertySummaryData[];
  } catch (err) {
    console.error("Error in getPropertySummary:", err);
    return [];
  }
}
export async function deletePropertySummary(
  org_id: string,
  outlet_id: string,
  reportDate: string,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("property_summary")
      .delete()
      .eq("org_id", org_id)
      .eq("outlet_id", outlet_id)
      .eq("report_date", reportDate);
    if (error) {
      console.error("Error deleting property summary:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error in deletePropertySummary:", err);
    return false;
  }
}
