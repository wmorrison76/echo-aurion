/** * Region Routing Middleware * Routes requests based on client IP/geolocation * Enables multi-region failover and latency optimization */ import {
  Request,
  Response,
  NextFunction,
} from "express";
export interface Region {
  id: string;
  host: string;
  weight: number;
}
export const regions: Region[] = [
  {
    id: "us-east",
    host: process.env.REGION_US_EAST || "https://us-east.luccca.cloud",
    weight: 1,
  },
  {
    id: "eu-west",
    host: process.env.REGION_EU_WEST || "https://eu-west.luccca.cloud",
    weight: 1,
  },
  {
    id: "ap-south",
    host: process.env.REGION_AP_SOUTH || "https://ap-south.luccca.cloud",
    weight: 1,
  },
]; /** * Simple IP-based region selection * In production, use MaxMind GeoIP or similar */
export function chooseRegion(ip: string): Region {
  // Simple heuristic based on IP first octet const firstOctet = parseInt(ip?.split(".")[0] ||"0", 10); if (firstOctet >= 200) return regions[2]; // AP if (firstOctet >= 100) return regions[1]; // EU return regions[0]; // US (default)
} /** * Region routing middleware */
export function regionRouter(req: Request, res: Response, next: NextFunction) {
  const clientIp =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
    req.socket.remoteAddress ||
    "";
  const region = chooseRegion(clientIp); // Attach region info to request (req as any).region = region.id; (req as any).regionHost = region.host; // Add region header to response res.setHeader("X-LUCCCA-Region", region.id); res.setHeader("X-LUCCCA-Client-IP", clientIp); next();
}
