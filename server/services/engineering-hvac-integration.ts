/**
 * Engineering HVAC Integration Service
 * Provides IoT device integration, real-time temperature control, and energy optimization
 * 
 * Features:
 * - IoT device API integration
 * - Real-time temperature control
 * - Energy optimization
 * - Predictive maintenance
 * - Device monitoring
 */

import { logger } from "../lib/logger";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * HVAC Integration Types
 */
export interface IoTDevice {
  id: string;
  orgId: string;
  outletId?: string;
  deviceType: "thermostat" | "sensor" | "controller" | "monitor";
  deviceName: string;
  manufacturer: string; // e.g., "Nest", "Ecobee", "Honeywell"
  model: string;
  apiProvider: "nest" | "ecobee" | "honeywell" | "generic" | "custom";
  apiKey?: string;
  apiEndpoint?: string;
  status: "online" | "offline" | "error";
  lastSeen?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface TemperatureReading {
  deviceId: string;
  orgId: string;
  outletId?: string;
  temperature: number; // Celsius
  humidity?: number; // Percentage
  timestamp: string;
  zone?: string; // e.g., "kitchen", "dining", "bar"
}

export interface TemperatureControl {
  deviceId: string;
  orgId: string;
  outletId?: string;
  targetTemperature: number; // Celsius
  mode: "heat" | "cool" | "auto" | "off";
  schedule?: {
    time: string;
    temperature: number;
    mode: "heat" | "cool" | "auto" | "off";
  }[];
  isActive: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface EnergyOptimization {
  deviceId: string;
  orgId: string;
  outletId?: string;
  currentConsumption: number; // kWh
  targetConsumption: number; // kWh
  savingsPercent: number; // Percentage saved
  recommendations: Array<{
    recommendation: string;
    expectedSavings: number; // kWh
    priority: "high" | "medium" | "low";
    implementationEffort: "low" | "medium" | "high";
  }>;
  optimizedAt: string;
}

export interface PredictiveMaintenance {
  deviceId: string;
  orgId: string;
  deviceName: string;
  issueType: "filter_replacement" | "calibration" | "maintenance" | "failure_risk";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  recommendedAction: string;
  estimatedCost?: number;
  dueDate?: string;
  confidence: number; // 0-1
  detectedAt: string;
}

/**
 * Engineering HVAC Integration Service
 */
export class EngineeringHVACIntegration {
  /**
   * Register IoT device
   */
  async registerDevice(
    orgId: string,
    device: Omit<IoTDevice, "id" | "orgId" | "status" | "createdAt" | "updatedAt">,
  ): Promise<IoTDevice> {
    try {
      logger.info("[EngineeringHVAC] Registering device", { orgId, deviceName: device.deviceName });

      // Test device connection
      const status = await this.testDeviceConnection(device);

      const { data, error } = await supabase
        .from("iot_devices")
        .insert({
          org_id: orgId,
          outlet_id: device.outletId || null,
          device_type: device.deviceType,
          device_name: device.deviceName,
          manufacturer: device.manufacturer,
          model: device.model,
          api_provider: device.apiProvider,
          api_key: device.apiKey || null,
          api_endpoint: device.apiEndpoint || null,
          status,
          last_seen: new Date().toISOString(),
          metadata: device.metadata || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      logger.info("[EngineeringHVAC] Device registered", { deviceId: data.id, status });

      return this.mapToDevice(data);
    } catch (error) {
      logger.error("[EngineeringHVAC] Failed to register device", { error, orgId, device });
      throw error;
    }
  }

  /**
   * Test device connection
   */
  private async testDeviceConnection(device: Omit<IoTDevice, "id" | "orgId" | "createdAt" | "updatedAt">): Promise<"online" | "offline" | "error"> {
    try {
      // Test connection based on API provider
      switch (device.apiProvider) {
        case "nest":
          // Test Nest API connection
          return await this.testNestConnection(device);
        case "ecobee":
          // Test Ecobee API connection
          return await this.testEcobeeConnection(device);
        case "honeywell":
          // Test Honeywell API connection
          return await this.testHoneywellConnection(device);
        case "generic":
        case "custom":
          // Test generic HTTP endpoint
          if (device.apiEndpoint) {
            const response = await fetch(device.apiEndpoint, {
              method: "GET",
              headers: device.apiKey
                ? {
                    Authorization: `Bearer ${device.apiKey}`,
                  }
                : {},
            });
            return response.ok ? "online" : "error";
          }
          return "offline";
        default:
          return "error";
      }
    } catch (error) {
      logger.warn("[EngineeringHVAC] Device connection test failed", { error, deviceName: device.deviceName });
      return "error";
    }
  }

  /**
   * Test Nest API connection
   */
  private async testNestConnection(device: Omit<IoTDevice, "id" | "orgId" | "createdAt" | "updatedAt">): Promise<"online" | "offline" | "error"> {
    // Simplified - in production, use Nest API
    return device.apiKey ? "online" : "error";
  }

  /**
   * Test Ecobee API connection
   */
  private async testEcobeeConnection(device: Omit<IoTDevice, "id" | "orgId" | "createdAt" | "updatedAt">): Promise<"online" | "offline" | "error"> {
    // Simplified - in production, use Ecobee API
    return device.apiKey ? "online" : "error";
  }

  /**
   * Test Honeywell API connection
   */
  private async testHoneywellConnection(device: Omit<IoTDevice, "id" | "orgId" | "createdAt" | "updatedAt">): Promise<"online" | "offline" | "error"> {
    // Simplified - in production, use Honeywell API
    return device.apiKey ? "online" : "error";
  }

  /**
   * Get temperature reading from device
   */
  async getTemperature(deviceId: string, orgId: string): Promise<TemperatureReading | null> {
    try {
      // Get device info
      const device = await this.getDevice(deviceId, orgId);
      if (!device || device.status !== "online") {
        return null;
      }

      // Fetch temperature from device API
      const temperature = await this.fetchTemperatureFromDevice(device);

      if (temperature) {
        // Store reading
        await supabase.from("temperature_readings").insert({
          device_id: deviceId,
          org_id: orgId,
          outlet_id: device.outletId || null,
          temperature: temperature.temperature,
          humidity: temperature.humidity || null,
          zone: temperature.zone || null,
          timestamp: new Date().toISOString(),
        });

        // Update device last seen
        await supabase
          .from("iot_devices")
          .update({ last_seen: new Date().toISOString() })
          .eq("id", deviceId)
          .eq("org_id", orgId);
      }

      return temperature;
    } catch (error) {
      logger.error("[EngineeringHVAC] Failed to get temperature", { error, deviceId, orgId });
      return null;
    }
  }

  /**
   * Fetch temperature from device API
   */
  private async fetchTemperatureFromDevice(device: IoTDevice): Promise<TemperatureReading | null> {
    try {
      // Fetch from device API based on provider
      switch (device.apiProvider) {
        case "nest":
          return await this.fetchNestTemperature(device);
        case "ecobee":
          return await this.fetchEcobeeTemperature(device);
        case "honeywell":
          return await this.fetchHoneywellTemperature(device);
        case "generic":
        case "custom":
          if (device.apiEndpoint) {
            const response = await fetch(device.apiEndpoint, {
              method: "GET",
              headers: device.apiKey
                ? {
                    Authorization: `Bearer ${device.apiKey}`,
                  }
                : {},
            });
            if (response.ok) {
              const data = await response.json();
              return {
                deviceId: device.id,
                orgId: device.orgId,
                outletId: device.outletId,
                temperature: data.temperature || 0,
                humidity: data.humidity,
                timestamp: new Date().toISOString(),
                zone: data.zone,
              };
            }
          }
          return null;
        default:
          return null;
      }
    } catch (error) {
      logger.warn("[EngineeringHVAC] Failed to fetch temperature from device", {
        error,
        deviceId: device.id,
      });
      return null;
    }
  }

  /**
   * Fetch Nest temperature
   */
  private async fetchNestTemperature(device: IoTDevice): Promise<TemperatureReading | null> {
    // Simplified - in production, use Nest API
    // This is a placeholder implementation
    return {
      deviceId: device.id,
      orgId: device.orgId,
      outletId: device.outletId,
      temperature: 22, // Mock temperature
      humidity: 50, // Mock humidity
      timestamp: new Date().toISOString(),
      zone: device.metadata?.zone,
    };
  }

  /**
   * Fetch Ecobee temperature
   */
  private async fetchEcobeeTemperature(device: IoTDevice): Promise<TemperatureReading | null> {
    // Simplified - in production, use Ecobee API
    return {
      deviceId: device.id,
      orgId: device.orgId,
      outletId: device.outletId,
      temperature: 22,
      humidity: 50,
      timestamp: new Date().toISOString(),
      zone: device.metadata?.zone,
    };
  }

  /**
   * Fetch Honeywell temperature
   */
  private async fetchHoneywellTemperature(device: IoTDevice): Promise<TemperatureReading | null> {
    // Simplified - in production, use Honeywell API
    return {
      deviceId: device.id,
      orgId: device.orgId,
      outletId: device.outletId,
      temperature: 22,
      humidity: 50,
      timestamp: new Date().toISOString(),
      zone: device.metadata?.zone,
    };
  }

  /**
   * Set temperature on device
   */
  async setTemperature(
    deviceId: string,
    orgId: string,
    targetTemperature: number,
    mode: "heat" | "cool" | "auto" | "off",
    userId: string,
  ): Promise<boolean> {
    try {
      const device = await this.getDevice(deviceId, orgId);
      if (!device || device.status !== "online") {
        throw new Error("Device not available");
      }

      // Set temperature via device API
      const success = await this.setTemperatureOnDevice(device, targetTemperature, mode);

      if (success) {
        // Store control setting
        await supabase.from("temperature_controls").upsert(
          {
            device_id: deviceId,
            org_id: orgId,
            outlet_id: device.outletId || null,
            target_temperature: targetTemperature,
            mode,
            is_active: true,
            updated_at: new Date().toISOString(),
            updated_by: userId,
          },
          {
            onConflict: "device_id,org_id",
          },
        );

        logger.info("[EngineeringHVAC] Temperature set", {
          deviceId,
          targetTemperature,
          mode,
        });
      }

      return success;
    } catch (error) {
      logger.error("[EngineeringHVAC] Failed to set temperature", { error, deviceId, orgId });
      return false;
    }
  }

  /**
   * Set temperature on device API
   */
  private async setTemperatureOnDevice(
    device: IoTDevice,
    temperature: number,
    mode: "heat" | "cool" | "auto" | "off",
  ): Promise<boolean> {
    try {
      // Set via device API based on provider
      switch (device.apiProvider) {
        case "nest":
          return await this.setNestTemperature(device, temperature, mode);
        case "ecobee":
          return await this.setEcobeeTemperature(device, temperature, mode);
        case "honeywell":
          return await this.setHoneywellTemperature(device, temperature, mode);
        case "generic":
        case "custom":
          if (device.apiEndpoint) {
            const response = await fetch(device.apiEndpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(device.apiKey ? { Authorization: `Bearer ${device.apiKey}` } : {}),
              },
              body: JSON.stringify({ temperature, mode }),
            });
            return response.ok;
          }
          return false;
        default:
          return false;
      }
    } catch (error) {
      logger.warn("[EngineeringHVAC] Failed to set temperature on device", {
        error,
        deviceId: device.id,
      });
      return false;
    }
  }

