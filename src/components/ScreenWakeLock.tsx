import React, { useEffect } from 'react';
import { useWakeLock } from '../hooks/useWakeLock';

const ScreenWakeLock: React.FC = () => {
  const { isSupported, isActive, requestWakeLock, toggleWakeLock } = useWakeLock();

  // Automatically request wake lock when component mounts
  useEffect(() => {
    if (isSupported) {
      requestWakeLock();
    }
  }, [isSupported, requestWakeLock]);

  // Don't render anything if not supported
  if (!isSupported) {
    return null;
  }

  return (
    <div className="flex items-center space-x-3">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Screen Awake
      </span>
      <button
        onClick={toggleWakeLock}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          isActive
            ? 'bg-blue-600'
            : 'bg-gray-300 dark:bg-gray-600'
        }`}
        title={isActive ? 'Screen is kept awake - Click to allow sleep' : 'Click to keep screen awake'}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out ${
            isActive ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};

export default ScreenWakeLock;