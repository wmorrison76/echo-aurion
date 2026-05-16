/** * Banquet Equipment Catalog * Defines all equipment types, specifications, and GL codes */ export type EquipmentKey =

    | "chafer_full"
    | "chafer_half"
    | "carving_station"
    | "heat_lamp_double"
    | "bowl_large"
    | "bowl_medium"
    | "bowl_small"
    | "station_6ft";
export interface EquipmentSpec {
  key: EquipmentKey;
  name: string;
  size: [number, number, number]; // width, height, depth (meters) defaultRotation?: [number, number, number]; seats?: number; glCode?: string; costCenter?: string; color?: string; description?: string;
}
export const EQUIPMENT: Record<EquipmentKey, EquipmentSpec> = {
  chafer_full: {
    key: "chafer_full",
    name: "Full Chafer",
    size: [0.65, 0.3, 0.42],
    glCode: "4012-CHAFFER",
    costCenter: "Banquet",
    color: "#b5b9bf",
    description: "Standard full-size chafer for hot food",
  },
  chafer_half: {
    key: "chafer_half",
    name: "Half Chafer",
    size: [0.45, 0.28, 0.32],
    glCode: "4012-CHAFFER",
    costCenter: "Banquet",
    color: "#c2c6cc",
    description: "Half-size chafer for smaller portions",
  },
  carving_station: {
    key: "carving_station",
    name: "Carving Station",
    size: [1.2, 0.95, 0.7],
    glCode: "4013-CARVING",
    costCenter: "Banquet",
    color: "#8e9aa9",
    description: "Full carving station with mirrors and accents",
  },
  heat_lamp_double: {
    key: "heat_lamp_double",
    name: "Heat Lamp (Double)",
    size: [0.9, 1.1, 0.4],
    glCode: "4014-HEATLAMP",
    costCenter: "Banquet",
    color: "#d9a441",
    description: "Double heat lamp for chafer warming",
  },
  bowl_large: {
    key: "bowl_large",
    name: "Bowl (Large)",
    size: [0.38, 0.22, 0.38],
    glCode: "4015-SMALLWARE",
    costCenter: "Banquet",
    color: "#e5e7eb",
    description: "Large serving bowl",
  },
  bowl_medium: {
    key: "bowl_medium",
    name: "Bowl (Medium)",
    size: [0.3, 0.18, 0.3],
    glCode: "4015-SMALLWARE",
    costCenter: "Banquet",
    color: "#eceff3",
    description: "Medium serving bowl",
  },
  bowl_small: {
    key: "bowl_small",
    name: "Bowl (Small)",
    size: [0.22, 0.14, 0.22],
    glCode: "4015-SMALLWARE",
    costCenter: "Banquet",
    color: "#f3f4f6",
    description: "Small serving bowl",
  },
  station_6ft: {
    key: "station_6ft",
    name: "Station Table (6ft)",
    size: [1.83, 0.76, 0.76],
    glCode: "4010-STATION",
    costCenter: "Operations",
    color: "#7f8c99",
    description: "6-foot station table for equipment and supplies",
  },
};
export function getEquipmentSpec(key: EquipmentKey): EquipmentSpec {
  return EQUIPMENT[key];
}
export function getAllEquipment(): EquipmentSpec[] {
  return Object.values(EQUIPMENT);
}
export function getEquipmentByCategory(
  category: "chafers" | "stations" | "bowls" | "lamps",
): EquipmentSpec[] {
  const categories: Record<string, EquipmentKey[]> = {
    chafers: ["chafer_full", "chafer_half"],
    stations: ["carving_station", "station_6ft"],
    bowls: ["bowl_large", "bowl_medium", "bowl_small"],
    lamps: ["heat_lamp_double"],
  };
  return (categories[category] || []).map((key) => EQUIPMENT[key]);
}
