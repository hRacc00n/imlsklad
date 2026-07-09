import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Хук для управления списком задач (загрузка, пагинация, фильтрация)
 */
export function useTaskList(config = {}) {
  const {
    apiUrl = '/api/tasks',
    perPage = 10,
    hideCompletedByDefault = true,
    storageKey = null,
    searchFields = [], // поля для поиска
  } = config;

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  
  const [hideCompleted, setHideCompleted] = useState(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      return saved !== null ? JSON.parse(saved) : hideCompletedByDefault;
    }
    return hideCompletedByDefault;
  });

  const isUpdatingRef = useRef(false);

  const loadTasks = useCallback(async (pageNum = 1, append = false) => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;

    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const url = `${apiUrl}?page=${pageNum}&per_page=${perPage}&hide_completed=${hideCompleted}&search=${encodeURIComponent(searchQuery)}`;
      console.log('[useTaskList] Загрузка:', url);
      
      const response = await fetch(url);
      const data = await response.json();

      if (append) {
        setTasks(prev => [...prev, ...data.data]);
      } else {
        setTasks(data.data);
      }

      setTotalPages(data.pagination?.total_pages || 0);
      setHasNext(data.pagination?.has_next || false);
      setPage(pageNum);

    } catch (err) {
      console.error('[useTaskList] Ошибка:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isUpdatingRef.current = false;
    }
  }, [apiUrl, perPage, hideCompleted, searchQuery]);

  const toggleHideCompleted = useCallback((value) => {
    console.log('[useTaskList] toggleHideCompleted:', value);
    setHideCompleted(value);
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(value));
    }
    setPage(1);
    // loadTasks вызовется автоматически через useEffect
  }, [storageKey]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasNext) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadTasks(nextPage, true);
    }
  }, [loadingMore, hasNext, page, loadTasks]);

  const refresh = useCallback(() => {
    setPage(1);
    loadTasks(1, false);
  }, [loadTasks]);

  // Загрузка при изменении фильтра или первой загрузке
  useEffect(() => {
    loadTasks(1, false);
  }, [hideCompleted]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    tasks,
    loading,
    loadingMore,
    error,
    page,
    totalPages,
    hasNext,
    loadMore,
    refresh,
    hideCompleted,
    toggleHideCompleted,
    searchQuery,
    setSearchQuery,
  };
}

export default useTaskList;