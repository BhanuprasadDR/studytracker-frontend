import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar, Clock, Archive, ChevronDown, ChevronRight } from 'lucide-react';
import { StudySession, Subject, RevisionSettings } from '../types';
import { formatDate } from '../utils/dateUtils';
import { calculateRevisionDates, autoMoveCompletedSessions } from '../utils/revisionUtils';
import Button from './Button';
import Modal from './Modal';

interface StudyTrackerProps {
  sessions: StudySession[];
  onSessionsChange: (sessions: StudySession[]) => void;
  subjects?: Subject[];
  onSubjectsChange?: (subjects: Subject[]) => void;
  revisionSettings?: RevisionSettings;
}

const StudyTracker: React.FC<StudyTrackerProps> = ({ 
  sessions, 
  onSessionsChange, 
  subjects = [], 
  onSubjectsChange,
  revisionSettings = { numberOfRevisions: 4, intervals: [1, 3, 7, 14] }
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSubjectEstimation, setShowSubjectEstimation] = useState(false);
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    date: formatDate(new Date()),
    subject: '',
    topic: '',
    duration: 60
  });
  const [subjectEstimation, setSubjectEstimation] = useState({ subject: '', estimatedHours: 10 });

  // Auto-move completed sessions when revisions change
  useEffect(() => {
    const updatedSessions = autoMoveCompletedSessions(sessions);
    const hasChanges = updatedSessions.some((session, index) => 
      session.isCompleted !== sessions[index]?.isCompleted
    );
    
    if (hasChanges) {
      onSessionsChange(updatedSessions);
    }
  }, [sessions]);

  // Show all sessions (including completed ones) in the active list
  const activeSessions = sessions;

  // Group active sessions by date
  const sessionsByDate = activeSessions.reduce((groups, session) => {
    const date = session.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(session);
    return groups;
  }, {} as Record<string, StudySession[]>);

  // Sort dates in descending order (most recent first)
  const sortedDates = Object.keys(sessionsByDate).sort((a, b) => {
    const dateA = new Date(a).getTime();
    const dateB = new Date(b).getTime();
    return dateB - dateA; // Most recent dates first
  });

  // Also sort sessions within each date by most recent first (if they have timestamps)
  Object.keys(sessionsByDate).forEach(date => {
    sessionsByDate[date].sort((a, b) => {
      // If sessions have timestamps or IDs that indicate creation order, use those
      // Otherwise, sort by ID (assuming higher ID = more recent)
      const idA = parseInt(a.id) || 0;
      const idB = parseInt(b.id) || 0;
      return idB - idA; // Most recent sessions first within each date
    });
  });

  const toggleDateExpansion = (date: string) => {
    setExpandedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const formatDateDisplay = (dateString: string) => {
    // Simply return the date string as is (YYYY-MM-DD format)
    return dateString;
  };

  // Check if subject exists (case-insensitive)
  const findExistingSubject = (subjectName: string) => {
    return subjects.find(subject => 
      subject.name.toLowerCase() === subjectName.toLowerCase()
    );
  };

  const resetForm = () => {
    setFormData({
      date: formatDate(new Date()),
      subject: '',
      topic: '',
      duration: 60
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if this is a new subject (case-insensitive)
    const existingSubject = findExistingSubject(formData.subject);
    
    if (!existingSubject && onSubjectsChange && formData.subject.trim()) {
      // New subject - ask for estimation
      setSubjectEstimation({
        subject: formData.subject,
        estimatedHours: 10
      });
      setShowSubjectEstimation(true);
      setShowAddModal(false);
      return;
    }

    // Existing subject or no subject management - proceed normally
    proceedWithSession();
  };

  const proceedWithSession = () => {
    if (editingSession) {
      // Update existing session
      const updatedSessions = sessions.map(session =>
        session.id === editingSession.id
          ? {
              ...session,
              ...formData,
              revisions: calculateRevisionDates(formData.date, revisionSettings)
            }
          : session
      );
      onSessionsChange(updatedSessions);
      setEditingSession(null);
    } else {
      // Add new session
      const newSession: StudySession = {
        id: Date.now().toString(),
        ...formData,
        type: 'study',
        revisions: calculateRevisionDates(formData.date, revisionSettings),
        isCompleted: false
      };
      onSessionsChange([...sessions, newSession]);
    }
    
    resetForm();
    setShowAddModal(false);
  };

  const handleSubjectEstimationSubmit = () => {
    // Add the new subject with estimation
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

    // Proceed with the session
    proceedWithSession();
    setShowSubjectEstimation(false);
  };

  const handleEdit = (session: StudySession) => {
    setEditingSession(session);
    setFormData({
      date: session.date,
      subject: session.subject,
      topic: session.topic,
      duration: session.duration
    });
    setShowAddModal(true);
  };

  const handleDelete = (sessionId: string) => {
    onSessionsChange(sessions.filter(session => session.id !== sessionId));
  };

  const handleRestoreSession = (sessionId: string) => {
    const updatedSessions = sessions.map(session => {
      if (session.id === sessionId) {
        const restoredRevisions: Record<string, { date: string; completed: boolean }> = {};
        Object.keys(session.revisions).forEach(key => {
          restoredRevisions[key] = {
            ...session.revisions[key],
            completed: false
          };
        });
        
        return {
          ...session,
          isCompleted: false,
          completedAt: undefined,
          revisions: restoredRevisions
        };
      }
      return session;
    });
    onSessionsChange(updatedSessions);
  };

  const handleDeleteCompletedSession = (sessionId: string) => {
    onSessionsChange(sessions.filter(session => session.id !== sessionId));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Study Sessions</h2>
          <p className="text-gray-600 dark:text-gray-400">Track your daily study sessions</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingSession(null);
            setShowAddModal(true);
          }}
          variant="primary"
          icon={Plus}
        >
          Add Session
        </Button>
      </div>

      {/* Sessions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden transition-colors">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Study Sessions</h3>
        </div>
        
        {activeSessions.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No active study sessions.</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">Add your first session to get started!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedDates.map((date) => {
              const dateSessions = sessionsByDate[date];
              const isExpanded = expandedDates.has(date);
              const totalDuration = dateSessions.reduce((sum, session) => sum + session.duration, 0);
              
              return (
                <div key={date}>
                  {/* Date Header */}
                  <button
                    onClick={() => toggleDateExpansion(date)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      )}
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatDateDisplay(date)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span>{Math.floor(totalDuration / 60)}h {totalDuration % 60}m</span>
                      </div>
                    </div>
                  </button>
                  
                  {/* Sessions for this date */}
                  {isExpanded && (
                    <div className="bg-gray-50 dark:bg-gray-700/50">
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead className="bg-gray-100 dark:bg-gray-600">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Subject
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Topic
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Duration
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {dateSessions.map((session) => (
                              <tr key={session.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                  <div className="flex items-center space-x-2">
                                    <span>{session.subject}</span>
                                    {session.isCompleted && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                        Completed
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                  {session.topic}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                  <div className="flex items-center space-x-1">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span>{session.duration}m</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      onClick={() => handleEdit(session)}
                                      variant="ghost"
                                      size="xs"
                                      icon={Edit}
                                    />
                                    <Button
                                      onClick={() => handleDelete(session.id)}
                                      variant="ghost"
                                      size="xs"
                                      icon={Trash2}
                                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                                    />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingSession(null);
          resetForm();
        }}
        title={editingSession ? 'Edit Study Session' : 'Add Study Session'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., Mathematics"
              required
            />
            {formData.subject && !findExistingSubject(formData.subject) && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                New subject detected - you'll be asked to set estimated hours
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Subject names are case-insensitive (e.g., "Audit" and "AUDIT" are the same)
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Topic</label>
            <input
              type="text"
              value={formData.topic}
              onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., Calculus"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Duration (minutes)</label>
            <input
              type="number"
              min="1"
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              onClick={() => {
                setShowAddModal(false);
                setEditingSession(null);
                resetForm();
              }}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              {editingSession ? 'Update Session' : 'Add Session'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Subject Estimation Modal */}
      <Modal
        isOpen={showSubjectEstimation}
        onClose={() => setShowSubjectEstimation(false)}
        title="Set Subject Target Hours"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">New Subject Detected</h4>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              You're adding a new subject: <strong>{subjectEstimation.subject}</strong>
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
              Please set the estimated hours you plan to spend on this subject.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Estimated Hours for "{subjectEstimation.subject}"
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              You can always adjust this later in the Subjects tab
            </p>
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              onClick={() => {
                setShowSubjectEstimation(false);
                setShowAddModal(true);
              }}
              variant="ghost"
            >
              Back
            </Button>
            <Button
              onClick={handleSubjectEstimationSubmit}
              variant="primary"
            >
              Save & Add Session
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default StudyTracker;