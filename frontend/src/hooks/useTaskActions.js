import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAvailableActions } from '../utils/taskActions';

/**
 * Хук для получения доступных действий над задачей
 */
export function useTaskActions() {
  const { user } = useAuth();

  /**
   * Получить доступные действия для задачи
   */
  const getActions = useCallback((task) => {
    return getAvailableActions(user, task);
  }, [user]);

  /**
   * Проверить, может ли пользователь редактировать задачу
   */
  const canEdit = useCallback((task) => {
    if (!user || !task) return false;
    if (user.role === 'admin') return true;
    return user.name === task.author || user.login === task.author;
  }, [user]);

  /**
   * Проверить, может ли пользователь удалить задачу
   */
  const canDelete = useCallback((task) => {
    if (!user || !task) return false;
    if (user.role === 'admin') return true;
    return user.name === task.author || user.login === task.author;
  }, [user]);

  return {
    getActions,
    canEdit,
    canDelete,
  };
}

export default useTaskActions;