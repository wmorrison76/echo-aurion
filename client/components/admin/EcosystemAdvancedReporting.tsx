/**
 * Ecosystem Control Panel - Phase 8: Advanced Reporting
 * Custom reports, scheduling, and automated delivery
 */

import React, { useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Button,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Checkbox,
} from '@/components/ui/button';
import {
  FileText,
  Calendar,
  Mail,
  Plus,
  Edit,
  Trash2,
  Download,
  Send,
  Clock,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'employee_summary' | 'hr_sync' | 'access_control' | 'performance' | 'compliance';
  sections: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface ScheduledReport {
  id: string;
  templateId: string;
  templateName: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  recipients: string[];
  format: 'pdf' | 'excel' | 'html';
  lastRun?: Date;
  nextRun: Date;
  isActive: boolean;
}

interface GeneratedReport {
  id: string;
  templateId: string;
  templateName: string;
  generatedAt: Date;
  fileSize: number;
  format: string;
  downloadUrl?: string;
}

interface EcosystemAdvancedReportingProps {
  templates?: ReportTemplate[];
  scheduledReports?: ScheduledReport[];
  generatedReports?: GeneratedReport[];
  onCreateTemplate?: (template: Partial<ReportTemplate>) => Promise<void>;
  onGenerateReport?: (templateId: string, format: string) => Promise<GeneratedReport>;
  onScheduleReport?: (scheduledReport: Partial<ScheduledReport>) => Promise<void>;
  onDeleteSchedule?: (scheduleId: string) => Promise<void>;
  onDownloadReport?: (reportId: string) => Promise<void>;
}

const REPORT_TYPES = {
  employee_summary: 'Employee Summary',
  hr_sync: 'HR Sync Status',
  access_control: 'Access Control Audit',
  performance: 'Performance Metrics',
  compliance: 'Compliance Report',
};

const FREQUENCY_LABELS = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

export const EcosystemAdvancedReporting: React.FC<EcosystemAdvancedReportingProps> = ({
  templates = [],
  scheduledReports = [],
  generatedReports = [],
  onCreateTemplate,
  onGenerateReport,
  onScheduleReport,
  onDeleteSchedule,
  onDownloadReport,
}) => {
  const { toast } = useToast();
  const [newTemplateDialog, setNewTemplateDialog] = useState(false);
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduledReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState<string>('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<string>('weekly');
  const [format, setFormat] = useState<string>('pdf');

  // Create template
  const handleCreateTemplate = useCallback(async () => {
    if (!templateName || !templateType || !onCreateTemplate) return;

    setIsLoading(true);
    try {
      await onCreateTemplate({
        name: templateName,
        type: templateType as any,
        description: `Custom ${templateType} report`,
      });

      toast({
        title: 'Template created',
        description: `${templateName} has been created`,
      });

      setNewTemplateDialog(false);
      setTemplateName('');
      setTemplateType('');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create template',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [templateName, templateType, onCreateTemplate, toast]);

  // Schedule report
  const handleScheduleReport = useCallback(async () => {
    if (!selectedTemplate || !recipients.length || !onScheduleReport) return;

    setIsLoading(true);
    try {
      await onScheduleReport({
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        frequency: frequency as any,
        recipients,
        format: format as any,
        isActive: true,
        nextRun: new Date(),
      });

      toast({
        title: 'Report scheduled',
        description: `Report will be sent ${frequency}`,
      });

      setScheduleDialog(false);
      setRecipients([]);
      setFrequency('weekly');
      setFormat('pdf');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to schedule report',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedTemplate, recipients, frequency, format, onScheduleReport, toast]);

  // Generate report
  const handleGenerateReport = useCallback(
    async (templateId: string) => {
      if (!onGenerateReport) return;

      setIsLoading(true);
      try {
        const report = await onGenerateReport(templateId, format);

        toast({
          title: 'Report generated',
          description: 'Report is ready for download',
        });

        if (onDownloadReport) {
          await onDownloadReport(report.id);
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to generate report',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [onGenerateReport, onDownloadReport, format, toast]
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="generated">Generated</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4 mt-4">
          <Button
            onClick={() => setNewTemplateDialog(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Template
          </Button>

          {templates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(template => (
                <Card key={template.id}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {template.name}
                    </CardTitle>
                    <CardDescription>
                      {REPORT_TYPES[template.type as keyof typeof REPORT_TYPES]}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600">
                      {template.description}
                    </p>

                    <div className="space-y-2 text-xs text-gray-600">
                      <p>Sections: {template.sections.length}</p>
                      <p>Created: {template.createdAt.toLocaleDateString()}</p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleGenerateReport(template.id)}
                        disabled={isLoading}
                        className="flex-1 gap-1"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Generate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedTemplate(template)}
                        className="flex-1 gap-1"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        Schedule
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-8">
              <p className="text-gray-600">No templates yet. Create one to get started.</p>
            </Card>
          )}
        </TabsContent>

        {/* Scheduled Tab */}
        <TabsContent value="scheduled" className="space-y-4 mt-4">
          {scheduledReports.length > 0 ? (
            <div className="space-y-3">
              {scheduledReports.map(report => (
                <Card key={report.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {report.templateName}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {FREQUENCY_LABELS[report.frequency]} to {report.recipients.join(', ')}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Next run: {report.nextRun.toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          className={cn(
                            report.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          )}
                        >
                          {report.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-600"
                          onClick={() => onDeleteSchedule?.(report.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-8">
              <p className="text-gray-600">
                No scheduled reports. Schedule one from a template.
              </p>
            </Card>
          )}
        </TabsContent>

        {/* Generated Tab */}
        <TabsContent value="generated" className="space-y-4 mt-4">
          {generatedReports.length > 0 ? (
            <div className="space-y-3">
              {generatedReports.map(report => (
                <Card key={report.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {report.templateName}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Generated: {report.generatedAt.toLocaleString()} •{' '}
                          {(report.fileSize / 1024).toFixed(2)} KB
                        </p>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => onDownloadReport?.(report.id)}
                        className="gap-2"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-8">
              <p className="text-gray-600">
                No generated reports yet. Generate one from a template.
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Template Dialog */}
      <Dialog open={newTemplateDialog} onOpenChange={setNewTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Report Template</DialogTitle>
            <DialogDescription>
              Create a new custom report template
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Template Name *</label>
              <Input
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder="e.g., Weekly Employee Summary"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Report Type *</label>
              <Select value={templateType} onValueChange={setTemplateType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REPORT_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewTemplateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTemplate}
              disabled={isLoading || !templateName || !templateType}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Report Dialog */}
      <Dialog open={!!selectedTemplate && scheduleDialog} onOpenChange={setScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Report</DialogTitle>
            <DialogDescription>
              Set up automated report delivery for {selectedTemplate?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Frequency</label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Format</label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Recipients</label>
              <div className="space-y-1 text-xs">
                {['admin@example.com', 'manager@example.com', 'hr@example.com'].map(email => (
                  <label key={email} className="flex items-center gap-2">
                    <Checkbox
                      checked={recipients.includes(email)}
                      onCheckedChange={checked => {
                        if (checked) {
                          setRecipients([...recipients, email]);
                        } else {
                          setRecipients(recipients.filter(r => r !== email));
                        }
                      }}
                    />
                    <span>{email}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setScheduleDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleScheduleReport}
              disabled={isLoading || recipients.length === 0}
            >
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EcosystemAdvancedReporting;
