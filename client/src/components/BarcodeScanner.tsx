import React, { useEffect, useRef, useState } from './../../node_modules/.vite/deps_temp_343513f7/react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType, Result } from '@zxing/library';
import { checkForDedicatedScanner } from "./src/utils/peripheralDetection";
import { useToast } from "./src/hooks/use-toast";

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onError?: (error: Error) => void;
  onClose: () => void;
  isActive: boolean;
  formats?: BarcodeFormat[];
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ 
  onScan, 
  onError, 
  onClose,
  isActive, 
  formats 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const activeRef = useRef<boolean>(isActive);
  const [hasHardwareScanner, setHasHardwareScanner] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    activeRef.current = isActive;
  }, [isActive]);

  // Check for dedicated barcode scanner when component becomes active
  useEffect(() => {
    if (isActive) {
      checkForDedicatedScanner().then(hasScanner => {
        setHasHardwareScanner(hasScanner);
        if (hasScanner) {
          toast({
            title: "Hardware Detected",
            description: "External barcode scanner detected and ready to use",
          });
        }
      });
    }
  }, [isActive, toast]);

  useEffect(() => {
    if (!isActive) return;

    const hints = new Map();
    
    // Set specific formats if provided, otherwise use defaults
    if (formats && formats.length > 0) {
      hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
    } else {
      hints.set(
        DecodeHintType.POSSIBLE_FORMATS, 
        [
          BarcodeFormat.QR_CODE,
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_39,
          BarcodeFormat.CODE_128
        ]
      );
    }

    const reader = new BrowserMultiFormatReader(hints);
    readerRef.current = reader;

    const startScanning = async () => {
      try {
        if (!videoRef.current) return;
        
        await reader.decodeFromConstraints(
          {
            audio: false,
            video: { 
              facingMode: 'environment',
              width: { min: 640, ideal: 1280, max: 1920 },
              height: { min: 480, ideal: 720, max: 1080 }
            }
          },
          videoRef.current,
          (result: Result | null, error?: Error) => {
            if (result && activeRef.current) {
              onScan(result.getText());
            }
            
            if (error && onError) {
              onError(error);
            }
          }
        );
        
        setErrorMessage(null);
      } catch (err) {
        console.error('Error starting scanner:', err);
        setErrorMessage('Failed to access camera. Please check permissions.');
        if (onError && err instanceof Error) {
          onError(err);
        }
      }
    };

    startScanning();

    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
        readerRef.current = null;
      }
    };
  }, [isActive, formats, onScan, onError]);

  const handleClose = () => {
    if (readerRef.current) {
      readerRef.current.reset();
      readerRef.current = null;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md overflow-hidden">
        <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
          <h3 className="font-medium">
            {hasHardwareScanner ? "Hardware Scanner Detected" : "Scan Barcode"}
          </h3>
          <button 
            onClick={handleClose}
            className="text-white hover:text-gray-200"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="p-4">
          {errorMessage ? (
            <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
              <p>{errorMessage}</p>
            </div>
          ) : null}
          
          {hasHardwareScanner ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-green-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-green-800 mb-1">External Barcode Scanner Ready</h4>
              <p className="text-sm text-green-600 mb-4">
                The system will use your dedicated scanner device instead of the camera.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Make sure your scanner is properly connected and scan a barcode to proceed.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-gray-900 rounded overflow-hidden aspect-video relative">
                <video 
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                <div className="absolute inset-0 border-2 border-dashed border-yellow-400 m-8 pointer-events-none"></div>
              </div>
              <p className="text-gray-500 mt-3 text-center text-sm">
                Position the barcode within the frame to scan
              </p>
            </>
          )}
        </div>
        
        <div className="p-4 bg-gray-100 flex justify-between">
          <button 
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-200"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              // Manually enter barcode option
              const barcode = prompt('Enter barcode manually:');
              if (barcode) {
                onScan(barcode);
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Enter Manually
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;