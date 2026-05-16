import { RequestHandler } from "express";
import { SyncCrmFn, SyncDiagramFn, Project } from "@shared/beo-types";

// CRM Integration Implementations
const syncSalesforce: SyncCrmFn = async ({ venueId, project, system }) => {
  console.log(`Syncing project ${project.id} to Salesforce for venue ${venueId}`);
  
  try {
    // In production, this would use Salesforce REST API
    const salesforceData = {
      Name: project.name,
      Description: project.description,
      Event_Date__c: project.eventDate,
      Guest_Count__c: project.guestCount,
      Budget__c: project.budget,
      Lead_Status__c: mapLeadStatusToSalesforce(project.leadStatus),
      Venue_Id__c: venueId,
      External_Project_Id__c: project.id
    };
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const opportunityId = `006${Math.random().toString(36).substr(2, 15)}`;
    
    console.log(`Created Salesforce Opportunity: ${opportunityId}`);
    
    return { ok: true, externalId: opportunityId };
  } catch (error) {
    console.error('Salesforce sync failed:', error);
    return { ok: false };
  }
};

const syncHubSpot: SyncCrmFn = async ({ venueId, project, system }) => {
  console.log(`Syncing project ${project.id} to HubSpot for venue ${venueId}`);
  
  try {
    // In production, this would use HubSpot API
    const hubspotData = {
      dealname: project.name,
      description: project.description,
      closedate: project.eventDate,
      amount: project.estimatedRevenue,
      dealstage: mapLeadStatusToHubSpot(project.leadStatus),
      venue_id: venueId,
      external_project_id: project.id,
      guest_count: project.guestCount,
      event_type: project.requirements.menuStyle
    };
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const dealId = Math.random().toString(36).substr(2, 10);
    
    console.log(`Created HubSpot Deal: ${dealId}`);
    
    return { ok: true, externalId: dealId };
  } catch (error) {
    console.error('HubSpot sync failed:', error);
    return { ok: false };
  }
};

const syncPipedrive: SyncCrmFn = async ({ venueId, project, system }) => {
  console.log(`Syncing project ${project.id} to Pipedrive for venue ${venueId}`);
  
  try {
    // In production, this would use Pipedrive API
    const pipedriveData = {
      title: project.name,
      value: project.estimatedRevenue,
      currency: 'USD',
      stage_id: mapLeadStatusToPipedrive(project.leadStatus),
      person_id: null, // Would map to client
      org_id: null, // Would map to venue
      expected_close_date: project.eventDate,
      custom_fields: {
        guest_count: project.guestCount,
        venue_id: venueId,
        external_project_id: project.id
      }
    };
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const dealId = Math.floor(Math.random() * 1000000);
    
    console.log(`Created Pipedrive Deal: ${dealId}`);
    
    return { ok: true, externalId: dealId.toString() };
  } catch (error) {
    console.error('Pipedrive sync failed:', error);
    return { ok: false };
  }
};

// Diagramming Integration Implementations
const syncCventDiagram: SyncDiagramFn = async ({ venueId, projectId, provider }) => {
  console.log(`Syncing project ${projectId} to Cvent diagramming for venue ${venueId}`);
  
  try {
    // In production, this would use Cvent API
    const cventData = {
      event_id: projectId,
      venue_id: venueId,
      layout_type: 'banquet',
      capacity: 200,
      setup_style: 'rounds'
    };
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const diagramUrl = `https://cvent.com/diagrams/venue_${venueId}/project_${projectId}`;
    const diagramId = `cvt_${Math.random().toString(36).substr(2, 12)}`;
    
    console.log(`Created Cvent diagram: ${diagramId}`);
    
    return { url: diagramUrl, diagramId };
  } catch (error) {
    console.error('Cvent sync failed:', error);
    throw error;
  }
};

const syncPrismmDiagram: SyncDiagramFn = async ({ venueId, projectId, provider }) => {
  console.log(`Syncing project ${projectId} to Prismm diagramming for venue ${venueId}`);
  
  try {
    // In production, this would use Prismm (ex-AllSeated) API
    const prismmData = {
      event_id: projectId,
      venue_id: venueId,
      layout_3d: true,
      virtual_tour: true,
      collaborative_planning: true
    };
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1800));
    
    const diagramUrl = `https://prismm.com/3d-layouts/venue_${venueId}/event_${projectId}`;
    const diagramId = `prm_${Math.random().toString(36).substr(2, 12)}`;
    
    console.log(`Created Prismm 3D diagram: ${diagramId}`);
    
    return { url: diagramUrl, diagramId };
  } catch (error) {
    console.error('Prismm sync failed:', error);
    throw error;
  }
};

