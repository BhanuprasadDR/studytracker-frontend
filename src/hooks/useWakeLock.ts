import { useState, useEffect, useCallback } from 'react';

export const useWakeLock = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [userWantsWakeLock, setUserWantsWakeLock] = useState(false);
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

  // Check if Wake Lock API is supported
  useEffect(() => {
    setIsSupported('wakeLock' in navigator);
  }, []);

  // Handle visibility change to reacquire wake lock when returning to tab
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && userWantsWakeLock && !wakeLock) {
        // Page became visible and user wants wake lock - reacquire it
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userWantsWakeLock, wakeLock]);
  const requestWakeLock = useCallback(async () => {
    if (!isSupported) return false;

    try {
      const lock = await navigator.wakeLock.request('screen');
      setWakeLock(lock);
      setIsActive(true);
      setUserWantsWakeLock(true);

      // Handle wake lock release
      lock.addEventListener('release', () => {
        setIsActive(false);
        setWakeLock(null);
      });

      return true;
    } catch (error) {
      console.log('Wake lock request failed:', error);
      return false;
    }
  }, [isSupported]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLock) {
      try {
        await wakeLock.release();
        setWakeLock(null);
        setIsActive(false);
        setUserWantsWakeLock(false);
      } catch (error) {
        console.log('Wake lock release failed:', error);
      }
    }
  }, [wakeLock]);

  const toggleWakeLock = useCallback(async () => {
    if (isActive) {
      await releaseWakeLock();
    } else {
      await requestWakeLock();
    }
  }, [isActive, requestWakeLock, releaseWakeLock]);


  return {
    isSupported,
    isActive,
    requestWakeLock,
    releaseWakeLock,
    toggleWakeLock
  };
};