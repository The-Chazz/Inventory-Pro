import React, { useState, useRef } from 'react';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ReceiptUploaderProps {
  onReceiptUploaded: (receiptData: { imageUrl: string; fileName: string }) => void;
  currentReceipt?: string;
  className?: string;
  acceptedTypes?: string[];
}

const ReceiptUploader: React.FC<ReceiptUploaderProps> = ({ 
  onReceiptUploaded, 
  currentReceipt,
  className = "",
  acceptedTypes = ['image/*', '.pdf']
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentReceipt);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (images and PDFs for receipts)
    const isValidType = file.type.startsWith('image/') || file.type === 'application/pdf';
    if (!isValidType) {
      setError('Please select an image file or PDF.');
      return;
    }

    // Validate file size (max 10MB for receipts)
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be less than 10MB.');
      return;
    }

    setError(null);
    setIsLoading(true);
    setFileName(file.name);

    try {
      // Create a local preview for images only
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onloadend = async () => {
          // Show preview first for images
          const dataUrl = reader.result as string;
          setPreviewUrl(dataUrl);
          
          await uploadFile(file);
        };
        
        reader.onerror = () => {
          throw new Error('Failed to read file');
        };
      } else {
        // For PDFs, upload directly without preview
        await uploadFile(file);
      }
    } catch (error: any) {
      console.error('Error processing receipt:', error);
      handleUploadError(error);
    }
  };

  const uploadFile = async (file: File) => {
    try {
      // Upload the file to the server
      const formData = new FormData();
      formData.append('receipt', file);
      
      const response = await fetch('/api/receipts/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload receipt');
      }
      
      const result = await response.json();
      
      // Pass the server URL and filename to the parent component
      onReceiptUploaded({
        imageUrl: result.receiptUrl || result.imageUrl,
        fileName: fileName || file.name
      });
      
      // Invalidate relevant queries to refresh data after upload
      queryClient.invalidateQueries({ queryKey: ['/api/receipts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      
      // Show success toast
      toast({
        title: "Success",
        description: "Receipt uploaded successfully",
        duration: 2000,
      });
      
      setIsLoading(false);
    } catch (error: any) {
      handleUploadError(error);
    }
  };

  const handleUploadError = (error: any) => {
    console.error('Error uploading receipt:', error);
    setError(error.message || 'Failed to upload receipt');
    setPreviewUrl(undefined);
    setFileName('');
    setIsLoading(false);
    
    // Show error toast
    toast({
      title: "Upload Failed",
      description: error.message || 'Failed to upload receipt',
      variant: "destructive",
      duration: 3000,
    });
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveReceipt = () => {
    setPreviewUrl(undefined);
    setError(null);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onReceiptUploaded({ imageUrl: '', fileName: '' });
    
    // Show confirmation toast
    toast({
      description: "Receipt removed",
      duration: 2000,
    });
  };

  const isPdf = fileName.toLowerCase().endsWith('.pdf');

  return (
    <div className={`receipt-uploader ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={acceptedTypes.join(',')}
        className="hidden"
      />

      {previewUrl || fileName ? (
        <div className="relative mt-2">
          {isPdf ? (
            // PDF preview
            <div className="w-full h-48 border border-gray-300 rounded-md bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-gray-600">PDF Receipt</p>
                <p className="text-xs text-gray-500 truncate max-w-full">{fileName}</p>
              </div>
            </div>
          ) : (
            // Image preview
            <img
              src={previewUrl}
              alt="Receipt Preview"
              className="w-full h-48 object-contain border border-gray-300 rounded-md"
            />
          )}
          <button
            type="button"
            onClick={handleRemoveReceipt}
            className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 focus:outline-none"
            title="Remove receipt"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleButtonClick}
          disabled={isLoading}
          className="w-full h-48 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {isLoading ? (
            <div className="text-center">
              <svg className="animate-spin h-6 w-6 text-gray-400 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm text-gray-600">Uploading receipt...</p>
            </div>
          ) : (
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">Click to upload receipt</p>
              <p className="mt-1 text-xs text-gray-500">Images or PDF up to 10MB</p>
            </div>
          )}
        </button>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default ReceiptUploader;