/**
 * ===========================================================================
 * Marketing cross-channel pipeline
 * ===========================================================================
 * Layer:    Atrium
 * Status:   IMPLEMENTED (Phase 5 — flag-flip publishing; Instagram webhook
 *           and unified marketing dashboard are Phase 5.x extensions)
 * Phase:    5
 *
 * Purpose:  Master doc §7.4: when marketing publishes a reel, it lands on
 *           Instagram AND in the Aurion app library. Same shoot, two
 *           channels.
 *
 *           Phase 5 implementation: simple toggle. Marketing flips the
 *           publish flags on a media asset; the venue page picks it up
 *           via media-library.query() within the next selector tick.
 *
 *           Phase 5.x extensions:
 *             - Webhook endpoint for the marketing CMS to push assets
 *             - Unified marketing dashboard for direct upload + tag
 *             - Instagram OAuth + Graph API for cross-channel post
 *               (today: marketing posts to Instagram via their existing
 *               tooling; we only mirror the asset into our app)
 * ===========================================================================
 */

import type { MediaAsset } from '../../../../shared/types/atrium';
import type { UUID } from '../../../../shared/types/base';
import { mediaLibrary } from './media-library';
import { logger } from '../../../lib/logger';

export interface PublishRequest {
  assetId: UUID;
  publishToInstagram: boolean;
  publishToApp: boolean;
}

export class MarketingPipeline {
  /**
   * Toggle publish flags on an existing asset. Master doc §7.4: "no
   * third-party Instagram embed — strictly own-content reuse." We DO NOT
   * call out to Instagram from this pipeline; the publishToInstagram flag
   * exists as audit metadata to track which assets the marketing team
   * has cross-posted via their own tooling.
   *
   * Returns the updated MediaAsset.
   */
  async publish(req: PublishRequest): Promise<MediaAsset> {
    try {
      const updated = await mediaLibrary.setPublishFlags(req.assetId, {
        publishedToInstagram: req.publishToInstagram,
        publishedToApp: req.publishToApp,
      });
      logger.info('[MarketingPipeline] publish flags set', {
        assetId: req.assetId,
        publishedToInstagram: req.publishToInstagram,
        publishedToApp: req.publishToApp,
      });
      return updated;
    } catch (err) {
      logger.error('[MarketingPipeline] publish failed', {
        assetId: req.assetId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}

export const marketingPipeline = new MarketingPipeline();
