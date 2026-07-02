import { createContext, useContext } from 'react';
import { useSSE } from '../hooks/useSSE';
import { useAuth } from './AuthContext';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { user } = useAuth();
  const userName = user?.name || 'Unknown';
  const sse = useSSE(userName);

  return (
    <AppContext.Provider value={{ sse }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}