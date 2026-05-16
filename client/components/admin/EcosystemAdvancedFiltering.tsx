/**
 * Ecosystem Control Panel - Phase 3: Advanced Filtering
 * Dynamic filtering with saved filters, complex predicates, and rule builder
 */

import React, { useState, useCallback, useMemo } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/button';
import {
  Filter,
  Plus,
  X,
  Save,
  Trash2,
  Copy,
  Share2,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface FilterRule {
  id: string;
  field: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'between' | 'in' | 'exists';
  value: any;
  caseSensitive?: boolean;
}

interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  rules: FilterRule[];
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  usageCount: number;
}

interface AdvancedFilteringProps {
  fields: Array<{ name: string; type: 'string' | 'number' | 'date' | 'boolean'; label: string }>;
  onApplyFilter?: (rules: FilterRule[]) => Promise<void>;
  onSaveFilter?: (filter: Partial<SavedFilter>) => Promise<void>;
  onDeleteFilter?: (filterId: string) => Promise<void>;
  onLoadFilter?: (filterId: string) => Promise<FilterRule[]>;
  savedFilters?: SavedFilter[];
}

const OPERATORS = {
  string: [
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'in', label: 'In List' },
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'gt', label: 'Greater Than' },
    { value: 'lt', label: 'Less Than' },
    { value: 'between', label: 'Between' },
  ],
  date: [
    { value: 'equals', label: 'On Date' },
    { value: 'gt', label: 'After' },
    { value: 'lt', label: 'Before' },
    { value: 'between', label: 'Between' },
  ],
  boolean: [
    { value: 'equals', label: 'Is' },
  ],
};

