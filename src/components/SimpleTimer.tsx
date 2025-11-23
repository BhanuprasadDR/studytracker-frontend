import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, RotateCcw, Edit, BookOpen, Target, Clock, Maximize, Minimize, Calendar } from 'lucide-react';
import { Subject, StudySession, RevisionSettings, PomodoroSession } from '../types';
import { formatDate } from '../utils/dateUtils';
import { getRevisionsDue, calculateRevisionDates, getOverdueRevisions } from '../utils/revisionUtils';
import { isDateOverdue, isDateToday } from '../utils/dateUtils';
import { useBackgroundTimer } from '../hooks/useBackgroundTimer';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';
import Button from './Button';
import Modal from './Modal';

// Custom hook for localStorage
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  return [storedValue, setValue];
}

interface SimpleTimerProps {
  onSessionComplete?: (session: PomodoroSession) => void;
  subjects?: Subject[];
  onSubjectsChange?: (subjects: Subject[]) => void;
  studySessions?: StudySession[];
  onStudySessionsChange?: (sessions: StudySession[]) => void;
  revisionSettings?: RevisionSettings;
  pomodoroSessions?: PomodoroSession[];
  globalTimerState?: any;
  onGlobalTimerStateChange?: (state: any) => void;
  dailyTargetHours?: number;
  hoursStudiedToday?: number;
}

