/**
 * Worker Pool Manager
 * Manages a pool of Web Workers for parallel processing of heavy operations
 * Distributes tasks across available workers and queues tasks when all workers are busy
 */

export interface WorkerTask {
  id: string;
  type: string;
  data: any;
  onProgress?: (progress: number) => void;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}

interface PendingTask {
  task: WorkerTask;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private workerQueue: PendingTask[] = [];
  private taskMap: Map<string, WorkerTask> = new Map();
  private poolSize: number;
  private workerScript: string;
  private activeWorkerCount = 0;

  constructor(workerScript: string, poolSize: number = 4) {
    this.workerScript = workerScript;
    this.poolSize = Math.max(1, Math.min(poolSize, navigator.hardwareConcurrency || 4));
    this.initializeWorkers();
  }

  /**
   * Initialize worker pool
   */
  private initializeWorkers(): void {
    try {
      for (let i = 0; i < this.poolSize; i++) {
        const worker = new Worker(this.workerScript, { type: 'module' });
        worker.onmessage = (e) => this.handleWorkerMessage(e);
        worker.onerror = (e) => this.handleWorkerError(e);
        this.workers.push(worker);
      }
    } catch (error) {
      console.error('Failed to initialize worker pool:', error);
    }
  }

  /**
   * Execute a task in the worker pool
   */
  async executeTask(task: WorkerTask): Promise<any> {
    return new Promise((resolve, reject) => {
      const pendingTask: PendingTask = {
        task,
        resolve,
        reject,
      };

      // Store task for progress tracking
      this.taskMap.set(task.id, task);

      // Try to assign to an available worker
      if (this.activeWorkerCount < this.workers.length) {
        this.assignTaskToWorker(pendingTask);
      } else {
        // Queue the task if all workers are busy
        this.workerQueue.push(pendingTask);
      }
    });
  }

  /**
   * Assign a task to an available worker
   */
  private assignTaskToWorker(pendingTask: PendingTask): void {
    if (this.workers.length === 0) {
      pendingTask.reject(new Error('Worker pool not initialized'));
      return;
    }

    const workerIndex = this.activeWorkerCount;
    const worker = this.workers[workerIndex];
    this.activeWorkerCount++;

    // Send task to worker with metadata
    worker.postMessage({
      id: pendingTask.task.id,
      type: pendingTask.task.type,
      data: pendingTask.task.data,
      workerIndex,
    });

    // Store pending task for resolution
    (worker as any).__pendingTask = pendingTask;
  }

  /**
   * Handle messages from workers
   */
  private handleWorkerMessage(event: MessageEvent): void {
    const { id, type, progress, result, error } = event.data;
    const task = this.taskMap.get(id);

    if (type === 'progress') {
      // Progress update from worker
      if (task?.onProgress) {
        task.onProgress(progress);
      }
    } else if (type === 'complete') {
      // Task completed
      const worker = event.target as any;
      const pendingTask = worker.__pendingTask as PendingTask;

      if (pendingTask) {
        if (error) {
          pendingTask.reject(new Error(error));
          if (task?.onError) {
            task.onError(new Error(error));
          }
        } else {
          pendingTask.resolve(result);
          if (task?.onComplete) {
            task.onComplete(result);
          }
        }
        worker.__pendingTask = null;
      }

      // Clean up
      this.taskMap.delete(id);
      this.activeWorkerCount--;

      // Process next queued task
      if (this.workerQueue.length > 0) {
        const nextTask = this.workerQueue.shift();
        if (nextTask) {
          this.assignTaskToWorker(nextTask);
        }
      }
    }
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(error: ErrorEvent): void {
    const worker = error.target as any;
    const pendingTask = worker.__pendingTask as PendingTask;

    if (pendingTask) {
      const errorMsg = `Worker error: ${error.message}`;
      pendingTask.reject(new Error(errorMsg));
      worker.__pendingTask = null;
    }

    // Restart failed worker
    this.activeWorkerCount--;
    const workerIndex = this.workers.indexOf(worker);
    if (workerIndex !== -1) {
      try {
        const newWorker = new Worker(this.workerScript, { type: 'module' });
        newWorker.onmessage = (e) => this.handleWorkerMessage(e);
        newWorker.onerror = (e) => this.handleWorkerError(e);
        this.workers[workerIndex] = newWorker;
      } catch (e) {
        console.error('Failed to restart worker:', e);
      }
    }

    // Process next queued task
    if (this.workerQueue.length > 0) {
      const nextTask = this.workerQueue.shift();
      if (nextTask) {
        this.assignTaskToWorker(nextTask);
      }
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    poolSize: number;
    activeWorkers: number;
    queuedTasks: number;
  } {
    return {
      poolSize: this.poolSize,
      activeWorkers: this.activeWorkerCount,
      queuedTasks: this.workerQueue.length,
    };
  }

  /**
   * Terminate all workers
   */
  terminate(): void {
    this.workers.forEach((worker) => worker.terminate());
    this.workers = [];
    this.taskMap.clear();
    this.workerQueue = [];
    this.activeWorkerCount = 0;
  }
}

/**
 * Global worker pool instance (lazy initialized)
 */
let globalWorkerPool: WorkerPool | null = null;

/**
 * Get or create the global worker pool
 */
export function getWorkerPool(): WorkerPool {
  if (!globalWorkerPool) {
    // Use inline worker script for development
    const workerScript = new URL(
      '../workers/filter-worker.ts',
      import.meta.url
    ).href;
    globalWorkerPool = new WorkerPool(workerScript, 4);
  }
  return globalWorkerPool;
}

/**
 * Clean up the global worker pool
 */
export function terminateWorkerPool(): void {
  if (globalWorkerPool) {
    globalWorkerPool.terminate();
    globalWorkerPool = null;
  }
}
