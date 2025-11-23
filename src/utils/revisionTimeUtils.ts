// Utility functions for tracking revision time spent from pomodoro sessions

export const getRevisionTimeSpent = (
  subject: string, 
  topic: string, 
  revisionKey: string, 
  pomodoroSessions: any[]
): number => {
  // Extract revision number from key (e.g., "revision1" -> "1")
  const revisionNumber = revisionKey.replace('revision', '');
  const revisionTopicPatternWithNumber = `${topic} (Revision ${revisionNumber})`;
  
  // Find pomodoro sessions that match this revision
  const revisionSessions = pomodoroSessions.filter(session => {
    if (session.sessionType !== 'pomodoro') return false;
    if (session.subject.toLowerCase() !== subject.toLowerCase()) return false;
    
    // Only match the specific revision number
    const sessionTopic = session.topic.toLowerCase();
    return sessionTopic === revisionTopicPatternWithNumber.toLowerCase();
  });
  
  // Sum up the duration of all matching revision sessions
  const totalMinutes = revisionSessions.reduce((total, session) => total + session.duration, 0);
  
  // Format time as requested (2m, 4m, 1h, etc.)
  if (totalMinutes === 0) return '';
  if (totalMinutes < 60) return `${totalMinutes}m`;
  
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
};

export const getTotalRevisionTimeForSession = (
  subject: string, 
  topic: string, 
  pomodoroSessions: any[]
): number => {
  const revisionTopicPattern = `${topic} (Revision)`;
  
  // Find all pomodoro sessions for this topic's revisions
  const revisionSessions = pomodoroSessions.filter(session => {
    if (session.sessionType !== 'pomodoro') return false;
    if (session.subject.toLowerCase() !== subject.toLowerCase()) return false;
    
    const sessionTopic = session.topic.toLowerCase();
    return sessionTopic.includes('(revision)') && sessionTopic.includes(topic.toLowerCase());
  });
  
  return revisionSessions.reduce((total, session) => total + session.duration, 0);
};

export const getRevisionTimeByType = (
  subject: string, 
  topic: string, 
  pomodoroSessions: any[]
): Record<string, number> => {
  const revisionTimes: Record<string, number> = {};
  
  // Initialize revision times
  for (let i = 1; i <= 4; i++) {
    revisionTimes[`revision${i}`] = 0;
  }
  
  // Find all pomodoro sessions for this topic's revisions
  const revisionSessions = pomodoroSessions.filter(session => {
    if (session.sessionType !== 'pomodoro') return false;
    if (session.subject.toLowerCase() !== subject.toLowerCase()) return false;
    
    const sessionTopic = session.topic.toLowerCase();
    return sessionTopic.includes('(revision)') && sessionTopic.includes(topic.toLowerCase());
  });
  
  // Group by revision type if possible
  revisionSessions.forEach(session => {
    const sessionTopic = session.topic.toLowerCase();
    
    // Try to extract revision number from topic
    const revisionMatch = sessionTopic.match(/revision\s*(\d+)/);
    if (revisionMatch) {
      const revisionNumber = revisionMatch[1];
      const revisionKey = `revision${revisionNumber}`;
      if (revisionTimes.hasOwnProperty(revisionKey)) {
        revisionTimes[revisionKey] += session.duration;
      }
    } else {
      // If no specific revision number, add to revision1 as default
      revisionTimes.revision1 += session.duration;
    }
  });
  
  return revisionTimes;
};