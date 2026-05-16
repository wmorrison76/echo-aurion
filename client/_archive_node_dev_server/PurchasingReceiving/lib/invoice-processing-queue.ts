import { logger } from "./logger";
export interface QueueJob {
  id: string;
  invoiceId: string;
  organizationId: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  progress: number; // 0-100 error?: string; retryCount: number; maxRetries: number;
}
export interface ProcessingResult {
  jobId: string;
  invoiceId: string;
  success: boolean;
  extractedFields?: Record<string, any>;
  lineItems?: any[];
  confidence?: number;
  processingTimeMs?: number;
  error?: string;
}
type JobHandler = (job: QueueJob) => Promise<ProcessingResult>;
type JobListener = (
  job: QueueJob,
) => void; /** * In-memory invoice processing queue with background worker support * In production, this would be replaced with Redis/BullMQ */
class InvoiceProcessingQueue {
  private queue: Map<string, QueueJob> = new Map();
  private jobHandlers: Map<string, JobHandler> = new Map();
  private listeners: JobListener[] = [];
  private workerRunning = false;
  private readonly WORKER_INTERVAL = 1000; // Check queue every 1s /** * Register a handler for job processing */ registerJobHandler(jobType: string, handler: JobHandler): void { this.jobHandlers.set(jobType, handler); logger.debug(`Registered job handler: ${jobType}`); } /** * Add listener for job status changes */ onJobStatusChange(listener: JobListener): void { this.listeners.push(listener); } /** * Add job to queue */ addJob(invoiceId: string, organizationId: string): QueueJob { const job: QueueJob = { id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, invoiceId, organizationId, status: 'pending', createdAt: new Date(), progress: 0, retryCount: 0, maxRetries: 3, }; this.queue.set(job.id, job); logger.info('Job added to queue', { jobId: job.id, invoiceId }); // Start worker if not running if (!this.workerRunning) { this.startWorker(); } return job; } /** * Get job by ID */ getJob(jobId: string): QueueJob | undefined { return this.queue.get(jobId); } /** * Get all jobs for an invoice */ getInvoiceJobs(invoiceId: string): QueueJob[] { return Array.from(this.queue.values()).filter((job) => job.invoiceId === invoiceId); } /** * Get queue statistics */ getStats(): { total: number; pending: number; processing: number; completed: number; failed: number; avgProcessingTimeMs: number; } { const jobs = Array.from(this.queue.values()); const completed = jobs.filter((j) => j.status === 'completed'); const avgProcessingTime = completed.length > 0 ? completed.reduce((sum, j) => { const duration = (j.completedAt || new Date()).getTime() - j.createdAt.getTime(); return sum + duration; }, 0) / completed.length : 0; return { total: jobs.length, pending: jobs.filter((j) => j.status === 'pending').length, processing: jobs.filter((j) => j.status === 'processing').length, completed: completed.length, failed: jobs.filter((j) => j.status === 'failed').length, avgProcessingTimeMs: Math.round(avgProcessingTime), }; } /** * Start background worker */ private startWorker(): void { if (this.workerRunning) return; this.workerRunning = true; logger.info('Invoice processing worker started'); const processNext = async () => { try { const pendingJob = Array.from(this.queue.values()).find( (j) => j.status === 'pending' ); if (!pendingJob) { // No work, check again later setTimeout(processNext, this.WORKER_INTERVAL); return; } // Mark as processing pendingJob.status = 'processing'; pendingJob.startedAt = new Date(); pendingJob.progress = 10; this.notifyListeners(pendingJob); // Process the job try { const handler = this.jobHandlers.get('invoice_ocr'); // Default handler if (!handler) { throw new Error('No job handler registered'); } const result = await handler(pendingJob); // Mark as completed pendingJob.status = 'completed'; pendingJob.completedAt = new Date(); pendingJob.progress = 100; logger.info('Job completed', { jobId: pendingJob.id, invoiceId: pendingJob.invoiceId, timeMs: pendingJob.completedAt.getTime() - pendingJob.createdAt.getTime(), }); } catch (error) { pendingJob.error = error instanceof Error ? error.message : String(error); pendingJob.retryCount++; if (pendingJob.retryCount < pendingJob.maxRetries) { // Retry pendingJob.status = 'pending'; logger.warn('Job will be retried', { jobId: pendingJob.id, retry: `${pendingJob.retryCount}/${pendingJob.maxRetries}`, error: pendingJob.error, }); } else { // Max retries exceeded pendingJob.status = 'failed'; pendingJob.completedAt = new Date(); logger.error('Job failed after max retries', { jobId: pendingJob.id, invoiceId: pendingJob.invoiceId, error: pendingJob.error, }); } } this.notifyListeners(pendingJob); // Process next job setTimeout(processNext, 100); // Small delay between jobs } catch (error) { logger.error('Worker error', error instanceof Error ? error : undefined); setTimeout(processNext, this.WORKER_INTERVAL); } }; // Start processing processNext(); } /** * Stop the background worker */ stopWorker(): void { this.workerRunning = false; logger.info('Invoice processing worker stopped'); } /** * Notify listeners of job status changes */ private notifyListeners(job: QueueJob): void { for (const listener of this.listeners) { try { listener(job); } catch (error) { logger.error('Listener error', error instanceof Error ? error : undefined); } } } /** * Clear old completed jobs (cleanup) */ clearOldJobs(olderThanHours: number = 24): number { const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000; let removed = 0; for (const [jobId, job] of this.queue.entries()) { if ( job.status === 'completed' && job.completedAt && job.completedAt.getTime() < cutoffTime ) { this.queue.delete(jobId); removed++; } } logger.info('Cleaned up old jobs', { count: removed }); return removed; }
} // Singleton instance
let queueInstance: InvoiceProcessingQueue | null = null;
export function getInvoiceProcessingQueue(): InvoiceProcessingQueue {
  if (!queueInstance) {
    queueInstance = new InvoiceProcessingQueue();
  }
  return queueInstance;
}
export default getInvoiceProcessingQueue;
