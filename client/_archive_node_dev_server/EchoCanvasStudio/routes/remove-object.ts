import { Router } from"express";
import OpenAI from"openai";
import * as fs from"fs";
import * as path from"path"; const router = Router();
import { getSubmoduleOpenAIClient } from "@/modules/_shared/openai-client";
const openai = getSubmoduleOpenAIClient(); // Convert base64 to buffer
function base64ToBuffer(base64: string): Buffer { return Buffer.from(base64,"base64");
} // Convert buffer to base64
function bufferToBase64(buffer: Buffer): string { return buffer.toString("base64");
} router.post("/remove-object", async (req, res) => { try { const { image, mask, strength = 100 } = req.body; if (!image || !mask) { return res.status(400).json({ error:"Image and mask are required" }); } // Convert base64 to buffers const imageBuffer = base64ToBuffer(image); const maskBuffer = base64ToBuffer(mask); // Create temporary files for OpenAI API const tmpDir = path.join(process.cwd(),"tmp"); if (!fs.existsSync(tmpDir)) { fs.mkdirSync(tmpDir, { recursive: true }); } const imageFile = path.join(tmpDir, `image-${Date.now()}.png`); const maskFile = path.join(tmpDir, `mask-${Date.now()}.png`); fs.writeFileSync(imageFile, imageBuffer); fs.writeFileSync(maskFile, maskBuffer); try { // Call OpenAI image editing API (inpainting) const response = await openai.images.edit({ image: fs.createReadStream(imageFile) as any, mask: fs.createReadStream(maskFile) as any, prompt: `Remove the marked object seamlessly. Strength: ${strength}%`, n: 1, size:"1024x1024", model:"dall-e-2", }); if ( !response.data || response.data.length === 0 || !response.data[0].url ) { throw new Error("No image URL returned from OpenAI API"); } const imageUrl = response.data[0].url; // Cleanup temporary files fs.unlinkSync(imageFile); fs.unlinkSync(maskFile); res.json({ success: true, imageUrl }); } catch (apiError: any) { // Cleanup on error if (fs.existsSync(imageFile)) fs.unlinkSync(imageFile); if (fs.existsSync(maskFile)) fs.unlinkSync(maskFile); throw apiError; } } catch (error: any) { console.error("Object removal error:", error); res.status(500).json({ error: error.message ||"Failed to remove object" }); }
}); export default router;
