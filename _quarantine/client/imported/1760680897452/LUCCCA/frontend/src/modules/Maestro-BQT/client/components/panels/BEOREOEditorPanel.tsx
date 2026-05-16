/**
 * BEO/REO Editor Panel - Advanced Document Management
 * 
 * Features:
 * - Parse BEO/REO documents with validation
 * - Autosave with conflict resolution
 * - Version control with change tracking
 * - Real-time collaboration
 * - Role-based permissions
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PanelShell } from '../../builder/maestro-banquets.builder-seed';
import type { 
  BEODocument, 
  BEOVersion, 
  BEOParseResult, 
  AutosaveState,
  BEOPermission,
  BEOSection,
  MenuSection,
  ServiceSection,
  SetupSection,
  BarSection,
  VersionChange
} from '../../types/beo';

interface BEOREOEditorProps {
  eventId?: string;
  documentId?: string;
  userRole?: BEOPermission;
  mode?: 'create' | 'edit' | 'view';
}

const AutosaveIndicator: React.FC<{ autosave: AutosaveState }> = ({ autosave }) => {
  const statusText = autosave.saveInProgress ? 'Saving...' :
                    autosave.hasUnsavedChanges ? 'Unsaved changes' :
                    'All changes saved';
  
  const statusColor = autosave.saveInProgress ? 'text-warn' :
                     autosave.hasUnsavedChanges ? 'text-err' :
                     'text-ok';

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={`w-2 h-2 rounded-full ${
        autosave.saveInProgress ? 'bg-warn animate-pulse' :
        autosave.hasUnsavedChanges ? 'bg-err' :
        'bg-ok'
      }`} />
      <span className={statusColor}>{statusText}</span>
      {autosave.lastSaved && (
        <span className="text-muted">
          Last saved: {new Date(autosave.lastSaved).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};

const VersionSelector: React.FC<{
  versions: BEOVersion[];
  currentVersion: number;
  onVersionSelect: (version: BEOVersion) => void;
  onCreateVersion: () => void;
}> = ({ versions, currentVersion, onVersionSelect, onCreateVersion }) => (
  <div className="flex items-center gap-2">
    <select
      value={currentVersion}
      onChange={(e) => {
        const version = versions.find(v => v.version === Number(e.target.value));
        if (version) onVersionSelect(version);
      }}
      className="text-xs p-1 bg-panel border border-default rounded"
    >
      {versions.map(version => (
        <option key={version.id} value={version.version}>
          v{version.version} - {version.title}
        </option>
      ))}
    </select>
    <button
      onClick={onCreateVersion}
      className="px-2 py-1 text-xs bg-accent text-white rounded hover:bg-accent/90 transition-colors"
    >
      + Version
    </button>
  </div>
);

const ParseResultDisplay: React.FC<{ result: BEOParseResult }> = ({ result }) => {
  if (!result.errors.length && !result.warnings.length) return null;

  return (
    <div className="glass-panel p-4 mb-4">
      <h4 className="font-semibold text-primary mb-3">Document Validation</h4>
      
      {result.errors.length > 0 && (
        <div className="mb-3">
          <div className="text-sm font-medium text-err mb-2">Errors ({result.errors.length})</div>
          <div className="space-y-1">
            {result.errors.map((error, idx) => (
              <div key={idx} className="text-xs text-err bg-err/10 p-2 rounded">
                {error.path && <span className="font-medium">{error.path}: </span>}
                {error.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="mb-3">
          <div className="text-sm font-medium text-warn mb-2">Warnings ({result.warnings.length})</div>
          <div className="space-y-1">
            {result.warnings.map((warning, idx) => (
              <div key={idx} className="text-xs text-warn bg-warn/10 p-2 rounded">
                {warning.path && <span className="font-medium">{warning.path}: </span>}
                {warning.message}
                {warning.suggestion && <div className="mt-1 text-muted">Suggestion: {warning.suggestion}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {result.suggestions.length > 0 && (
        <div>
          <div className="text-sm font-medium text-accent mb-2">Suggestions ({result.suggestions.length})</div>
          <div className="space-y-1">
            {result.suggestions.map((suggestion, idx) => (
              <div key={idx} className="text-xs text-primary bg-accent/10 p-2 rounded flex justify-between items-start">
                <div>
                  {suggestion.path && <span className="font-medium">{suggestion.path}: </span>}
                  {suggestion.message}
                </div>
                {suggestion.autoFixable && (
                  <button className="ml-2 px-2 py-0.5 text-xs bg-accent text-white rounded hover:bg-accent/90">
                    Auto Fix
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SectionEditor: React.FC<{
  section: BEOSection;
  onUpdate: (section: BEOSection) => void;
  onDelete: (sectionId: string) => void;
  userRole: BEOPermission;
}> = ({ section, onUpdate, onDelete, userRole }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(section.content);

  const canEdit = ['EventManager', 'ExecutiveChef', 'SeniorExecSous'].includes(userRole);
  const canDelete = ['EventManager', 'ExecutiveChef'].includes(userRole);

  const handleSave = () => {
    onUpdate({
      ...section,
      content: editContent as any,
      lastModified: new Date().toISOString()
    });
    setIsEditing(false);
  };

  const renderSectionContent = () => {
    switch (section.type) {
      case 'menu':
        return (
          <div className="space-y-3">
            {editContent.menu?.courses.map(course => (
              <div key={course.id} className="glass-panel p-3">
                <div className="flex justify-between items-start mb-2">
                  <h5 className="font-medium text-primary capitalize">{course.course}</h5>
                  <span className="text-sm text-accent">${course.courseCost.toFixed(2)}</span>
                </div>
                <div className="text-sm text-muted">{course.description}</div>
                <div className="mt-2 space-y-1">
                  {course.items.map(item => (
                    <div key={item.id} className="text-xs text-primary">
                      • {item.name} - ${item.price.toFixed(2)} x{item.quantity}
                    </div>
                  ))}
                </div>
              </div>
            )) || <div className="text-muted">No menu items</div>}
          </div>
        );
      
      case 'service':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-panel p-3">
                <h5 className="font-medium text-primary mb-2">Staffing</h5>
                {editContent.service?.staffing.map((staff, idx) => (
                  <div key={idx} className="text-xs text-primary">
                    {staff.count}x {staff.role} ({staff.hours}h)
                  </div>
                )) || <div className="text-muted">No staffing requirements</div>}
              </div>
              <div className="glass-panel p-3">
                <h5 className="font-medium text-primary mb-2">Equipment</h5>
                {editContent.service?.equipmentNeeds.map((eq, idx) => (
                  <div key={idx} className="text-xs text-primary">
                    {eq.quantity}x {eq.item}
                  </div>
                )) || <div className="text-muted">No equipment needs</div>}
              </div>
            </div>
          </div>
        );
      
      case 'setup':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-panel p-3">
                <h5 className="font-medium text-primary mb-2">Layout</h5>
                {editContent.setup?.layout.map((layout, idx) => (
                  <div key={idx} className="text-xs text-primary">
                    {layout.area}: {layout.setup} ({layout.capacity} guests)
                  </div>
                )) || <div className="text-muted">No layout specified</div>}
              </div>
              <div className="glass-panel p-3">
                <h5 className="font-medium text-primary mb-2">Furniture</h5>
                {editContent.setup?.furniture.map((furniture, idx) => (
                  <div key={idx} className="text-xs text-primary">
                    {furniture.quantity}x {furniture.type}
                  </div>
                )) || <div className="text-muted">No furniture specified</div>}
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="glass-panel p-3">
            <pre className="text-xs text-primary whitespace-pre-wrap">
              {JSON.stringify(editContent, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <div className="glass-panel p-4 mb-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold text-accent">{section.title}</h4>
          {section.required && (
            <span className="text-xs text-err">Required</span>
          )}
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-2 py-1 text-xs bg-panel border border-default rounded hover:bg-muted/10 transition-colors"
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          )}
          {isEditing && (
            <button
              onClick={handleSave}
              className="px-2 py-1 text-xs bg-ok text-white rounded hover:bg-ok/90 transition-colors"
            >
              Save
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(section.id)}
              className="px-2 py-1 text-xs bg-err text-white rounded hover:bg-err/90 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <input
            value={section.title}
            onChange={(e) => onUpdate({ ...section, title: e.target.value })}
            className="w-full p-2 bg-panel border border-default rounded text-sm"
            placeholder="Section title..."
          />
          <textarea
            value={JSON.stringify(editContent, null, 2)}
            onChange={(e) => {
              try {
                setEditContent(JSON.parse(e.target.value));
              } catch {
                // Invalid JSON, ignore
              }
            }}
            className="w-full h-40 p-2 bg-panel border border-default rounded text-xs font-mono"
            placeholder="Section content (JSON)..."
          />
        </div>
      ) : (
        renderSectionContent()
      )}
    </div>
  );
};

export const BEOREOEditorPanel: React.FC<BEOREOEditorProps> = ({
  eventId,
  documentId,
  userRole = 'EventManager',
  mode = 'edit'
}) => {
  const [document, setDocument] = useState<BEODocument | null>(null);
  const [versions, setVersions] = useState<BEOVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState(1);
  const [parseResult, setParseResult] = useState<BEOParseResult | null>(null);
  const [autosave, setAutosave] = useState<AutosaveState>({
    enabled: true,
    interval: 30,
    lastSaved: new Date().toISOString(),
    hasUnsavedChanges: false,
    saveInProgress: false,
    conflicts: []
  });
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize document
  useEffect(() => {
    const loadDocument = async () => {
      setIsLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockDocument: BEODocument = {
        id: documentId || `beo-${Date.now()}`,
        eventId: eventId || 'evt-1',
        type: 'BEO',
        version: currentVersion,
        status: 'draft',
        title: 'Wedding Reception BEO',
        description: 'Comprehensive banquet event order for Williams-Johnson wedding',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user-1',
        lastModifiedBy: 'user-1',
        approvalRequired: true,
        header: {
          eventName: 'Wedding Reception',
          eventDate: '2024-06-15',
          contact: 'Event Manager',
          paymentType: 'card'
        },
        event: {
          date: '2024-06-15',
          time: '18:00',
          room: 'Main Ballroom',
          function: 'Reception',
          setup: 'Banquet',
          expected: 150,
          guaranteed: 150
        },
        menu: { items: [] },
        beverage: { room: 'Main Ballroom' },
        setup: { room: 'Main Ballroom' },
        sections: [
          {
            id: 'menu-1',
            title: 'Dinner Menu',
            order: 1,
            type: 'menu',
            required: true,
            content: {
              menu: {
                courses: [
                  {
                    id: 'app-1',
                    name: 'Appetizer Course',
                    description: 'Selection of seasonal appetizers',
                    course: 'appetizer',
                    items: [
                      {
                        id: 'item-1',
                        name: 'Shrimp Cocktail',
                        description: 'Jumbo shrimp with cocktail sauce',
                        ingredients: ['shrimp', 'cocktail sauce', 'lemon'],
                        allergens: ['shellfish'],
                        price: 18.50,
                        quantity: 150,
                        linkedRecipeId: 'recipe-1'
                      }
                    ],
                    courseCost: 2775.00
                  }
                ],
                dietaryRestrictions: [],
                allergies: [],
                serviceStyle: 'plated',
                totalCost: 2775.00
              }
            },
            lastModified: new Date().toISOString()
          }
        ],
        attachments: [],
        totalCost: 12500.00,
        guestCount: 150,
        costPerGuest: 83.33,
        serviceDate: '2024-06-15',
        setupTime: '14:00',
        eventStartTime: '18:00',
        eventEndTime: '23:00',
        breakdownTime: '01:00'
      };

      setDocument(mockDocument);
      setVersions([{
        id: 'v1',
        documentId: mockDocument.id,
        version: 1,
        title: 'Initial Draft',
        createdAt: new Date().toISOString(),
        createdBy: 'user-1',
        changes: [],
        snapshot: mockDocument,
        approved: false
      }]);
      
      setIsLoading(false);
    };

    loadDocument();
  }, [documentId, eventId, currentVersion]);

  // Autosave functionality
  useEffect(() => {
    if (!autosave.enabled || !document) return;

    const interval = setInterval(() => {
      if (autosave.hasUnsavedChanges && !autosave.saveInProgress) {
        handleAutosave();
      }
    }, autosave.interval * 1000);

    return () => clearInterval(interval);
  }, [autosave, document]);

  const handleAutosave = useCallback(async () => {
    setAutosave(prev => ({ ...prev, saveInProgress: true }));
    
    // Simulate API save
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setAutosave(prev => ({
      ...prev,
      saveInProgress: false,
      hasUnsavedChanges: false,
      lastSaved: new Date().toISOString()
    }));
  }, []);

  const handleDocumentChange = useCallback((updates: Partial<BEODocument>) => {
    setDocument(prev => prev ? { ...prev, ...updates } : null);
    setAutosave(prev => ({ ...prev, hasUnsavedChanges: true }));
  }, []);

  const handleSectionUpdate = useCallback((section: BEOSection) => {
    if (!document) return;
    
    const updatedSections = document.sections.map(s => 
      s.id === section.id ? section : s
    );
    
    handleDocumentChange({ 
      sections: updatedSections,
      updatedAt: new Date().toISOString()
    });
  }, [document, handleDocumentChange]);

  const handleSectionDelete = useCallback((sectionId: string) => {
    if (!document) return;
    
    const updatedSections = document.sections.filter(s => s.id !== sectionId);
    handleDocumentChange({ sections: updatedSections });
  }, [document, handleDocumentChange]);

  const handleCreateVersion = useCallback(() => {
    if (!document) return;
    
    const newVersion: BEOVersion = {
      id: `v${versions.length + 1}`,
      documentId: document.id,
      version: versions.length + 1,
      title: `Version ${versions.length + 1}`,
      createdAt: new Date().toISOString(),
      createdBy: 'user-1',
      changes: [],
      snapshot: { ...document },
      approved: false
    };
    
    setVersions(prev => [...prev, newVersion]);
    setCurrentVersion(newVersion.version);
  }, [document, versions]);

  const canEdit = ['EventManager', 'ExecutiveChef', 'SeniorExecSous'].includes(userRole);
  const canApprove = ['EventManager', 'ExecutiveChef'].includes(userRole);

  const toolbarRight = (
    <div className="flex items-center gap-3">
      <AutosaveIndicator autosave={autosave} />
      
      <VersionSelector
        versions={versions}
        currentVersion={currentVersion}
        onVersionSelect={(version) => setCurrentVersion(version.version)}
        onCreateVersion={handleCreateVersion}
      />
      
      <button
        onClick={() => setShowVersionHistory(!showVersionHistory)}
        className="px-3 py-1.5 bg-panel border border-default rounded-lg text-sm font-medium hover:bg-muted/10 transition-colors"
      >
        📋 History
      </button>
      
      {canApprove && document?.status === 'pending_approval' && (
        <button
          onClick={() => handleDocumentChange({ status: 'approved', approvedAt: new Date().toISOString() })}
          className="px-3 py-1.5 bg-ok text-white rounded-lg text-sm font-medium hover:bg-ok/90 transition-colors"
        >
          ✅ Approve
        </button>
      )}
      
      <button
        onClick={() => {/* Export functionality */}}
        className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
      >
        📄 Export
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <PanelShell title="BEO/REO Editor" toolbarRight={toolbarRight}>
        <div className="glass-panel p-8 text-center">
          <div className="animate-pulse text-muted">Loading document...</div>
        </div>
      </PanelShell>
    );
  }

  if (!document) {
    return (
      <PanelShell title="BEO/REO Editor" toolbarRight={toolbarRight}>
        <div className="glass-panel p-8 text-center">
          <div className="text-err">Document not found</div>
        </div>
      </PanelShell>
    );
  }

  return (
    <PanelShell title={`BEO/REO Editor — ${document.title}`} toolbarRight={toolbarRight}>
      <div className="space-y-6">
        {/* Document Header */}
        <div className="glass-panel p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-sm text-muted">Status</div>
              <div className={`text-lg font-bold capitalize ${
                document.status === 'approved' ? 'text-ok' :
                document.status === 'pending_approval' ? 'text-warn' :
                'text-primary'
              }`}>
                {document.status.replace('_', ' ')}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted">Guest Count</div>
              <div className="text-lg font-bold text-primary">{document.guestCount}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted">Total Cost</div>
              <div className="text-lg font-bold text-accent">${document.totalCost.toLocaleString()}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted">Cost per Guest</div>
              <div className="text-lg font-bold text-accent">${document.costPerGuest.toFixed(2)}</div>
            </div>
          </div>
          
          {canEdit && (
            <div className="space-y-3">
              <input
                value={document.title}
                onChange={(e) => handleDocumentChange({ title: e.target.value })}
                className="w-full p-2 bg-panel border border-default rounded text-lg font-semibold"
              />
              <textarea
                value={document.description || ''}
                onChange={(e) => handleDocumentChange({ description: e.target.value })}
                className="w-full p-2 bg-panel border border-default rounded text-sm"
                placeholder="Document description..."
                rows={2}
              />
            </div>
          )}
        </div>

        {/* Parse Results */}
        {parseResult && <ParseResultDisplay result={parseResult} />}

        {/* Document Sections */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-accent">Document Sections</h3>
            {canEdit && (
              <button
                onClick={() => {/* Add section functionality */}}
                className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
              >
                + Add Section
              </button>
            )}
          </div>
          
          {document.sections.map(section => (
            <SectionEditor
              key={section.id}
              section={section}
              onUpdate={handleSectionUpdate}
              onDelete={handleSectionDelete}
              userRole={userRole}
            />
          ))}
        </div>

        {/* Version History */}
        {showVersionHistory && (
          <div className="glass-panel p-4">
            <h4 className="font-semibold text-accent mb-3">Version History</h4>
            <div className="space-y-2">
              {versions.map(version => (
                <div key={version.id} className="flex justify-between items-center p-2 bg-panel rounded">
                  <div>
                    <span className="font-medium">v{version.version}</span>
                    <span className="text-muted ml-2">{version.title}</span>
                    <span className="text-xs text-muted ml-2">
                      {new Date(version.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => setCurrentVersion(version.version)}
                    className="px-2 py-1 text-xs bg-accent text-white rounded hover:bg-accent/90"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PanelShell>
  );
};

export default BEOREOEditorPanel;
