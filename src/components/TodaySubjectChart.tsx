import React, { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { StudySession, PomodoroSession } from '../types';
import { formatDate } from '../utils/dateUtils';
import { Clock, Calendar } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

interface TodaySubjectChartProps {
  studySessions: StudySession[];
  pomodoroSessions: PomodoroSession[];
}

const TodaySubjectChart: React.FC<TodaySubjectChartProps> = ({
  studySessions,
  pomodoroSessions
}) => {
  const todayData = useMemo(() => {
    // Use the same date formatting as used throughout the app
    const today = formatDate(new Date());
    
    console.log('Today\'s date for chart:', today);
    console.log('Available study sessions:', studySessions.map(s => ({ date: s.date, subject: s.subject, duration: s.duration })));
    console.log('Available pomodoro sessions:', pomodoroSessions.map(s => ({ date: s.date, subject: s.subject, duration: s.duration, sessionType: s.sessionType })));
    
    // Create a map to group subjects case-insensitively for today only
    const subjectHoursMap = new Map<string, { name: string; hours: number }>();
    
    // Process study sessions for today
    studySessions
      .filter(session => session.date === today)
      .forEach(session => {
        console.log('Processing study session:', session.subject, session.duration);
        if (session.subject) {
          const subjectLower = session.subject.toLowerCase();
          const existing = subjectHoursMap.get(subjectLower);
          
          if (existing) {
            existing.hours += session.duration / 60;
          } else {
            subjectHoursMap.set(subjectLower, {
              name: session.subject,
              hours: session.duration / 60
            });
          }
        }
      });

    // Process pomodoro sessions for today (only pomodoro type, not breaks)
    pomodoroSessions
      .filter(session => session.date === today && session.sessionType === 'pomodoro')
      .forEach(session => {
        console.log('Processing pomodoro session:', session.subject, session.duration);
        if (session.subject) {
          const subjectLower = session.subject.toLowerCase();
          const existing = subjectHoursMap.get(subjectLower);
          
          if (existing) {
            existing.hours += session.duration / 60;
          } else {
            subjectHoursMap.set(subjectLower, {
              name: session.subject,
              hours: session.duration / 60
            });
          }
        }
      });

    console.log('Final subject hours map:', Array.from(subjectHoursMap.entries()));

    // Convert map to arrays for chart
    const subjectData = Array.from(subjectHoursMap.values());
    const subjects = subjectData.map(item => item.name);
    const hours = subjectData.map(item => item.hours);
    const totalHours = hours.reduce((sum, h) => sum + h, 0);
    
    console.log('Chart data - subjects:', subjects, 'hours:', hours, 'total:', totalHours);
    
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6B7280',
      '#F472B6', '#A78BFA', '#34D399', '#FBBF24', '#FB7185'
    ];

    return {
      subjects,
      hours,
      totalHours,
      chartData: {
        labels: subjects,
        datasets: [
          {
            data: hours,
            backgroundColor: colors.slice(0, subjects.length),
            borderWidth: 2,
            borderColor: '#ffffff'
          }
        ]
      }
    };
  }, [studySessions, pomodoroSessions]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const hours = context.parsed;
            const percentage = ((hours / todayData.totalHours) * 100).toFixed(1);
            return `${context.label}: ${hours.toFixed(1)}h (${percentage}%)`;
          }
        }
      }
    }
  };

  if (todayData.subjects.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
        <div className="flex items-center space-x-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Today's Study Time by Subject</h3>
        </div>
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <Clock className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-center">No study time recorded for today</p>
          <p className="text-sm text-center mt-1">Start a study session or pomodoro to see your progress!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Today's Study Time by Subject</h3>
        </div>
        <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
          <Clock className="w-4 h-4" />
          <span>Total: {todayData.totalHours.toFixed(1)}h</span>
        </div>
      </div>
      
      <div className="h-80">
        <Pie data={todayData.chartData} options={chartOptions} />
      </div>

      {/* Subject breakdown */}
      <div className="mt-6 space-y-2">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Today's Breakdown</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {todayData.subjects.map((subject, index) => {
            const hours = todayData.hours[index];
            const percentage = ((hours / todayData.totalHours) * 100).toFixed(1);
            const color = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6B7280'][index % 10];
            
            return (
              <div key={subject} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{subject}</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {hours.toFixed(1)}h ({percentage}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TodaySubjectChart;