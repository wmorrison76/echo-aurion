import { randomBytes } from "crypto";
/** * Tablet Device Pairing Service * Handles QR code generation, device registration, and authentication */ export interface TabletDevice {
  id: string;
  device_id: string;
  device_name: string;
  device_token: string;
  credential_mode: "none" | "camera" | "employee_id" | "disabled";
  include_chef_name: boolean;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}
export interface QRCodeData {
  device_id: string;
  device_token: string;
  pairing_url: string;
  timestamp: number;
} /** * Generate a unique device ID and token for tablet pairing */
export function generateDeviceCredentials(): {
  deviceId: string;
  deviceToken: string;
} {
  const deviceId = `TABLET-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`;
  const deviceToken = randomBytes(32).toString("hex");
  return { deviceId, deviceToken };
} /** * Generate QR code data for tablet device setup * The QR code contains a setup URL with device credentials */
export function generatePairingQRData(
  deviceId: string,
  deviceToken: string,
  baseUrl: string,
): QRCodeData {
  const pairingUrl = `${baseUrl}/tablet/setup?device=${deviceId}&token=${deviceToken}`;
  return {
    device_id: deviceId,
    device_token: deviceToken,
    pairing_url: pairingUrl,
    timestamp: Date.now(),
  };
} /** * Verify device credentials during tablet registration */
export function verifyDeviceCredentials(
  deviceId: string,
  deviceToken: string,
  storedToken: string,
): boolean {
  return deviceId && deviceToken === storedToken;
} /** * Generate a QR code image URL for the pairing data * Uses QR Server API */
export function getQRCodeImageUrl(
  pairingUrl: string,
  size: number = 300,
): string {
  const encoded = encodeURIComponent(pairingUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
}
