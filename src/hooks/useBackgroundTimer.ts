import { useState, useEffect, useRef, useCallback } from 'react';

interface TimerState {
  isRunning: boolean;
  startTime: number | null;
  elapsedTime: number;
  subject: string;
  topic: string;
}

export const useBackgroundTimer = () => {
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    startTime: null,
    elapsedTime: 0,
    subject: '',
    topic: ''
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  // Load timer state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('backgroundTimer');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.isRunning && parsed.startTime) {
          // Calculate elapsed time based on current time
          const now = Date.now();
          const calculatedElapsed = now - parsed.startTime;
          setTimerState({
            ...parsed,
            elapsedTime: calculatedElapsed
          });
        } else {
          setTimerState(parsed);
        }
      } catch (error) {
        console.error('Error loading timer state:', error);
      }
    }
  }, []);

  // Save timer state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('backgroundTimer', JSON.stringify(timerState));
  }, [timerState]);

  // Handle visibility change (tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden - timer continues in background
        lastUpdateRef.current = Date.now();
      } else {
        // Tab is visible again - sync timer state
        if (timerState.isRunning && timerState.startTime) {
          const now = Date.now();
          const calculatedElapsed = now - timerState.startTime;
          setTimerState(prev => ({
            ...prev,
            elapsedTime: calculatedElapsed
          }));
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [timerState.isRunning, timerState.startTime]);

  // Handle page unload/reload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (timerState.isRunning && timerState.startTime) {
        // Save current state before page unloads
        const currentState = {
          ...timerState,
          elapsedTime: Date.now() - timerState.startTime
        };
        localStorage.setItem('backgroundTimer', JSON.stringify(currentState));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [timerState]);

  // Timer interval
  useEffect(() => {
    if (timerState.isRunning && timerState.startTime) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = now - timerState.startTime!;
        setTimerState(prev => ({
          ...prev,
          elapsedTime: elapsed
        }));
      }, 10); // Update every 10ms for smooth display
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState.isRunning, timerState.startTime]);

  const startTimer = useCallback((subject: string, topic: string) => {
    const now = Date.now();
    setTimerState({
      isRunning: true,
      startTime: now,
      elapsedTime: 0,
      subject,
      topic
    });
  }, []);

  const pauseTimer = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      startTime: null
    }));
  }, []);

  const resumeTimer = useCallback(() => {
    if (timerState.elapsedTime > 0) {
      const now = Date.now();
      setTimerState(prev => ({
        ...prev,
        isRunning: true,
        startTime: now - prev.elapsedTime
      }));
    }
  }, [timerState.elapsedTime]);

  const resetTimer = useCallback(() => {
    // Always preserve current subject and topic
    const currentSubject = timerState.subject;
    const currentTopic = timerState.topic;
    
    setTimerState({
      isRunning: false,
      startTime: null,
      elapsedTime: 0,
      subject: currentSubject || '', // Preserve subject or empty string
      topic: currentTopic || ''      // Preserve topic or empty string
    });
    
    // Immediately update localStorage with preserved subject/topic
    const preservedState = {
      isRunning: false,
      startTime: null,
      elapsedTime: 0,
      subject: currentSubject || '',
      topic: currentTopic || ''
    };
    localStorage.setItem('backgroundTimer', JSON.stringify(preservedState));
  }, []);

  const endSession = useCallback(() => {
    const finalElapsed = timerState.elapsedTime;
    // Always preserve current subject and topic
    const currentSubject = timerState.subject;
    const currentTopic = timerState.topic;
    
    setTimerState({
      isRunning: false,
      startTime: null,
      elapsedTime: 0,
      subject: currentSubject || '', // Preserve subject or empty string
      topic: currentTopic || ''      // Preserve topic or empty string
    });
    
    // Immediately update localStorage with preserved subject/topic
    const preservedState = {
      isRunning: false,
      startTime: null,
      elapsedTime: 0,
      subject: currentSubject || '',
      topic: currentTopic || ''
    };
    localStorage.setItem('backgroundTimer', JSON.stringify(preservedState));
    
    return finalElapsed;
  }, [timerState.elapsedTime, timerState.subject, timerState.topic]);

  const updateSubjectTopic = useCallback((subject: string, topic: string) => {
    setTimerState(prev => ({
      ...prev,
      subject,
      topic
    }));
  }, []);

  return {
    isRunning: timerState.isRunning,
    elapsedTime: timerState.elapsedTime,
    subject: timerState.subject,
    topic: timerState.topic,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    endSession,
    updateSubjectTopic
  };
};