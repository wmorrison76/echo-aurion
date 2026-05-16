/**
 * Ecosystem Control Panel - Phase 2: Bulk Operations Interface
 * Handles large-scale operations with parallel processing
 * Features: Job queuing, progress tracking, result aggregation
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Button,
  Badge,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/button';
import {
  Activity,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Pause,
  Play,
  Trash2,
  RotateCcw,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface BulkJob {
  id: string;
  name: string;
  type: 'grant_access' | 'revoke_access' | 'export' | 'import' | 'sync' | 'email';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused';
  totalItems: number;
  processedItems: number;
  successItems: number;
  failedItems: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  parallelWorkers: number;
  estimatedTimeRemaining?: number;
  errors: Array<{ itemId: string; error: string }>;
}

interface EcosystemBulkOperationsProps {
  jobs?: BulkJob[];
  onCreateJob?: (jobData: Partial<BulkJob>) => Promise<string>;
  onPauseJob?: (jobId: string) => Promise<void>;
  onResumeJob?: (jobId: string) => Promise<void>;
  onCancelJob?: (jobId: string) => Promise<void>;
  onRetryJob?: (jobId: string) => Promise<void>;
  onDownloadResults?: (jobId: string) => Promise<void>;
}

const statusColorMap: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  paused: 'bg-yellow-100 text-yellow-800',
};

const statusIconMap: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  processing: <Activity className="h-4 w-4 animate-spin" />,
  completed: <CheckCircle className="h-4 w-4" />,
  failed: <AlertCircle className="h-4 w-4" />,
  paused: <Pause className="h-4 w-4" />,
};

export const EcosystemBulkOperations: React.FC<EcosystemBulkOperationsProps> = ({
  jobs = [],
  onCreateJob,
  onPauseJob,
  onResumeJob,
  onCancelJob,
  onRetryJob,
  onDownloadResults,
}) => {
  const { toast } = useToast();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [parallelWorkers, setParallelWorkers] = useState(5);

  // Calculate statistics
  const statistics = useMemo(() => {
    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter(j => j.status === 'processing').length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      totalProcessed: jobs.reduce((sum, j) => sum + j.processedItems, 0),
      totalSuccessful: jobs.reduce((sum, j) => sum + j.successItems, 0),
      totalFailed: jobs.reduce((sum, j) => sum + j.failedItems, 0),
    };
  }, [jobs]);

  // Get active job
  const activeJob = useMemo(
    () => jobs.find(j => j.id === activeJobId),
    [jobs, activeJobId]
  );

  // Handle pause job
  const handlePauseJob = useCallback(
    async (jobId: string) => {
      if (!onPauseJob) return;

      try {
        await onPauseJob(jobId);
        toast({ title: 'Job paused', description: 'The job has been paused' });
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to pause job',
          variant: 'destructive',
        });
      }
    },
    [onPauseJob, toast]
  );

  // Handle resume job
  const handleResumeJob = useCallback(
    async (jobId: string) => {
      if (!onResumeJob) return;

      try {
        await onResumeJob(jobId);
        toast({ title: 'Job resumed', description: 'The job has been resumed' });
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to resume job',
          variant: 'destructive',
        });
      }
    },
    [onResumeJob, toast]
  );

  // Handle cancel job
  const handleCancelJob = useCallback(
    async (jobId: string) => {
      if (!onCancelJob) return;

      try {
        await onCancelJob(jobId);
        toast({ title: 'Job cancelled', description: 'The job has been cancelled' });
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to cancel job',
          variant: 'destructive',
        });
      }
    },
    [onCancelJob, toast]
  );

  // Handle retry job
  const handleRetryJob = useCallback(
    async (jobId: string) => {
      if (!onRetryJob) return;

      try {
        await onRetryJob(jobId);
        toast({ title: 'Job retried', description: 'The job has been retried' });
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to retry job',
          variant: 'destructive',
        });
      }
    },
    [onRetryJob, toast]
  );

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalJobs}</div>
            <div className="text-xs text-gray-600 mt-1">
              {statistics.activeJobs} active
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statistics.completedJobs}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {statistics.totalSuccessful.toLocaleString()} items
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {statistics.failedJobs}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {statistics.totalFailed.toLocaleString()} items
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics.totalProcessed > 0
                ? (
                  (statistics.totalSuccessful / statistics.totalProcessed) *
                  100
                ).toFixed(1)
                : 0}
              %
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {statistics.totalSuccessful} successful
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="jobs" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="jobs">Job Queue</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="space-y-4 mt-4">
          {/* Parallel Workers Control */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700">
                    Parallel Workers
                  </label>
                  <p className="text-xs text-gray-600 mt-1">
                    Number of concurrent operations to process simultaneously
                  </p>
                </div>
                <Select
                  value={parallelWorkers.toString()}
                  onValueChange={val => setParallelWorkers(parseInt(val))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Worker</SelectItem>
                    <SelectItem value="2">2 Workers</SelectItem>
                    <SelectItem value="5">5 Workers</SelectItem>
                    <SelectItem value="10">10 Workers</SelectItem>
                    <SelectItem value="20">20 Workers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Jobs Table */}
          {jobs.length > 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Success</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.map(job => {
                        const progressPercent =
                          job.totalItems > 0
                            ? Math.round((job.processedItems / job.totalItems) * 100)
                            : 0;

                        return (
                          <TableRow
                            key={job.id}
                            className={cn(
                              'cursor-pointer hover:bg-gray-50',
                              activeJobId === job.id && 'bg-blue-50'
                            )}
                            onClick={() => setActiveJobId(job.id)}
                          >
                            <TableCell className="font-mono text-xs">
                              {job.id.substring(0, 8)}...
                            </TableCell>
                            <TableCell className="text-sm capitalize">
                              {job.type.replace('_', ' ')}
                            </TableCell>
                            <TableCell>
                              <Badge className={cn('text-xs', statusColorMap[job.status])}>
                                {statusIconMap[job.status]}
                                <span className="ml-1">{job.status}</span>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 w-32">
                                <Progress value={progressPercent} className="h-1.5" />
                                <span className="text-xs text-gray-600 w-8">
                                  {progressPercent}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {job.processedItems} / {job.totalItems}
                            </TableCell>
                            <TableCell className="text-sm">
                              <span className="text-green-600">
                                {job.successItems}
                              </span>
                              <span className="text-gray-400 mx-1">/</span>
                              <span className="text-red-600">{job.failedItems}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {job.status === 'processing' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={e => {
                                      e.stopPropagation();
                                      handlePauseJob(job.id);
                                    }}
                                  >
                                    <Pause className="h-3 w-3" />
                                  </Button>
                                )}

                                {job.status === 'paused' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleResumeJob(job.id);
                                    }}
                                  >
                                    <Play className="h-3 w-3" />
                                  </Button>
                                )}

                                {job.status === 'failed' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-blue-600"
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleRetryJob(job.id);
                                    }}
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                  </Button>
                                )}

                                {(job.status === 'completed' || job.status === 'failed') && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-green-600"
                                    onClick={e => {
                                      e.stopPropagation();
                                      onDownloadResults?.(job.id);
                                    }}
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                )}

                                {(job.status === 'pending' || job.status === 'processing' || job.status === 'paused') && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-red-600"
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleCancelJob(job.id);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <p className="text-gray-600">No bulk operations in progress</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4 mt-4">
          {activeJob ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Job Details</CardTitle>
                <CardDescription>{activeJob.id}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Job Name</p>
                    <p className="text-sm text-gray-900 mt-1">{activeJob.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Job Type</p>
                    <p className="text-sm text-gray-900 mt-1 capitalize">
                      {activeJob.type.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Status</p>
                    <Badge className={cn('mt-1', statusColorMap[activeJob.status])}>
                      {activeJob.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Parallel Workers</p>
                    <p className="text-sm text-gray-900 mt-1">
                      {activeJob.parallelWorkers}
                    </p>
                  </div>
                </div>

                {/* Progress Info */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Progress</p>
                  <Progress
                    value={
                      activeJob.totalItems > 0
                        ? Math.round((activeJob.processedItems / activeJob.totalItems) * 100)
                        : 0
                    }
                    className="h-2"
                  />
                  <div className="grid grid-cols-4 gap-2 mt-3 text-xs">
                    <div className="bg-blue-50 p-2 rounded border border-blue-200">
                      <p className="text-gray-600">Total</p>
                      <p className="font-semibold text-blue-900">
                        {activeJob.totalItems.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                      <p className="text-gray-600">Processed</p>
                      <p className="font-semibold text-yellow-900">
                        {activeJob.processedItems.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-green-50 p-2 rounded border border-green-200">
                      <p className="text-gray-600">Success</p>
                      <p className="font-semibold text-green-900">
                        {activeJob.successItems.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-red-50 p-2 rounded border border-red-200">
                      <p className="text-gray-600">Failed</p>
                      <p className="font-semibold text-red-900">
                        {activeJob.failedItems.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timeline Info */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Timeline</p>
                  <div className="space-y-1 text-xs text-gray-600">
                    <p>Created: {activeJob.createdAt.toLocaleString()}</p>
                    {activeJob.startedAt && (
                      <p>Started: {activeJob.startedAt.toLocaleString()}</p>
                    )}
                    {activeJob.completedAt && (
                      <p>Completed: {activeJob.completedAt.toLocaleString()}</p>
                    )}
                    {activeJob.estimatedTimeRemaining && (
                      <p>
                        Estimated remaining:{' '}
                        {Math.round(activeJob.estimatedTimeRemaining / 60)} minutes
                      </p>
                    )}
                  </div>
                </div>

                {/* Error List */}
                {activeJob.errors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      Errors ({activeJob.errors.length})
                    </p>
                    <div className="bg-red-50 border border-red-200 rounded p-3 max-h-40 overflow-y-auto">
                      <ul className="space-y-1 text-xs text-red-900">
                        {activeJob.errors.slice(0, 10).map((err, idx) => (
                          <li key={idx}>
                            <span className="font-mono text-red-700">{err.itemId}:</span>{' '}
                            {err.error}
                          </li>
                        ))}
                        {activeJob.errors.length > 10 && (
                          <li className="text-red-700 font-medium">
                            ... and {activeJob.errors.length - 10} more
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <p className="text-gray-600">Select a job to view details</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EcosystemBulkOperations;