const SimpleTimer: React.FC<SimpleTimerProps> = ({ 
  onSessionComplete, 
  subjects = [], 
  onSubjectsChange,
  studySessions = [],
  onStudySessionsChange,
  revisionSettings = { numberOfRevisions: 4, intervals: [1, 3, 7, 14] },
  pomodoroSessions = [],
  globalTimerState,
  onGlobalTimerStateChange,
  dailyTargetHours = 6,
  hoursStudiedToday = 0
}) => {
  const { toast, showToast, hideToast } = useToast();

  // Use global timer state if provided, otherwise fall back to local state
  const useGlobalTimer = !!(globalTimerState && onGlobalTimerStateChange);
  const localTimer = useBackgroundTimer();
  
  // Choose between global or local timer
  const timerState = useGlobalTimer ? {
    isRunning: globalTimerState.isRunning,
    elapsedTime: globalTimerState.elapsedTime,
    subject: globalTimerState.subject,
    topic: globalTimerState.topic,
    startTimer: (subject: string, topic: string) => {
      const now = Date.now();
      onGlobalTimerStateChange({
        isRunning: true,
        startTime: now,
        elapsedTime: 0,
        subject,
        topic
      });
    },
    pauseTimer: () => {
      onGlobalTimerStateChange({
        ...globalTimerState,
        isRunning: false,
        startTime: null
      });
    },
    resumeTimer: () => {
      if (globalTimerState.elapsedTime > 0) {
        const now = Date.now();
        onGlobalTimerStateChange({
          ...globalTimerState,
          isRunning: true,
          startTime: now - globalTimerState.elapsedTime
        });
      }
    },
    resetTimer: () => {
      onGlobalTimerStateChange({
        isRunning: false,
        startTime: null,
        elapsedTime: 0,
        subject: '',
        topic: ''
      });
    },
    endSession: () => {
      const finalElapsed = globalTimerState.elapsedTime;
      onGlobalTimerStateChange({
        isRunning: false,
        startTime: null,
        elapsedTime: 0,
        subject: '',
        topic: ''
      });
      return finalElapsed;
    },
    updateSubjectTopic: (subject: string, topic: string) => {
      onGlobalTimerStateChange({
        ...globalTimerState,
        subject,
        topic
      });
    }
  } : localTimer;

  const {
    isRunning,
    elapsedTime,
    subject,
    topic,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    endSession,
    updateSubjectTopic
  } = timerState;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSessionSetup, setShowSessionSetup] = useState(false);
  const [showSubjectEstimation, setShowSubjectEstimation] = useState(false);
  const [showRevisionSetup, setShowRevisionSetup] = useState(false);
  const [sessionForm, setSessionForm] = useState({ subject: '', topic: '' });
  const [subjectEstimation, setSubjectEstimation] = useState({ subject: '', estimatedHours: 10 });
  const [lastUsedValues, setLastUsedValues] = useLocalStorage('lastUsedSubjectTopic', { subject: '', topic: '' });
  const [mostRecentTimerSelection, setMostRecentTimerSelection] = useLocalStorage('mostRecentTimerSelection', { subject: '', topic: '', timestamp: 0 });
  const [revisionForm, setRevisionForm] = useState({ 
    selectedRevision: '', 
    customSubject: '', 
    customTopic: '', 
    useCustom: false 
  });
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  const revisionsDue = getRevisionsDue(studySessions);

  // Global timer update interval
  useEffect(() => {
    if (useGlobalTimer && globalTimerState?.isRunning && globalTimerState?.startTime) {
      const interval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - globalTimerState.startTime;
        onGlobalTimerStateChange({
          ...globalTimerState,
          elapsedTime: elapsed
        });
      }, 10);
      setIntervalId(interval);
      
      return () => {
        clearInterval(interval);
        setIntervalId(null);
      };
    } else if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
  }, [useGlobalTimer, globalTimerState?.isRunning, globalTimerState?.startTime]);

  // Initialize session form with current timer state values
  useEffect(() => {
    setSessionForm({
      subject: subject || '',
      topic: topic || ''
    });
  }, [subject, topic]);

  // Show background timer notification in title
  useEffect(() => {
    if (isRunning && document.title.indexOf('⏱️') === -1) {
      document.title = '⏱️ Timer Running - ' + document.title.replace('⏱️ Timer Running - ', '');
    } else if (!isRunning && document.title.indexOf('⏱️') !== -1) {
      document.title = document.title.replace('⏱️ Timer Running - ', '');
    }
  }, [isRunning]);

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const ms = Math.floor((milliseconds % 1000) / 10);
    
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const findExistingSubject = (subjectName: string) => {
    return subjects.find(subject => 
      subject.name.toLowerCase() === subjectName.toLowerCase()
    );
  };

  const getMostRecentSessionFromToday = () => {
    const today = new Date().toDateString();
    const selectionDate = new Date(mostRecentTimerSelection.timestamp).toDateString();
    
    if (mostRecentTimerSelection.subject && mostRecentTimerSelection.topic && selectionDate === today) {
      return {
        subject: mostRecentTimerSelection.subject,
        topic: mostRecentTimerSelection.topic
      };
    }
    
    if (lastUsedValues.subject && lastUsedValues.topic) {
      return {
        subject: lastUsedValues.subject,
        topic: lastUsedValues.topic
      };
    }
    
    return {
      subject: '',
      topic: ''
    };
  };

  const handleStart = () => {
    if (!subject || !topic) {
      const recentSession = getMostRecentSessionFromToday();
      setSessionForm({
        subject: subject || recentSession.subject || lastUsedValues.subject || '',
        topic: topic || recentSession.topic || lastUsedValues.topic || ''
      });
      setShowSessionSetup(true);
      return;
    }

    if (isRunning) {
      pauseTimer();
    } else if (elapsedTime > 0) {
      resumeTimer();
    } else {
      startTimer(subject, topic);
    }
  };

  const handleStop = () => {
    if (elapsedTime > 0 && subject && topic) {
      const finalElapsedTime = endSession();
      const durationInMinutes = Math.round(finalElapsedTime / 60000);
      const currentDate = formatDate(new Date());

      // Update StudySessions
      if (onStudySessionsChange) {
        onStudySessionsChange(prev => {
          const existingIndex = prev.findIndex(session => 
            session.date === currentDate &&
            session.subject.toLowerCase() === subject.toLowerCase() &&
            session.topic.toLowerCase() === topic.toLowerCase()
          );

          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              duration: updated[existingIndex].duration + Math.max(1, durationInMinutes)
            };
            return updated;
          } else {
            const newStudySession: StudySession = {
              id: Date.now().toString(),
              date: currentDate,
              subject,
              topic,
              duration: Math.max(1, durationInMinutes),
              type: 'study' as const,
              revisions: calculateRevisionDates(currentDate, revisionSettings),
              isCompleted: false
            };
            return [...prev, newStudySession];
          }
        });
      }

      // ✅ Notify parent (Dashboard) with PomodoroSession
      if (onSessionComplete) {
        const end = new Date();
        const start = new Date(end.getTime() - finalElapsedTime);

        const pomodoroSession: PomodoroSession = {
          id: Date.now().toString(),
          date: currentDate,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          duration: Math.max(1, durationInMinutes),
          sessionType: 'pomodoro',
          subject,
          topic,
        };

        onSessionComplete(pomodoroSession);
      }

      // Show toast if timer ran more than 60 minutes
      if (finalElapsedTime > 3600000) {
        showToast(hoursStudiedToday + (durationInMinutes / 60), dailyTargetHours || 6, 'center');
      }

      // Reset timer
      if (useGlobalTimer) {
        onGlobalTimerStateChange({
          isRunning: false,
          startTime: null,
          elapsedTime: 0,
          subject: '',
          topic: ''
        });
      } else {
        localTimer.resetTimer();
      }
    } else {
      // Just reset
      if (useGlobalTimer) {
        onGlobalTimerStateChange({
          isRunning: false,
          startTime: null,
          elapsedTime: 0,
          subject: '',
          topic: ''
        });
      } else {
        localTimer.resetTimer();
      }
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the timer? Time progress will be lost but subject and topic will be kept.')) {
      if (useGlobalTimer) {
        onGlobalTimerStateChange({
          isRunning: false,
          startTime: null,
          elapsedTime: 0,
          subject: '',
          topic: ''
        });
      } else {
        resetTimer();
      }
    }
  };

  const handleSessionSetup = () => {
    const existingSubject = findExistingSubject(sessionForm.subject);
    
    if (!existingSubject && onSubjectsChange && sessionForm.subject.trim()) {
      setSubjectEstimation({
        subject: sessionForm.subject,
        estimatedHours: 10
      });
      setShowSubjectEstimation(true);
      setShowSessionSetup(false);
      return;
    }

    updateSubjectTopic(sessionForm.subject, sessionForm.topic);
    startTimer(sessionForm.subject, sessionForm.topic);
    
    setMostRecentTimerSelection({
      subject: sessionForm.subject,
      topic: sessionForm.topic,
      timestamp: Date.now()
    });
    
    setLastUsedValues({
      subject: sessionForm.subject,
      topic: sessionForm.topic
    });
    
    setShowSessionSetup(false);
  };

  const handleRevisionSetup = () => {
    let revisionSubject = '';
    let revisionTopic = '';

    if (revisionForm.useCustom) {
      revisionSubject = revisionForm.customSubject;
      revisionTopic = revisionForm.customTopic;
    } else if (revisionForm.selectedRevision) {
      const selectedRevisionData = revisionsDue.find(r => r.id === revisionForm.selectedRevision);
      if (selectedRevisionData) {
        revisionSubject = selectedRevisionData.subject;
        revisionTopic = selectedRevisionData.topic;
      }
    }

    if (!revisionSubject || !revisionTopic) {
      return;
    }

    const existingSubject = findExistingSubject(revisionSubject);
    
    if (!existingSubject && onSubjectsChange && revisionSubject.trim()) {
      setSubjectEstimation({
        subject: revisionSubject,
        estimatedHours: 10
      });
      setSessionForm({ subject: revisionSubject, topic: revisionTopic });
      setShowSubjectEstimation(true);
      setShowRevisionSetup(false);
      return;
    }

    const revisionTopicWithLabel = revisionTopic.includes('(Revision)') 
      ? revisionTopic 
      : revisionTopic + ' (Revision)';

    updateSubjectTopic(revisionSubject, revisionTopicWithLabel);
    startTimer(revisionSubject, revisionTopicWithLabel);
    
    setMostRecentTimerSelection({
      subject: revisionSubject,
      topic: revisionTopicWithLabel,
      timestamp: Date.now()
    });
    
    setShowRevisionSetup(false);
  };

  const handleSubjectEstimationSubmit = () => {
    if (onSubjectsChange) {
      const newSubject: Subject = {
        id: Date.now().toString(),
        name: subjectEstimation.subject,
        estimatedHours: subjectEstimation.estimatedHours,
        actualHours: 0,
        completed: false
      };
      onSubjectsChange([...subjects, newSubject]);
    }

    updateSubjectTopic(sessionForm.subject, sessionForm.topic);
    startTimer(sessionForm.subject, sessionForm.topic);
    
    setMostRecentTimerSelection({
      subject: sessionForm.subject,
      topic: sessionForm.topic,
      timestamp: Date.now()
    });
    
    setLastUsedValues({
      subject: sessionForm.subject,
      topic: sessionForm.topic
    });
    
    setShowSubjectEstimation(false);
  };

  const handleEditSubjectTopic = () => {
    const recentSession = getMostRecentSessionFromToday();
    setSessionForm({
      subject: subject || recentSession.subject || '',
      topic: topic || recentSession.topic || ''
    });
    setShowSessionSetup(true);
  };

  const handleUpdateSubjectTopic = () => {
    const existingSubject = findExistingSubject(sessionForm.subject);
    
    if (!existingSubject && onSubjectsChange && sessionForm.subject.trim()) {
      setSubjectEstimation({
        subject: sessionForm.subject,
        estimatedHours: 10
      });
      setShowSubjectEstimation(true);
      setShowSessionSetup(false);
      return;
    }

    updateSubjectTopic(sessionForm.subject, sessionForm.topic);
    
    setMostRecentTimerSelection({
      subject: sessionForm.subject,
      topic: sessionForm.topic,
      timestamp: Date.now()
    });
    
    setLastUsedValues({
      subject: sessionForm.subject,
      topic: sessionForm.topic
    });
    
    setShowSessionSetup(false);
  };

  const handleSubjectEstimationUpdate = () => {
    if (onSubjectsChange) {
      const newSubject: Subject = {
        id: Date.now().toString(),
        name: subjectEstimation.subject,
        estimatedHours: subjectEstimation.estimatedHours,
        actualHours: 0,
        completed: false
      };
      onSubjectsChange([...subjects, newSubject]);
    }

    updateSubjectTopic(sessionForm.subject, sessionForm.topic);
    
    setMostRecentTimerSelection({
      subject: sessionForm.subject,
      topic: sessionForm.topic,
      timestamp: Date.now()
    });
    
    setLastUsedValues({
      subject: sessionForm.subject,
      topic: sessionForm.topic
    });
    
    setShowSubjectEstimation(false);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : ''} bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-all duration-300`}>
      <div className={`${isFullscreen ? 'h-full' : 'min-h-screen'} flex flex-col`}>
        {/* Header */}
        <div className={`${isFullscreen ? '' : 'sticky top-32 z-30'} flex justify-between items-center p-6 bg-gray-50 dark:bg-gray-900`}>
          <div></div>
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors z-40"
          >
            {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
          </button>
        </div>

        {/* Main Timer Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* Timer Display */}
          <div className="text-center mb-12">
            <div
              className="text-8xl md:text-9xl font-bold text-black dark:text-white mb-4 tracking-wider"
              style={{ 
                fontFamily: '"Segoe UI Variable", "Segoe UI", system-ui, -apple-system, sans-serif',
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum" 1',
                letterSpacing: '0.05em',
                textRendering: 'optimizeLegibility'
              }}
            >
              {formatTime(elapsedTime)}
            </div>
            <div className="flex justify-center space-x-12 text-lg text-gray-600 dark:text-gray-400 font-medium">
              <span>hr</span>
              <span>min</span>
              <span>sec</span>
              <span>ms</span>
            </div>
          </div>

          {/* Subject/Topic Info */}
          <div className="flex items-center justify-center space-x-6 mb-12">
            <div className="flex items-center space-x-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-600/50">
              <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-gray-600 dark:text-gray-400">Subject:</span>
              <span className="text-gray-900 dark:text-white font-medium min-w-[80px]">{subject || 'Not set'}</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-600/50">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-gray-600 dark:text-gray-400">Topic:</span>
              <span className="text-gray-900 dark:text-white font-medium min-w-[80px]">{topic || 'Not set'}</span>
            </div>
            <button
              onClick={handleEditSubjectTopic}
              className="flex items-center space-x-1 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 rounded-lg transition-all duration-200 border border-blue-200/50 dark:border-blue-700/50 shadow-sm hover:shadow-md"
            >
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => {
                setRevisionForm({ selectedRevision: '', customSubject: '', customTopic: '', useCustom: false });
                setShowRevisionSetup(true);
              }}
              className="flex items-center space-x-1 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95"
            >
              <BookOpen className="w-4 h-4" />
              <span>Revision</span>
              {revisionsDue.length > 0 && (
                <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-xs ml-1 font-medium">
                  {revisionsDue.length}
                </span>
              )}
            </button>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center space-x-6">
            {/* Start/Pause Button */}
            <button
              onClick={handleStart}
              className="w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
            >
              {isRunning ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
            </button>

            {/* End Session Button */}
            <button
              onClick={handleStop}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center space-x-2 transition-colors shadow-lg font-medium"
            >
              <Square className="w-5 h-5" />
              <span>End Session</span>
            </button>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="w-16 h-16 bg-gray-500 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
            >
              <RotateCcw className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 text-center text-gray-600 dark:text-gray-500">
          <p className="text-sm">
            {isRunning 
              ? 'Timer is running in the background - you can switch tabs safely' 
              : 'Press Start to begin your study session'
            }
          </p>
        </div>
      </div>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        isVisible={toast.isVisible}
        onClose={hideToast}
        type={toast.type}
        position={toast.position}
      />

      {/* Session Setup Modal */}
      <Modal
        isOpen={showSessionSetup}
        onClose={() => setShowSessionSetup(false)}
        title={subject && topic ? "Edit Subject & Topic" : "Set Study Session"}
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center space-x-2">
              <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Subject</span>
            </label>
            <div className="relative">
              <input
                type="text"
                list="subjects-list"
                value={sessionForm.subject}
                onChange={(e) => setSessionForm(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200 shadow-sm focus:shadow-md"
                placeholder="e.g., Mathematics (type or select)"
                required
              />
              <datalist id="subjects-list">
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.name} />
                ))}
              </datalist>
            </div>
            {sessionForm.subject && !findExistingSubject(sessionForm.subject) && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 flex items-center space-x-1">
                <span className="w-1 h-1 bg-blue-500 rounded-full" />
                <span>
                  New subject detected - you'll be asked to set estimated hours
                </span>
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Topic</span>
            </label>
            <div className="relative">
              <input
                type="text"
                list="topics-list"
                value={sessionForm.topic}
                onChange={(e) => setSessionForm(prev => ({ ...prev, topic: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200 shadow-sm focus:shadow-md"
                placeholder="e.g., Calculus (type or select)"
                required
              />
              <datalist id="topics-list">
                {(() => {
                  const today = formatDate(new Date());
                  const todaysTopics = new Set<string>();
                  
                  // From study sessions
                  studySessions
                    .filter(session => session.date === today)
                    .forEach(session => {
                      if (session.topic) todaysTopics.add(session.topic);
                    });
                  
                  // From pomodoro sessions
                  pomodoroSessions
                    .filter(session => session.date === today && session.sessionType === 'pomodoro')
                    .forEach(session => {
                      if (session.topic) {
                        const cleanTopic = session.topic.replace(/ \(Revision.*?\)$/i, '');
                        todaysTopics.add(cleanTopic);
                      }
                    });
                  
                  return Array.from(todaysTopics).map(topic => (
                    <option key={topic} value={topic} />
                  ));
                })()}
              </datalist>
            </div>
          </div>
        </div>
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
          <Button
            onClick={() => setShowSessionSetup(false)}
            variant="ghost"
            className="px-6 py-2.5"
          >
            Cancel
          </Button>
          <Button
            onClick={subject && topic ? handleUpdateSubjectTopic : handleSessionSetup}
            disabled={!sessionForm.subject || !sessionForm.topic}
            variant="primary"
            className="px-6 py-2.5"
          >
            {subject && topic ? 'Update' : 'Start Session'}
          </Button>
        </div>
      </Modal>

      {/* Revision Setup Modal */}
      <Modal
        isOpen={showRevisionSetup}
        onClose={() => setShowRevisionSetup(false)}
        title="Select Revision Topic"
        size="lg"
      >
        <div className="space-y-7">
          {revisionsDue.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                <span>Revisions Due Today</span>
                <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-2 py-1 rounded-full text-sm font-medium">
                  {revisionsDue.length}
                </span>
              </h4>
              <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                {revisionsDue.map((revision) => (
                  <label
                    key={`${revision.id}-${revision.revisionType}`}
                    className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50 dark:hover:from-yellow-900/20 dark:hover:to-orange-900/20 cursor-pointer transition-all duration-200 hover:border-yellow-300 dark:hover:border-yellow-600 hover:shadow-md"
                  >
                    <input
                      type="radio"
                      name="revision"
                      value={revision.id}
                      checked={revisionForm.selectedRevision === revision.id && !revisionForm.useCustom}
                      onChange={(e) => setRevisionForm(prev => ({ 
                        ...prev, 
                        selectedRevision: e.target.value, 
                        useCustom: false 
                      }))}
                      className="mr-4 w-4 h-4 text-yellow-600 focus:ring-yellow-500"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {revision.subject} - {revision.topic}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center space-x-2">
                        <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-2 py-0.5 rounded-full text-xs font-medium">
                          {revision.revisionType.replace('revision', 'Revision ')} • Due: {revision.revisionDate}
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Custom Topic Section */}
          <div>
            <div className="flex items-center mb-4">
              <input
                type="radio"
                name="revision"
                checked={revisionForm.useCustom}
                onChange={() => setRevisionForm(prev => ({ 
                  ...prev, 
                  useCustom: true, 
                  selectedRevision: '' 
                }))}
                className="mr-3 w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Revise Other Topic</span>
              </h4>
            </div>
            
            {revisionForm.useCustom && (
              <div className="space-y-5 ml-7 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-200/50 dark:border-blue-700/50">
                {/* Quick Select Dropdown */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Quick Select from Pending/Overdue</span>
                  </label>
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        const [subject, topic] = e.target.value.split('|||');
                        setRevisionForm(prev => ({
                          ...prev,
                          customSubject: subject,
                          customTopic: topic
                        }));
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200 shadow-sm focus:shadow-md"
                  >
                    <option value="">Select a topic to revise...</option>
                    {(() => {
                      const overdueRevisions = getOverdueRevisions(studySessions);
                      const pendingRevisions = studySessions
                        .filter(session => !session.isCompleted)
                        .flatMap(session => 
                          Object.entries(session.revisions)
                            .filter(([_, revision]) => !revision.completed && !isDateOverdue(revision.date) && !isDateToday(revision.date))
                            .map(([revisionKey, revision]) => ({
                              ...session,
                              revisionType: revisionKey,
                              revisionDate: revision.date,
                              status: 'pending' as const
                            }))
                        );
                      
                      const overdueTopics = new Set<string>();
                      const pendingTopics = new Set<string>();
                      
                      overdueRevisions.forEach(item => {
                        const key = `${item.subject}|||${item.topic}`;
                        overdueTopics.add(key);
                      });
                      
                      pendingRevisions.forEach(item => {
                        const key = `${item.subject}|||${item.topic}`;
                        if (!overdueTopics.has(key)) {
                          pendingTopics.add(key);
                        }
                      });
                      
                      const allOptions: JSX.Element[] = [];
                      
                      if (overdueTopics.size > 0) {
                        allOptions.push(
                          <optgroup key="overdue" label="🔴 Overdue Topics">
                            {Array.from(overdueTopics).map((topicKey, index) => {
                              const [subject, topic] = topicKey.split('|||');
                              return (
                                <option 
                                  key={`overdue-${topicKey}-${index}`}
                                  value={topicKey}
                                >
                                  {subject} - {topic}
                                </option>
                              );
                            })}
                          </optgroup>
                        );
                      }
                      
                      if (pendingTopics.size > 0) {
                        allOptions.push(
                          <optgroup key="pending" label="⏳ Pending Topics">
                            {Array.from(pendingTopics).map((topicKey, index) => {
                              const [subject, topic] = topicKey.split('|||');
                              return (
                                <option 
                                  key={`pending-${topicKey}-${index}`}
                                  value={topicKey}
                                >
                                  {subject} - {topic}
                                </option>
                              );
                            })}
                          </optgroup>
                        );
                      }
                      
                      if (allOptions.length === 0) {
                        allOptions.push(
                          <option key="no-topics" value="" disabled>
                            No pending or overdue revisions found
                          </option>
                        );
                      }
                      
                      return allOptions;
                    })()}
                  </select>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    Select from your existing revision schedule or enter custom details below
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center space-x-2">
                    <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Subject</span>
                  </label>
                  <input
                    type="text"
                    value={revisionForm.customSubject}
                    onChange={(e) => setRevisionForm(prev => ({ ...prev, customSubject: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200 shadow-sm focus:shadow-md"
                    placeholder="e.g., Mathematics"
                  />
                  {revisionForm.customSubject && !findExistingSubject(revisionForm.customSubject) && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 flex items-center space-x-1">
                      <span className="w-1 h-1 bg-blue-500 rounded-full" />
                      <span>
                        New subject detected - you'll be asked to set estimated hours
                      </span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Topic</span>
                  </label>
                  <input
                    type="text"
                    value={revisionForm.customTopic}
                    onChange={(e) => setRevisionForm(prev => ({ ...prev, customTopic: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200 shadow-sm focus:shadow-md"
                    placeholder="e.g., Calculus"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
            <Button
              onClick={() => setShowRevisionSetup(false)}
              variant="ghost"
              className="px-6 py-2.5"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRevisionSetup}
              disabled={
                (!revisionForm.useCustom && !revisionForm.selectedRevision) ||
                (revisionForm.useCustom && (!revisionForm.customSubject || !revisionForm.customTopic))
              }
              variant="primary"
              className="px-6 py-2.5"
            >
              Start Revision Session
            </Button>
          </div>
        </div>
      </Modal>

      {/* Subject Estimation Modal */}
      <Modal
        isOpen={showSubjectEstimation}
        onClose={() => setShowSubjectEstimation(false)}
        title="Set Subject Target Hours"
      >
        <div className="space-y-5">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 rounded-xl border border-blue-200/50 dark:border-blue-700/50">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-3 flex items-center space-x-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full" />
              <span>New Subject Detected</span>
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
              You're adding a new subject: <strong>{subjectEstimation.subject}</strong>
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-500">
              Please set the estimated hours you plan to spend on this subject.
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center space-x-2">
              <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>
                Estimated Hours for "{subjectEstimation.subject}"
              </span>
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              value={subjectEstimation.estimatedHours}
              onChange={(e) => setSubjectEstimation(prev => ({ 
                ...prev, 
                estimatedHours: parseInt(e.target.value) || 1 
              }))}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200 shadow-sm focus:shadow-md"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              You can always adjust this later in the Subjects tab
            </p>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
            <Button
              onClick={() => {
                setShowSubjectEstimation(false);
                setShowSessionSetup(true);
              }}
              variant="ghost"
              className="px-6 py-2.5"
            >
              Back
            </Button>
            <Button
              onClick={subject && topic ? handleSubjectEstimationUpdate : handleSubjectEstimationSubmit}
              variant="primary"
              className="px-6 py-2.5"
            >
              {subject && topic ? 'Save & Update' : 'Save & Start Session'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SimpleTimer;