const syncSocialTablesDiagram: SyncDiagramFn = async ({ venueId, projectId, provider }) => {
  console.log(`Syncing project ${projectId} to Social Tables for venue ${venueId}`);
  
  try {
    // In production, this would use Social Tables API
    const socialTablesData = {
      event_id: projectId,
      venue_id: venueId,
      seating_chart: true,
      floor_plan: true,
      table_management: true
    };
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const diagramUrl = `https://socialtables.com/events/venue_${venueId}/project_${projectId}`;
    const diagramId = `st_${Math.random().toString(36).substr(2, 12)}`;
    
    console.log(`Created Social Tables diagram: ${diagramId}`);
    
    return { url: diagramUrl, diagramId };
  } catch (error) {
    console.error('Social Tables sync failed:', error);
    throw error;
  }
};

// PMS Integration (Property Management Systems)
const syncCloudPMS = async (venueId: string, project: Project) => {
  console.log(`Syncing project ${project.id} to Cloud PMS for venue ${venueId}`);
  
  try {
    // Cloud PMS event booking
    const cloudPMSData = {
      hotelId: venueId,
      eventName: project.name,
      eventDate: project.eventDate,
      expectedAttendees: project.guestCount,
      roomSetup: project.requirements.setupStyle || 'banquet',
      cateringRequired: true,
      contactName: project.contacts[0]?.name || 'TBD',
      estimatedRevenue: project.estimatedRevenue,
      bookingStatus: mapEventStatusToCloudPMS(project.eventStatus)
    };
    
    // Simulate Cloud PMS API call
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const bookingId = `CLD${Math.floor(Math.random() * 1000000)}`;
    
    console.log(`Created Cloud PMS booking: ${bookingId}`);
    
    return { ok: true, externalId: bookingId };
  } catch (error) {
    console.error('Cloud PMS sync failed:', error);
    return { ok: false };
  }
};

const syncMews = async (venueId: string, project: Project) => {
  console.log(`Syncing project ${project.id} to Mews for venue ${venueId}`);
  
  try {
    // Mews event booking
    const mewsData = {
      propertyId: venueId,
      name: project.name,
      startUtc: `${project.eventDate}T${project.eventTime}:00Z`,
      endUtc: `${project.eventDate}T${project.endTime}:00Z`,
      spaceCategory: 'Event',
      state: mapEventStatusToMews(project.eventStatus),
      notes: project.description,
      occupancy: project.guestCount
    };
    
    // Simulate Mews API call
    await new Promise(resolve => setTimeout(resolve, 1800));
    
    const reservationId = `MWS${Math.floor(Math.random() * 1000000)}`;
    
    console.log(`Created Mews reservation: ${reservationId}`);
    
    return { ok: true, externalId: reservationId };
  } catch (error) {
    console.error('Mews sync failed:', error);
    return { ok: false };
  }
};

// Mapping Functions
const mapLeadStatusToSalesforce = (status: string): string => {
  const mapping: Record<string, string> = {
    'cold': 'Prospecting',
    'warm': 'Qualification',
    'qualified': 'Needs Analysis',
    'proposal': 'Proposal/Price Quote',
    'negotiation': 'Negotiation/Review',
    'won': 'Closed Won',
    'lost': 'Closed Lost'
  };
  return mapping[status] || 'Prospecting';
};

const mapLeadStatusToHubSpot = (status: string): string => {
  const mapping: Record<string, string> = {
    'cold': 'appointmentscheduled',
    'warm': 'qualifiedtobuy',
    'qualified': 'presentationscheduled',
    'proposal': 'decisionmakerboughtin',
    'negotiation': 'contractsent',
    'won': 'closedwon',
    'lost': 'closedlost'
  };
  return mapping[status] || 'appointmentscheduled';
};

const mapLeadStatusToPipedrive = (status: string): number => {
  const mapping: Record<string, number> = {
    'cold': 1,
    'warm': 2,
    'qualified': 3,
    'proposal': 4,
    'negotiation': 5,
    'won': 6,
    'lost': 7
  };
  return mapping[status] || 1;
};

const mapEventStatusToCloudPMS = (status: string): string => {
  const mapping: Record<string, string> = {
    'tentative': 'Tentative',
    'in-progress': 'Definite',
    'confirmed': 'Definite',
    'completed': 'Checked Out',
    'cancelled': 'Cancelled'
  };
  return mapping[status] || 'Tentative';
};

const mapEventStatusToMews = (status: string): string => {
  const mapping: Record<string, string> = {
    'tentative': 'Optional',
    'in-progress': 'Confirmed',
    'confirmed': 'Confirmed',
    'completed': 'CheckedOut',
    'cancelled': 'Cancelled'
  };
  return mapping[status] || 'Optional';
};

