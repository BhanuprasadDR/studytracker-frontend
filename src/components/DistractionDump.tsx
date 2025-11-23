import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Trash2, Check, Clock, AlertCircle, X } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { formatDateTime } from '../utils/dateUtils';

interface DistractionEntry {
  id: string;
  text: string;
  timestamp: string;
  resolved: boolean;
  reviewLater: boolean;
}

interface DistractionDumpProps {
  className?: string;
}

const DistractionDump: React.FC<DistractionDumpProps> = ({ className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [entries, setEntries] = useLocalStorage<DistractionEntry[]>('distractionEntries', []);
  const [showEmptyAlert, setShowEmptyAlert] = useState(false);
  const [lastInteraction, setLastInteraction] = useLocalStorage('lastDistractionInteraction', Date.now());
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const alertTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-save current text
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (currentText.trim()) {
        setLastInteraction(Date.now());
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [currentText, setLastInteraction]);

  // Check for empty distraction dump alert
  useEffect(() => {
    const checkEmptyAlert = () => {
      const now = Date.now();
      const timeSinceLastInteraction = now - lastInteraction;
      const fifteenMinutes = 15 * 60 * 1000;

      if (timeSinceLastInteraction > fifteenMinutes && entries.length === 0 && !currentText.trim() && !showEmptyAlert) {
        setShowEmptyAlert(true);
        
        // Auto-hide alert after 10 seconds
        alertTimeoutRef.current = setTimeout(() => {
          setShowEmptyAlert(false);
        }, 25000);
      }
    };

    const interval = setInterval(checkEmptyAlert, 60000); // Check every minute
    return () => {
      clearInterval(interval);
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
    };
  }, [lastInteraction, entries.length, currentText, showEmptyAlert]);

  const addEntry = () => {
    if (currentText.trim()) {
      const newEntry: DistractionEntry = {
        id: Date.now().toString(),
        text: currentText.trim(),
        timestamp: formatDateTime(new Date()),
        resolved: false,
        reviewLater: false
      };
      
      setEntries(prev => [newEntry, ...prev]);
      setCurrentText('');
      setLastInteraction(Date.now());
      
      // Focus back to textarea for quick entry
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      addEntry();
    }
  };

  const toggleResolved = (id: string) => {
    setEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, resolved: !entry.resolved } : entry
    ));
  };

  const toggleReviewLater = (id: string) => {
    setEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, reviewLater: !entry.reviewLater } : entry
    ));
  };

  const deleteEntry = (id: string) => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const clearAll = () => {
    if (window.confirm('Are you sure you want to clear all distraction entries?')) {
      setEntries([]);
      setCurrentText('');
      setLastInteraction(Date.now());
    }
  };

  const markAllResolved = () => {
    setEntries(prev => prev.map(entry => ({ ...entry, resolved: true })));
  };

  const dismissAlert = () => {
    setShowEmptyAlert(false);
    setLastInteraction(Date.now());
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
    }
  };

  const unresolvedCount = entries.filter(entry => !entry.resolved).length;
  const reviewLaterCount = entries.filter(entry => entry.reviewLater && !entry.resolved).length;

  return (
    <>
      {/* Empty Alert Notification */}
      {showEmptyAlert && (
        <div className="fixed right-4 bottom-20 z-50 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4 shadow-lg animate-in slide-in-from-right-2 duration-300">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Got distracted?
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                Jot it down in your distraction dump and get back on track!
              </p>
            </div>
            <button
              onClick={dismissAlert}
              className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Distraction Dump Component */}
      <div className={`fixed right-4 bottom-4 z-40 transition-all duration-300 ease-in-out ${className}`}>
        <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out ${
          isExpanded ? 'w-80' : 'w-56'
        }`}>
          {/* Header */}
          <div 
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-t-xl"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Distraction Dump
              </h3>
              {unresolvedCount > 0 && (
                <span className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs px-2 py-1 rounded-full">
                  {unresolvedCount}
                </span>
              )}
              {reviewLaterCount > 0 && (
                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded-full">
                  {reviewLaterCount} review
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              )}
            </div>
          </div>

          {/* Expandable Content */}
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? 'max-h-[32rem] opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <div className="p-6 pt-0 space-y-4">
              {/* Input Area */}
              <div className="space-y-3">
                <textarea
                  ref={textareaRef}
                  value={currentText}
                  onChange={(e) => setCurrentText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Dump all your distractions here... (Ctrl+Enter to save)"
                  className="w-full h-24 px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                />
                
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Quick capture your thoughts
                  </div>
                  <button
                    onClick={addEntry}
                    disabled={!currentText.trim()}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white text-xs rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              {entries.length > 0 && (
                <div className="flex items-center space-x-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                  <button
                    onClick={markAllResolved}
                    className="flex items-center space-x-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    <span>Mark All</span>
                  </button>
                  <button
                    onClick={clearAll}
                    className="flex items-center space-x-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear All</span>
                  </button>
                </div>
              )}

              {/* Entries List */}
              <div className="max-h-64 overflow-y-auto space-y-3">
                {entries.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-xs">
                    No distractions captured yet
                  </div>
                ) : (
                  entries.map((entry) => (
                    <div
                      key={entry.id}
                      className={`p-2 rounded-md border transition-all ${
                        entry.resolved
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 opacity-60'
                          : entry.reviewLater
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between space-x-2">
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs ${
                            entry.resolved 
                              ? 'text-gray-500 dark:text-gray-400 line-through' 
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {entry.text}
                          </p>
                          {entry.reviewLater && !entry.resolved && (
                            <div className="mt-0.5">
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                Review Later
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => toggleReviewLater(entry.id)}
                            className={`p-1 rounded transition-colors ${
                              entry.reviewLater
                                ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30'
                                : 'text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400'
                            }`}
                            title="Mark for review later"
                          >
                            <AlertCircle className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => toggleResolved(entry.id)}
                            className={`p-1 rounded transition-colors ${
                              entry.resolved
                                ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
                                : 'text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400'
                            }`}
                            title="Mark as resolved"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DistractionDump;