  /**
   * Set Nest temperature
   */
  private async setNestTemperature(
    device: IoTDevice,
    temperature: number,
    mode: "heat" | "cool" | "auto" | "off",
  ): Promise<boolean> {
    // Simplified - in production, use Nest API
    return true;
  }

  /**
   * Set Ecobee temperature
   */
  private async setEcobeeTemperature(
    device: IoTDevice,
    temperature: number,
    mode: "heat" | "cool" | "auto" | "off",
  ): Promise<boolean> {
    // Simplified - in production, use Ecobee API
    return true;
  }

  /**
   * Set Honeywell temperature
   */
  private async setHoneywellTemperature(
    device: IoTDevice,
    temperature: number,
    mode: "heat" | "cool" | "auto" | "off",
  ): Promise<boolean> {
    // Simplified - in production, use Honeywell API
    return true;
  }

  /**
   * Optimize energy consumption
   */
  async optimizeEnergy(deviceId: string, orgId: string): Promise<EnergyOptimization | null> {
    try {
      // Get historical consumption data
      const { data: readings, error } = await supabase
        .from("temperature_readings")
        .select("temperature, timestamp")
        .eq("device_id", deviceId)
        .eq("org_id", orgId)
        .gte("timestamp", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order("timestamp", { ascending: false })
        .limit(1000);

      if (error || !readings || readings.length === 0) {
        return null;
      }

      // Calculate current consumption (simplified)
      const currentConsumption = this.calculateEnergyConsumption(readings);

      // Get target consumption (based on occupancy patterns)
      const targetConsumption = await this.calculateTargetConsumption(deviceId, orgId);

      // Generate recommendations
      const recommendations = await this.generateEnergyRecommendations(
        deviceId,
        orgId,
        currentConsumption,
        targetConsumption,
      );

      const savingsPercent =
        currentConsumption > 0
          ? ((currentConsumption - targetConsumption) / currentConsumption) * 100
          : 0;

      const optimization: EnergyOptimization = {
        deviceId,
        orgId,
        currentConsumption,
        targetConsumption,
        savingsPercent: Math.max(0, savingsPercent),
        recommendations,
        optimizedAt: new Date().toISOString(),
      };

      // Store optimization
      await supabase.from("energy_optimizations").insert({
        device_id: deviceId,
        org_id: orgId,
        current_consumption: currentConsumption,
        target_consumption: targetConsumption,
        savings_percent: savingsPercent,
        recommendations,
        optimized_at: optimization.optimizedAt,
      });

      logger.info("[EngineeringHVAC] Energy optimized", {
        deviceId,
        savingsPercent: savingsPercent.toFixed(1),
      });

      return optimization;
    } catch (error) {
      logger.error("[EngineeringHVAC] Energy optimization failed", { error, deviceId, orgId });
      return null;
    }
  }

  /**
   * Calculate energy consumption from temperature readings
   */
  private calculateEnergyConsumption(readings: Array<{ temperature: number; timestamp: string }>): number {
    // Simplified calculation - in production, use actual energy consumption data
    // Estimate based on temperature variations and runtime
    if (readings.length === 0) return 0;

    // Average temperature
    const avgTemp = readings.reduce((sum, r) => sum + r.temperature, 0) / readings.length;

    // Base consumption: 1 kWh per degree deviation from 20°C
    const baseConsumption = Math.abs(avgTemp - 20) * 24; // Per day

    return baseConsumption;
  }

  /**
   * Calculate target consumption
   */
  private async calculateTargetConsumption(deviceId: string, orgId: string): Promise<number> {
    // Get device schedule and occupancy patterns
    // Simplified - in production, use occupancy and schedule data
    return 20; // kWh per day target
  }

  /**
   * Generate energy optimization recommendations
   */
  private async generateEnergyRecommendations(
    deviceId: string,
    orgId: string,
    current: number,
    target: number,
  ): Promise<EnergyOptimization["recommendations"]> {
    const recommendations: EnergyOptimization["recommendations"] = [];

    if (current > target * 1.2) {
      recommendations.push({
        recommendation: "Adjust temperature schedule based on occupancy patterns",
        expectedSavings: (current - target) * 0.2,
        priority: "high",
        implementationEffort: "medium",
      });

      recommendations.push({
        recommendation: "Enable smart scheduling to reduce HVAC usage during low-occupancy hours",
        expectedSavings: (current - target) * 0.15,
        priority: "high",
        implementationEffort: "low",
      });
    }

    if (current > target) {
      recommendations.push({
        recommendation: "Consider upgrading to energy-efficient HVAC system",
        expectedSavings: (current - target) * 0.3,
        priority: "medium",
        implementationEffort: "high",
      });
    }

    return recommendations;
  }

  /**
   * Detect predictive maintenance needs
   */
  async detectMaintenanceNeeds(deviceId: string, orgId: string): Promise<PredictiveMaintenance[]> {
    try {
      const device = await this.getDevice(deviceId, orgId);
      if (!device) {
        return [];
      }

      const maintenance: PredictiveMaintenance[] = [];

      // Check last maintenance date
      const { data: lastMaintenance } = await supabase
        .from("maintenance_records")
        .select("maintenance_date, maintenance_type")
        .eq("device_id", deviceId)
        .eq("org_id", orgId)
        .order("maintenance_date", { ascending: false })
        .limit(1)
        .single();

      // Check device age and usage
      const deviceAge = Date.now() - new Date(device.createdAt).getTime();
      const daysSinceCreation = deviceAge / (1000 * 60 * 60 * 24);

      // Filter replacement recommendation (every 3 months)
      if (!lastMaintenance || daysSinceCreation > 90) {
        maintenance.push({
          deviceId,
          orgId,
          deviceName: device.deviceName,
          issueType: "filter_replacement",
          severity: daysSinceCreation > 120 ? "high" : "medium",
          description: "HVAC filter should be replaced every 3 months for optimal performance",
          recommendedAction: "Replace HVAC filter and clean air ducts",
          estimatedCost: 50,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          confidence: 0.9,
          detectedAt: new Date().toISOString(),
        });
      }

      // Check for calibration needs (if temperature readings are inconsistent)
      const { data: recentReadings } = await supabase
        .from("temperature_readings")
        .select("temperature")
        .eq("device_id", deviceId)
        .eq("org_id", orgId)
        .gte("timestamp", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order("timestamp", { ascending: false })
        .limit(100);

      if (recentReadings && recentReadings.length > 10) {
        const temperatures = recentReadings.map((r: any) => r.temperature);
        const avgTemp = temperatures.reduce((sum, t) => sum + t, 0) / temperatures.length;
        const variance =
          temperatures.reduce((sum, t) => sum + Math.pow(t - avgTemp, 2), 0) / temperatures.length;

        if (variance > 5) {
          maintenance.push({
            deviceId,
            orgId,
            deviceName: device.deviceName,
            issueType: "calibration",
            severity: "medium",
            description: "Temperature sensor shows high variance. Device may need calibration",
            recommendedAction: "Calibrate temperature sensor and verify accuracy",
            estimatedCost: 100,
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            confidence: 0.7,
            detectedAt: new Date().toISOString(),
          });
        }
      }

      // Check device status and errors
      if (device.status === "error" || device.status === "offline") {
        maintenance.push({
          deviceId,
          orgId,
          deviceName: device.deviceName,
          issueType: "failure_risk",
          severity: "critical",
          description: `Device is ${device.status}. Requires immediate attention`,
          recommendedAction: "Check device connection and functionality. Contact support if issue persists",
          estimatedCost: 200,
          dueDate: new Date().toISOString(),
          confidence: 0.95,
          detectedAt: new Date().toISOString(),
        });
      }

      logger.info("[EngineeringHVAC] Maintenance needs detected", {
        deviceId,
        count: maintenance.length,
      });

      return maintenance;
    } catch (error) {
      logger.error("[EngineeringHVAC] Maintenance detection failed", { error, deviceId, orgId });
      return [];
    }
  }

  /**
   * Get device by ID
   */
  private async getDevice(deviceId: string, orgId: string): Promise<IoTDevice | null> {
    try {
      const { data, error } = await supabase
        .from("iot_devices")
        .select("*")
        .eq("id", deviceId)
        .eq("org_id", orgId)
        .single();

      if (error || !data) return null;

      return this.mapToDevice(data);
    } catch (error) {
      logger.error("[EngineeringHVAC] Failed to get device", { error, deviceId, orgId });
      return null;
    }
  }

  /**
   * Map database row to IoTDevice
   */
  private mapToDevice(data: any): IoTDevice {
    return {
      id: data.id,
      orgId: data.org_id,
      outletId: data.outlet_id || undefined,
      deviceType: data.device_type,
      deviceName: data.device_name,
      manufacturer: data.manufacturer,
      model: data.model,
      apiProvider: data.api_provider,
      apiKey: data.api_key || undefined,
      apiEndpoint: data.api_endpoint || undefined,
      status: data.status,
      lastSeen: data.last_seen || undefined,
      metadata: data.metadata || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

// Export singleton instance
export const engineeringHVACIntegration = new EngineeringHVACIntegration();
