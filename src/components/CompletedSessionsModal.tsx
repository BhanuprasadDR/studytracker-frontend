import React, { useState } from 'react';
import { CheckCircle, RotateCcw, Trash2, Calendar, Clock, Search, Filter } from 'lucide-react';
import { StudySession, RevisionSettings } from '../types';
import { formatDate } from '../utils/dateUtils';
import { getRevisionLabel } from '../utils/revisionUtils';
import Modal from './Modal';

interface CompletedSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  completedSessions: StudySession[];
  onRestoreSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  revisionSettings?: RevisionSettings;
}

const CompletedSessionsModal: React.FC<CompletedSessionsModalProps> = ({
  isOpen,
  onClose,
  completedSessions,
  onRestoreSession,
  onDeleteSession,
  revisionSettings = { numberOfRevisions: 4, intervals: [1, 3, 7, 14] }
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');

  // Get unique subjects for filter
  const uniqueSubjects = Array.from(new Set(completedSessions.map(session => session.subject)));

  // Filter sessions based on search and filter criteria
  const filteredSessions = completedSessions.filter(session => {
    const matchesSearch = searchTerm === '' || 
      session.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.topic.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSubject = filterSubject === '' || session.subject === filterSubject;
    
    return matchesSearch && matchesSubject;
  });

  // Sort by completion date (most recent first)
  const sortedSessions = filteredSessions.sort((a, b) => {
    const dateA = new Date(a.completedAt || a.date);
    const dateB = new Date(b.completedAt || b.date);
    return dateB.getTime() - dateA.getTime();
  });

  const handleRestore = (sessionId: string) => {
    if (window.confirm('Are you sure you want to restore this session? All revision statuses will be reset.')) {
      onRestoreSession(sessionId);
    }
  };

  const handleDelete = (sessionId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this completed session? This action cannot be undone.')) {
      onDeleteSession(sessionId);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Completed Sessions"
      size="xl"
    >
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">
                {completedSessions.length} Completed Sessions
              </p>
              <p className="text-xs text-green-600">
                Sessions with all revisions completed are automatically moved here
              </p>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by subject or topic..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Subjects</option>
                {uniqueSubjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="max-h-96 overflow-y-auto">
          {sortedSessions.length > 0 ? (
            <div className="space-y-3">
              {sortedSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {session.subject} - {session.topic}
                          </h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>Studied: {session.date}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{session.duration}m</span>
                            </div>
                            {session.completedAt && (
                              <div className="flex items-center space-x-1">
                                <CheckCircle className="w-4 h-4" />
                                <span>Completed: {formatDate(session.completedAt)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Revision Status */}
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="text-gray-500">Revisions:</span>
                        {Object.entries(session.revisions).map(([key, revision], index) => (
                          <span
                            key={key}
                            className="px-2 py-1 bg-green-100 text-green-800 rounded-full"
                          >
                            {getRevisionLabel(key, revisionSettings.intervals)} ✓
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleRestore(session.id)}
                        className="flex items-center space-x-1 px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Restore Session"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Restore</span>
                      </button>
                      <button
                        onClick={() => handleDelete(session.id)}
                        className="flex items-center space-x-1 px-3 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {completedSessions.length === 0 
                  ? 'No completed sessions yet.'
                  : 'No sessions match your search criteria.'
                }
              </p>
              <p className="text-gray-400 text-sm">
                {completedSessions.length === 0 
                  ? 'Complete all revisions for a topic to see it here!'
                  : 'Try adjusting your search or filter.'
                }
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Showing {sortedSessions.length} of {completedSessions.length} completed sessions
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CompletedSessionsModal;