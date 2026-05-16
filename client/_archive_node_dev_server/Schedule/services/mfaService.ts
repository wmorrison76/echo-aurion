/** * Multi-Factor Authentication (MFA) Service * TOTP-based authentication with backup codes */ import { supabase } from"../lib/db"; interface MFASetup { secret: string; qrCode: string; backupCodes: string[];
} interface MFAVerification { valid: boolean; message: string;
} /** * Generate a random backup code */
function generateBackupCode(): string { return Array.from({ length: 8 }, () => Math.floor(Math.random() * 10) ).join("");
} /** * Generate TOTP secret (in production, use speakeasy or similar library) */
export function generateTOTPSecret(): string { // In production: use speakeasy.generateSecret() // For now, return a mock secret return"ABCDEFGHIJKLMNOP";
} /** * Generate QR code URL for MFA setup */
export function generateQRCodeURL( email: string, secret: string, appName: string ="LUCCCA"
): string { const encodedEmail = encodeURIComponent(email); const encodedSecret = encodeURIComponent(secret); return `otpauth://totp/${appName}:${encodedEmail}?secret=${encodedSecret}&issuer=${appName}`;
} /** * Verify TOTP token */
export function verifyTOTPToken( secret: string, token: string
): boolean { // In production: use speakeasy.totp.verify() // For now, accept any 6-digit code for demo return /^\d{6}$/.test(token);
} /** * Enable MFA for user */
export async function enableMFA( userId: string
): Promise<MFASetup> { const secret = generateTOTPSecret(); const qrCode = generateQRCodeURL(userId, secret); // Generate 10 backup codes const backupCodes = Array.from({ length: 10 }, () => generateBackupCode() ); // Store setup (encrypted) in database // In production, this would be stored encrypted await supabase.from("user_mfa_setup").insert({ user_id: userId, secret, backup_codes: backupCodes, enabled: false, created_at: new Date(), }); return { secret, qrCode, backupCodes, };
} /** * Verify MFA token and activate MFA */
export async function verifyAndActivateMFA( userId: string, token: string
): Promise<MFAVerification> { try { // Get setup from database const { data: setup } = await supabase .from("user_mfa_setup") .select("*") .eq("user_id", userId) .eq("enabled", false) .single(); if (!setup) { return { valid: false, message:"No pending MFA setup found", }; } // Verify token if (!verifyTOTPToken(setup.secret, token)) { return { valid: false, message:"Invalid authentication code", }; } // Activate MFA await supabase .from("user_mfa_setup") .update({ enabled: true }) .eq("user_id", userId); return { valid: true, message:"MFA successfully enabled", }; } catch (error) { console.error("MFA activation error:", error); return { valid: false, message:"Failed to enable MFA", }; }
} /** * Disable MFA for user */
export async function disableMFA(userId: string): Promise<boolean> { try { const { error } = await supabase .from("user_mfa_setup") .delete() .eq("user_id", userId); if (error) { console.error("MFA disable error:", error); return false; } return true; } catch (error) { console.error("MFA disable error:", error); return false; }
} /** * Verify login with MFA */
export async function verifyLoginMFA( userId: string, token: string
): Promise<MFAVerification> { try { const { data: mfa } = await supabase .from("user_mfa_setup") .select("*") .eq("user_id", userId) .eq("enabled", true) .single(); if (!mfa) { return { valid: false, message:"MFA not enabled for this user", }; } // Check if token matches TOTP if (verifyTOTPToken(mfa.secret, token)) { return { valid: true, message:"MFA verification successful", }; } // Check backup codes if (mfa.backup_codes.includes(token)) { // Remove used backup code const updatedCodes = mfa.backup_codes.filter((code: string) => code !== token); await supabase .from("user_mfa_setup") .update({ backup_codes: updatedCodes }) .eq("user_id", userId); return { valid: true, message:"MFA verification successful (backup code used)", }; } return { valid: false, message:"Invalid MFA code", }; } catch (error) { console.error("MFA verification error:", error); return { valid: false, message:"MFA verification failed", }; }
} /** * Check if user has MFA enabled */
export async function isMFAEnabled(userId: string): Promise<boolean> { try { const { data } = await supabase .from("user_mfa_setup") .select("enabled") .eq("user_id", userId) .eq("enabled", true) .single(); return !!data; } catch (error) { return false; }
} /** * Generate new backup codes */
export async function regenerateBackupCodes( userId: string
): Promise<string[] | null> { try { const backupCodes = Array.from({ length: 10 }, () => generateBackupCode() ); const { error } = await supabase .from("user_mfa_setup") .update({ backup_codes: backupCodes }) .eq("user_id", userId); if (error) { console.error("Backup code regeneration error:", error); return null; } return backupCodes; } catch (error) { console.error("Backup code regeneration error:", error); return null; }
}
