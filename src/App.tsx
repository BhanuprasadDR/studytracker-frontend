import React, {  useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import { useLocalStorage } from './hooks/useLocalStorage';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useLocalStorage('isAuthenticated', false);
  const [userInfo, setUserInfo] = useLocalStorage('userInfo', { name: '', username: '' });
  const [sessionId, setSessionId] = useLocalStorage('sessionId', '');

  // Check for session validity on app load
  useEffect(() => {
    const currentSessionId = Date.now().toString();
    
    // If no session ID exists or it's different from stored one, require login
    if (!sessionId) {
      // First time or after browser close - require login
      setIsAuthenticated(false);
      setSessionId(currentSessionId);
    }
  }, []);

  // Handle beforeunload event to detect when user closes the browser/tab
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clear session when user closes the browser/tab
      localStorage.removeItem('sessionId');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Check for revisions due and show notifications
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleLogin = (name: string, username: string) => {
    const newSessionId = Date.now().toString();
    setIsAuthenticated(true);
    setUserInfo({ name, username });
    setSessionId(newSessionId);
  };

 const handleLogout = () => {
  setIsAuthenticated(false);
  setUserInfo({ name: '', username: '' });
  setSessionId('');
  
  // Clear session data
  localStorage.removeItem('sessionId');
  localStorage.removeItem('token');   // ✅ clear JWT on logout
};


  return (
    <ThemeProvider>
      <div className="App min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        {!isAuthenticated ? (
          <LoginScreen onLogin={handleLogin} />
        ) : (
          <Dashboard userInfo={userInfo} onLogout={handleLogout} />
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;