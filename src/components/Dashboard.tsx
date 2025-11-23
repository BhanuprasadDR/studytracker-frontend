import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, BookOpen, Target, BarChart3, Calendar, 
  Settings, Maximize, CheckCircle, LogOut
} from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { StudySession, PomodoroSession, Subject, AppSettings } from '../types';
import { getHoursStudiedToday, getTotalHoursStudied, getDaysUntilExam } from '../utils/dateUtils';
import { getRevisionsDue } from '../utils/revisionUtils';
import SimpleTimer from './SimpleTimer';
import StudyTracker from './StudyTracker';
import SubjectTracker from './SubjectTracker';
import RevisionTracker from './RevisionTracker';
import ExcelTracker from './ExcelTracker';
import ProgressCharts from './ProgressCharts';
import TodaySubjectChart from './TodaySubjectChart';
import SynchronizedFloatingTimer from './SynchronizedFloatingTimer';
import DistractionDump from './DistractionDump';
import Button from './Button';
import Modal from './Modal';
import ScreenWakeLock from './ScreenWakeLock';
import ThemeToggle from './ThemeToggle';
import { useMotivationalQuotes } from '../hooks/useMotivationalQuotes';
import MotivationalQuoteToast from './MotivationalQuoteToast';

interface DashboardProps {
  userInfo: { name: string; username: string };
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ userInfo, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFloatingTimer, setShowFloatingTimer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Motivational quotes hook
  const {
    currentQuote,
    isVisible: isQuoteVisible,
    position: quotePosition,
    isEnabled: quotesEnabled,
    hideQuote,
    toggleQuotes,
    showLoginQuote,
  } = useMotivationalQuotes(userInfo.username); // Pass username as unique user identifier

  // Persistent timer state that survives tab switches
  const [globalTimerState, setGlobalTimerState] = useLocalStorage('globalTimerState', {
    isRunning: false,
    startTime: null,
    elapsedTime: 0,
    subject: '',
    topic: ''
  });

  const [studySessions, setStudySessions] = useLocalStorage<StudySession[]>('studySessions', []);
  const [pomodoroSessions, setPomodoroSessions] = useLocalStorage<PomodoroSession[]>('pomodoroSessions', []);
  const [subjects, setSubjects] = useLocalStorage<Subject[]>('subjects', []);
  const [settings, setSettings] = useLocalStorage<AppSettings>('dashboardSettings', {
    pomodoroDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    dailyTargetHours: 8,
    examDate: '',
    examTargetHours: 100,
    revisionSettings: { numberOfRevisions: 4, intervals: [1, 3, 7, 14] }
  });

  // Temporary settings for the modal
  const [tempSettings, setTempSettings] = useState(settings);

  // Show login quote immediately when Dashboard mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      showLoginQuote();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [showLoginQuote]);

  // Update temp settings when settings change or modal opens
  useEffect(() => {
    if (showSettings) {
      setTempSettings(settings);
    }
  }, [showSettings, settings]);

