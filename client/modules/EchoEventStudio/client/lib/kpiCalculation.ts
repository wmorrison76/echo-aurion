import type { Obj } from "@/store/sceneStore";
export interface KPIMetrics {
  throughput: number;
  avgPathM: number;
  seatsPerM2: number;
  totalSeats: number;
  roomArea: number;
} /** * Calculate room area from room dimensions */
export function calculateRoomArea(width: number, length: number): number {
  return width * length;
} /** * Calculate total seats from layout objects */
export function calculateTotalSeats(objects: Obj[]): number {
  return objects.reduce((sum, obj) => sum + (obj.seats || 0), 0);
} /** * Calculate seating density (seats per square meter) */
export function calculateSeatingDensity(
  totalSeats: number,
  roomArea: number,
): number {
  if (roomArea === 0) return 0;
  return Number((totalSeats / roomArea).toFixed(2));
} /** * Calculate throughput (people per hour through main aisles) * Simplified: assumes standard service pace */
export function calculateThroughput(
  totalSeats: number,
  serviceType: "plated" | "buffet" | "cocktail" = "buffet",
): number {
  // Standard throughput rates (people/hour) const rates = { buffet: 120, // Higher throughput for buffet plated: 80, // Lower for plated service cocktail: 150, // Higher for cocktail standing }; const baseRate = rates[serviceType] || 120; // Adjust based on occupancy: density affects service speed return Math.round(baseRate * 0.95); // Conservative estimate
} /** * Calculate average path length through layout * Simplified: estimates from room dimensions and table distribution */
export function calculateAveragePathLength(
  objects: Obj[],
  roomWidth: number,
  roomLength: number,
): number {
  if (objects.length === 0) return 0; // Estimate center of mass of all tables let sumX = 0, sumZ = 0; let tableCount = 0; objects.forEach((obj) => { if (obj.type.startsWith("table") || obj.type ==="buffet") { sumX += obj.position[0]; sumZ += obj.position[2]; tableCount++; } }); if (tableCount === 0) return 0; const centerX = sumX / tableCount; const centerZ = sumZ / tableCount; // Average path: from entry (assumed -length/2) to room center to exit const pathLength = Math.sqrt( Math.pow(centerX, 2) + Math.pow(centerZ + roomLength / 2, 2) ); // Round to nearest 0.5m return Math.round(pathLength * 2) / 2;
} /** * Calculate overall KPIs for a layout */
export function calculateKPIs(
  objects: Obj[],
  roomWidth: number,
  roomLength: number,
  serviceType: "plated" | "buffet" | "cocktail" = "buffet",
): KPIMetrics {
  const roomArea = calculateRoomArea(roomWidth, roomLength);
  const totalSeats = calculateTotalSeats(objects);
  const seatsPerM2 = calculateSeatingDensity(totalSeats, roomArea);
  const throughput = calculateThroughput(totalSeats, serviceType);
  const avgPathM = calculateAveragePathLength(objects, roomWidth, roomLength);
  return { throughput, avgPathM, seatsPerM2, totalSeats, roomArea };
} /** * Get layout efficiency score (0-100) * Based on seating density and path length */
export function getEfficiencyScore(kpis: KPIMetrics): number {
  // Ideal density: 0.5-0.8 seats/m² const densityScore = Math.min( 100, (kpis.seatsPerM2 / 0.65) * 100 ); // Ideal path: under 15m average const pathScore = Math.min( 100, (1 - kpis.avgPathM / 20) * 100 ); // Average the two metrics return Math.round((densityScore + pathScore) / 2);
} /** * Get layout recommendations based on KPIs */
export function getLayoutRecommendations(kpis: KPIMetrics): string[] {
  const recommendations: string[] = [];
  if (kpis.seatsPerM2 < 0.4) {
    recommendations.push("Layout is spacious; consider adding more seating");
  }
  if (kpis.seatsPerM2 > 1.0) {
    recommendations.push(
      "Layout is crowded; reduce table count for guest comfort",
    );
  }
  if (kpis.avgPathM > 20) {
    recommendations.push(
      "Average path is long; relocate tables closer to center",
    );
  }
  if (kpis.avgPathM < 5) {
    recommendations.push(
      "Average path is short; layout is compact and efficient",
    );
  }
  if (kpis.throughput < 80) {
    recommendations.push(
      "Service throughput is low; consider faster service style",
    );
  }
  if (recommendations.length === 0) {
    recommendations.push("Layout is well-balanced and efficient");
  }
  return recommendations;
}