// API Routes
export const syncToCRM: RequestHandler = async (req, res) => {
  try {
    const { venueId } = req.params;
    const { projectId, system } = req.body;
    
    if (!venueId || !projectId || !system) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'venueId, projectId, and system are required' }
      });
    }
    
    // Mock project data - in production, fetch from database
    const project: Project = {
      id: projectId,
      venueId,
      clientId: 'client_1',
      name: 'Sample Event Project',
      description: 'Event sync to CRM',
      eventDate: '2024-02-15',
      eventTime: '18:00',
      endTime: '23:00',
      guestCount: 150,
      leadStatus: 'qualified',
      eventStatus: 'tentative',
      priority: 'medium',
      budget: 25000,
      estimatedRevenue: 22000,
      assignedTo: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timeline: [],
      requirements: {
        menuStyle: 'plated',
        serviceStyle: 'full-service',
        specialDietary: [],
        avNeeds: [],
        decorRequests: [],
        specialRequests: [],
        setupNotes: '',
        breakdownNotes: ''
      },
      contacts: [],
      documents: [],
      notes: [],
      tags: []
    };
    
    let result;
    
    switch (system) {
      case 'salesforce':
        result = await syncSalesforce({ venueId, project, system });
        break;
      case 'hubspot':
        result = await syncHubSpot({ venueId, project, system });
        break;
      case 'pipedrive':
        result = await syncPipedrive({ venueId, project, system });
        break;
      default:
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_SYSTEM', message: 'Supported systems: salesforce, hubspot, pipedrive' }
        });
    }
    
    res.json({
      success: result.ok,
      data: {
        projectId,
        system,
        externalId: result.externalId,
        syncedAt: new Date().toISOString(),
        status: result.ok ? 'synced' : 'failed'
      }
    });
    
  } catch (error) {
    console.error('CRM sync error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYNC_ERROR',
        message: 'Failed to sync to CRM system',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
};

export const syncToPMS: RequestHandler = async (req, res) => {
  try {
    const { venueId } = req.params;
    const { projectId, system } = req.body;
    
    // Mock project data
    const project: Project = {
      id: projectId,
      venueId,
      clientId: 'client_1',
      name: 'Hotel Event Booking',
      description: 'PMS sync for hotel event',
      eventDate: '2024-02-15',
      eventTime: '18:00',
      endTime: '23:00',
      guestCount: 200,
      leadStatus: 'won',
      eventStatus: 'confirmed',
      priority: 'high',
      budget: 35000,
      estimatedRevenue: 32000,
      assignedTo: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timeline: [],
      requirements: {
        menuStyle: 'buffet',
        serviceStyle: 'full-service',
        specialDietary: [],
        avNeeds: [],
        decorRequests: [],
        specialRequests: [],
        setupNotes: '',
        breakdownNotes: ''
      },
      contacts: [{ name: 'John Doe', email: 'john@example.com', phone: '555-0123', type: 'primary', relationship: 'event planner', id: '1' }],
      documents: [],
      notes: [],
      tags: []
    };
    
    let result;
    
    switch (system) {
      case 'opera':
        result = await syncOPERACloud(venueId, project);
        break;
      case 'mews':
        result = await syncMews(venueId, project);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_SYSTEM', message: 'Supported systems: opera, mews' }
        });
    }
    
    res.json({
      success: result.ok,
      data: {
        projectId,
        system,
        externalId: result.externalId,
        syncedAt: new Date().toISOString(),
        status: result.ok ? 'synced' : 'failed'
      }
    });
    
  } catch (error) {
    console.error('PMS sync error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYNC_ERROR',
        message: 'Failed to sync to PMS system'
      }
    });
  }
};

