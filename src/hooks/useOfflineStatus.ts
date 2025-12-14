import { useState, useEffect } from 'react';

/**
 * Hook to track online/offline status
 * @returns boolean indicating if the device is online
 */
export function useOfflineStatus(): { isOnline: boolean; isOffline: boolean } {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = (): void => {
      setIsOnline(true);
      console.log('Network: Online');
    };

    const handleOffline = (): void => {
      setIsOnline(false);
      console.log('Network: Offline');
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connectivity check (optional, for more reliable detection)
    const checkConnectivity = async (): Promise<void> => {
      try {
        // Try to fetch a small resource to verify actual connectivity
        const response = await fetch('/favicon.ico', {
          method: 'HEAD',
          cache: 'no-cache',
        });
        setIsOnline(response.ok);
      } catch {
        setIsOnline(false);
      }
    };

    // Check connectivity every 30 seconds
    const intervalId = setInterval(checkConnectivity, 30000);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
  };
}
