import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CheckCircle, Clock, Archive, List, CheckSquare, Settings } from 'lucide-react';
import { StudySession, Subject, RevisionSettings } from '../types';
import { formatDate } from '../utils/dateUtils';
import { calculateRevisionDates, autoMoveCompletedSessions, getRevisionLabel, getRevisionStatus, updateAllSessionsWithRevisionSettings } from '../utils/revisionUtils';
import { getRevisionTimeSpent } from '../utils/revisionTimeUtils';
import Button from './Button';
import Modal from './Modal';
import RevisionSettingsModal from './RevisionSettingsModal';

interface ExcelTrackerProps {
  sessions: StudySession[];
  onSessionsChange: (sessions: StudySession[]) => void;
  subjects?: Subject[];
  onSubjectsChange?: (subjects: Subject[]) => void;
  revisionSettings?: RevisionSettings;
  onRevisionSettingsChange?: (settings: RevisionSettings) => void;
  pomodoroSessions?: any[]; // Add pomodoro sessions for revision time tracking
}

const ExcelTracker: React.FC<ExcelTrackerProps> = ({ 
  sessions, 
  onSessionsChange, 
  subjects = [], 
  onSubjectsChange,
  revisionSettings = { numberOfRevisions: 4, intervals: [1, 3, 7, 14] },
  onRevisionSettingsChange,
  pomodoroSessions = []
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSubjectEstimation, setShowSubjectEstimation] = useState(false);
  const [showRevisionSettings, setShowRevisionSettings] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'completed'>('active');
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
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

  // Separate active and completed sessions
  const activeSessions = sessions.filter(session => 
    !session.isCompleted && !session.topic.includes('(Revision)')
  );
  const completedSessions = sessions.filter(session => 
    session.isCompleted && !session.topic.includes('(Revision)')
  );

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

  const handleRevisionSettingsChange = (newSettings: RevisionSettings) => {
    if (onRevisionSettingsChange) {
      onRevisionSettingsChange(newSettings);
      
      // Update all existing sessions with new revision settings while preserving completion status
      const updatedSessions = updateAllSessionsWithRevisionSettings(sessions, newSettings);
      onSessionsChange(updatedSessions);
    }
  };

  const subTabs = [
    { id: 'active' as const, label: 'Active Sessions', icon: List },
    { id: 'completed' as const, label: 'Completed Sessions', icon: CheckSquare }
  ];

  const exportToCSV = () => {
    const headers = [
      'Date', 'Subject', 'Topic', 'Duration (min)', 'Status',
      ...revisionSettings.intervals.map((interval, index) => [
        `Revision ${index + 1} Date (${interval}d)`,
        `Revision ${index + 1} Status`
      ]).flat()
    ];

    const rows = activeSessions.map(session => [
      session.date,
      session.subject,
      session.topic,
      session.duration,
      session.isCompleted ? 'Completed' : 'Active',
      ...Object.entries(session.revisions).map(([_, revision]) => [
        revision.date,
        revision.completed ? 'Completed' : 'Pending'
      ]).flat()
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-tracker-${formatDate(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRevisionClassName = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700';
      case 'due': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700';
      case 'overdue': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700';
      default: return 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Revision Vault</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage Your Revisions Scientifically</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => {
              resetForm();
              setEditingSession(null);
              setShowAddModal(true);
            }}
            variant="primary"
            icon={Plus}
          >
            Add Entry
          </Button>
          <Button
            onClick={() => setShowRevisionSettings(true)}
            variant="ghost"
            icon={Settings}
            title="Revision Settings"
          />
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden transition-colors">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {subTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeSubTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Active Sessions Tab */}
        {activeSubTab === 'active' && (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                      Subject
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                      Topic
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                      Duration
                    </th>
                    {Array.from({ length: revisionSettings.numberOfRevisions }, (_, index) => (
                      <th key={index} className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                        Revision {index + 1}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800">
                  {activeSessions.map((session, index) => (
                    <tr key={session.id} className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-25 dark:bg-gray-750'}`}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-600">
                        {index + 1}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                        {session.date}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                        {session.subject}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                        {session.topic}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{session.duration}m</span>
                        </div>
                      </td>
                      {Array.from({ length: revisionSettings.numberOfRevisions }, (_, index) => {
                        const revisionKey = `revision${index + 1}`;
                        const revision = session.revisions[revisionKey];
                        if (!revision) return (
                          <td key={revisionKey} className="px-4 py-4 whitespace-nowrap text-center border-r border-gray-200 dark:border-gray-600">
                            <span className="text-gray-400 text-xs">N/A</span>
                          </td>
                        );
                        const status = getRevisionStatus(revision);
                        const revisionTimeSpent = getRevisionTimeSpent(session.subject, session.topic, revisionKey, pomodoroSessions);
                        return (
                          <td key={revisionKey} className="px-4 py-4 whitespace-nowrap text-center border-r border-gray-200 dark:border-gray-600">
                            <button
                              onClick={() => toggleRevision(session.id, revisionKey)}
                              className={`inline-flex items-center px-2 py-1 text-xs rounded-md border transition-colors ${getRevisionClassName(status)}`}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              <div className="text-center">
                                <div className="text-xs opacity-75">
                                  {revision.completed ? 'Done' : status === 'due' ? 'Due' : status === 'overdue' ? 'Late' : 'Pending'}
                                </div>
                                {revisionTimeSpent > 0 && (
                                  <div className="text-xs opacity-60 mt-1">
                                    {revisionTimeSpent}
                                  </div>
                                )}
                              </div>
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            onClick={() => handleEdit(session)}
                            variant="ghost"
                            size="xs"
                            icon={Edit}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
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
              {activeSessions.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">No active data entries.</p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm">Add your first entry to start tracking!</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Completed Sessions Tab */}
        {activeSubTab === 'completed' && (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                      Subject
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                      Topic
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                      Duration
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                      Completed
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                      Revisions
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800">
                  {completedSessions.map((session, index) => (
                    <tr key={session.id} className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-25 dark:bg-gray-750'}`}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-600">
                        {index + 1}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                        {session.date}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                        {session.subject}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                        {session.topic}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{session.duration}m</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                        {session.completedAt ? formatDate(session.completedAt) : 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center border-r border-gray-200 dark:border-gray-600">
                        <div className="flex flex-wrap justify-center gap-1">
                          {Object.entries(session.revisions).map(([key, revision], index) => (
                            <span
                              key={key}
                              className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs"
                            >
                              Revision {index + 1} ✓
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            onClick={() => handleRestoreSession(session.id)}
                            variant="ghost"
                            size="xs"
                            icon={Archive}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                            title="Restore to Active"
                          />
                          <Button
                            onClick={() => handleDeleteCompletedSession(session.id)}
                            variant="ghost"
                            size="xs"
                            icon={Trash2}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                            title="Delete Permanently"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {completedSessions.length === 0 && (
                <div className="text-center py-12">
                  <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No completed sessions yet.</p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm">Complete all revisions for a topic to see it here!</p>
                </div>
              )}
            </div>
          </>
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
        title={editingSession ? 'Edit Study Entry' : 'Add Study Entry'}
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
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Automatic Revision Schedule</h4>
            <div className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              {revisionSettings.intervals.map((interval, index) => (
                <p key={index}>• Revision {index + 1}: {interval} day{interval !== 1 ? 's' : ''} after study date</p>
              ))}
            </div>
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
              {editingSession ? 'Update Entry' : 'Add Entry'}
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
              Save & Add Entry
            </Button>
          </div>
        </div>
      </Modal>

      {/* Revision Settings Modal */}
      <RevisionSettingsModal
        isOpen={showRevisionSettings}
        onClose={() => setShowRevisionSettings(false)}
        settings={revisionSettings}
        onSave={handleRevisionSettingsChange}
      />
    </div>
  );
};

export default ExcelTracker;