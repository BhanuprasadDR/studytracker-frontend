import React, { useMemo } from 'react';
import { CheckCircle, Calendar, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { StudySession, RevisionSettings } from '../types';
import { getRevisionProgress, getRevisionsDue, getOverdueRevisions, getRevisionStatus } from '../utils/revisionUtils';
import { useTheme } from '../contexts/ThemeContext';
import { getRevisionTimeSpent } from '../utils/revisionTimeUtils';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement);

interface RevisionTrackerProps {
  sessions: StudySession[];
  onSessionsChange: (sessions: StudySession[]) => void;
  revisionSettings?: RevisionSettings;
  pomodoroSessions?: any[];
}

const RevisionTracker: React.FC<RevisionTrackerProps> = ({ 
  sessions, 
  onSessionsChange,
  revisionSettings = { numberOfRevisions: 4, intervals: [1, 3, 7, 14] },
  pomodoroSessions = []
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const revisionProgress = useMemo(() => getRevisionProgress(sessions), [sessions]);
  const revisionsDue = useMemo(() => getRevisionsDue(sessions), [sessions]);
  const overdueRevisions = useMemo(() => getOverdueRevisions(sessions), [sessions]);

  const subjectWiseProgress = useMemo(() => {
    const subjectData: Record<string, { total: number; completed: number }> = {};
    
    sessions.forEach(session => {
      if (!subjectData[session.subject]) {
        subjectData[session.subject] = { total: 0, completed: 0 };
      }
      
      Object.values(session.revisions).forEach(revision => {
        subjectData[session.subject].total++;
        if (revision.completed) {
          subjectData[session.subject].completed++;
        }
      });
    });
    
    return Object.entries(subjectData).map(([subject, data]) => ({
      subject,
      total: data.total,
      completed: data.completed,
      percentage: data.total > 0 ? (data.completed / data.total) * 100 : 0
    }));
  }, [sessions]);

  // Revision time tracking data
  const revisionTimeData = useMemo(() => {
    const timeByRevisionType: Record<string, number> = {};
    const timeBySubject: Record<string, number> = {};
    
    // Initialize revision types
    for (let i = 1; i <= revisionSettings.numberOfRevisions; i++) {
      timeByRevisionType[`Revision ${i}`] = 0;
    }
    
    // Calculate time spent on each revision type and subject
    sessions.forEach(session => {
      Object.keys(session.revisions).forEach((revisionKey, index) => {
        const revisionLabel = `Revision ${index + 1}`;
        const timeSpent = getRevisionTimeSpent(session.subject, session.topic, revisionKey, pomodoroSessions);
        
        if (timeSpent) {
          // Parse time string (e.g., "25m", "1h 30m") to minutes
          let minutes = 0;
          const timeStr = timeSpent.toString();
          
          if (timeStr.includes('h')) {
            const parts = timeStr.split('h');
            minutes += parseInt(parts[0]) * 60;
            if (parts[1] && parts[1].includes('m')) {
              minutes += parseInt(parts[1].replace('m', '').trim());
            }
          } else if (timeStr.includes('m')) {
            minutes = parseInt(timeStr.replace('m', ''));
          }
          
          if (minutes > 0) {
            timeByRevisionType[revisionLabel] += minutes;
            
            if (!timeBySubject[session.subject]) {
              timeBySubject[session.subject] = 0;
            }
            timeBySubject[session.subject] += minutes;
          }
        }
      });
    });
    
    return { timeByRevisionType, timeBySubject };
  }, [sessions, pomodoroSessions, revisionSettings.numberOfRevisions]);

  // Revision time by type chart
  const revisionTimeByTypeData = {
    labels: Object.keys(revisionTimeData.timeByRevisionType),
    datasets: [
      {
        label: 'Time Spent (minutes)',
        data: Object.values(revisionTimeData.timeByRevisionType),
        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'],
        borderColor: ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#EA580C', '#65A30D'],
        borderWidth: 2
      }
    ]
  };

  // Revision time by subject chart
  const revisionTimeBySubjectData = {
    labels: Object.keys(revisionTimeData.timeBySubject),
    datasets: [
      {
        label: 'Revision Time (minutes)',
        data: Object.values(revisionTimeData.timeBySubject),
        backgroundColor: isDark ? '#374151' : '#E5E7EB',
        borderColor: isDark ? '#4B5563' : '#9CA3AF',
        borderWidth: 1
      },
      {
        label: 'Total Time',
        data: Object.keys(revisionTimeData.timeBySubject).map(subject => {
          // Calculate total study time for comparison
          return sessions
            .filter(s => s.subject.toLowerCase() === subject.toLowerCase())
            .reduce((total, s) => total + s.duration, 0);
        }),
        backgroundColor: '#10B981',
        borderColor: '#059669',
        borderWidth: 1
      }
    ]
  };

  const toggleRevision = (sessionId: string, revisionKey: string) => {
    const updatedSessions = sessions.map(session => {
      if (session.id === sessionId) {
        return {
          ...session,
          revisions: {
            ...session.revisions,
            [revisionKey]: {
              ...session.revisions[revisionKey],
              completed: !session.revisions[revisionKey].completed
            }
          }
        };
      }
      return session;
    });
    onSessionsChange(updatedSessions);
  };

  // Overall progress chart with theme-aware colors
  const progressChartData = {
    labels: ['Completed', 'Pending'],
    datasets: [
      {
        data: [revisionProgress.completed, revisionProgress.total - revisionProgress.completed],
        backgroundColor: ['#10B981', isDark ? '#374151' : '#E5E7EB'],
        borderColor: ['#059669', isDark ? '#4B5563' : '#D1D5DB'],
        borderWidth: 2
      }
    ]
  };

  // Subject-wise progress chart with theme-aware colors
  const subjectProgressData = {
    labels: subjectWiseProgress.map(item => item.subject),
    datasets: [
      {
        label: 'Total Revisions',
        data: subjectWiseProgress.map(item => item.total),
        backgroundColor: isDark ? '#374151' : '#E5E7EB',
        borderColor: isDark ? '#4B5563' : '#9CA3AF',
        borderWidth: 1
      },
      {
        label: 'Completed Revisions',
        data: subjectWiseProgress.map(item => item.completed),
        backgroundColor: '#10B981',
        borderColor: '#059669',
        borderWidth: 1
      }
    ]
  };

  // Theme-aware chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: isDark ? 'rgb(156, 163, 175)' : 'rgb(75, 85, 99)', // gray-400 : gray-600
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: isDark ? 'rgb(31, 41, 55)' : 'rgb(255, 255, 255)', // gray-800 : white
        titleColor: isDark ? 'rgb(243, 244, 246)' : 'rgb(17, 24, 39)', // gray-100 : gray-900
        bodyColor: isDark ? 'rgb(209, 213, 219)' : 'rgb(75, 85, 99)', // gray-300 : gray-600
        borderColor: isDark ? 'rgb(75, 85, 99)' : 'rgb(209, 213, 219)', // gray-600 : gray-300
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: {
          color: isDark ? 'rgb(156, 163, 175)' : 'rgb(75, 85, 99)' // gray-400 : gray-600
        },
        grid: {
          color: isDark ? 'rgb(75, 85, 99)' : 'rgb(229, 231, 235)' // gray-600 : gray-200
        }
      },
      y: {
        ticks: {
          color: isDark ? 'rgb(156, 163, 175)' : 'rgb(75, 85, 99)' // gray-400 : gray-600
        },
        grid: {
          color: isDark ? 'rgb(75, 85, 99)' : 'rgb(229, 231, 235)' // gray-600 : gray-200
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Revision Tracker</h2>
        <p className="text-gray-600 dark:text-gray-400">Monitor your revision progress with detailed analytics</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revisions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{revisionProgress.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{revisionProgress.completed}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {revisionProgress.percentage.toFixed(1)}% complete
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Due Today</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{revisionsDue.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Clock className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Overdue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{overdueRevisions.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Overall Progress</h3>
            <div className="h-64">
              <Doughnut data={progressChartData} options={chartOptions} />
            </div>
            <div className="text-center mt-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {revisionProgress.percentage.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {revisionProgress.completed} of {revisionProgress.total} revisions completed
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Subject-wise Progress</h3>
            <div className="h-64">
              <Bar data={subjectProgressData} options={chartOptions} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revision Time Tracking</h3>
            <div className="h-64">
              {Object.values(revisionTimeData.timeByRevisionType).some(time => time > 0) ? (
                <Bar data={revisionTimeByTypeData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No revision time recorded</p>
                    <p className="text-sm">Use the timer for revision sessions</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Revision Time by Subject Chart */}
      {sessions.length > 0 && Object.keys(revisionTimeData.timeBySubject).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revision vs Study Time by Subject</h3>
          <div className="h-80">
            <Bar data={revisionTimeBySubjectData} options={{
              ...chartOptions,
              plugins: {
                ...chartOptions.plugins,
                tooltip: {
                  ...chartOptions.plugins.tooltip,
                  callbacks: {
                    label: function(context: any) {
                      const label = context.dataset.label || '';
                      const value = context.parsed.y;
                      const hours = Math.floor(value / 60);
                      const minutes = value % 60;
                      const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                      return `${label}: ${timeStr}`;
                    }
                  }
                }
              }
            }} />
          </div>
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            <p>Compare time spent on revisions vs. initial study sessions for each subject</p>
          </div>
        </div>
      )}

      {/* Overdue Revisions */}
      {overdueRevisions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden transition-colors">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Overdue Revisions ({overdueRevisions.length})</span>
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              These revisions are past their scheduled dates and need immediate attention
            </p>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {overdueRevisions.map((item) => (
              <div key={`${item.id}-${item.revisionType}`} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{item.subject} - {item.topic}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>
                            {item.revisionType.replace('revision', 'Revision ')} was due on {item.revisionDate}
                          </span>
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            {item.daysPastDue} day{item.daysPastDue !== 1 ? 's' : ''} overdue
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleRevision(item.id, item.revisionType)}
                    className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full text-sm hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  >
                    Mark Complete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revisions Due Today */}
      {revisionsDue.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden transition-colors">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20">
            <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <span>Revisions Due Today ({revisionsDue.length})</span>
            </h3>
            <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
              Complete these revisions today to stay on track
            </p>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {revisionsDue.map((item) => (
              <div key={`${item.id}-${item.revisionType}`} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{item.subject} - {item.topic}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {item.revisionType.replace('revision', 'Revision ')} due today
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleRevision(item.id, item.revisionType)}
                    className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                  >
                    Mark Complete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {sessions.filter(session => !session.isCompleted).length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 transition-colors">
          <div className="text-center">
            <Calendar className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No active study sessions available for revision tracking.</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">Add study sessions to start tracking revisions!</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevisionTracker;