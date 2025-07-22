import React, { useEffect, useRef } from 'react';

interface InvisibleBarcodeScannerProps {
  onScan: (result: string) => void;
  isActive: boolean;
}

const InvisibleBarcodeScanner: React.FC<InvisibleBarcodeScannerProps> = ({ 
  onScan, 
  isActive 
}) => {
  const activeRef = useRef<boolean>(isActive);

  // Update ref when isActive changes
  useEffect(() => {
    activeRef.current = isActive;
  }, [isActive]);

  // Set up keyboard listener for barcode scanners with improved reliability
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
      
      // If there's a long delay between keypresses, start a new barcode
      if (currentTime - lastKeyTime > 500) { // Reduced timeout for better reliability
        barcodeBuffer = '';
      }
      
      // Update last keypress time
      lastKeyTime = currentTime;
      
      // Handle Enter key as completion of barcode
      if (e.key === 'Enter' && barcodeBuffer.length >= 4) {
        onScan(barcodeBuffer);
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
        
        // Process immediately if we have a complete barcode (12-14 digits for common formats)
        if (barcodeBuffer.length >= 8 && (barcodeBuffer.length === 12 || barcodeBuffer.length === 13 || barcodeBuffer.length === 14)) {
          onScan(barcodeBuffer);
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
  }, [isActive, onScan]);

  // This component renders nothing visible
  return null;
};

export default InvisibleBarcodeScanner;