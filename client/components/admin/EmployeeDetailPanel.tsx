/**
 * Employee Detail Panel
 * Modal view with inline editing, audit trail, and related information
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Edit, Save, X, Eye, EyeOff, Mail, Lock, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department: string;
  position_title: string;
  employment_type: 'SALARY' | 'HOURLY' | '1099_CONTRACTOR';
  status: 'ACTIVE' | 'INACTIVE' | 'ONBOARDING' | 'SUSPENDED' | 'TERMINATED';
  hire_date: string;
  hourly_rate?: number;
  salary?: number;
  outlet_id?: string;
  outlet_name?: string;
  last_login_at?: string;
  access_level?: string;
  can_access_system?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  field: string;
  old_value: string;
  new_value: string;
  changed_by: string;
}

interface EmployeeDetailPanelProps {
  employee: Employee | null;
  isOpen: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onSave?: (employee: Partial<Employee>) => Promise<void>;
  onSendEmail?: (type: 'welcome' | 'password_reset' | 'credentials') => Promise<void>;
  onGrantAccess?: () => Promise<void>;
  onRevokeAccess?: () => Promise<void>;
  auditTrail?: AuditEntry[];
}

export const EmployeeDetailPanel: React.FC<EmployeeDetailPanelProps> = ({
  employee,
  isOpen,
  isLoading = false,
  onClose,
  onSave,
  onSendEmail,
  onGrantAccess,
  onRevokeAccess,
  auditTrail = [],
}) => {
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [editedEmployee, setEditedEmployee] = useState<Partial<Employee>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [emailType, setEmailType] = useState<'welcome' | 'password_reset' | 'credentials'>(
    'welcome'
  );

  // Initialize edited employee when modal opens
  useEffect(() => {
    if (employee) {
      setEditedEmployee(employee);
      setEditMode(false);
    }
  }, [employee, isOpen]);

  if (!employee) return null;

  // Handle field change
  const handleFieldChange = useCallback(
    (field: keyof Employee, value: any) => {
      setEditedEmployee((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );

  // Handle save
  const handleSave = useCallback(async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      // Only send changed fields
      const changes: Partial<Employee> = {};
      Object.keys(editedEmployee).forEach((key) => {
        const k = key as keyof Employee;
        if (editedEmployee[k] !== employee[k]) {
          changes[k] = editedEmployee[k];
        }
      });

      if (Object.keys(changes).length === 0) {
        toast({
          title: 'No changes',
          description: 'You did not make any changes',
        });
        setEditMode(false);
        setIsSaving(false);
        return;
      }

      await onSave(changes);
      setEditMode(false);
      toast({
        title: 'Employee updated',
        description: 'Changes saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [editedEmployee, employee, onSave, toast]);

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditedEmployee(employee);
    setEditMode(false);
  }, [employee]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
          <DialogHeader className="flex flex-row items-start justify-between">
            <div className="flex-1">
              <DialogTitle>
                {editedEmployee.first_name} {editedEmployee.last_name}
              </DialogTitle>
              <DialogDescription>
                {editedEmployee.employee_number} • {editedEmployee.position_title}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {editMode ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="gap-1"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="gap-1"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditMode(true)}
                  className="gap-1"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Badge
              className={cn(
                editedEmployee.status === 'ACTIVE' && 'bg-green-100 text-green-800',
                editedEmployee.status === 'INACTIVE' && 'bg-gray-100 text-gray-800',
                editedEmployee.status === 'ONBOARDING' && 'bg-blue-100 text-blue-800',
                editedEmployee.status === 'SUSPENDED' && 'bg-yellow-100 text-yellow-800',
                editedEmployee.status === 'TERMINATED' && 'bg-red-100 text-red-800'
              )}
            >
              {editedEmployee.status}
            </Badge>
            {editedEmployee.can_access_system && (
              <Badge className="bg-green-100 text-green-800" variant="outline">
                <Shield className="h-3 w-3 mr-1" />
                System Access
              </Badge>
            )}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="access">Access</TabsTrigger>
              <TabsTrigger value="audit">Audit Trail</TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Personal Info */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">First Name</label>
                  {editMode ? (
                    <Input
                      value={editedEmployee.first_name || ''}
                      onChange={(e) => handleFieldChange('first_name', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{editedEmployee.first_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Last Name</label>
                  {editMode ? (
                    <Input
                      value={editedEmployee.last_name || ''}
                      onChange={(e) => handleFieldChange('last_name', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{editedEmployee.last_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  {editMode ? (
                    <Input
                      type="email"
                      value={editedEmployee.email || ''}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{editedEmployee.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  {editMode ? (
                    <Input
                      value={editedEmployee.phone || ''}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{editedEmployee.phone || 'N/A'}</p>
                  )}
                </div>

                {/* Employment Info */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Department</label>
                  {editMode ? (
                    <Input
                      value={editedEmployee.department || ''}
                      onChange={(e) => handleFieldChange('department', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{editedEmployee.department}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Position</label>
                  {editMode ? (
                    <Input
                      value={editedEmployee.position_title || ''}
                      onChange={(e) => handleFieldChange('position_title', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{editedEmployee.position_title}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Employment Type</label>
                  {editMode ? (
                    <Select
                      value={editedEmployee.employment_type}
                      onValueChange={(val: any) =>
                        handleFieldChange('employment_type', val)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SALARY">Salaried</SelectItem>
                        <SelectItem value="HOURLY">Hourly</SelectItem>
                        <SelectItem value="1099_CONTRACTOR">Contractor</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-gray-900">
                      {editedEmployee.employment_type === 'SALARY'
                        ? 'Salaried'
                        : editedEmployee.employment_type === 'HOURLY'
                          ? 'Hourly'
                          : 'Contractor'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Hire Date</label>
                  {editMode ? (
                    <Input
                      type="date"
                      value={editedEmployee.hire_date || ''}
                      onChange={(e) => handleFieldChange('hire_date', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-gray-900">
                      {new Date(editedEmployee.hire_date || '').toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Compensation */}
                {editedEmployee.employment_type === 'SALARY' && editedEmployee.salary && (
                  <>
                    <div className="space-y-2 col-span-2">
                      <label className="text-sm font-medium text-gray-700">Annual Salary</label>
                      {editMode ? (
                        <Input
                          type="number"
                          value={editedEmployee.salary || ''}
                          onChange={(e) =>
                            handleFieldChange('salary', parseFloat(e.target.value))
                          }
                        />
                      ) : (
                        <p className="text-sm text-gray-900">
                          ${(editedEmployee.salary || 0).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {editedEmployee.employment_type === 'HOURLY' && editedEmployee.hourly_rate && (
                  <>
                    <div className="space-y-2 col-span-2">
                      <label className="text-sm font-medium text-gray-700">Hourly Rate</label>
                      {editMode ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={editedEmployee.hourly_rate || ''}
                          onChange={(e) =>
                            handleFieldChange('hourly_rate', parseFloat(e.target.value))
                          }
                        />
                      ) : (
                        <p className="text-sm text-gray-900">
                          ${(editedEmployee.hourly_rate || 0).toFixed(2)}/hr
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            {/* Access Tab */}
            <TabsContent value="access" className="space-y-4 mt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">System Access</p>
                    <p className="text-sm text-gray-600">
                      {editedEmployee.can_access_system ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {editedEmployee.can_access_system ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={onRevokeAccess}
                        className="gap-2"
                      >
                        <Lock className="h-4 w-4" />
                        Revoke
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onGrantAccess}
                        className="gap-2"
                      >
                        <Shield className="h-4 w-4" />
                        Grant
                      </Button>
                    )}
                  </div>
                </div>

                {/* Email Actions */}
                <div className="space-y-2 p-3 border rounded-lg">
                  <p className="font-medium text-gray-900">Email Actions</p>
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEmailType('welcome');
                        setShowPasswordDialog(true);
                      }}
                      className="gap-2 justify-start"
                    >
                      <Mail className="h-4 w-4" />
                      Send Welcome Email
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEmailType('password_reset');
                        setShowPasswordDialog(true);
                      }}
                      className="gap-2 justify-start"
                    >
                      <Mail className="h-4 w-4" />
                      Send Password Reset
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEmailType('credentials');
                        setShowPasswordDialog(true);
                      }}
                      className="gap-2 justify-start"
                    >
                      <Mail className="h-4 w-4" />
                      Send Credentials
                    </Button>
                  </div>
                </div>

                {/* Last Login */}
                {editedEmployee.last_login_at && (
                  <div className="p-3 border rounded-lg bg-gray-50">
                    <p className="text-sm font-medium text-gray-700">Last Login</p>
                    <p className="text-sm text-gray-600">
                      {new Date(editedEmployee.last_login_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Audit Trail Tab */}
            <TabsContent value="audit" className="space-y-4 mt-4">
              {auditTrail.length > 0 ? (
                <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                  <Table className="text-xs">
                    <TableHeader className="sticky top-0">
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead>Old Value</TableHead>
                        <TableHead>New Value</TableHead>
                        <TableHead>Changed By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditTrail.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-gray-600">
                            {new Date(entry.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-medium">{entry.field}</TableCell>
                          <TableCell className="text-gray-600">
                            {entry.old_value || '-'}
                          </TableCell>
                          <TableCell className="text-gray-900">
                            {entry.new_value}
                          </TableCell>
                          <TableCell className="text-gray-600">{entry.changed_by}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-gray-600 text-center py-8">
                  No audit entries
                </p>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Email Confirmation Dialog */}
      <AlertDialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Email</AlertDialogTitle>
            <AlertDialogDescription>
              {emailType === 'welcome' &&
                `Send welcome email to ${editedEmployee.email}?`}
              {emailType === 'password_reset' &&
                `Send password reset email to ${editedEmployee.email}?`}
              {emailType === 'credentials' &&
                `Send credentials email to ${editedEmployee.email}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (onSendEmail) {
                  try {
                    await onSendEmail(emailType);
                    toast({
                      title: 'Email sent',
                      description: `${emailType} email sent successfully`,
                    });
                    setShowPasswordDialog(false);
                  } catch (error) {
                    toast({
                      title: 'Send failed',
                      description: error instanceof Error ? error.message : 'Unknown error',
                      variant: 'destructive',
                    });
                  }
                }
              }}
            >
              Send
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EmployeeDetailPanel;
