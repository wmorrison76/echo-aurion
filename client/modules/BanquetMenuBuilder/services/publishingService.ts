/**
 * services/publishingService.ts
 * ----------------------------------------------------------------------------
 * Multi-surface publishing pipeline. Takes a finalized menu composition +
 * a brand overlay and produces output artifacts for each requested surface.
 *
 * Surfaces:
 *   print         — letter-size PDF, print-optimized layout
 *   web           — web preview HTML, embedded styling
 *   beo           — Banquet Event Order document (operational, not guest-facing)
 *   guest_pdf     — guest-facing PDF, branded
 *   kitchen_card  — laminated 5x7 kitchen reference card
 *
 * Implementation pattern:
 *   Each surface has a formatter function that takes a Pkg 1-3 composition
 *   snapshot + brand overlay and returns either inline content (HTML/text)
 *   or a server-generated artifact URL.
 *
 *   Server-generated surfaces (PDFs) post to the publishing endpoint.
 *   Inline surfaces (HTML web preview) are generated client-side.
 *
 * Why a service:
 *   The same composition needs to publish to multiple surfaces in a single
 *   user action. Centralized pipeline = consistent error handling + audit
 *   logging + one network round trip.
 * ----------------------------------------------------------------------------
 */

import type {
  PublishRequest,
  PublishResult,
  PublishedArtifact,
  PublishSurface,
  BrandOverlay,
} from '../BanquetMenuBuilder.p5.types';
import type { CompositionSnapshot } from '../hooks/useMenuComposition';
import { getEchoProxyConfig } from './echoProxyConfig';

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

interface PublishArgs {
  composition: CompositionSnapshot;
  request: PublishRequest;
  publishedBy: string;
}

