import React, { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';

interface MotivationalQuote {
  text: string;
}

interface MotivationalQuoteToastProps {
  quote: MotivationalQuote | null;
  isVisible: boolean;
  position: any;
  onClose: () => void;
  isEnabled: boolean; // Add this prop to know if quotes are enabled
}

const MotivationalQuoteToast: React.FC<MotivationalQuoteToastProps> = ({
  quote,
  isVisible,
  position,
  onClose,
  isEnabled = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAutoExpanded, setIsAutoExpanded] = useState(false);
  const [autoMinimizeTimer, setAutoMinimizeTimer] = useState<NodeJS.Timeout | null>(null);

  // When a new quote becomes visible, automatically expand it for 25 seconds
  useEffect(() => {
    if (isVisible && quote) {
      setIsExpanded(true);
      setIsAutoExpanded(true);
      
      // Auto-minimize after 25 seconds
      const timer = setTimeout(() => {
        setIsExpanded(false);
        setIsAutoExpanded(false);
      }, 25000);
      
      setAutoMinimizeTimer(timer);
      
      return () => {
        if (timer) clearTimeout(timer);
      };
    }
  }, [isVisible, quote?.text]); // Add quote.text to dependencies to trigger on new quotes

  // Reset auto-expanded state when quote changes or becomes invisible
  useEffect(() => {
    if (!isVisible) {
      setIsAutoExpanded(false);
    }
  }, [isVisible, quote]);

  // Handle click to expand
  const handleIconClick = () => {
    if (quote && !isExpanded) {
      setIsExpanded(true);
      setIsAutoExpanded(false); // Manual expansion, not auto
    }
    // Clear auto-minimize timer when manually expanding
    if (autoMinimizeTimer) {
      clearTimeout(autoMinimizeTimer);
      setAutoMinimizeTimer(null);
    }
  };

  // Handle close button click
  const handleCloseClick = () => {
    setIsExpanded(false);
    setIsAutoExpanded(false);
    // Clear any existing timer
    if (autoMinimizeTimer) {
      clearTimeout(autoMinimizeTimer);
      setAutoMinimizeTimer(null);
    }
  };

  // Don't render if quotes are disabled
  if (!isEnabled) return null;

  // Show icon when enabled, expand when quote available and expanded
  const showIcon = isEnabled;
  const showFullContent = isExpanded && quote;

  return (
    <div 
      className="fixed top-20 right-4 z-[9998] pointer-events-auto transition-all duration-400 ease-out transform"
      style={{
        maxWidth: showFullContent ? '420px' : '48px',
        minWidth: showFullContent ? '350px' : '48px',
        height: showFullContent ? 'auto' : '48px'
      }}
    >
      <div className={`backdrop-blur-sm transition-all duration-500 ease-out transform ${
        showFullContent 
          ? 'bg-yellow-50 border border-yellow-200 rounded-2xl shadow-xl p-5 scale-100 w-full opacity-100' 
          : 'bg-gradient-to-br from-blue-500 to-blue-600 rounded-full shadow-lg hover:shadow-xl p-3 scale-100 hover:scale-110 w-12 h-12 group opacity-100 cursor-pointer'
      }`}>
        {showFullContent ? (
          <div className="flex items-start space-x-3 animate-fade-in">
            {/* Soft Icon */}
            <div className="flex-shrink-0 mt-0.5">
              <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200 shadow-sm">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0 animate-fade-in-delay">
              <h4 className="text-sm font-bold text-gray-900 mb-2 leading-tight tracking-wide">
                Study Mentor - CA Ramesh Murthy
              </h4>
              <div className="text-sm text-gray-800 leading-relaxed font-medium">
                {quote.text.split('\n').map((line, index) => (
                  <div key={index} className="mb-1.5 last:mb-0">
                    {line}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Close Button */}
            <button
              onClick={handleCloseClick}
              className="flex-shrink-0 p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors duration-200"
              title="Close message"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          /* Minimized State - Always show blue book icon when enabled */
          <div 
            className="flex items-center justify-center w-full h-full relative overflow-hidden"
            onClick={handleIconClick}
          >
            {/* Show subtle indicator if quote is available */}
            {quote && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full opacity-75"></div>
            )}
            
            {/* Pulsing ring effect */}
            <div className="absolute inset-0.5 rounded-full bg-blue-300 opacity-25 animate-ping"></div>
            <div className="absolute inset-1 rounded-full bg-blue-400 opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
            
            {/* Main icon */}
            <div className="relative z-10 transition-all duration-300 ease-out group-hover:scale-105">
              <BookOpen className="w-5 h-5 text-white drop-shadow-sm filter group-hover:drop-shadow-md" />
            </div>
            
            {/* Hover effect overlay */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out"></div>
            
            {/* Subtle glow effect on hover */}
            <div className="absolute inset-0 rounded-full bg-blue-400 opacity-0 group-hover:opacity-20 blur-sm transition-all duration-300 ease-out"></div>
          </div>
        )}
      </div>
      
      {/* Tooltip for minimized state */}
      {!showFullContent && (
        <div className="absolute top-full right-0 mt-3 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-lg z-10">
          {quote ? 'Click to read mentor message' : 'Mentor Messages (No new messages)'}
          <div className="absolute bottom-full right-6 w-0 h-0 border-l-3 border-r-3 border-b-3 border-transparent border-b-gray-900"></div>
        </div>
      )}
    </div>
  );
};

export default MotivationalQuoteToast;