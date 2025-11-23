import React, { useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, BarElement } from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { StudySession, PomodoroSession, Subject, AppSettings } from '../types';
import { getHoursStudiedToday, getTotalHoursStudied } from '../utils/dateUtils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
);

interface ProgressChartsProps {
  studySessions: StudySession[];
  pomodoroSessions: PomodoroSession[];
  subjects: Subject[];
  settings: AppSettings;
}

const ProgressCharts: React.FC<ProgressChartsProps> = ({
  studySessions,
  pomodoroSessions,
  subjects,
  settings
}) => {
  const allSessions = [...studySessions, ...pomodoroSessions];
  const hoursStudiedToday = getHoursStudiedToday(allSessions);
  const totalHoursStudied = getTotalHoursStudied(allSessions);

  // Daily progress over the last 7 days
  const dailyProgressData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    const dailyHours = last7Days.map(date => {
      const daySessions = allSessions.filter(session => session.date === date);
      let dayHours = 0;
      
      daySessions.forEach(session => {
        // For study sessions, count all time
        if (session.type === 'study' || session.type === 'pomodoro') {
          dayHours += session.duration / 60;
        }
        // For pomodoro sessions, only count 'pomodoro' type (exclude breaks)
        else if (session.sessionType === 'pomodoro') {
          dayHours += session.duration / 60;
        }
      });
      
      return dayHours;
    });

    return {
      labels: last7Days.map(date => new Date(date).toLocaleDateString('en-US', { weekday: 'short' })),
      datasets: [
        {
          label: 'Hours Studied',
          data: dailyHours,
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Daily Target',
          data: Array(7).fill(settings.dailyTargetHours),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderDash: [5, 5],
          fill: false
        }
      ]
    };
  }, [allSessions, settings.dailyTargetHours]);

  // Subject distribution with case-insensitive grouping
  const subjectDistributionData = useMemo(() => {
    // Create a map to group subjects case-insensitively
    const subjectHoursMap = new Map<string, { name: string; hours: number }>();
    
    allSessions.forEach(session => {
      if (session.subject) {
        // Only count productive work time
        let sessionHours = 0;
        if (session.type === 'study' || session.type === 'pomodoro') {
          sessionHours = session.duration / 60;
        } else if (session.sessionType === 'pomodoro') {
          sessionHours = session.duration / 60;
        } else {
          return; // Skip break sessions
        }
        
        const subjectLower = session.subject.toLowerCase();
        const existing = subjectHoursMap.get(subjectLower);
        
        if (existing) {
          existing.hours += sessionHours;
        } else {
          // Use the original case from the first occurrence
          subjectHoursMap.set(subjectLower, {
            name: session.subject,
            hours: sessionHours
          });
        }
      }
    });

    // Convert map to arrays for chart
    const subjectData = Array.from(subjectHoursMap.values());
    const subjects = subjectData.map(item => item.name);
    const hours = subjectData.map(item => item.hours);
    
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6B7280'
    ];

    return {
      labels: subjects,
      datasets: [
        {
          data: hours,
          backgroundColor: colors.slice(0, subjects.length),
          borderWidth: 2,
          borderColor: '#ffffff'
        }
      ]
    };
  }, [allSessions]);

  // Weekly comparison
  const weeklyComparisonData = useMemo(() => {
    const currentWeekHours = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = date.toISOString().split('T')[0];
      
      const daySessions = allSessions.filter(session => session.date === dateStr);
      let dayHours = 0;
      
      daySessions.forEach(session => {
        if (session.type === 'study' || session.type === 'pomodoro') {
          dayHours += session.duration / 60;
        } else if (session.sessionType === 'pomodoro') {
          dayHours += session.duration / 60;
        }
      });
      
      return dayHours;
    });

    const lastWeekHours = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - i));
      const dateStr = date.toISOString().split('T')[0];
      
      const daySessions = allSessions.filter(session => session.date === dateStr);
      let dayHours = 0;
      
      daySessions.forEach(session => {
        if (session.type === 'study' || session.type === 'pomodoro') {
          dayHours += session.duration / 60;
        } else if (session.sessionType === 'pomodoro') {
          dayHours += session.duration / 60;
        }
      });
      
      return dayHours;
    });

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return {
      labels: days,
      datasets: [
        {
          label: 'Current Week',
          data: currentWeekHours,
          backgroundColor: '#3B82F6',
          borderColor: '#2563EB',
          borderWidth: 1
        },
        {
          label: 'Previous Week',
          data: lastWeekHours,
          backgroundColor: '#E5E7EB',
          borderColor: '#9CA3AF',
          borderWidth: 1
        }
      ]
    };
  }, [allSessions]);

  // Exam progress
  const examProgressData = useMemo(() => {
    const progressPercentage = settings.examTargetHours > 0 
      ? (totalHoursStudied / settings.examTargetHours) * 100 
      : 0;

    return {
      labels: ['Completed', 'Remaining'],
      datasets: [
        {
          data: [
            Math.min(totalHoursStudied, settings.examTargetHours),
            Math.max(0, settings.examTargetHours - totalHoursStudied)
          ],
          backgroundColor: ['#10B981', '#E5E7EB'],
          borderColor: ['#059669', '#D1D5DB'],
          borderWidth: 2
        }
      ]
    };
  }, [totalHoursStudied, settings.examTargetHours]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Daily Progress Trend */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Daily Progress Trend</h3>
        <div className="h-64">
          <Line data={dailyProgressData} options={chartOptions} />
        </div>
      </div>

      {/* Subject Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Study Time by Subject</h3>
        <div className="h-64">
          {subjectDistributionData.labels && subjectDistributionData.labels.length > 0 ? (
            <Doughnut data={subjectDistributionData} options={chartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              No study data available
            </div>
          )}
        </div>
      </div>

      {/* Weekly Comparison */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Weekly Comparison</h3>
        <div className="h-64">
          <Bar data={weeklyComparisonData} options={chartOptions} />
        </div>
      </div>

      {/* Exam Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Exam Target Progress</h3>
        <div className="h-64">
          {settings.examTargetHours > 0 ? (
            <Doughnut data={examProgressData} options={chartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              Set exam target hours in settings
            </div>
          )}
        </div>
        {settings.examTargetHours > 0 && (
          <div className="text-center mt-4">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {((totalHoursStudied / settings.examTargetHours) * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {totalHoursStudied.toFixed(1)} / {settings.examTargetHours} hours
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressCharts;