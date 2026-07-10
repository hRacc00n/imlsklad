import { createContext, useContext, useCallback, useMemo } from 'react';
import { useSSE } from '../hooks/useSSE';
import { useAuth } from './AuthContext';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { user } = useAuth();
  const userName = user?.name || 'Unknown';

  // Обработчик входящих SSE сообщений
  const handleSSEMessage = useCallback((data) => {
    console.log('[App] SSE Event received:', data);
    
    // Диспатчим событие для всех компонентов
    const event = new CustomEvent('sse-message', { detail: data });
    window.dispatchEvent(event);
    console.log('[App] Dispatched sse-message event');
    
    // ===== ДОПОЛНИТЕЛЬНАЯ ОБРАБОТКА =====
    if (data.type === 'task_created' || data.type === 'task_updated' || data.type === 'task_deleted') {
      console.log('[App] Обновление списка задач');
    }
    if (data.type === 'notification_created') {
      console.log('[App] 🔔 Новое уведомление для:', data.data?.user_name);
    }
    if (data.type === 'notification_count_updated') {
      console.log('[App] 📊 Обновление счётчика уведомлений:', data.data?.count);
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