export async function publish(args: PublishArgs): Promise<PublishResult> {
  const { composition, request, publishedBy } = args;
  const overlay = request.brandOverlay;
  const artifacts: PublishedArtifact[] = [];
  const errors: PublishResult['errors'] = [];

  // Group surfaces — inline-generated vs. server-generated
  const inlineSurfaces: PublishSurface[] = [];
  const serverSurfaces: PublishSurface[] = [];

  for (const surface of request.surfaces) {
    if (surface === 'web') inlineSurfaces.push(surface);
    else serverSurfaces.push(surface);
  }

  // Inline surfaces — generated client-side, instant
  for (const surface of inlineSurfaces) {
    try {
      const artifact = generateInlineArtifact(surface, composition, overlay);
      artifacts.push(artifact);
    } catch (err) {
      errors.push({
        surface,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Server surfaces — single batch call
  if (serverSurfaces.length > 0) {
    try {
      const serverArtifacts = await generateServerArtifacts({
        surfaces: serverSurfaces,
        composition,
        overlay,
        forceRegenerate: request.forceRegenerate,
      });
      artifacts.push(...serverArtifacts);
    } catch (err) {
      // If the server call fails entirely, mark all server surfaces as errored
      const errorMessage = err instanceof Error ? err.message : String(err);
      for (const surface of serverSurfaces) {
        errors.push({ surface, error: errorMessage });
      }
    }
  }

  return {
    artifacts,
    publishedAt: new Date().toISOString(),
    publishedBy,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ----------------------------------------------------------------------------
// Inline artifact generation
// ----------------------------------------------------------------------------

function generateInlineArtifact(
  surface: PublishSurface,
  composition: CompositionSnapshot,
  overlay?: BrandOverlay,
): PublishedArtifact {
  switch (surface) {
    case 'web':
      return generateWebPreview(composition, overlay);
    default:
      throw new Error(`Surface "${surface}" requires server generation.`);
  }
}

function generateWebPreview(
  composition: CompositionSnapshot,
  overlay?: BrandOverlay,
): PublishedArtifact {
  const primaryColor = overlay?.primaryColor ?? '#c9a961';
  const accentColor = overlay?.accentColor ?? '#0d0e10';
  const displayFont = overlay?.displayFont ?? 'Playfair Display, serif';
  const bodyFont = overlay?.bodyFont ?? 'Inter, system-ui, sans-serif';
  const headerLine = overlay?.headerLine ?? `${composition.eventType} Menu`;
  const footerLine = overlay?.footerLine ?? '';

  const sectionsHtml = composition.sections
    .filter((s) => s.items.length > 0)
    .map((section) => {
      const items = section.items
        .map((it) => {
          const tags = (it.dietaryTags ?? [])
            .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
            .join(' ');
          return `<li class="item">
            <span class="item-name">${escapeHtml(it.name)}</span>
            ${tags ? `<span class="item-tags">${tags}</span>` : ''}
          </li>`;
        })
        .join('\n');

      return `<section class="course">
        <h2 class="course-label">${escapeHtml(section.name)}</h2>
        <ul class="course-items">${items}</ul>
      </section>`;
    })
    .join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(headerLine)}</title>
<style>
  :root {
    --primary: ${primaryColor};
    --accent: ${accentColor};
    --display: ${displayFont};
    --body: ${bodyFont};
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--body);
    background: #faf7f0;
    color: #1a1a1a;
    padding: 48px 24px;
    line-height: 1.5;
  }
  .menu {
    max-width: 640px;
    margin: 0 auto;
    background: #fffdf7;
    padding: 48px 56px;
    border-top: 4px solid var(--primary);
    box-shadow: 0 2px 16px rgba(0,0,0,0.06);
  }
  ${overlay?.logoUrl ? `.brand-mark { text-align: center; margin-bottom: 16px; }
  .brand-mark img { max-height: 80px; max-width: 200px; }` : ''}
  .header {
    text-align: center;
    margin-bottom: 32px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--primary);
  }
  .header h1 {
    font-family: var(--display);
    font-size: 28px;
    font-weight: 500;
    letter-spacing: 0.02em;
    color: var(--accent);
  }
  .course { margin-bottom: 28px; }
  .course-label {
    font-family: var(--display);
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--primary);
    text-align: center;
    margin-bottom: 12px;
  }
  .course-items { list-style: none; }
  .item {
    text-align: center;
    padding: 6px 0;
    font-size: 14px;
  }
  .item-name { display: block; }
  .item-tags { display: block; margin-top: 4px; }
  .tag {
    display: inline-block;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #666;
    border: 1px solid #ccc;
    padding: 1px 6px;
    border-radius: 3px;
    margin: 0 2px;
  }
  .footer {
    text-align: center;
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid #ddd;
    font-size: 11px;
    color: #888;
    letter-spacing: 0.04em;
  }
</style>
</head>
<body>
  <div class="menu">
    ${overlay?.logoUrl ? `<div class="brand-mark"><img src="${escapeHtml(overlay.logoUrl)}" alt=""></div>` : ''}
    <header class="header"><h1>${escapeHtml(headerLine)}</h1></header>
    ${sectionsHtml}
    ${footerLine ? `<div class="footer">${escapeHtml(footerLine)}</div>` : ''}
  </div>
</body>
</html>`;

  return {
    surface: 'web',
    content: html,
    contentType: 'text/html',
    generatedAt: new Date().toISOString(),
    size: html.length,
  };
}

// ----------------------------------------------------------------------------
// Server artifact generation
// ----------------------------------------------------------------------------

interface ServerGenArgs {
  surfaces: PublishSurface[];
  composition: CompositionSnapshot;
  overlay?: BrandOverlay;
  forceRegenerate?: boolean;
}

async function generateServerArtifacts(args: ServerGenArgs): Promise<PublishedArtifact[]> {
  const { proxyUrl, propertyApiKey } = await getEchoProxyConfig();
  if (!proxyUrl) {
    throw new Error('Publishing proxy URL is not configured.');
  }

  const response = await fetch(`${proxyUrl}/v1/menu/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(propertyApiKey ? { 'X-Property-Key': propertyApiKey } : {}),
    },
    body: JSON.stringify({
      surfaces: args.surfaces,
      composition: args.composition,
      brandOverlay: args.overlay,
      forceRegenerate: args.forceRegenerate ?? false,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Publish failed (${response.status}): ${text || response.statusText}`);
  }

  const payload = (await response.json()) as { artifacts: unknown[] };
  if (!Array.isArray(payload.artifacts)) {
    throw new Error('Publish response did not include artifacts array.');
  }

  return payload.artifacts
    .filter((a): a is Record<string, unknown> => typeof a === 'object' && a !== null)
    .map((a) => ({
      surface: a.surface as PublishSurface,
      url: typeof a.url === 'string' ? a.url : undefined,
      content: typeof a.content === 'string' ? a.content : undefined,
      contentType: typeof a.contentType === 'string' ? a.contentType : 'application/octet-stream',
      generatedAt: typeof a.generatedAt === 'string' ? a.generatedAt : new Date().toISOString(),
      size: typeof a.size === 'number' ? a.size : undefined,
    }))
    .filter((a) => a.surface);
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ----------------------------------------------------------------------------
// Surface metadata (for UI)
// ----------------------------------------------------------------------------

export const SURFACE_META: Record<PublishSurface, { label: string; description: string; icon: string }> = {
  print: {
    label: 'Print menu',
    description: 'Letter-size PDF, print-optimized',
    icon: '📄',
  },
  web: {
    label: 'Web preview',
    description: 'HTML preview for sharing',
    icon: '🌐',
  },
  beo: {
    label: 'Banquet Event Order',
    description: 'Operational document for the team',
    icon: '📋',
  },
  guest_pdf: {
    label: 'Guest PDF',
    description: 'Branded guest-facing PDF',
    icon: '✉️',
  },
  kitchen_card: {
    label: 'Kitchen card',
    description: 'Laminated 5x7 reference for line cooks',
    icon: '🔥',
  },
};
