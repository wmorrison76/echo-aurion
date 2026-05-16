import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEventStore } from '../stores/eventStore';
import { MBQTPanel, ThemeToggle, PanelType } from '../builder/maestro-banquets.builder-seed';

const validPanelTypes: PanelType[] = [
  'BEOBuilder',
  'BEOREOEditor',
  'MenuRecipe',
  'Timeline',
  'MaestroDashboard',
  'SeatingPlanner',
  'CapacityAnalyzer',
  'LayoutDesigner',
  'ServiceStyle',
  'BeveragePlanner',
  'NutritionAllergen',
  'Sustainability',
  'PurchasingVendors',
  'FinancePnlCashflow',
  'ExecutionConsole',
  'PostEventQAWizard',
  'VendorRisk',
  'ForecastSignals',
  'ExecutiveDashboards',
  'SectionPlanner',
  'FiringOrder',
  'CaptainConsole',
  'ChefLaunchBoard'
];

const panelDescriptions: Record<PanelType, string> = {
  'BEOBuilder': 'Create and manage banquet event orders with menu planning and costing',
  'BEOREOEditor': 'Advanced BEO/REO document editor with parsing, autosave, and version control',
  'MenuRecipe': 'Menu management with recipe linking, scaling, and Echo AI integration',
  'Timeline': 'Event timeline management with prep day, execution day, and role breakdowns',
  'MaestroDashboard': 'Main chef dashboard with Nova Lab integration, notifications, and real-time BEO updates',
  'SeatingPlanner': 'Design seating layouts and manage guest assignments',
  'CapacityAnalyzer': 'Analyze venue capacity and optimization opportunities',
  'LayoutDesigner': 'Design and visualize event space layouts',
  'ServiceStyle': 'Configure service styles and operational procedures',
  'BeveragePlanner': 'Plan beverage service and calculate consumption needs',
  'NutritionAllergen': 'Manage dietary restrictions and nutritional analysis',
  'Sustainability': 'Track sustainability metrics and eco-friendly practices',
  'PurchasingVendors': 'Manage vendor relationships and purchasing workflows',
  'FinancePnlCashflow': 'Monitor financial performance and cash flow projections',
  'ExecutionConsole': 'Real-time event execution and timeline management',
  'PostEventQAWizard': 'Post-event quality assurance and feedback collection',
  'VendorRisk': 'Assess and monitor vendor risk factors',
  'ForecastSignals': 'Predictive analytics and demand forecasting',
  'ExecutiveDashboards': 'High-level executive reporting and KPI monitoring',
  'SectionPlanner': 'Design floor sections and manage table assignments for captain workflow',
  'FiringOrder': 'Configure table firing sequences and course timing optimization',
  'CaptainConsole': 'Real-time captain interface for kitchen coordination and service management',
  'ChefLaunchBoard': 'Comprehensive chef operations dashboard with Echo Event Studio integration'
};

export default function PanelView() {
  const { panelType, eventId } = useParams<{ panelType: string; eventId?: string }>();
  const navigate = useNavigate();
  const { currentEvent, events } = useEventStore();

  // Validate panel type
  if (!panelType || !validPanelTypes.includes(panelType as PanelType)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="glass-panel-elevated p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-err mb-4">Invalid Panel</h1>
          <p className="text-muted mb-6">
            The panel type "{panelType}" is not recognized.
          </p>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
          >
            ← Return to Workspace
          </Link>
        </div>
      </div>
    );
  }

  const typedPanelType = panelType as PanelType;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="glass-panel p-4 m-6 mb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-3 py-2 bg-panel border border-default rounded-lg hover:bg-muted/10 transition-colors"
            >
              ← Back to Workspace
            </button>
            <div>
              <h1 className="text-xl font-bold text-primary">{typedPanelType.replace(/([A-Z])/g, ' $1').trim()}</h1>
              <p className="text-sm text-muted">{panelDescriptions[typedPanelType]}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Event Selector */}
            {events.length > 1 && (
              <select
                value={currentEvent?.id || ''}
                onChange={(e) => {
                  const selectedEvent = events.find(event => event.id === e.target.value);
                  if (selectedEvent) {
                    useEventStore.getState().setCurrentEvent(selectedEvent);
                  }
                }}
                className="p-2 bg-panel border border-default rounded-lg text-primary text-sm focus:ring-2 focus:ring-accent focus:border-transparent"
              >
                <option value="">Select Event</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            )}
            
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Panel Content */}
      <div className="p-6 pt-6">
        {currentEvent ? (
          <MBQTPanel
            panelType={typedPanelType}
            eventId={currentEvent.id}
            roomId="default"
          />
        ) : (
          <div className="glass-panel-elevated p-8 text-center">
            <h2 className="text-xl font-bold text-muted mb-4">No Event Selected</h2>
            <p className="text-muted mb-6">
              Please select an event to view the {typedPanelType} panel.
            </p>
            {events.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted">Available events:</p>
                {events.map(event => (
                  <button
                    key={event.id}
                    onClick={() => useEventStore.getState().setCurrentEvent(event)}
                    className="block w-full p-3 bg-panel border border-default rounded-lg hover:bg-accent hover:text-white transition-colors"
                  >
                    <div className="font-medium">{event.title}</div>
                    <div className="text-sm opacity-75">
                      {new Date(event.date).toLocaleDateString()} • {event.guestCount} guests
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
              >
                Create New Event
              </button>
            )}
          </div>
        )}
      </div>

      {/* Quick Navigation */}
      <div className="fixed bottom-6 right-6">
        <div className="glass-panel p-3">
          <div className="text-xs text-muted mb-2">Quick Navigation</div>
          <div className="grid grid-cols-2 gap-1">
            {['MaestroDashboard', 'BEOBuilder', 'SeatingPlanner', 'SectionPlanner', 'CaptainConsole', 'ChefLaunchBoard'].map(panel => (
              <Link
                key={panel}
                to={`/panel/${panel}`}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  panel === panelType
                    ? 'bg-accent text-white'
                    : 'text-muted hover:text-primary hover:bg-muted/10'
                }`}
              >
                {panel.replace(/([A-Z])/g, ' $1').trim()}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
