import { createContext, useContext, useCallback, useMemo } from 'react';
import { useSSE } from '../hooks/useSSE';
import { useAuth } from './AuthContext';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { user } = useAuth();
  const userName = user?.name || 'Unknown';

  // Обработчик входящих SSE сообщений
  const handleSSEMessage = useCallback((data) => {
    console.log('[App] SSE Event:', data);
    
    // ===== ДИСПАТЧИМ СОБЫТИЕ ДЛЯ ВСЕХ КОМПОНЕНТОВ =====
    const event = new CustomEvent('sse-message', { detail: data });
    window.dispatchEvent(event);
    console.log('[App] Dispatched sse-message event');
    
    if (data.type === 'task_created') {
      console.log(`[App] Новая задача #${data.data?.task_id}`);
    } else if (data.type === 'task_updated') {
      console.log(`[App] Обновлена задача #${data.data?.task_id} (${data.data?.action})`);
    } else if (data.type === 'task_deleted') {
      console.log(`[App] Удалена задача #${data.data?.task_id}`);
    }
  }, []);

  const sse = useSSE(userName, handleSSEMessage);

  const value = useMemo(() => ({ sse, user }), [sse, user]);

  return (
    <AppContext.Provider value={value}>
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