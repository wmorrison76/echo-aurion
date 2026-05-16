/**
 * Bulk Operations Toolbar
 * Provides quick actions for bulk employee operations:
 * Select/deselect, grant/revoke access, export, archive
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Button,
  Card,
  Checkbox,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/button';
import {
  Users,
  Shield,
  Lock,
  Download,
  Archive,
  Mail,
  Settings,
  ChevronDown,
  Check,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface BulkOperationsToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  onGrantAccess?: (selectedIds: string[]) => Promise<void>;
  onRevokeAccess?: (selectedIds: string[]) => Promise<void>;
  onExport?: (selectedIds: string[], format: 'csv' | 'excel') => Promise<void>;
  onArchive?: (selectedIds: string[]) => Promise<void>;
  onSendEmail?: (selectedIds: string[], type: 'welcome' | 'announcement') => Promise<void>;
  selectedIds: string[];
  isLoading?: boolean;
}

interface BulkActionDialog {
  isOpen: boolean;
  action: 'grant' | 'revoke' | 'archive' | 'email' | null;
  loading: boolean;
  accessLevel?: string;
  emailType?: 'welcome' | 'announcement';
}

export const BulkOperationsToolbar: React.FC<BulkOperationsToolbarProps> = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onGrantAccess,
  onRevokeAccess,
  onExport,
  onArchive,
  onSendEmail,
  selectedIds,
  isLoading = false,
}) => {
  const { toast } = useToast();
  const [dialog, setDialog] = useState<BulkActionDialog>({
    isOpen: false,
    action: null,
    loading: false,
  });

  const selectionPercentage = useMemo(() => {
    return totalCount > 0 ? Math.round((selectedCount / totalCount) * 100) : 0;
  }, [selectedCount, totalCount]);

  const handleGrantAccess = useCallback(async () => {
    if (!onGrantAccess || selectedIds.length === 0) return;

    setDialog(prev => ({ ...prev, loading: true }));

    try {
      await onGrantAccess(selectedIds);

      toast({
        title: 'Access granted',
        description: `Granted access to ${selectedIds.length} employees`,
      });

      setDialog({ isOpen: false, action: null, loading: false });
      onClearSelection?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to grant access',
        variant: 'destructive',
      });
    } finally {
      setDialog(prev => ({ ...prev, loading: false }));
    }
  }, [selectedIds, onGrantAccess, onClearSelection, toast]);

  const handleRevokeAccess = useCallback(async () => {
    if (!onRevokeAccess || selectedIds.length === 0) return;

    setDialog(prev => ({ ...prev, loading: true }));

    try {
      await onRevokeAccess(selectedIds);

      toast({
        title: 'Access revoked',
        description: `Revoked access from ${selectedIds.length} employees`,
        variant: 'destructive',
      });

      setDialog({ isOpen: false, action: null, loading: false });
      onClearSelection?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to revoke access',
        variant: 'destructive',
      });
    } finally {
      setDialog(prev => ({ ...prev, loading: false }));
    }
  }, [selectedIds, onRevokeAccess, onClearSelection, toast]);

  const handleExport = useCallback(async (format: 'csv' | 'excel') => {
    if (!onExport || selectedIds.length === 0) return;

    try {
      await onExport(selectedIds, format);

      toast({
        title: 'Export started',
        description: `Exporting ${selectedIds.length} employees as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Failed to export',
        variant: 'destructive',
      });
    }
  }, [selectedIds, onExport, toast]);

  const handleArchive = useCallback(async () => {
    if (!onArchive || selectedIds.length === 0) return;

    setDialog(prev => ({ ...prev, loading: true }));

    try {
      await onArchive(selectedIds);

      toast({
        title: 'Archived',
        description: `Archived ${selectedIds.length} employees`,
      });

      setDialog({ isOpen: false, action: null, loading: false });
      onClearSelection?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to archive',
        variant: 'destructive',
      });
    } finally {
      setDialog(prev => ({ ...prev, loading: false }));
    }
  }, [selectedIds, onArchive, onClearSelection, toast]);

  const handleSendEmail = useCallback(async (type: 'welcome' | 'announcement') => {
    if (!onSendEmail || selectedIds.length === 0) return;

    setDialog(prev => ({ ...prev, loading: true }));

    try {
      await onSendEmail(selectedIds, type);

      toast({
        title: 'Emails sent',
        description: `${type === 'welcome' ? 'Welcome' : 'Announcement'} sent to ${selectedIds.length} employees`,
      });

      setDialog({ isOpen: false, action: null, loading: false });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send email',
        variant: 'destructive',
      });
    } finally {
      setDialog(prev => ({ ...prev, loading: false }));
    }
  }, [selectedIds, onSendEmail, toast]);

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      {/* Toolbar Card */}
      <Card className="border-l-4 border-l-blue-600 bg-blue-50">
        <div className="p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Selection Info */}
            <div className="flex items-center gap-3 flex-1">
              <Checkbox
                checked={selectedCount === totalCount && totalCount > 0}
                onCheckedChange={selectedCount > 0 ? onClearSelection : onSelectAll}
                className="h-5 w-5"
              />

              <div className="flex-1">
                <p className="font-semibold text-gray-900">
                  {selectedCount.toLocaleString()} selected
                </p>
                <p className="text-xs text-gray-600">
                  {selectionPercentage}% of {totalCount.toLocaleString()} employees
                </p>
              </div>

              {/* Selection Progress */}
              <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${selectionPercentage}%` }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Grant Access */}
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => setDialog({ isOpen: true, action: 'grant', loading: false })}
                disabled={isLoading}
              >
                <Shield className="h-4 w-4" />
                Grant Access
              </Button>

              {/* Revoke Access */}
              <Button
                size="sm"
                variant="outline"
                className="gap-2 text-red-600 hover:text-red-700 border-red-200"
                onClick={() => setDialog({ isOpen: true, action: 'revoke', loading: false })}
                disabled={isLoading}
              >
                <Lock className="h-4 w-4" />
                Revoke Access
              </Button>

              {/* More Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    disabled={isLoading}
                  >
                    <Settings className="h-4 w-4" />
                    More
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-48">
                  {/* Export Section */}
                  <DropdownMenuLabel className="text-xs">Export</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleExport('csv')} className="gap-2">
                    <Download className="h-4 w-4" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('excel')} className="gap-2">
                    <Download className="h-4 w-4" />
                    Export as Excel
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {/* Email Section */}
                  <DropdownMenuLabel className="text-xs">Email Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => setDialog({ isOpen: true, action: 'email', loading: false, emailType: 'welcome' })}
                    className="gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Send Welcome Email
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDialog({ isOpen: true, action: 'email', loading: false, emailType: 'announcement' })}
                    className="gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Send Announcement
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {/* Archive Section */}
                  <DropdownMenuLabel className="text-xs">Status</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => setDialog({ isOpen: true, action: 'archive', loading: false })}
                    className="gap-2 text-orange-600"
                  >
                    <Archive className="h-4 w-4" />
                    Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Clear Selection */}
              <Button
                size="sm"
                variant="ghost"
                onClick={onClearSelection}
                disabled={isLoading}
                className="text-gray-600"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Grant Access Dialog */}
      <Dialog open={dialog.action === 'grant' && dialog.isOpen} onOpenChange={(open) => {
        if (!open) setDialog({ isOpen: false, action: null, loading: false });
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant System Access</DialogTitle>
            <DialogDescription>
              Grant system access to {selectedCount.toLocaleString()} selected employees
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Access Level</label>
              <Select defaultValue="FULL">
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL">Full Access</SelectItem>
                  <SelectItem value="LIMITED">Limited Access</SelectItem>
                  <SelectItem value="READ_ONLY">Read Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
              <div className="flex gap-2">
                <Check className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Access will be granted immediately</p>
                  <p className="text-xs mt-1">
                    Employees will be able to log in and access assigned modules
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialog({ isOpen: false, action: null, loading: false })}
              disabled={dialog.loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGrantAccess}
              disabled={dialog.loading}
              className="gap-2"
            >
              {dialog.loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Grant Access to {selectedCount}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Access Dialog */}
      <AlertDialog open={dialog.action === 'revoke' && dialog.isOpen} onOpenChange={(open) => {
        if (!open) setDialog({ isOpen: false, action: null, loading: false });
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Revoke Access
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to revoke system access from {selectedCount.toLocaleString()} employees.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-900 space-y-1">
            <p className="font-medium">These employees will no longer be able to:</p>
            <ul className="list-disc list-inside text-xs">
              <li>Log in to the system</li>
              <li>View any schedules or employee data</li>
              <li>Access any modules or features</li>
            </ul>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="confirm" />
            <label htmlFor="confirm" className="text-sm">
              I understand the consequences and want to proceed
            </label>
          </div>

          <AlertDialogHeader>
            <AlertDialogCancel disabled={dialog.loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeAccess}
              disabled={dialog.loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {dialog.loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Revoke Access
            </AlertDialogAction>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Dialog */}
      <AlertDialog open={dialog.action === 'archive' && dialog.isOpen} onOpenChange={(open) => {
        if (!open) setDialog({ isOpen: false, action: null, loading: false });
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Employees</AlertDialogTitle>
            <AlertDialogDescription>
              Archive {selectedCount.toLocaleString()} selected employees. They will be hidden from active lists.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogCancel disabled={dialog.loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleArchive}
            disabled={dialog.loading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {dialog.loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Archive
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BulkOperationsToolbar;
