# EchoCoder Seed → App Guide

This guide explains how to drop in a Seed (existing repo/folder) and generate a working LUCCCA app using EchoCoder. It also documents budgets, adapters, RBAC, theming, and the approve/apply loop.

## What is a Seed?
A Seed is a source of truth to learn from:
- A repository folder or archive (.zip/.tar.gz)
- A minimal spec (JSON/Markdown) describing features
- Mixed assets (code + docs) for analysis

## Quick Start
1) Connect integrations (optional):
   - Open MCP popover → connect: Neon (DB), Prisma Postgres, Netlify or Vercel (deploy), Sentry (errors), Context7 (docs), Semgrep (security), Builder CMS / Supabase / Zapier / Linear / Notion as needed.
2) Open Studio → Prompt tab: describe what to build (e.g., Welcome + Contact pages) → click Plan.
3) Review Plan Candidates and Seed results (Seed tab for zipped repo upload) → iterate prompt if needed.
4) Code tab: adjust code template. Click Apply to Codebase to write client/pages/Generated.tsx.
5) Interact tab: live preview of /generated. Refresh Preview if needed.
6) Integrate (next): enable budgets + PR gates, DB models, and deploy via MCP once connected.

## Connecting Providers (MCP)
- Databases (Neon + Prisma): connect Neon in MCP, then run schema sync in Studio (coming). Use Prisma for models/migrations.
- Deploy (Netlify/Vercel): connect provider in MCP; deployments will be triggered from Studio once enabled.
- Observability (Sentry + OTel): connect Sentry; OTel traces can be exported via env config.
- Security/Docs (Semgrep/Context7): connect to run security scans and doc retrieval.

## Studio Layout
- Prompt: natural-language planner; Plan calls /api/plan and shows candidates.
- Design: draggable canvas with toolbar for blocks (Text, Button, Card).
- Interact: iframe preview of /generated (written by Apply).
- Code: text editor where you can directly edit the Generated.tsx content.
- Seed: upload zipped repo/spec; server analyzes and returns inferred structure.

## The Loop
- Spec Intake → Retrieve patterns → Plan N → Score → Scaffold → Verify → Patch → Integrate → Gate → Log.
- Deterministic guardrails, no blind regex; minimal diffs; budgets enforced.

## Supported Adapters (v1)
- node_express (API controllers, routes, tests)
- python_fastapi (planned)
- go_fiber (planned)

## Budgets (default)
- Lighthouse: PWA ≥ 90, Perf ≥ 85, A11y ≥ 95
- Bundle delta: 0 KB without approval
- Tests coverage: ≥ 80%
- Security: no critical vulns

## Tools API (functional contracts)
```
export type Tools = {
  fs_write(params:{path:string; contents:string; mode?:"create"|"patch"}): Promise<{ok:boolean; diff?:string}>;
  fs_read(params:{path:string}): Promise<{ok:boolean; contents?:string}>;
  ast_edit(params:{path:string; transform:string; args?:any}): Promise<{ok:boolean; diff?:string}>;
  run_lint(params:{scope:string}): Promise<{ok:boolean; report:any}>;
  run_tests(params:{scope:string}): Promise<{ok:boolean; summary:any}>;
  run_a11y(params:{url:string}): Promise<{ok:boolean; violations:any[]}>;
  run_perf(params:{url:string; budgets:any}): Promise<{ok:boolean; scores:any}>;
  run_security(params:{scope:string}): Promise<{ok:boolean; findings:any[]}>;
  git_open_pr(params:{title:string; body:string; branch:string}): Promise<{ok:boolean; pr:number}>;
  repo_scan(params:{path:string}): Promise<{structure:any; deps:any; problems:any[]}>;
  simulate_folder(params:{path:string; mode:"analyze"|"repair"|"rebuild"}): Promise<{report:any}>;
  retrieve(params:{query:string; k?:number}): Promise<{snippets:{path:string; lines:[number,number]; text:string}[]}>;
};
```

## Theme & Tokens
- Edit client/global.css HSL variables (Apple×TRON defaults). Tailwind reads these via tailwind.config.ts.
- Change tokens once; all pages/components update.

## RBAC & Safe Mode (ZARO)
- Entitlements: e.g., mixology:view, studio:generate
- Safe Mode: All engine writes go to branch + PR with budgets enforced

## Seed Analyzer
- Reads the entire tree; infers modules (Routes, Panels, Hooks, Services)
- Detects issues: missing exports, circular deps, CSS leaks, slow bundles
- Proposes (a) write missing files, (b) safe refactors (codemods), (c) stub tests → reach green

## Approve/Apply Flow
- Studio shows diff/plan summary → Approve or Request Changes
- On approval, Integrator writes files and opens a PR; Historian logs decisions

## Troubleshooting
- If budgets fail, Reviewer proposes minimal patches; otherwise block and explain
- For private repos, connect a storage/provider via MCP and reference the repo URL

## Glossary
- Seed: Input repo/spec
- Plan: Candidate steps + files
- Scorecard: Weighted evaluation (Fit/Complexity/Perf/A11y/Obs/Sec/Bundle)
- Historian: Decision ledger
