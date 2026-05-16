# ─── Pillars (direct copies from Luccca framework) ───
This directory maps the seven pillars to their actual implementation files in Luccca.
When you clone the seed, these are the files that get baked into your new platform.

## 1. Brain (EchoAi orchestration)
- source: `/app/backend/routes/cake_ai_services.py` (Claude + Gemini + fal.ai patterns)
- source: `/app/backend/routes/ai_image_gen.py` (multi-provider image gen)

## 2. Spine (EchoBus)
- source: `/app/client/lib/echo-bus.ts`
- source: `/app/client/components/echo/EchoCommandBar.tsx`

## 3. Sidebar + Panel System
- source: `/app/client/components/site/Sidebar.tsx` (8-group chef-first template)

## 4. Stripe Standalone Pattern (Pastry + BEO reference)
- source: `/app/backend/routes/pastry_stripe.py`
- source: `/app/backend/routes/pastry_share.py`
- source: `/app/backend/routes/beo_standalone.py`
- source: `/app/client/modules/Pastry/*`
- source: `/app/client/modules/BEOStandalone/*`

## 5. Admin Auth Gate
- source: `/app/backend/auth_admin.py`
- source: `/app/client/lib/admin-auth.ts`

## 6. Observability
- source: `/app/backend/observability/sentry_init.py`
- source: `/app/backend/observability/rate_limit.py`
- source: `/app/backend/email_service.py`
- source: `/app/backend/scheduler.py`
- source: `/app/backend/routes/eng_ops_notifications.py`

## 7. Cognition + OPA Guardrails
- source: `/app/client/developer/EchoCoder/cognition/`
- source: `/app/client/developer/EchoCoder/opa/`
- source: `/app/client/developer/EchoCoder/orchestrator/`
