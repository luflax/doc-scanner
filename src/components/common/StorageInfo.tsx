import React, { useEffect, useState } from 'react';
import { getStorageService } from '@/services/StorageService';
import type { StorageUsage } from '@/types';

interface StorageInfoProps {
  compact?: boolean;
}

export const StorageInfo: React.FC<StorageInfoProps> = ({ compact = false }) => {
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStorageUsage();
  }, []);

  const loadStorageUsage = async () => {
    try {
      const storageService = await getStorageService();
      const storageUsage = await storageService.getStorageUsage();
      setUsage(storageUsage);
    } catch (error) {
      console.error('Failed to load storage usage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading) {
    return compact ? (
      <span className="text-xs text-gray-500">Loading...</span>
    ) : (
      <div className="text-sm text-gray-600">Loading storage info...</div>
    );
  }

  if (!usage || usage.quota === 0) {
    return compact ? (
      <span className="text-xs text-gray-500">Storage: N/A</span>
    ) : (
      <div className="text-sm text-gray-600">Storage information not available</div>
    );
  }

  const getUsageColor = (percentage: number): string => {
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600">
          {formatBytes(usage.used)} / {formatBytes(usage.quota)}
        </span>
        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${getUsageColor(usage.percentage)} transition-all duration-300`}
            style={{ width: `${Math.min(usage.percentage, 100)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-2">Storage Usage</h3>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Used</span>
          <span className="font-medium">{formatBytes(usage.used)}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Total</span>
          <span className="font-medium">{formatBytes(usage.quota)}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Used</span>
          <span className="font-medium">{usage.percentage.toFixed(1)}%</span>
        </div>

        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mt-2">
          <div
            className={`h-full ${getUsageColor(usage.percentage)} transition-all duration-300`}
            style={{ width: `${Math.min(usage.percentage, 100)}%` }}
          />
        </div>

        {usage.percentage > 80 && (
          <div className="mt-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
            ⚠️ Storage is running low. Consider deleting old documents.
          </div>
        )}
      </div>
    </div>
  );
};
