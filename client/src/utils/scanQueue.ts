/**
 * Scan Queue Management System
 * 
 * Handles rapid successive scans by queueing them and processing sequentially.
 * Provides visual feedback and status tracking for scan operations.
 */

export type ScanStatus = 'pending' | 'processing' | 'success' | 'error';

export interface QueuedScan {
  id: string;
  barcode: string;
  timestamp: number;
  status: ScanStatus;
  result?: any;
  error?: string;
  retryCount?: number;
}

export interface ScanQueueConfig {
  maxQueueSize: number;
  processingDelay: number; // Minimum delay between processing scans
  maxRetries: number;
  duplicateWindow: number; // Time window to ignore duplicate scans (ms)
}

export class ScanQueue {
  private queue: QueuedScan[] = [];
  private isProcessing = false;
  private config: ScanQueueConfig;
  private statusListeners: ((queue: QueuedScan[]) => void)[] = [];
  private lastProcessTime = 0;

  constructor(config: Partial<ScanQueueConfig> = {}) {
    this.config = {
      maxQueueSize: 10,
      processingDelay: 200, // Reduced from 500ms to 200ms for better performance
      maxRetries: 2,
      duplicateWindow: 1000, // 1 second window to ignore duplicates
      ...config
    };
  }

  /**
   * Add a scan to the queue
   */
  addScan(barcode: string): string | null {
    // Clean the barcode
    const cleanBarcode = barcode.replace(/\D/g, '');
    
    if (!cleanBarcode || cleanBarcode.length < 4) {
      return null;
    }

    // Check for recent duplicates
    const now = Date.now();
    const recentDuplicate = this.queue.find(scan => 
      scan.barcode === cleanBarcode && 
      (now - scan.timestamp) < this.config.duplicateWindow &&
      scan.status !== 'error'
    );

    if (recentDuplicate) {
      console.log(`[ScanQueue] Ignoring duplicate scan: ${cleanBarcode}`);
      return recentDuplicate.id;
    }

    // Remove oldest items if queue is full
    while (this.queue.length >= this.config.maxQueueSize) {
      const removed = this.queue.shift();
      console.log(`[ScanQueue] Queue full, removed oldest scan: ${removed?.barcode}`);
    }

    // Create new scan entry
    const scanId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const queuedScan: QueuedScan = {
      id: scanId,
      barcode: cleanBarcode,
      timestamp: now,
      status: 'pending',
      retryCount: 0
    };

    this.queue.push(queuedScan);
    this.notifyStatusListeners();

    console.log(`[ScanQueue] Added scan to queue: ${cleanBarcode} (queue size: ${this.queue.length})`);

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return scanId;
  }

  /**
   * Process the queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const scan = this.queue.find(s => s.status === 'pending');
      if (!scan) {
        break;
      }

      // Rate limiting: ensure minimum delay between processing
      const now = Date.now();
      const timeSinceLastProcess = now - this.lastProcessTime;
      if (timeSinceLastProcess < this.config.processingDelay) {
        const delay = this.config.processingDelay - timeSinceLastProcess;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Update status to processing
      scan.status = 'processing';
      this.notifyStatusListeners();

      try {
        // Process the scan
        const result = await this.processScan(scan.barcode);
        scan.status = 'success';
        scan.result = result;
        this.lastProcessTime = Date.now();
        
        console.log(`[ScanQueue] Successfully processed scan: ${scan.barcode}`);
      } catch (error) {
        scan.status = 'error';
        scan.error = error instanceof Error ? error.message : 'Unknown error';
        
        // Retry logic
        if ((scan.retryCount || 0) < this.config.maxRetries) {
          scan.retryCount = (scan.retryCount || 0) + 1;
          scan.status = 'pending';
          console.log(`[ScanQueue] Retrying scan: ${scan.barcode} (attempt ${scan.retryCount})`);
        } else {
          console.error(`[ScanQueue] Failed to process scan after ${this.config.maxRetries} retries: ${scan.barcode}`, error);
        }
      }

      this.notifyStatusListeners();

      // Clean up completed scans after a delay
      setTimeout(() => {
        this.cleanupCompletedScans();
      }, 3000);
    }

    this.isProcessing = false;
  }

  /**
   * Override this method to define how scans are processed
   */
  protected async processScan(barcode: string): Promise<any> {
    // This should be overridden by specific implementations
    throw new Error('processScan method must be implemented');
  }

  /**
   * Set the scan processor function
   */
  setScanProcessor(processor: (barcode: string) => Promise<any>): void {
    this.processScan = processor;
  }

  /**
   * Remove completed scans from the queue
   */
  private cleanupCompletedScans(): void {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(scan => 
      scan.status === 'pending' || scan.status === 'processing'
    );
    
    if (this.queue.length !== initialLength) {
      this.notifyStatusListeners();
      console.log(`[ScanQueue] Cleaned up completed scans (remaining: ${this.queue.length})`);
    }
  }

  /**
   * Get current queue status
   */
  getQueueStatus(): QueuedScan[] {
    return [...this.queue]; // Return a copy
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    total: number;
    pending: number;
    processing: number;
    success: number;
    error: number;
  } {
    const stats = {
      total: this.queue.length,
      pending: 0,
      processing: 0,
      success: 0,
      error: 0
    };

    this.queue.forEach(scan => {
      stats[scan.status]++;
    });

    return stats;
  }

  /**
   * Subscribe to queue status updates
   */
  onStatusChange(listener: (queue: QueuedScan[]) => void): () => void {
    this.statusListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.statusListeners.indexOf(listener);
      if (index > -1) {
        this.statusListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all status listeners
   */
  private notifyStatusListeners(): void {
    const queueCopy = this.getQueueStatus();
    this.statusListeners.forEach(listener => {
      try {
        listener(queueCopy);
      } catch (error) {
        console.error('[ScanQueue] Error in status listener:', error);
      }
    });
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
    this.isProcessing = false;
    this.notifyStatusListeners();
    console.log('[ScanQueue] Queue cleared');
  }

  /**
   * Cancel a specific scan
   */
  cancelScan(scanId: string): boolean {
    const scanIndex = this.queue.findIndex(scan => scan.id === scanId);
    if (scanIndex === -1) {
      return false;
    }

    const scan = this.queue[scanIndex];
    if (scan.status === 'processing') {
      // Can't cancel a scan that's currently processing
      return false;
    }

    this.queue.splice(scanIndex, 1);
    this.notifyStatusListeners();
    console.log(`[ScanQueue] Cancelled scan: ${scan.barcode}`);
    return true;
  }
}

/**
 * Default scan queue instance
 */
export const defaultScanQueue = new ScanQueue();