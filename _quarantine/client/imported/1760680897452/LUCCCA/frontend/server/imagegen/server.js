const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, ".env") });

const PORT = process.env.PORT || 8787;
const STABILITY_KEY = process.env.STABILITY_API_KEY;

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: "25mb" }));

function stepsForMode(mode) {
  if (mode === "fast") return 20;
  if (mode === "quality") return 40;
  return 28;
}

app.post("/api/txt2img", async (req, res) => {
  try {
    if (!STABILITY_KEY) {
      return res.status(500).json({
        error: "Missing STABILITY_API_KEY. Edit server/imagegen/.env and restart.",
      });
    }
    const { prompt, negative, width = 768, height = 768, seed, mode } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing prompt" });
    }

    const form = new FormData();
    form.append("prompt", prompt);
    if (negative) form.append("negative_prompt", negative);
    form.append("width", String(width));
    form.append("height", String(height));
    form.append("output_format", "png");
    if (seed !== undefined) form.append("seed", String(seed));
    form.append("steps", String(stepsForMode(mode)));

    const r = await fetch("https://api.stability.ai/v2beta/stable-image/generate/sd3", {
      method: "POST",
      headers: { Authorization: `Bearer ${STABILITY_KEY}` },
      body: form,
    });

    if (!r.ok) {
      const t = await r.text().catch(() => "");
      return res.status(r.status).send(t || r.statusText);
    }

    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader("Content-Type", "image/png");
    res.send(buf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
});

app.listen(PORT, () => {
  console.log(`✓ Image server listening on http://localhost:${PORT}`);
});
