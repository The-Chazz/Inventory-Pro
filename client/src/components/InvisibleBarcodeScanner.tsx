import React, { useEffect, useRef } from 'react';
import { ScanQueue, QueuedScan } from '@/utils/scanQueue';

interface InvisibleBarcodeScannerProps {
  onScan: (result: string) => void;
  isActive: boolean;
  scanQueue?: ScanQueue;
  onQueueUpdate?: (queue: QueuedScan[]) => void;
  onError?: (error: Error) => void;
}

const InvisibleBarcodeScanner: React.FC<InvisibleBarcodeScannerProps> = ({ 
  onScan, 
  isActive,
  scanQueue,
  onQueueUpdate,
  onError
}) => {
  const activeRef = useRef<boolean>(isActive);
  const currentScanQueue = useRef<ScanQueue>(scanQueue || new ScanQueue());

  // Update ref when isActive changes
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
  }, [onScan, onQueueUpdate, onError]);

  // Set up keyboard listener for barcode scanners with improved reliability and queue support
  useEffect(() => {
    if (!isActive) return;

    let barcodeBuffer = '';
    let lastKeyTime = 0;

    const keyListener = (e: KeyboardEvent) => {
      // Only process when active
      if (!activeRef.current) return;
      
      // Don't capture input if user is typing in an input field, textarea, or any interactive element
      const target = e.target as HTMLElement;
      if (target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable ||
        target.closest('[contenteditable]') ||
        target.closest('iframe') ||
        target.closest('.chat-window') ||
        target.closest('[role="textbox"]')
      )) {
        return;
      }
      
      const currentTime = new Date().getTime();
      
      // Optimized timeout for better reliability - reduced from 500ms to 300ms
      if (currentTime - lastKeyTime > 300) {
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
        
        // Process immediately if we have a complete barcode - optimized for common formats
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
    
    // Add the listener
    document.addEventListener('keydown', keyListener, true);
    
    // Cleanup function
    return () => {
      document.removeEventListener('keydown', keyListener, true);
    };
  }, [isActive, onError]);

  // This component renders nothing visible
  return null;
};

export default InvisibleBarcodeScanner;