export const syncToDiagramming: RequestHandler = async (req, res) => {
  try {
    const { venueId } = req.params;
    const { projectId, provider } = req.body;
    
    if (!venueId || !projectId || !provider) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'venueId, projectId, and provider are required' }
      });
    }
    
    let result;
    
    switch (provider) {
      case 'cvent':
        result = await syncCventDiagram({ venueId, projectId, provider });
        break;
      case 'prismm':
        result = await syncPrismmDiagram({ venueId, projectId, provider });
        break;
      case 'socialtables':
        result = await syncSocialTablesDiagram({ venueId, projectId, provider });
        break;
      default:
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PROVIDER', message: 'Supported providers: cvent, prismm, socialtables' }
        });
    }
    
    res.json({
      success: true,
      data: {
        projectId,
        provider,
        diagramUrl: result.url,
        diagramId: result.diagramId,
        syncedAt: new Date().toISOString(),
        status: 'ready'
      }
    });
    
  } catch (error) {
    console.error('Diagramming sync error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYNC_ERROR',
        message: 'Failed to sync to diagramming system',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
};

export const getIntegrationStatus: RequestHandler = async (req, res) => {
  try {
    const { venueId } = req.params;
    
    // In production, fetch actual integration status from database
    const integrationStatus = {
      crm: {
        salesforce: { connected: true, lastSync: '2024-01-15T10:30:00Z', status: 'active' },
        hubspot: { connected: false, lastSync: null, status: 'disconnected' },
        pipedrive: { connected: true, lastSync: '2024-01-14T15:20:00Z', status: 'active' }
      },
      pms: {
        opera: { connected: true, lastSync: '2024-01-15T09:00:00Z', status: 'active' },
        mews: { connected: false, lastSync: null, status: 'disconnected' }
      },
      diagramming: {
        cvent: { connected: true, lastSync: '2024-01-15T11:00:00Z', status: 'active' },
        prismm: { connected: true, lastSync: '2024-01-15T14:30:00Z', status: 'active' },
        socialtables: { connected: false, lastSync: null, status: 'disconnected' }
      }
    };
    
    res.json({
      success: true,
      data: {
        venueId,
        integrations: integrationStatus,
        lastUpdated: new Date().toISOString()
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_ERROR',
        message: 'Failed to get integration status'
      }
    });
  }
};

export const configureIntegration: RequestHandler = async (req, res) => {
  try {
    const { venueId } = req.params;
    const { system, provider, config } = req.body;
    
    if (!system || !config) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'system and config are required' }
      });
    }
    
    // In production, validate and store integration configuration
    console.log(`Configuring ${system} integration for venue ${venueId}:`, config);
    
    // Validate configuration based on system type
    const validationResult = validateIntegrationConfig(system, provider, config);
    
    if (!validationResult.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CONFIG',
          message: 'Invalid configuration',
          details: validationResult.errors
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        venueId,
        system,
        provider,
        status: 'configured',
        configuredAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CONFIG_ERROR',
        message: 'Failed to configure integration'
      }
    });
  }
};

const validateIntegrationConfig = (system: string, provider: string, config: any) => {
  const errors: string[] = [];
  
  switch (system) {
    case 'crm':
      if (provider === 'salesforce') {
        if (!config.clientId) errors.push('Salesforce client ID required');
        if (!config.clientSecret) errors.push('Salesforce client secret required');
        if (!config.instanceUrl) errors.push('Salesforce instance URL required');
      } else if (provider === 'hubspot') {
        if (!config.apiKey) errors.push('HubSpot API key required');
        if (!config.portalId) errors.push('HubSpot portal ID required');
      } else if (provider === 'pipedrive') {
        if (!config.apiToken) errors.push('Pipedrive API token required');
        if (!config.companyDomain) errors.push('Pipedrive company domain required');
      }
      break;
      
    case 'pms':
      if (provider === 'opera') {
        if (!config.hotelId) errors.push('OPERA hotel ID required');
        if (!config.username) errors.push('OPERA username required');
        if (!config.password) errors.push('OPERA password required');
      } else if (provider === 'mews') {
        if (!config.accessToken) errors.push('Mews access token required');
        if (!config.propertyId) errors.push('Mews property ID required');
      }
      break;
      
    case 'diagramming':
      if (provider === 'cvent') {
        if (!config.apiKey) errors.push('Cvent API key required');
        if (!config.accountId) errors.push('Cvent account ID required');
      } else if (provider === 'prismm') {
        if (!config.apiToken) errors.push('Prismm API token required');
        if (!config.organizationId) errors.push('Prismm organization ID required');
      }
      break;
      
    default:
      errors.push('Unknown system type');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

export const testIntegration: RequestHandler = async (req, res) => {
  try {
    const { venueId } = req.params;
    const { system, provider } = req.body;
    
    console.log(`Testing ${system}/${provider} integration for venue ${venueId}`);
    
    // Simulate integration test
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const testResults = {
      connection: Math.random() > 0.1, // 90% success rate
      authentication: Math.random() > 0.05, // 95% success rate
      dataSync: Math.random() > 0.15, // 85% success rate
      responseTime: Math.floor(Math.random() * 1000) + 200 // 200-1200ms
    };
    
    const allPassed = Object.values(testResults).every(result => 
      typeof result === 'boolean' ? result : true
    );
    
    res.json({
      success: allPassed,
      data: {
        venueId,
        system,
        provider,
        testResults,
        status: allPassed ? 'passed' : 'failed',
        testedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'TEST_ERROR',
        message: 'Failed to test integration'
      }
    });
  }
};

export default syncToCRM;
