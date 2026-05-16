import type { RequestHandler } from "express";

const ALLOWED_HOSTS = new Set([
  "github.com",
  "raw.githubusercontent.com",
  "codeload.github.com",
  "api.github.com",
]);

function isAllowed(url: string) {
  try { const u = new URL(url); return ALLOWED_HOSTS.has(u.hostname); } catch { return false; }
}

function parseGithubRepo(url: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname.replace(/^\/+/, "").split("/");
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") };
  } catch { return null; }
}

export const githubRaw: RequestHandler = async (req, res) => {
  try {
    const repo = String(req.query.repo || "");
    const branch = String(req.query.branch || "main");
    const path = String(req.query.path || "");
    let target: string | null = null;

    if (/raw\.githubusercontent\.com\//.test(repo)) {
      target = repo; // already raw URL
    } else if (isAllowed(repo)) {
      target = repo;
    } else {
      const r = parseGithubRepo(repo);
      if (!r) return res.status(400).json({ error: "Invalid GitHub repository URL" });
      const p = path.replace(/^\/+/, "");
      target = `https://raw.githubusercontent.com/${r.owner}/${r.repo}/${encodeURIComponent(branch)}/${p}`;
    }

    if (!target) return res.status(400).json({ error: "Bad request" });

    const resp = await fetch(target, { headers: { Accept: "application/vnd.github.raw" } });
    const buf = Buffer.from(await resp.arrayBuffer());
    res.status(resp.status);
    if (resp.headers.get("content-type")) res.setHeader("Content-Type", resp.headers.get("content-type") as string);
    res.send(buf);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Proxy error" });
  }
};

export const githubZip: RequestHandler = async (req, res) => {
  try {
    const repo = String(req.query.repo || "");
    const branch = String(req.query.branch || "main");
    let target: string | null = null;

    if (/codeload\.github\.com\//.test(repo) || /\.zip$/.test(repo)) {
      target = repo;
    } else {
      const r = parseGithubRepo(repo);
      if (!r) return res.status(400).json({ error: "Invalid GitHub repository URL" });
      target = `https://codeload.github.com/${r.owner}/${r.repo}/zip/refs/heads/${encodeURIComponent(branch)}`;
    }

    const resp = await fetch(target);
    const buf = Buffer.from(await resp.arrayBuffer());
    res.status(resp.status);
    res.setHeader("Content-Type", resp.headers.get("content-type") || "application/zip");
    res.setHeader("Content-Disposition", resp.headers.get("content-disposition") || `attachment; filename=repo.zip`);
    res.send(buf);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Proxy error" });
  }
};

export default githubRaw;
