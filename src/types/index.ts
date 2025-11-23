export interface StudySession {
  id: string;
  date: string;
  subject: string;
  topic: string;
  duration: number; // in minutes
  type: 'study' | 'pomodoro';
  revisions: Record<string, { date: string; completed: boolean }>;
  isCompleted?: boolean; // New field to track if all revisions are complete
  completedAt?: string; // When it was marked as completed
}

export interface PomodoroSession {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  sessionType: 'pomodoro' | 'short-break' | 'long-break';
  subject: string;
  topic: string;
}

export interface Subject {
  id: string;
  name: string;
  estimatedHours: number;
  actualHours: number;
  completed: boolean;
}

export interface RevisionSettings {
  numberOfRevisions: number;
  intervals: number[]; // Array of intervals in days
}

export interface AppSettings {
  pomodoroDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  dailyTargetHours: number;
  examDate: string;
  examTargetHours: number;
  revisionSettings: RevisionSettings;
  longBreakInterval?: number; // After how many pomodoros to take long break
}

export interface TimerState {
  isRunning: boolean;
  timeLeft: number;
  currentSession: 'pomodoro' | 'short-break' | 'long-break';
  subject: string;
  topic: string;
  startTime: number;
}