export const EcosystemAdvancedFiltering: React.FC<AdvancedFilteringProps> = ({
  fields,
  onApplyFilter,
  onSaveFilter,
  onDeleteFilter,
  onLoadFilter,
  savedFilters = [],
}) => {
  const { toast } = useToast();
  const [rules, setRules] = useState<FilterRule[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Add new rule
  const handleAddRule = useCallback(() => {
    const newRule: FilterRule = {
      id: `rule-${Date.now()}`,
      field: fields[0]?.name || '',
      operator: 'equals',
      value: '',
    };
    setRules(prev => [...prev, newRule]);
  }, [fields]);

  // Update rule
  const handleUpdateRule = useCallback((ruleId: string, updates: Partial<FilterRule>) => {
    setRules(prev =>
      prev.map(rule => (rule.id === ruleId ? { ...rule, ...updates } : rule))
    );
  }, []);

  // Remove rule
  const handleRemoveRule = useCallback((ruleId: string) => {
    setRules(prev => prev.filter(rule => rule.id !== ruleId));
  }, []);

  // Apply filters
  const handleApplyFilter = useCallback(async () => {
    if (!onApplyFilter || rules.length === 0) return;

    setIsLoading(true);
    try {
      await onApplyFilter(rules);
      toast({
        title: 'Filter applied',
        description: `${rules.length} filter rule(s) applied`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to apply filter',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [rules, onApplyFilter, toast]);

  // Save filter
  const handleSaveFilter = useCallback(async () => {
    if (!onSaveFilter || !saveName.trim()) {
      toast({
        title: 'Validation error',
        description: 'Please enter a filter name',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await onSaveFilter({
        name: saveName,
        description: saveDescription,
        rules,
        isPublic,
      });

      toast({
        title: 'Filter saved',
        description: `"${saveName}" has been saved`,
      });

      setSaveDialogOpen(false);
      setSaveName('');
      setSaveDescription('');
      setIsPublic(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save filter',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [rules, saveName, saveDescription, isPublic, onSaveFilter, toast]);

  // Load filter
  const handleLoadFilter = useCallback(
    async (filterId: string) => {
      if (!onLoadFilter) return;

      setIsLoading(true);
      try {
        const loadedRules = await onLoadFilter(filterId);
        setRules(loadedRules);

        toast({
          title: 'Filter loaded',
          description: 'Filter has been loaded',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to load filter',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [onLoadFilter, toast]
  );

  // Delete filter
  const handleDeleteFilter = useCallback(
    async (filterId: string) => {
      if (!onDeleteFilter) return;

      try {
        await onDeleteFilter(filterId);

        toast({
          title: 'Filter deleted',
          description: 'The filter has been removed',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to delete filter',
          variant: 'destructive',
        });
      }
    },
    [onDeleteFilter, toast]
  );

  // Clear all rules
  const handleClearRules = useCallback(() => {
    setRules([]);
  }, []);

  // Get operators for field type
  const getOperatorsForField = useCallback(
    (fieldName: string) => {
      const field = fields.find(f => f.name === fieldName);
      return OPERATORS[field?.type as keyof typeof OPERATORS] || OPERATORS.string;
    },
    [fields]
  );

  return (
    <div className="space-y-6">
      {/* Saved Filters Section */}
      {savedFilters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Saved Filters</CardTitle>
            <CardDescription>
              Click to load a saved filter or manage your filters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {savedFilters.map(filter => (
                <div
                  key={filter.id}
                  className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {filter.name}
                      </p>
                      {filter.description && (
                        <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                          {filter.description}
                        </p>
                      )}
                    </div>
                    {filter.isPublic && (
                      <Badge className="bg-blue-100 text-blue-800 text-xs flex-shrink-0">
                        Public
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs text-gray-600 mb-3">
                    <span>{filter.rules.length} rule(s)</span>
                    <span>{filter.usageCount} uses</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs"
                      onClick={() => handleLoadFilter(filter.id)}
                      disabled={isLoading}
                    >
                      Load
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        navigator.clipboard.writeText(filter.id);
                        toast({ title: 'Copied', description: 'Filter ID copied to clipboard' });
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-600"
                      onClick={() => handleDeleteFilter(filter.id)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Builder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Builder
          </CardTitle>
          <CardDescription>
            Create custom filters with multiple conditions
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {rules.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No filters applied yet</p>
              <Button onClick={handleAddRule} className="gap-2">
                <Plus className="h-4 w-4" />
                Add First Filter Rule
              </Button>
            </div>
          ) : (
            <>
              {/* Filter Rules */}
              <div className="space-y-3">
                {rules.map((rule, idx) => {
                  const field = fields.find(f => f.name === rule.field);
                  const operators = getOperatorsForField(rule.field);

                  return (
                    <div
                      key={rule.id}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50"
                    >
                      {/* Field Selector */}
                      <Select
                        value={rule.field}
                        onValueChange={val => handleUpdateRule(rule.id, { field: val })}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fields.map(f => (
                            <SelectItem key={f.name} value={f.name}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Operator Selector */}
                      <Select
                        value={rule.operator}
                        onValueChange={val => handleUpdateRule(rule.id, { operator: val as any })}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {operators.map(op => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Value Input */}
                      {rule.operator !== 'exists' && (
                        <Input
                          type={field?.type === 'number' ? 'number' : 'text'}
                          placeholder="Filter value"
                          value={rule.value}
                          onChange={e => handleUpdateRule(rule.id, { value: e.target.value })}
                          className="h-8 flex-1"
                        />
                      )}

                      {/* Remove Button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-600"
                        onClick={() => handleRemoveRule(rule.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleAddRule}
                  disabled={isLoading}
                >
                  <Plus className="h-4 w-4" />
                  Add Rule
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearRules}
                  disabled={isLoading}
                  className="text-gray-600"
                >
                  Clear
                </Button>

                <div className="flex-1" />

                <Button
                  size="sm"
                  onClick={() => setSaveDialogOpen(true)}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Filter
                </Button>

                <Button
                  size="sm"
                  onClick={handleApplyFilter}
                  disabled={isLoading || rules.length === 0}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Apply Filter
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Filter Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Filter</DialogTitle>
            <DialogDescription>
              Save this filter for reuse later
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Filter Name *</label>
              <Input
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                placeholder="e.g., Active in Operations"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={saveDescription}
                onChange={e => setSaveDescription(e.target.value)}
                placeholder="Optional description of what this filter does"
                className="mt-1"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={e => setIsPublic(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <label htmlFor="isPublic" className="text-sm">
                Make this filter public (shareable with team)
              </label>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
              <p className="font-medium">Filter Summary</p>
              <ul className="list-disc list-inside text-xs mt-2 space-y-1">
                {rules.map((rule, idx) => {
                  const field = fields.find(f => f.name === rule.field);
                  return (
                    <li key={idx}>
                      {field?.label} {rule.operator} {rule.value}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveFilter}
              disabled={isLoading || !saveName.trim()}
            >
              Save Filter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EcosystemAdvancedFiltering;
