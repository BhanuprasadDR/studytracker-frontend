import { addDaysToDate, isDateToday, isDateOverdue } from './dateUtils';

export const calculateRevisionDates = (studyDate: string, revisionSettings?: { numberOfRevisions: number; intervals: number[] }) => {
  // Default revision settings if not provided
  const defaultSettings = {
    numberOfRevisions: 4,
    intervals: [1, 3, 7, 14]
  };
  
  const settings = revisionSettings || defaultSettings;
  const revisions: Record<string, { date: string; completed: boolean }> = {};
  
  for (let i = 0; i < settings.numberOfRevisions; i++) {
    const revisionKey = `revision${i + 1}`;
    const interval = settings.intervals[i] || settings.intervals[settings.intervals.length - 1];
    revisions[revisionKey] = {
      date: addDaysToDate(studyDate, interval),
      completed: false
    };
  }
  
  return revisions;
};

export const updateSessionWithNewRevisionSettings = (
  session: any, 
  revisionSettings: { numberOfRevisions: number; intervals: number[] }
) => {
  const newRevisions: Record<string, { date: string; completed: boolean }> = {};
  
  // Create new revision structure based on current settings
  for (let i = 0; i < revisionSettings.numberOfRevisions; i++) {
    const revisionKey = `revision${i + 1}`;
    const interval = revisionSettings.intervals[i] || revisionSettings.intervals[revisionSettings.intervals.length - 1];
    
    // CRITICAL FIX: PRESERVE existing completion status if revision existed before
    const existingRevision = session.revisions[revisionKey];
    
    newRevisions[revisionKey] = {
      date: addDaysToDate(session.date, interval),
      // PRESERVE existing completion status, default to false for new revisions
      completed: existingRevision ? existingRevision.completed : false
    };
  }
  
  return {
    ...session,
    revisions: newRevisions
  };
};

export const updateAllSessionsWithRevisionSettings = (
  sessions: any[], 
  revisionSettings: { numberOfRevisions: number; intervals: number[] }
) => {
  return sessions.map(session => updateSessionWithNewRevisionSettings(session, revisionSettings));
};

export const getRevisionsDue = (sessions: any[]) => {
  const revisionsDue: any[] = [];

  sessions.forEach(session => {
    // Skip completed sessions
    if (session.isCompleted) return;
    
    const revisions = session.revisions;
    Object.entries(revisions).forEach(([revisionKey, revision]: [string, any]) => {
      // Use real-time date checking
      if (isDateToday(revision.date) && !revision.completed) {
        revisionsDue.push({
          ...session,
          revisionType: revisionKey,
          revisionDate: revision.date,
          status: 'due'
        });
      }
    });
  });

  return revisionsDue;
};

export const getOverdueRevisions = (sessions: any[]) => {
  const today = new Date().toISOString().split('T')[0];
  const overdueRevisions: any[] = [];

  sessions.forEach(session => {
    // Skip completed sessions
    if (session.isCompleted) return;
    
    const revisions = session.revisions;
    Object.entries(revisions).forEach(([revisionKey, revision]: [string, any]) => {
      // Use real-time date checking
      if (isDateOverdue(revision.date) && !revision.completed) {
        const daysPastDue = Math.floor((new Date(today).getTime() - new Date(revision.date).getTime()) / (1000 * 60 * 60 * 24));
        overdueRevisions.push({
          ...session,
          revisionType: revisionKey,
          revisionDate: revision.date,
          daysPastDue,
          status: 'overdue'
        });
      }
    });
  });

  // Sort by most overdue first
  return overdueRevisions.sort((a, b) => b.daysPastDue - a.daysPastDue);
};

export const getRevisionProgress = (sessions: any[]) => {
  let totalRevisions = 0;
  let completedRevisions = 0;

  sessions.forEach(session => {
    // Count all revisions from all sessions (including completed ones)
    Object.values(session.revisions).forEach((revision: any) => {
      totalRevisions++;
      if (revision.completed) {
        completedRevisions++;
      }
    });
  });

  return {
    total: totalRevisions,
    completed: completedRevisions,
    percentage: totalRevisions > 0 ? (completedRevisions / totalRevisions) * 100 : 0
  };
};

export const checkIfAllRevisionsComplete = (session: any) => {
  return Object.values(session.revisions).every((revision: any) => revision.completed);
};

export const autoMoveCompletedSessions = (sessions: any[]) => {
  const now = new Date().toISOString();
  
  return sessions.map(session => {
    const allRevisionsComplete = checkIfAllRevisionsComplete(session);
    
    // Move to completed if not already completed and all current revisions are done
    if (!session.isCompleted && allRevisionsComplete) {
      return {
        ...session,
        isCompleted: true,
        completedAt: now
      };
    }
    
    // Move back to active if marked as completed but not all current revisions are complete
    // This MUST preserve existing completion statuses and only mark new revisions as pending
    if (session.isCompleted && !allRevisionsComplete) {
      // CRITICAL: Preserve all existing revision completion statuses
      // Only new revisions should be marked as incomplete
      return {
        ...session,
        isCompleted: false,
        completedAt: undefined,
        // Explicitly preserve the revisions object - DO NOT modify it
        revisions: session.revisions
      };
    }
    
    return session;
  });
};

export const getRevisionLabel = (revisionKey: string, intervals: number[]) => {
  const revisionNumber = parseInt(revisionKey.replace('revision', ''));
  const interval = intervals[revisionNumber - 1];
  return `Rev ${revisionNumber} (${interval}d)`;
};

export const getRevisionStatus = (revision: { date: string; completed: boolean }) => {
  if (revision.completed) return 'completed';
  // Use real-time date checking
  if (isDateToday(revision.date)) return 'due';
  if (isDateOverdue(revision.date)) return 'overdue';
  return 'pending';
};