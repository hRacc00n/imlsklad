import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Хук для управления задачами (CRUD операции)
 * @param {Object} config - конфигурация хаба
 * @param {string} config.apiUrl - базовый URL для API
 * @param {Function} config.onSuccess - колбэк при успешном выполнении
 * @param {Function} config.onError - колбэк при ошибке
 */
export function useTasks(config = {}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    apiUrl = '/api/tasks', // fallback
    onSuccess = null,
    onError = null,
  } = config;

  /**
   * Базовый запрос с обработкой ошибок
   */
  const request = useCallback(async (url, options = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Ошибка запроса');
      }
      
      return data;
    } catch (err) {
      setError(err.message);
      if (onError) onError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [onError]);

  /**
   * Создать задачу
   * @param {Object} taskData - данные задачи
   * @param {Array} photos - фотографии (base64)
   */
  const createTask = useCallback(async (taskData, photos = []) => {
    try {
      // 1. Создаём задачу
      const result = await request(`${apiUrl}`, {
        method: 'POST',
        body: JSON.stringify({
          ...taskData,
          author: user?.name || 'Неизвестно',
        }),
      });
      
      // 2. Если есть фото - загружаем их
      if (photos.length > 0 && result.task?.id) {
        try {
          await uploadPhotos(result.task.id, photos);
        } catch (photoErr) {
          console.warn('Фото не загружены:', photoErr);
          // Не прерываем выполнение, задача уже создана
        }
      }
      
      if (onSuccess) onSuccess(result);
      return result;
    } catch (err) {
      if (onError) onError(err);
      throw err;
    }
  }, [apiUrl, request, user, onSuccess, onError]);

  /**
   * Обновить задачу
   * @param {number} taskId - ID задачи
   * @param {Object} taskData - данные для обновления
   * @param {Array} photos - фотографии (base64)
   */
  const updateTask = useCallback(async (taskId, taskData, photos = []) => {
    try {
      const result = await request(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...taskData,
          photos,
        }),
      });
      if (onSuccess) onSuccess(result);
      return result;
    } catch (err) {
      if (onError) onError(err);
      throw err;
    }
  }, [request, onSuccess, onError]);

  /**
   * Удалить задачу
   * @param {number} taskId - ID задачи
   */
  const deleteTask = useCallback(async (taskId) => {
    try {
      const result = await request(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (onSuccess) onSuccess(result);
      return result; // ← ДОБАВИТЬ
    } catch (err) {
      if (onError) onError(err);
      throw err;
    }
  }, [request, onSuccess, onError]);

  /**
   * Загрузить фотографии для задачи
   * @param {number} taskId - ID задачи
   * @param {Array} photos - фотографии (base64)
   */
  const uploadPhotos = useCallback(async (taskId, photos) => {
    if (!photos || photos.length === 0) return [];
    
    try {
      const result = await request(`/api/tasks/${taskId}/photos`, {
        method: 'POST',
        body: JSON.stringify({ photos }),
      });
      return result.photos || [];
    } catch (err) {
      console.error('Ошибка загрузки фото:', err);
      throw err;
    }
  }, [request]);

  /**
   * Взять задачу в работу
   * @param {number} taskId - ID задачи
   */
  const takeTask = useCallback(async (taskId) => {
    try {
      const result = await request(`${apiUrl}/${taskId}/take`, {
        method: 'PUT',
        body: JSON.stringify({ user_name: user?.name || 'Неизвестно' }),
      });
      if (onSuccess) onSuccess(result);
      return result; // ← ДОБАВИТЬ
    } catch (err) {
      if (onError) onError(err);
      throw err;
    }
  }, [apiUrl, request, user, onSuccess, onError]);

  /**
   * Выполнить задачу
   * @param {number} taskId - ID задачи
   */
  const completeTask = useCallback(async (taskId) => {
    try {
      const result = await request(`${apiUrl}/${taskId}/complete`, {
        method: 'PUT',
      });
      
      if (onSuccess) onSuccess(result);
      return result;
    } catch (err) {
      if (onError) onError(err);
      throw err;
    }
  }, [apiUrl, request, onSuccess, onError]);

  /**
   * Отказаться от задачи
   * @param {number} taskId - ID задачи
   */
  const declineTask = useCallback(async (taskId) => {
    try {
      const result = await request(`${apiUrl}/${taskId}/decline`, {
        method: 'PUT',
      });
      
      if (onSuccess) onSuccess(result);
      return result;
    } catch (err) {
      if (onError) onError(err);
      throw err;
    }
  }, [apiUrl, request, onSuccess, onError]);

  /**
   * Переназначить задачу на себя
   * @param {number} taskId - ID задачи
   */
  const reassignTask = useCallback(async (taskId) => {
    try {
      const result = await request(`${apiUrl}/${taskId}/reassign`, {
        method: 'PUT',
        body: JSON.stringify({ 
          user_name: user?.name || 'Неизвестно' 
        }),
      });
      
      if (onSuccess) onSuccess(result);
      return result;
    } catch (err) {
      if (onError) onError(err);
      throw err;
    }
  }, [apiUrl, request, user, onSuccess, onError]);

  return {
    // Состояния
    loading,
    error,
    
    // CRUD операции
    createTask,
    updateTask,
    deleteTask,
    uploadPhotos,
    
    // Действия с задачами
    takeTask,
    completeTask,
    declineTask,
    reassignTask,
  };
}

export default useTasks;