import React, { useState, useEffect } from 'react';
import { CheckCircle, Target, Trophy, Info, Lightbulb, BookOpen } from 'lucide-react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  type?: 'success' | 'progress' | 'achievement';
  position?: 'default' | 'center';
}

const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose, type = 'success', position = 'default' }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsClosing(false);
      setShouldRender(true);
      
      // Auto-close after 20 seconds
      const timer = setTimeout(() => {
        setIsClosing(true);
        // Wait for fade-out animation to complete before calling onClose
        setTimeout(() => {
          setShouldRender(false);
          onClose();
        }, 300);
      }, 20000);

      return () => clearTimeout(timer);
    } else {
      // Delay unmounting to allow exit animation
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'achievement':
        return <Trophy className="w-5 h-5 text-amber-500" />;
      case 'progress':
        return <Target className="w-5 h-5 text-blue-500" />;
      default:
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'achievement':
        return 'Goal Achieved!';
      case 'progress':
        return 'Great Progress!';
      default:
        return 'Session Complete';
    }
  };

  const getPositionClasses = () => {
    if (position === 'center') {
      return 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
    }
    return 'fixed top-4 right-4';
  };
  // Don't render at all if not needed
  if (!shouldRender && !isVisible) return null;

  return (
    <div className={`${getPositionClasses()} z-[9999] pointer-events-none transition-all duration-300 ease-in-out ${
      isClosing || !isVisible ? 'opacity-0 translate-x-full scale-95' : 'opacity-100 translate-x-0 scale-100'
    }`}>
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 shadow-lg max-w-sm w-full pointer-events-auto">
        <div className="flex items-start space-x-3">
          {/* Soft Icon */}
          <div className="flex-shrink-0 mt-0.5">
            <div className="p-2 bg-white/60 rounded-xl backdrop-blur-sm">
              {getIcon()}
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-800 mb-1 leading-tight">
              {getTitle()}
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              {message}
            </p>
          </div>
          
          {/* Close Button */}
          <button
            onClick={() => {
              setIsClosing(true);
              setTimeout(() => onClose(), 300);
            }}
            className="flex-shrink-0 p-1 text-gray-500 hover:text-gray-700 transition-colors rounded-md hover:bg-white/50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;