  // Load study data from backend on first mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const loadData = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/study/data', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          console.error('Failed to load study data');
          return;
        }

        const data = await response.json();
        // data = { studySessions, pomodoroSessions, subjects, settings }

        // Study sessions
        if (data.studySessions) {
          setStudySessions(
            data.studySessions.map((s: any): StudySession => ({
              id: s.id,
              date: s.date,
              subject: s.subject,
              topic: s.topic,
              duration: s.duration,
              type: s.type,
              revisions: s.revisionsJson ? JSON.parse(s.revisionsJson) : {},
              isCompleted: s.isCompleted ?? false,
              completedAt: s.completedAt ?? undefined,
            }))
          );
        }

        // Pomodoro sessions
        if (data.pomodoroSessions) {
          setPomodoroSessions(
            data.pomodoroSessions.map((p: any): PomodoroSession => ({
              id: p.id,
              date: p.date,
              subject: p.subject,
              topic: p.topic,
              duration: p.duration,
              startTime: p.startTime ?? '',
              endTime: p.endTime ?? '',
              sessionType: p.sessionType ?? 'pomodoro',
            }))
          );
        }

        // Subjects
        if (data.subjects) {
          setSubjects(
            data.subjects.map((sub: any): Subject => ({
              id: sub.id,
              name: sub.name,
              estimatedHours: sub.estimatedHours,
              actualHours: sub.actualHours,
              completed: sub.completed,
            }))
          );
        }

        // Settings
        if (data.settings) {
          setSettings((prev) => ({
            ...prev,
            pomodoroDuration: data.settings.pomodoroDuration,
            shortBreakDuration: data.settings.shortBreakDuration,
            longBreakDuration: data.settings.longBreakDuration,
            dailyTargetHours: data.settings.dailyTargetHours,
            examDate: data.settings.examDate ?? '',
            examTargetHours: data.settings.examTargetHours,
            revisionSettings: data.settings.revisionSettingsJson
              ? JSON.parse(data.settings.revisionSettingsJson)
              : prev.revisionSettings,
            // longBreakInterval isn't in AppSettings type, so keep prev if missing
            // @ts-ignore
            longBreakInterval: data.settings.longBreakInterval ?? prev.longBreakInterval,
          }));
        }
      } catch (err) {
        console.error('Error loading study data', err);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save study data to backend whenever it changes
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const timeoutId = setTimeout(() => {
      const body = {
        studySessions: studySessions.map((s) => ({
          id: s.id,
          date: s.date,
          subject: s.subject,
          topic: s.topic,
          duration: s.duration,
          type: s.type,
          revisionsJson: JSON.stringify(s.revisions ?? {}),
          isCompleted: s.isCompleted ?? false,
          completedAt: s.completedAt ?? null,
        })),
        pomodoroSessions: pomodoroSessions.map((p) => ({
          id: p.id,
          date: p.date,
          subject: p.subject,
          topic: p.topic,
          duration: p.duration,
          startTime: p.startTime,
          endTime: p.endTime,
          sessionType: p.sessionType,
        })),
        subjects: subjects.map((sub) => ({
          id: sub.id,
          name: sub.name,
          estimatedHours: sub.estimatedHours,
          actualHours: sub.actualHours,
          completed: sub.completed,
        })),
        settings: {
          pomodoroDuration: settings.pomodoroDuration,
          shortBreakDuration: settings.shortBreakDuration,
          longBreakDuration: settings.longBreakDuration,
          dailyTargetHours: settings.dailyTargetHours,
          examDate: settings.examDate,
          examTargetHours: settings.examTargetHours,
          revisionSettingsJson: JSON.stringify(settings.revisionSettings),
          // @ts-ignore longBreakInterval might not exist in type but backend supports it
          longBreakInterval: (settings as any).longBreakInterval ?? null,
        },
      };

      fetch('http://localhost:8080/api/study/data', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      }).catch((err) => {
        console.error('Failed to save study data', err);
      });
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [studySessions, pomodoroSessions, subjects, settings]);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'pomodoro', label: 'Timer', icon: Clock },
    { id: 'study-tracker', label: 'Study Sessions', icon: BookOpen },
    { id: 'subjects', label: 'Subjects', icon: Target },
    { id: 'revisions', label: 'Revisions', icon: CheckCircle },
    { id: 'excel-tracker', label: 'Revision Vault', icon: Calendar },
  ];

  const hoursStudiedToday = useMemo(
    () => getHoursStudiedToday([...studySessions, ...pomodoroSessions]),
    [studySessions, pomodoroSessions, studySessions.length, pomodoroSessions.length]
  );
  
  const totalHoursStudied = useMemo(
    () => getTotalHoursStudied([...studySessions, ...pomodoroSessions]),
    [studySessions, pomodoroSessions, studySessions.length, pomodoroSessions.length]
  );
  
  const daysUntilExam = useMemo(
    () => getDaysUntilExam(settings.examDate),
    [settings.examDate]
  );
  
  const revisionsDue = useMemo(
    () => getRevisionsDue(studySessions),
    [studySessions, studySessions.length]
  );

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handlePomodoroComplete = (session: PomodoroSession) => {
    setPomodoroSessions(prev => [...prev, session]);
    
    // Only sync to study tracker if it's NOT a revision session AND it's a pomodoro session
    if (session.sessionType === 'pomodoro' && !session.topic.includes('(Revision)')) {
      syncPomodoroToStudyTracker(session);
    }
  };

  const syncPomodoroToStudyTracker = (pomodoroSession: PomodoroSession) => {
    setStudySessions(prev => {
      // Check if there's already a study session for this subject/topic/date (case-insensitive)
      const existingIndex = prev.findIndex(session => 
        session.date === pomodoroSession.date &&
        session.subject.toLowerCase() === pomodoroSession.subject.toLowerCase() &&
        session.topic.toLowerCase() === pomodoroSession.topic.toLowerCase()
      );

      if (existingIndex >= 0) {
        // Update existing session by adding duration
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          duration: updated[existingIndex].duration + pomodoroSession.duration
        };
        return updated;
      } else {
        // Create new study session with proper revision dates and NOT completed
        const newSession: StudySession = {
          id: Date.now().toString(),
          date: pomodoroSession.date,
          subject: pomodoroSession.subject,
          topic: pomodoroSession.topic,
          duration: pomodoroSession.duration,
          type: 'pomodoro',
          revisions: {
            revision1: { date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], completed: false },
            revision2: { date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], completed: false },
            revision3: { date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], completed: false },
            revision4: { date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], completed: false }
          },
          isCompleted: false
        };
        return [...prev, newSession];
      }
    });
  };

  const handleSaveSettings = () => {
    setSettings(tempSettings);
    setShowSettings(false);
  };

  const handleCancelSettings = () => {
    setTempSettings(settings);
    setShowSettings(false);
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      onLogout();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Study Tracker Pro</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {revisionsDue.length > 0 && (
                <div className="flex items-center space-x-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-3 py-1 rounded-full text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>{revisionsDue.length} revisions due</span>
                </div>
              )}

              <ScreenWakeLock />

              {/* Motivational Quotes Toggle */}
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Mentor Messages
                </span>
                <button
                  onClick={toggleQuotes}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                    quotesEnabled
                      ? 'bg-purple-600'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  title={quotesEnabled ? 'Disable mentor messages' : 'Enable mentor messages'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out ${
                      quotesEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <ThemeToggle />

              <Button
                onClick={() => setShowSettings(true)}
                variant="ghost"
                size="sm"
                icon={Settings}
              />
              
              <Button
                onClick={toggleFullscreen}
                variant="ghost"
                size="sm"
                icon={Maximize}
              />
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                icon={LogOut}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="sticky top-16 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Today</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {hoursStudiedToday.toFixed(1)}h
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Target: {settings.dailyTargetHours}h</span>
                    <span>{((hoursStudiedToday / settings.dailyTargetHours) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((hoursStudiedToday / settings.dailyTargetHours) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Hours</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {totalHoursStudied.toFixed(1)}h
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Days to Exam</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {daysUntilExam > 0 ? daysUntilExam : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Revisions Due</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{revisionsDue.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <ProgressCharts 
              studySessions={studySessions}
              pomodoroSessions={pomodoroSessions}
              subjects={subjects}
              settings={settings}
            />

            {/* Today's Subject Time Chart */}
            <TodaySubjectChart 
              studySessions={studySessions}
              pomodoroSessions={pomodoroSessions}
              key={`${studySessions.length}-${pomodoroSessions.length}`}
            />
          </div>
        )}

        {activeTab === 'pomodoro' && (
          <SimpleTimer 
            onSessionComplete={handlePomodoroComplete}
            subjects={subjects}
            onSubjectsChange={setSubjects}
            studySessions={studySessions}
            onStudySessionsChange={setStudySessions}
            pomodoroSessions={pomodoroSessions}
            globalTimerState={globalTimerState}
            onGlobalTimerStateChange={setGlobalTimerState}
            dailyTargetHours={settings.dailyTargetHours}
            hoursStudiedToday={hoursStudiedToday}
          />
        )}

        {activeTab === 'study-tracker' && (
          <StudyTracker 
            sessions={studySessions}
            onSessionsChange={setStudySessions}
            subjects={subjects}
            onSubjectsChange={setSubjects}
          />
        )}

        {activeTab === 'subjects' && (
          <SubjectTracker 
            subjects={subjects}
            onSubjectsChange={setSubjects}
            studySessions={studySessions}
            pomodoroSessions={pomodoroSessions}
          />
        )}

        {activeTab === 'revisions' && (
          <RevisionTracker 
            sessions={studySessions}
            onSessionsChange={setStudySessions}
            pomodoroSessions={pomodoroSessions}
          />
        )}

        {activeTab === 'excel-tracker' && (
          <ExcelTracker 
            sessions={studySessions}
            onSessionsChange={setStudySessions}
            subjects={subjects}
            onSubjectsChange={setSubjects}
            revisionSettings={settings.revisionSettings}
            onRevisionSettingsChange={(newRevisionSettings) => 
              setSettings(prev => ({ ...prev, revisionSettings: newRevisionSettings }))
            }
            pomodoroSessions={pomodoroSessions}
          />
        )}
      </main>

      {/* Settings Modal */}
      <Modal
        isOpen={showSettings}
        onClose={handleCancelSettings}
        title="Target Settings"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Daily Target Hours
            </label>
            <input
              type="number"
              min="1"
              max="24"
              value={tempSettings.dailyTargetHours}
              onChange={(e) => setTempSettings(prev => ({ ...prev, dailyTargetHours: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Exam Date
            </label>
            <input
              type="date"
              value={tempSettings.examDate}
              onChange={(e) => setTempSettings(prev => ({ ...prev, examDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Study Goal in Hours (Till Exam Day)
            </label>
            <input
              type="number"
              min="1"
              value={tempSettings.examTargetHours}
              onChange={(e) => setTempSettings(prev => ({ ...prev, examTargetHours: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              onClick={handleCancelSettings}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSettings}
              variant="primary"
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Floating Pomodoro Timer */}
      <SynchronizedFloatingTimer
        isVisible={showFloatingTimer}
        onClose={() => setShowFloatingTimer(false)}
      />

      {/* Distraction Dump */}
      <DistractionDump />

      {/* Motivational Quote Toast */}
      <MotivationalQuoteToast
        quote={currentQuote}
        isVisible={isQuoteVisible}
        position={quotePosition}
        onClose={hideQuote}
        isEnabled={quotesEnabled}
      />
    </div>
  );
};

export default Dashboard;
