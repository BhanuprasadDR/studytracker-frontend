import { format, addDays, parseISO, isToday, differenceInHours, startOfDay, endOfDay } from 'date-fns';

export const formatDate = (date: string | Date) => {
  // Always use current system date for real-time updates
  const currentDate = new Date(date);
  return format(currentDate, 'yyyy-MM-dd');
};

export const formatTime = (date: string | Date) => {
  return format(new Date(date), 'HH:mm');
};

export const formatDateTime = (date: string | Date) => {
  return format(new Date(date), 'yyyy-MM-dd HH:mm:ss');
};

import { addDays, parseISO } from 'date-fns';

export const addDaysToDate = (date: string, days: number) => {
  return formatDate(addDays(parseISO(date), days));
};

export const isDateToday = (date: string) => {
  // Use real-time system date for comparison
  const today = new Date();
  const targetDate = parseISO(date);
  return isToday(targetDate);
};

export const isDateOverdue = (date: string) => {
  // Use real-time system date for comparison
  const today = new Date();
  const targetDate = new Date(date);
  
  // Set both dates to start of day for accurate comparison
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  
  return targetDate < today;
};

export const getHoursStudiedToday = (sessions: any[]) => {
  // Use real-time system date
  const today = formatDate(new Date());
  
  // Debug: Log all sessions for today
  const todaySessions = sessions.filter(session => session.date === today);
  console.log('Today\'s sessions for', today, ':', todaySessions);
  
  // Filter sessions for today and only count productive work time
  
  let totalMinutes = 0;
  
  todaySessions.forEach(session => {
    console.log('Processing session:', session.subject, session.topic, session.duration, 'minutes');
    // For study sessions, count all time
    if (session.type === 'study' || session.type === 'pomodoro') {
      totalMinutes += session.duration;
      console.log('Added study/pomodoro session:', session.duration, 'minutes, total now:', totalMinutes, 'minutes');
    }
    // For pomodoro sessions, only count 'pomodoro' type (exclude breaks)
    else if (session.sessionType === 'pomodoro') {
      totalMinutes += session.duration;
      console.log('Added pomodoro focus session:', session.duration, 'minutes, total now:', totalMinutes, 'minutes');
    }
    // Skip short-break and long-break sessions
  });
  
  const totalHours = totalMinutes / 60;
  console.log('Final calculation: ', totalMinutes, 'minutes =', totalHours, 'hours');
  return totalHours;
};

export const getTotalHoursStudied = (sessions: any[]) => {
  let totalMinutes = 0;
  
  sessions.forEach(session => {
    // For study sessions, count all time
    if (session.type === 'study' || session.type === 'pomodoro') {
      totalMinutes += session.duration;
    }
    // For pomodoro sessions, only count 'pomodoro' type (exclude breaks)
    else if (session.sessionType === 'pomodoro') {
      totalMinutes += session.duration;
    }
    // Skip short-break and long-break sessions
  });
  
  return totalMinutes / 60;
};

export const getDaysUntilExam = (examDate: string) => {
  if (!examDate) return 0;
  const exam = parseISO(examDate);
  // Use real-time system date
  const now = new Date();
  return Math.ceil(differenceInHours(exam, now) / 24);
};