/**
 * BEO Management Page - Maestro Banquets
 * Comprehensive BEO creation, editing, and management interface
 */

import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { BEOEditor } from '../components/panels/BEOEditor';
import { GlobalCalendar } from '../components/panels/GlobalCalendar';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { FileText, Calendar, Save, Eye, Printer } from 'lucide-react';

export default function BEOManagement() {
  const { beoId, eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const forceView = params.get('mode') === 'view';
  const [activeTab, setActiveTab] = useState<'editor' | 'calendar'>('editor');

  const handleBEOSave = () => {
    console.log('BEO saved');
    // Could navigate back to calendar or show success message
  };

  const handleClose = () => {
    navigate('/calendar');
  };

  const handleBEOSelect = (selectedBeoId: string) => {
    navigate(`/beo-management/${selectedBeoId}`);
  };

  const handleCreateBEO = (selectedEventId: string) => {
    navigate(`/beo-management/new?eventId=${selectedEventId}`);
  };

  const headerActions = (
    <>
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
        <TabsList>
          <TabsTrigger value="editor" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            BEO Editor
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendar View
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Button variant="outline" size="sm">
        <Eye className="h-4 w-4 mr-2" />
        Preview
      </Button>
      <Button variant="outline" size="sm">
        <Printer className="h-4 w-4 mr-2" />
        Print
      </Button>
      <Button size="sm">
        <Save className="h-4 w-4 mr-2" />
        Save
      </Button>
    </>
  );

  return (
    <DashboardLayout
      title="BEO Management"
      subtitle={beoId === 'new' ? 'Create New BEO' : `Edit BEO ${beoId}`}
      actions={headerActions}
    >
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
        <TabsContent value="editor" className="mt-0">
          <BEOEditor
            eventId={eventId}
            beoId={beoId === 'new' ? undefined : beoId}
            mode={forceView ? 'view' : (beoId === 'new' ? 'create' : 'edit')}
            onSave={handleBEOSave}
            onClose={handleClose}
          />
        </TabsContent>

        <TabsContent value="calendar" className="mt-0">
          <GlobalCalendar
            onBEOSelect={handleBEOSelect}
            onCreateBEO={handleCreateBEO}
            viewMode="calendar"
          />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
