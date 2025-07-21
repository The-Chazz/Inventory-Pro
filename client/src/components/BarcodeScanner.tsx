import React, { useEffect, useRef } from 'react';
import { BarcodeFormat } from '@zxing/library';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  isActive: boolean;
  formats?: BarcodeFormat[];
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ 
  onScan, 
  onError, 
  isActive, 
  formats
}) => {
  const activeRef = useRef<boolean>(isActive);

  useEffect(() => {
    activeRef.current = isActive;
  }, [isActive]);

  // Simplified barcode scanner - keyboard input only for better reliability
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
      
      // If there's a delay between keypresses, start a new barcode
      if (currentTime - lastKeyTime > 500) { // Reduced timeout for better reliability
        barcodeBuffer = '';
      }
      
      // Update last keypress time
      lastKeyTime = currentTime;
      
      // Handle Enter key as completion of barcode
      if (e.key === 'Enter' && barcodeBuffer.length >= 4) {
        try {
          onScan(barcodeBuffer);
        } catch (error) {
          if (onError) {
            onError(error as Error);
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
        
        // Process immediately if we have a complete barcode
        if (barcodeBuffer.length >= 8 && (barcodeBuffer.length === 12 || barcodeBuffer.length === 13 || barcodeBuffer.length === 14)) {
          try {
            onScan(barcodeBuffer);
          } catch (error) {
            if (onError) {
              onError(error as Error);
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
  }, [isActive, onScan, onError]);

  // This component runs invisibly in background - no UI needed
  return null;
};

export default BarcodeScanner;