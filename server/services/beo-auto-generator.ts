/**
 * BEO Auto-Generator Service
 * 
 * Automated BEO/REO generation from prospects and scanned menus
 * - Prospect integration (copy prospect data to BEO)
 * - Menu scanning integration (use scanned menu items)
 * - Automated BEO form generation
 * - Menu item selection and validation
 * - Date and guest count entry
 * - Automatic BEO number generation
 * - Link prospect to BEO in canonical model
 * 
 * Production-ready, military-grade, AI^3 optimized, no-fail architecture
 */

import { logger } from '../utils/logger';
import { getSupabaseServiceClient } from '../lib/supabase-service-client';
import { masterEntityService } from './master-entity-service';
import { prospectPipelineService } from './prospect-pipeline-service';
import { beoAIMenuScannerService } from './beo-ai-menu-scanner';
import crypto from 'crypto';

export interface BEOGenerationRequest {
  tenant_id: string;
  org_id: string;
  prospect_id?: string;
  menu_document_id?: string;
  parsed_menu_id?: string;
  event_date: string;
  guest_count: number;
  selected_menu_items?: string[]; // Menu item IDs
  outlet_id?: string;
  department_id: string;
  created_by: string;
  additional_data?: Record<string, any>;
}

export interface GeneratedBEO {
  id: string;
  beo_number: string;
  prospect_id?: string;
  event_id?: string;
  event_date: string;
  guest_count: number;
  menu_items: Array<{
    id: string;
    name: string;
    description?: string;
    category: string;
    price?: number;
    quantity: number;
    total_price: number;
  }>;
  total_price: number;
  status: 'draft' | 'approved';
  created_at: string;
}

/**
 * BEO Auto-Generator Service
 * 
 * Generates BEOs automatically from prospects and scanned menus
 */
