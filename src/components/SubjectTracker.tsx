import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Target, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { Subject, StudySession, PomodoroSession } from '../types';
import Button from './Button';
import Modal from './Modal';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

interface SubjectTrackerProps {
  subjects: Subject[];
  onSubjectsChange: (subjects: Subject[]) => void;
  studySessions: StudySession[];
  pomodoroSessions: PomodoroSession[];
}

const SubjectTracker: React.FC<SubjectTrackerProps> = ({ 
  subjects, 
  onSubjectsChange, 
  studySessions, 
  pomodoroSessions 
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    estimatedHours: 10
  });

  // Define calculateActualHours function before it's used
  const calculateActualHours = (subject: Subject) => {
    // Calculate actual hours from both study sessions and pomodoro sessions (case-insensitive)
    const studyHours = studySessions
      .filter(session => session.subject.toLowerCase() === subject.name.toLowerCase())
      .reduce((total, session) => total + (session.duration / 60), 0);
    
    // Only count pomodoro focus sessions, exclude breaks
    const pomodoroHours = pomodoroSessions
      .filter(session => session.subject.toLowerCase() === subject.name.toLowerCase() && session.sessionType === 'pomodoro')
      .reduce((total, session) => total + (session.duration / 60), 0);
    
    const totalActualHours = studyHours + pomodoroHours;
    
    // Update the subject's actual hours if it has changed
    if (Math.abs(subject.actualHours - totalActualHours) > 0.01) {
      return {
        ...subject,
        actualHours: totalActualHours
      };
    }
    
    return subject;
  };

  // Auto-sync subjects with actual hours and create missing subjects
  const subjectsWithActualHours = useMemo(() => {
    // Get all unique subjects from sessions (case-insensitive)
    const allSessionSubjects = new Set<string>();
    
    studySessions.forEach(session => {
      if (session.subject) {
        allSessionSubjects.add(session.subject.toLowerCase());
      }
    });
    
    pomodoroSessions
      .filter(session => session.sessionType === 'pomodoro')
      .forEach(session => {
        if (session.subject) {
          allSessionSubjects.add(session.subject.toLowerCase());
        }
      });

    // Create missing subjects automatically
    const missingSubjects: Subject[] = [];
    allSessionSubjects.forEach(subjectNameLower => {
      // Find the original case from sessions
      const originalSubjectName = [...studySessions, ...pomodoroSessions]
        .find(session => session.subject.toLowerCase() === subjectNameLower)?.subject;
      
      if (originalSubjectName && !subjects.find(s => s.name.toLowerCase() === subjectNameLower)) {
        missingSubjects.push({
          id: `auto-${Date.now()}-${subjectNameLower}`,
          name: originalSubjectName,
          estimatedHours: 10, // Default estimate
          actualHours: 0,
          completed: false
        });
      }
    });

    // Add missing subjects to the subjects array
    if (missingSubjects.length > 0) {
      const updatedSubjects = [...subjects, ...missingSubjects];
      onSubjectsChange(updatedSubjects);
      return updatedSubjects.map(subject => calculateActualHours(subject));
    }

    return subjects.map(subject => calculateActualHours(subject));
  }, [subjects, studySessions, pomodoroSessions, onSubjectsChange]);

  // Update subjects when actual hours change
  React.useEffect(() => {
    const updatedSubjects = subjects.map(subject => calculateActualHours(subject));
    const hasChanges = updatedSubjects.some((subject, index) => 
      Math.abs(subject.actualHours - subjects[index].actualHours) > 0.01
    );
    
    if (hasChanges) {
      onSubjectsChange(updatedSubjects);
    }
  }, [studySessions, pomodoroSessions]);

  const resetForm = () => {
    setFormData({
      name: '',
      estimatedHours: 10
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for duplicate subject names (case-insensitive)
    const isDuplicate = subjects.some(subject => 
      subject.name.toLowerCase() === formData.name.toLowerCase() && 
      (!editingSubject || subject.id !== editingSubject.id)
    );

    if (isDuplicate) {
      alert('A subject with this name already exists (case-insensitive)');
      return;
    }
    
    if (editingSubject) {
      // Update existing subject
      const updatedSubjects = subjects.map(subject =>
        subject.id === editingSubject.id
          ? { ...subject, name: formData.name, estimatedHours: formData.estimatedHours }
          : subject
      );
      onSubjectsChange(updatedSubjects);
      setEditingSubject(null);
    } else {
      // Add new subject
      const newSubject: Subject = {
        id: Date.now().toString(),
        name: formData.name,
        estimatedHours: formData.estimatedHours,
        actualHours: 0,
        completed: false
      };
      onSubjectsChange([...subjects, newSubject]);
    }
    
    resetForm();
    setShowAddModal(false);
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      estimatedHours: subject.estimatedHours
    });
    setShowAddModal(true);
  };

  const handleDelete = (subjectId: string) => {
    onSubjectsChange(subjects.filter(subject => subject.id !== subjectId));
  };

  const toggleComplete = (subjectId: string) => {
    const updatedSubjects = subjects.map(subject =>
      subject.id === subjectId
        ? { ...subject, completed: !subject.completed }
        : subject
    );
    onSubjectsChange(updatedSubjects);
  };

  // Chart data
  const pieChartData = {
    labels: subjectsWithActualHours.map(subject => subject.name),
    datasets: [
      {
        label: 'Hours Studied',
        data: subjectsWithActualHours.map(subject => subject.actualHours),
        backgroundColor: [
          '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
          '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6B7280'
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }
    ]
  };

  const barChartData = {
    labels: subjectsWithActualHours.map(subject => subject.name),
    datasets: [
      {
        label: 'Estimated Hours',
        data: subjectsWithActualHours.map(subject => subject.estimatedHours),
        backgroundColor: '#E5E7EB',
        borderColor: '#9CA3AF',
        borderWidth: 1
      },
      {
        label: 'Actual Hours',
        data: subjectsWithActualHours.map(subject => subject.actualHours),
        backgroundColor: '#3B82F6',
        borderColor: '#2563EB',
        borderWidth: 1
      }
    ]
  };

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Subject Tracker</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage subjects and track progress with visual analytics</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingSubject(null);
            setShowAddModal(true);
          }}
          variant="primary"
          icon={Plus}
        >
          Add Subject
        </Button>
      </div>

      {/* Charts */}
      {subjectsWithActualHours.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Time Distribution</h3>
            <div className="h-64">
              <Pie data={pieChartData} options={chartOptions} />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Estimated vs Actual Hours</h3>
            <div className="h-64">
              <Bar data={barChartData} options={chartOptions} />
            </div>
          </div>
        </div>
      )}

      {/* Subjects List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden transition-colors">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Subjects</h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {subjectsWithActualHours.map((subject) => {
            const progress = subject.estimatedHours > 0 
              ? (subject.actualHours / subject.estimatedHours) * 100 
              : 0;
            const isOverEstimate = subject.actualHours > subject.estimatedHours;
            
            return (
              <div key={subject.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Button
                      onClick={() => toggleComplete(subject.id)}
                      variant="ghost"
                      size="sm"
                      icon={CheckCircle}
                      className={`${
                        subject.completed
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400'
                      } rounded-full`}
                    />
                    <div>
                      <h4 className={`text-lg font-semibold ${
                        subject.completed ? 'text-green-600 dark:text-green-400 line-through' : 'text-gray-900 dark:text-white'
                      }`}>
                        {subject.name}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Target className="w-4 h-4" />
                          <span>Target: {subject.estimatedHours}h</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>Actual: {subject.actualHours.toFixed(1)}h</span>
                        </div>
                        <div className={`flex items-center space-x-1 ${
                          isOverEstimate ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                        }`}>
                          <TrendingUp className="w-4 h-4" />
                          <span>{progress.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => handleEdit(subject)}
                      variant="ghost"
                      size="sm"
                      icon={Edit}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    />
                    <Button
                      onClick={() => handleDelete(subject.id)}
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                    />
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-300 ${
                      subject.completed ? 'bg-green-500' :
                      isOverEstimate ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                {isOverEstimate && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Over estimate by {(subject.actualHours - subject.estimatedHours).toFixed(1)} hours
                  </p>
                )}
              </div>
            );
          })}
        </div>
        {subjects.length === 0 && (
          <div className="text-center py-12">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No subjects added yet.</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">Add subjects to track your study progress!</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingSubject(null);
          resetForm();
        }}
        title={editingSubject ? 'Edit Subject' : 'Add Subject'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., Mathematics"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Subject names are case-insensitive (e.g., "Audit" and "AUDIT" are the same)
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Estimated hours to complete the subject</label>
            <input
              type="number"
              min="1"
              value={formData.estimatedHours}
              onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              onClick={() => {
                setShowAddModal(false);
                setEditingSubject(null);
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
              {editingSubject ? 'Update Subject' : 'Add Subject'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SubjectTracker;