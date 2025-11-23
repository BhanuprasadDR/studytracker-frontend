import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Play, Pause, X, RotateCcw, Settings, Square, StopCircle, Maximize2, Minimize2 } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface FloatingTimerPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SynchronizedFloatingTimerProps {
  isVisible: boolean;
  onClose: () => void;
}

const SynchronizedFloatingTimer: React.FC<SynchronizedFloatingTimerProps> = ({
  isVisible,
  onClose
}) => {
  const [position, setPosition] = useLocalStorage<FloatingTimerPosition>('floatingTimerPosition', {
    x: window.innerWidth - 200,
    y: 100,
    width: 180,
    height: 180
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const timerRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  // Since we removed the Pomodoro context, this component is now non-functional
  // Return a simple message
  if (!isVisible) return null;

  return (
    <div
      className="fixed z-[9999] bg-white dark:bg-gray-800 rounded-full shadow-2xl border-2 border-gray-200 dark:border-gray-600 p-4"
      style={{
        left: position.x,
        top: position.y,
        width: 120,
        height: 120,
        zIndex: 2147483647
      }}
    >
      <button
        onClick={onClose}
        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs transition-colors shadow-lg"
      >
        <X className="w-3 h-3" />
      </button>
      
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">Floating Timer</div>
        <div className="text-sm text-gray-800 dark:text-gray-200">Use main timer</div>
      </div>
    </div>
  );

  // Dragging logic
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === resizeRef.current) return;
    
    setIsDragging(true);
    const rect = timerRef.current!.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newX = Math.max(0, Math.min(window.innerWidth - position.width, e.clientX - dragOffset.x));
      const newY = Math.max(0, Math.min(window.innerHeight - position.height, e.clientY - dragOffset.y));
      
      setPosition(prev => ({
        ...prev,
        x: newX,
        y: newY
      }));
    }
  }, [isDragging, dragOffset, position.width, position.height, setPosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  // Resizing logic
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.stopPropagation();
    e.preventDefault();
  }, []);

  const handleResizeMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const rect = timerRef.current!.getBoundingClientRect();
      const newWidth = Math.max(120, Math.min(400, e.clientX - rect.left));
      const newHeight = Math.max(120, Math.min(400, e.clientY - rect.top));
      
      setPosition(prev => ({
        ...prev,
        width: newWidth,
        height: newHeight
      }));
    }
  }, [isResizing, setPosition]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousemove', handleResizeMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, handleMouseMove, handleResizeMouseMove, handleMouseUp]);

  // Keep timer on screen when window resizes
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        ...prev,
        x: Math.min(prev.x, window.innerWidth - prev.width),
        y: Math.min(prev.y, window.innerHeight - prev.height)
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setPosition]);

  if (!isVisible) return null;

  const minimizedSize = 60;
  const currentWidth = isMinimized ? minimizedSize : position.width;
  const currentHeight = isMinimized ? minimizedSize : position.height;

  return (
    <>
      {/* Main floating timer */}
      <div
        ref={timerRef}
        className={`fixed z-[9999] select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} transition-all duration-300`}
        style={{
          left: position.x,
          top: position.y,
          width: currentWidth,
          height: currentHeight,
          zIndex: 2147483647 // Maximum z-index for cross-site compatibility
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="relative w-full h-full">
          {/* Progress ring */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="rgba(0,0,0,0.1)"
              strokeWidth="3"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={getSessionColor()}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              className="transition-all duration-1000"
            />
          </svg>

          {/* Timer content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-2xl border-2 border-gray-200 dark:border-gray-600">
            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs transition-colors shadow-lg"
            >
              <X className="w-3 h-3" />
            </button>

            {/* Minimize/Maximize button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(!isMinimized);
              }}
              className="absolute -top-2 -left-2 w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center text-xs transition-colors shadow-lg"
            >
              {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
            </button>

            {!isMinimized && (
              <>
                {/* Settings button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSettings(true);
                  }}
                  className="absolute top-2 right-2 w-6 h-6 bg-gray-500 hover:bg-gray-600 text-white rounded-full flex items-center justify-center text-xs transition-colors"
                >
                  <Settings className="w-3 h-3" />
                </button>

                {/* Time display */}
                <div className="text-center mb-2">
                  <div className={`font-bold text-gray-900 dark:text-white ${currentWidth < 150 ? 'text-sm' : 'text-lg'}`} style={{ 
                    fontFamily: '"Segoe UI Variable", "Segoe UI", system-ui, -apple-system, sans-serif',
                    fontVariantNumeric: 'tabular-nums',
                    fontFeatureSettings: '"tnum" 1'
                  }}>
                    {formatTime(state.timeLeft)}
                  </div>
                  <div className={`text-gray-600 dark:text-gray-400 ${currentWidth < 150 ? 'text-xs' : 'text-sm'}`}>
                    {getSessionLabel()}
                  </div>
                </div>

                {/* Subject/Topic info */}
                {state.currentSession === 'pomodoro' && state.subject && currentWidth > 140 && (
                  <div className="text-center mb-2 px-2">
                    <div className="text-xs text-gray-700 dark:text-gray-300 truncate">
                      {state.subject}
                    </div>
                    {state.topic && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {state.topic}
                      </div>
                    )}
                  </div>
                )}

                {/* Control buttons */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      state.isRunning ? pauseTimer() : startTimer();
                    }}
                    className="w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors"
                  >
                    {state.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  
                  {state.isRunning && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        endSession();
                      }}
                      className="w-8 h-8 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center justify-center transition-colors"
                    >
                      <StopCircle className="w-4 h-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resetTimer();
                    }}
                    className="w-8 h-8 bg-gray-500 hover:bg-gray-600 text-white rounded-full flex items-center justify-center transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                {/* Session switcher */}
                {currentWidth > 160 && (
                  <div className="flex space-x-1 mt-2">
                    {(['pomodoro', 'short-break', 'long-break'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={(e) => {
                          e.stopPropagation();
                          switchSession(type);
                        }}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          state.currentSession === type
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                        }`}
                      >
                        {type === 'pomodoro' ? 'Focus' : type === 'short-break' ? 'Break' : 'Long'}
                      </button>
                    ))}
                  </div>
                )}

                {/* Resize handle */}
                <div
                  ref={resizeRef}
                  className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
                  onMouseDown={handleResizeMouseDown}
                >
                  <div className="absolute bottom-1 right-1 w-2 h-2 bg-gray-400 rounded-full opacity-50 hover:opacity-100 transition-opacity" />
                </div>
              </>
            )}

            {isMinimized && (
              <div className="text-center">
                <div className="text-xs font-bold text-gray-900 dark:text-white" style={{ 
                  fontFamily: '"Segoe UI Variable", "Segoe UI", system-ui, -apple-system, sans-serif',
                  fontVariantNumeric: 'tabular-nums',
                  fontFeatureSettings: '"tnum" 1'
                }}>
                  {formatTime(state.timeLeft)}
                </div>
                <div className="w-2 h-2 rounded-full mx-auto mt-1" style={{ backgroundColor: getSessionColor() }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto" style={{ zIndex: 2147483647 }}>
          <div className="flex min-h-screen items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setShowSettings(false)}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md transform transition-all">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Floating Timer Settings</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Timer Size
                    </label>
                    <input
                      type="range"
                      min="120"
                      max="400"
                      value={position.width}
                      onChange={(e) => {
                        const size = parseInt(e.target.value);
                        setPosition(prev => ({ ...prev, width: size, height: size }));
                      }}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {position.width}px
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Position
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPosition(prev => ({ ...prev, x: 20, y: 20 }))}
                        className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                      >
                        Top Left
                      </button>
                      <button
                        onClick={() => setPosition(prev => ({ ...prev, x: window.innerWidth - prev.width - 20, y: 20 }))}
                        className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                      >
                        Top Right
                      </button>
                      <button
                        onClick={() => setPosition(prev => ({ ...prev, x: 20, y: window.innerHeight - prev.height - 20 }))}
                        className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                      >
                        Bottom Left
                      </button>
                      <button
                        onClick={() => setPosition(prev => ({ ...prev, x: window.innerWidth - prev.width - 20, y: window.innerHeight - prev.height - 20 }))}
                        className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                      >
                        Bottom Right
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                    <button
                      onClick={() => setShowSettings(false)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

export default SynchronizedFloatingTimer;