export class BEOAutoGeneratorService {
  /**
   * Generate BEO from prospect and menu
   */
  async generateBEO(request: BEOGenerationRequest): Promise<GeneratedBEO> {
    try {
      logger.info('[BEOAutoGenerator] Generating BEO', {
        prospect_id: request.prospect_id,
        menu_document_id: request.menu_document_id,
        event_date: request.event_date,
        guest_count: request.guest_count,
      });

      // Step 1: Get prospect data if prospect_id provided
      let prospectData: any = null;
      if (request.prospect_id) {
        prospectData = await prospectPipelineService.getProspect(request.prospect_id, request.tenant_id);
        if (!prospectData) {
          throw new Error(`Prospect not found: ${request.prospect_id}`);
        }

        // Validate event date and guest count match prospect
        if (prospectData.event_date !== request.event_date) {
          logger.warn('[BEOAutoGenerator] Event date mismatch with prospect', {
            prospect_date: prospectData.event_date,
            request_date: request.event_date,
          });
        }

        if (prospectData.guest_count && prospectData.guest_count !== request.guest_count) {
          logger.warn('[BEOAutoGenerator] Guest count mismatch with prospect', {
            prospect_guests: prospectData.guest_count,
            request_guests: request.guest_count,
          });
        }
      }

      // Step 2: Get parsed menu data if menu_document_id or parsed_menu_id provided
      const supabase = getSupabaseServiceClient(); // Get persistent Supabase client
      let parsedMenuData: any = null;
      if (request.parsed_menu_id) {
        const { data, error } = await supabase
          .from('parsed_menus')
          .select('*')
          .eq('id', request.parsed_menu_id)
          .eq('tenant_id', request.tenant_id)
          .single();

        if (error) {
          logger.error('[BEOAutoGenerator] Failed to get parsed menu', { error, parsed_menu_id: request.parsed_menu_id });
          throw error;
        }

        parsedMenuData = data;
      } else if (request.menu_document_id) {
        // Get parsed menu from menu document
        const { data: menuDoc, error: menuDocError } = await supabase
          .from('menu_documents')
          .select('parsed_menu_id')
          .eq('id', request.menu_document_id)
          .eq('tenant_id', request.tenant_id)
          .single();

        if (menuDocError) {
          logger.error('[BEOAutoGenerator] Failed to get menu document', { error: menuDocError });
          throw menuDocError;
        }

        if (menuDoc.parsed_menu_id) {
          const { data, error } = await supabase
            .from('parsed_menus')
            .select('*')
            .eq('id', menuDoc.parsed_menu_id)
            .eq('tenant_id', request.tenant_id)
            .single();

          if (error) {
            logger.error('[BEOAutoGenerator] Failed to get parsed menu from document', { error });
            throw error;
          }

          parsedMenuData = data;
        }
      }

      // Step 3: Select menu items (use selected items or all items from menu)
      const selectedMenuItems = this.selectMenuItems(parsedMenuData, request.selected_menu_items);

      // Step 4: Calculate quantities and prices
      const menuItemsWithQuantities = this.calculateMenuItemQuantities(
        selectedMenuItems,
        request.guest_count
      );

      // Step 5: Generate BEO number
      const beoNumber = await this.generateBEONumber(
        request.org_id,
        request.outlet_id || prospectData?.outlet_id,
        request.event_date,
        request.tenant_id
      );

      // Step 6: Create calendar event (if not exists)
      let eventId: string | undefined;
      if (request.prospect_id && prospectData) {
        eventId = await this.createOrGetCalendarEvent(
          request.tenant_id,
          request.org_id,
          request.prospect_id,
          prospectData,
          request.event_date,
          request.guest_count
        );
      }

      // Step 7: Create BEO record
      const beoId = this.generateBEOId();
      const totalPrice = menuItemsWithQuantities.reduce((sum, item) => sum + item.total_price, 0);

      const beoContentData = {
        event_date: request.event_date,
        guest_count: request.guest_count,
        menu_items: menuItemsWithQuantities,
        total_price: totalPrice,
        prospect: prospectData ? {
          id: prospectData.id,
          name: prospectData.name,
          email: prospectData.email,
          phone: prospectData.phone,
        } : null,
        menu: parsedMenuData ? {
          id: parsedMenuData.id,
          restaurant_name: parsedMenuData.restaurant_name,
          menu_sections: parsedMenuData.menu_sections,
        } : null,
        ...request.additional_data,
      };

      const { data: beoData, error: beoError } = await supabase
        .from('beo_banquet_orders')
        .insert({
          id: beoId,
          org_id: request.org_id,
          event_id: eventId,
          beo_number: beoNumber,
          content_data: beoContentData,
          department_id: request.department_id,
          created_by_user_id: request.created_by,
          status: 'draft',
        })
        .select('*')
        .single();

      if (beoError) {
        logger.error('[BEOAutoGenerator] Failed to create BEO', { error: beoError });
        throw beoError;
      }

      // Step 8: Detect missing recipes for BEO menu items
      let missingRecipesDetected = false;
      try {
        const missingRecipes = await missingRecipeHandler.detectMissingRecipes(
          beoId,
          request.org_id,
          request.outlet_id || ''
        );
        
        if (missingRecipes.length > 0) {
          missingRecipesDetected = true;
          logger.info('[BEOAutoGenerator] Missing recipes detected for BEO', {
            beoId,
            beoNumber,
            missingCount: missingRecipes.length,
            menuItems: missingRecipes.map(r => r.menu_item_name),
          });
        }
      } catch (error) {
        logger.warn('[BEOAutoGenerator] Failed to detect missing recipes', {
          beoId,
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue even if missing recipe detection fails
      }

      // Step 9: Create BEO entity in canonical model
      try {
        await masterEntityService.createEntity({
          tenant_id: request.tenant_id,
          org_id: request.org_id,
          entity_type: 'beo',
          entity_id: beoId,
          entity_data: {
            beo_number: beoNumber,
            event_date: request.event_date,
            guest_count: request.guest_count,
            total_price: totalPrice,
            status: 'draft',
            missing_recipes_detected: missingRecipesDetected,
          },
          version: 1,
        });

        // Create prospect-to-BEO relationship if prospect exists
        if (request.prospect_id) {
          const prospectEntity = await masterEntityService.resolveEntityReference({
            entity_type: 'prospect',
            entity_id: request.prospect_id,
            tenant_id: request.tenant_id,
          });

          const beoEntity = await masterEntityService.resolveEntityReference({
            entity_type: 'beo',
            entity_id: beoId,
            tenant_id: request.tenant_id,
          });

          if (prospectEntity && beoEntity) {
            await masterEntityService.createRelationship(
              prospectEntity.id,
              beoEntity.id,
              'prospect_to_beo',
              request.tenant_id,
              request.org_id,
              {
                conversion_date: new Date().toISOString(),
                converted_by: request.created_by,
              }
            );
          }
        }
      } catch (canonicalError) {
        logger.warn('[BEOAutoGenerator] Failed to create BEO in canonical model', {
          error: canonicalError,
          beo_id: beoId,
        });
        // Continue even if canonical model fails (graceful degradation)
      }

      // Step 9: Update prospect status to 'beo_created' if prospect exists
      if (request.prospect_id) {
        try {
          await prospectPipelineService.updateProspectStage(
            request.prospect_id,
            request.tenant_id,
            'beo_created',
            request.created_by,
            'BEO automatically generated'
          );
        } catch (prospectError) {
          logger.warn('[BEOAutoGenerator] Failed to update prospect status', {
            error: prospectError,
            prospect_id: request.prospect_id,
          });
        }
      }

      logger.info('[BEOAutoGenerator] BEO generated successfully', {
        beo_id: beoId,
        beo_number: beoNumber,
        prospect_id: request.prospect_id,
        total_price: totalPrice,
      });

      return {
        id: beoId,
        beo_number: beoNumber,
        prospect_id: request.prospect_id,
        event_id: eventId,
        event_date: request.event_date,
        guest_count: request.guest_count,
        menu_items: menuItemsWithQuantities,
        total_price: totalPrice,
        status: 'draft',
        created_at: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('[BEOAutoGenerator] Error generating BEO', { error });
      throw error;
    }
  }

  /**
   * Select menu items (use selected items or all items from menu)
   */
  private selectMenuItems(parsedMenuData: any, selectedItemIds?: string[]): any[] {
    if (!parsedMenuData || !parsedMenuData.menu_items) {
      return [];
    }

    const menuItems = parsedMenuData.menu_items;

    if (selectedItemIds && selectedItemIds.length > 0) {
      // Return selected items only
      return menuItems.filter((item: any) => selectedItemIds.includes(item.id));
    }

    // Return all menu items
    return menuItems;
  }

  /**
   * Calculate menu item quantities based on guest count
   */
  private calculateMenuItemQuantities(
    menuItems: any[],
    guestCount: number
  ): Array<{
    id: string;
    name: string;
    description?: string;
    category: string;
    price?: number;
    quantity: number;
    total_price: number;
  }> {
    return menuItems.map((item) => {
      // Default: 1 per guest for entrees, 0.5 per guest for appetizers/desserts
      let quantity = guestCount;
      if (item.category === 'appetizer' || item.category === 'dessert') {
        quantity = Math.ceil(guestCount * 0.5);
      } else if (item.category === 'beverage') {
        quantity = Math.ceil(guestCount * 2); // 2 drinks per guest
      }

      const price = item.price || 0;
      const totalPrice = price * quantity;

      return {
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        price,
        quantity,
        total_price: totalPrice,
      };
    });
  }

  /**
   * Generate BEO number
   */
  private async generateBEONumber(
    orgId: string,
    outletId: string | undefined,
    eventDate: string,
    tenantId: string
  ): Promise<string> {
    try {
      const supabase = getSupabaseServiceClient(); // Get persistent Supabase client
      // Format: AUR-[GL]-[YYYYMMDD]-[Type]-[Seq]
      const dateStr = eventDate.replace(/-/g, '');
      const glCode = '0'; // Default GL code (would lookup from outlet_gl_codes)
      const eventType = 'BEO'; // Default event type
      
      // Get sequence number for this date
      const { data: existingBeos, error } = await supabase
        .from('beo_banquet_orders')
        .select('beo_number')
        .eq('org_id', orgId)
        .like('beo_number', `AUR-${glCode}-${dateStr}-${eventType}-%`)
        .order('beo_number', { ascending: false })
        .limit(1);

      let sequence = 1;
      if (!error && existingBeos && existingBeos.length > 0) {
        const lastNumber = existingBeos[0].beo_number;
        const lastSeq = parseInt(lastNumber.split('-')[4] || '0', 10);
        sequence = lastSeq + 1;
      }

      const seqStr = sequence.toString().padStart(4, '0');
      return `AUR-${glCode}-${dateStr}-${eventType}-${seqStr}`;
    } catch (error) {
      logger.error('[BEOAutoGenerator] Error generating BEO number', { error });
      // Fallback: simple number
      return `BEO-${eventDate.replace(/-/g, '')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }
  }

  /**
   * Create or get calendar event
   */
  private async createOrGetCalendarEvent(
    tenantId: string,
    orgId: string,
    prospectId: string,
    prospectData: any,
    eventDate: string,
    guestCount: number
  ): Promise<string> {
    try {
      const supabase = getSupabaseServiceClient(); // Get persistent Supabase client
      // Check if event already exists for this prospect
      const { data: existingEvents, error: existingError } = await supabase
        .from('calendar_events')
        .select('id')
        .eq('org_id', orgId)
        .eq('prospect_id', prospectId)
        .eq('date', eventDate)
        .limit(1);

      if (!existingError && existingEvents && existingEvents.length > 0) {
        return existingEvents[0].id;
      }

      // Create new calendar event
      const eventId = this.generateEventId();
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          id: eventId,
          org_id: orgId,
          outlet_id: prospectData.outlet_id,
          name: prospectData.name || 'Event',
          date: eventDate,
          guest_count: guestCount,
          prospect_id: prospectId,
          status: 'confirmed',
        })
        .select('id')
        .single();

      if (error) {
        logger.error('[BEOAutoGenerator] Failed to create calendar event', { error });
        throw error;
      }

      return data.id;
    } catch (error) {
      logger.error('[BEOAutoGenerator] Error creating calendar event', { error });
      throw error;
    }
  }

  /**
   * Generate BEO ID
   */
  private generateBEOId(): string {
    return `beo_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }
}

// Export singleton instance
export const beoAutoGeneratorService = new BEOAutoGeneratorService();
