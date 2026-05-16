# Bundle 012 — ImageGen reference images (style/composition/pose) — 2025-08-18 03:06

## What’s new
- Add **reference images** (up to 4). Drag & drop, paste, or pick files.
- Choose **Mode** (style / composition / pose), **Style Weight**, and **Img2Img Strength** (when a single ref is used).
- Params are sent to backend (if configured) or used to decorate the **mock preview**.

## Files
- `engine/imagegen/types.ts` — new fields: `refs`, `refMode`, `refStrength`, `img2imgStrength`, `maskDataUrl`.
- `engine/imagegen/ImageGenClient.ts` — passes refs to API; mock renders a tiny grid of refs + labels.
- `components/panels/ImageGenPanel.tsx` — UI for refs, weights, modes.
- `components/layout/RightPanels.tsx` — ensures panel is included.

## Notes
- In real backends, `refMode` often maps to: style/IP-Adapter, ControlNet (canny/depth/pose) for composition/pose, or img2img for single-reference guidance.
- For strict licensing, ensure you only upload references you own or have permission to use for generation.
