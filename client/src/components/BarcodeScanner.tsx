import React, { useEffect, useRef } from 'react';
import { BarcodeFormat } from '@zxing/library';
import { ScanQueue, QueuedScan } from '@/utils/scanQueue';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  isActive: boolean;
  formats?: BarcodeFormat[];
  scanQueue?: ScanQueue;
  onQueueUpdate?: (queue: QueuedScan[]) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ 
  onScan, 
  onError, 
  isActive, 
  formats,
  scanQueue,
  onQueueUpdate
}) => {
  const activeRef = useRef<boolean>(isActive);
  const currentScanQueue = useRef<ScanQueue>(scanQueue || new ScanQueue());

  useEffect(() => {
    activeRef.current = isActive;
  }, [isActive]);

  // Set up scan queue processor
  useEffect(() => {
    const queue = currentScanQueue.current;
    
    // Set the scan processor to handle the actual scanning logic
    queue.setScanProcessor(async (barcode: string) => {
      return new Promise((resolve, reject) => {
        try {
          onScan(barcode);
          resolve({ barcode, processed: true });
        } catch (error) {
          if (onError) {
            onError(error as Error);
          }
          reject(error);
        }
      });
    });

    // Subscribe to queue updates if callback provided
    let unsubscribe: (() => void) | undefined;
    if (onQueueUpdate) {
      unsubscribe = queue.onStatusChange(onQueueUpdate);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [onScan, onError, onQueueUpdate]);

  // Enhanced barcode scanner with queue support and optimized timing
  useEffect(() => {
    if (!isActive) return;

    let barcodeBuffer = '';
    let lastKeyTime = 0;

    const handleKeyboardInput = (e: KeyboardEvent) => {
      // Only process when active
      if (!activeRef.current) return;
      
      // Don't capture input if user is typing in an input field or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      
      const currentTime = new Date().getTime();
      
      // Reduced timeout for better reliability - optimized timing
      if (currentTime - lastKeyTime > 300) { // Reduced from 500ms to 300ms
        barcodeBuffer = '';
      }
      
      // Update last keypress time
      lastKeyTime = currentTime;
      
      // Handle Enter key as completion of barcode
      if (e.key === 'Enter' && barcodeBuffer.length >= 4) {
        // Add to scan queue instead of processing immediately
        const scanId = currentScanQueue.current.addScan(barcodeBuffer);
        if (!scanId) {
          // Invalid barcode or duplicate - show error through onError callback
          if (onError) {
            onError(new Error(`Invalid or duplicate barcode: ${barcodeBuffer}`));
          }
        }
        barcodeBuffer = '';
        e.preventDefault();
        e.stopPropagation();
      } 
      // Handle all other keys that might be part of a barcode
      else if (/^[a-zA-Z0-9\-]$/.test(e.key)) {
        barcodeBuffer += e.key;
        
        // Prevent the key from being typed elsewhere
        e.preventDefault();
        e.stopPropagation();
        
        // Process immediately if we have a complete barcode (optimized lengths)
        if (barcodeBuffer.length >= 8 && (
          barcodeBuffer.length === 8 ||  // EAN-8
          barcodeBuffer.length === 12 || // UPC-A
          barcodeBuffer.length === 13 || // EAN-13
          barcodeBuffer.length === 14    // GTIN-14
        )) {
          // Add to scan queue instead of processing immediately
          const scanId = currentScanQueue.current.addScan(barcodeBuffer);
          if (!scanId) {
            // Invalid barcode or duplicate - show error through onError callback
            if (onError) {
              onError(new Error(`Invalid or duplicate barcode: ${barcodeBuffer}`));
            }
          }
          barcodeBuffer = '';
        }
      }
    };
    
    // Add the listener with capture to get events before other handlers
    document.addEventListener('keydown', handleKeyboardInput, true);
    
    // Return cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeyboardInput, true);
    };
  }, [isActive, onError]);

  // This component runs invisibly in background - no UI needed
  return null;
};

export default BarcodeScanner;