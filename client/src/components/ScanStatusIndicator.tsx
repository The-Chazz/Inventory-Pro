import React from 'react';
import { QueuedScan, ScanStatus } from '@/utils/scanQueue';

interface ScanStatusIndicatorProps {
  queue: QueuedScan[];
  className?: string;
  showDetails?: boolean;
}

const getStatusIcon = (status: ScanStatus) => {
  switch (status) {
    case 'pending':
      return (
        <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'processing':
      return (
        <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      );
    case 'success':
      return (
        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'error':
      return (
        <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    default:
      return null;
  }
};

const getStatusColor = (status: ScanStatus) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'processing':
      return 'bg-blue-100 text-blue-800';
    case 'success':
      return 'bg-green-100 text-green-800';
    case 'error':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusText = (status: ScanStatus) => {
  switch (status) {
    case 'pending':
      return 'Queued';
    case 'processing':
      return 'Processing';
    case 'success':
      return 'Success';
    case 'error':
      return 'Error';
    default:
      return 'Unknown';
  }
};

export const ScanStatusIndicator: React.FC<ScanStatusIndicatorProps> = ({
  queue,
  className = '',
  showDetails = false
}) => {
  if (queue.length === 0) {
    return (
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-md bg-green-100 text-green-800 ${className}`}>
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span className="text-sm font-medium">Scanner Ready</span>
      </div>
    );
  }

  const stats = queue.reduce((acc, scan) => {
    acc[scan.status] = (acc[scan.status] || 0) + 1;
    return acc;
  }, {} as Record<ScanStatus, number>);

  const hasProcessing = stats.processing > 0;
  const hasError = stats.error > 0;
  const hasPending = stats.pending > 0;

  // Determine overall status
  let overallStatus: ScanStatus = 'success';
  let statusMessage = 'All scans complete';

  if (hasError) {
    overallStatus = 'error';
    statusMessage = `${stats.error} scan${stats.error > 1 ? 's' : ''} failed`;
  } else if (hasProcessing) {
    overallStatus = 'processing';
    statusMessage = 'Processing scans...';
  } else if (hasPending) {
    overallStatus = 'pending';
    statusMessage = `${stats.pending} scan${stats.pending > 1 ? 's' : ''} queued`;
  }

  if (showDetails) {
    return (
      <div className={`space-y-2 ${className}`}>
        {/* Overall status */}
        <div className={`flex items-center space-x-2 px-3 py-2 rounded-md ${getStatusColor(overallStatus)}`}>
          {getStatusIcon(overallStatus)}
          <span className="text-sm font-medium">{statusMessage}</span>
          {queue.length > 0 && (
            <span className="text-xs bg-white bg-opacity-50 rounded-full px-2 py-0.5">
              {queue.length}
            </span>
          )}
        </div>

        {/* Individual scan details */}
        {queue.length > 0 && (
          <div className="max-h-32 overflow-y-auto space-y-1">
            {queue.map((scan, index) => (
              <div
                key={scan.id}
                className={`flex items-center justify-between px-2 py-1 rounded text-xs ${getStatusColor(scan.status)}`}
              >
                <div className="flex items-center space-x-2">
                  {getStatusIcon(scan.status)}
                  <span className="font-mono">{scan.barcode}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>{getStatusText(scan.status)}</span>
                  {scan.retryCount && scan.retryCount > 0 && (
                    <span className="bg-white bg-opacity-50 rounded px-1">
                      R{scan.retryCount}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Simple compact view
  return (
    <div className={`flex items-center space-x-2 px-3 py-2 rounded-md ${getStatusColor(overallStatus)} ${className}`}>
      {getStatusIcon(overallStatus)}
      <span className="text-sm font-medium">{statusMessage}</span>
      {queue.length > 0 && (
        <span className="text-xs bg-white bg-opacity-50 rounded-full px-2 py-0.5">
          {queue.length}
        </span>
      )}
    </div>
  );
};

export default ScanStatusIndicator;