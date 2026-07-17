import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import SearchBar from '../components/common/SearchBar';
import PersonalTaskCard from '../components/personal-tasks/PersonalTaskCard';
import PersonalTaskFormModal from '../components/personal-tasks/PersonalTaskFormModal';
import PersonalTaskModal from '../components/personal-tasks/PersonalTaskModal';
import { HUB_TYPES, getHubConfig } from '../config/hubConfigs';
import { useModal } from '../contexts/ModalContext';
import './PersonalTasksHub.css';

function TasksHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sse } = useAppContext();
  const config = getHubConfig(HUB_TYPES.TASKS);

  // Состояния
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Состояния для модалки просмотра
  const [selectedTask, setSelectedTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [taskItems, setTaskItems] = useState([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const perPage = config.perPage || 10;

  const { openModal } = useModal();

  // Загрузка задач
  const loadTasks = useCallback(async (resetPage = true) => {
    if (!user?.name) return;
    
    try {
      if (resetPage) setPage(1);
      const currentPage = resetPage ? 1 : page;
      
      const url = `${config.apiUrl}?page=${currentPage}&per_page=${perPage}&hide_completed=${hideCompleted}&search=${encodeURIComponent(searchQuery)}&user_name=${encodeURIComponent(user.name)}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (resetPage) {
        setTasks(data.data || []);
      } else {
        setTasks(prev => [...prev, ...(data.data || [])]);
      }
      
      setTotalPages(data.pagination?.total_pages || 1);
      setHasNext(data.pagination?.has_next || false);
      setLoading(false);
      setLoadingMore(false);
    } catch (err) {
      console.error('Ошибка загрузки задач:', err);
      setLoading(false);
      setLoadingMore(false);
    }
  }, [config.apiUrl, page, perPage, searchQuery, hideCompleted, user?.name]);

  // Загрузка комментариев к задаче
  const loadComments = async (taskId) => {
    try {
      setIsLoadingComments(true);
      const response = await fetch(`/api/personal-tasks/${taskId}/comments`);
      const data = await response.json();
      setComments(data || []);
    } catch (err) {
      console.error('Ошибка загрузки комментариев:', err);
    } finally {
      setIsLoadingComments(false);
    }
  };

  // Загрузка подпунктов задачи
  const loadTaskItems = async (taskId) => {
    try {
      const response = await fetch(`/api/personal-tasks/${taskId}`);
      const data = await response.json();
      setTaskItems(data.items || []);
      return data;
    } catch (err) {
      console.error('Ошибка загрузки подпунктов:', err);
      return null;
    }
  };

  // Обновление при поиске/фильтрах
  useEffect(() => {
    loadTasks(true);
  }, [searchQuery, hideCompleted]);

  // SSE обновления
  useEffect(() => {
    const handleSSEEvent = (event) => {
      const data = event.detail;
      console.log('[TasksHub] SSE событие:', data);
      
      if (data.type === 'personal_task_created' || 
          data.type === 'personal_task_updated' || 
          data.type === 'personal_task_deleted') {
        loadTasks(true);
      }
    };

    window.addEventListener('sse-message', handleSSEEvent);
    return () => window.removeEventListener('sse-message', handleSSEEvent);
  }, [loadTasks]);

  // Обработчики
  const handleBack = () => navigate('/');

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleToggleHideCompleted = () => {
    setHideCompleted(!hideCompleted);
  };

  const handleLoadMore = () => {
    if (hasNext && !loadingMore) {
      setLoadingMore(true);
      setPage(prev => prev + 1);
      loadTasks(false);
    }
  };

  const handleCreateTask = async (values, files) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/personal-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: values.title,
          description: values.description || '',
          author: user?.name,
          assigned_to: values.assigned_to || [],
          items: values.items || [],
          files: files || [],
        }),
      });
      const data = await response.json();
      if (data.success) {
        setShowCreateModal(false);
        loadTasks(true);
      } else {
        alert(data.message || 'Ошибка при создании задачи');
      }
    } catch (err) {
      console.error('Ошибка создания задачи:', err);
      alert('Ошибка при создании задачи');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTaskClick = async (task) => {
    // Загружаем полные данные задачи
    try {
      const response = await fetch(`/api/personal-tasks/${task.id}`);
      const fullTask = await response.json();
      openModal(fullTask, 'personal_task');
    } catch (err) {
      console.error('Ошибка загрузки задачи:', err);
      alert('Ошибка при открытии задачи');
    }
  };

  const handleToggleItem = async (itemId, isCompleted) => {
    try {
      const response = await fetch(`/api/personal-tasks/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: isCompleted }),
      });
      const data = await response.json();
      if (data.success) {
        loadTasks(true);
        if (selectedTask) {
          const updatedTask = await fetch(`/api/personal-tasks/${selectedTask.id}`).then(r => r.json());
          setSelectedTask(updatedTask);
          setTaskItems(updatedTask.items || []);
        }
      }
    } catch (err) {
      console.error('Ошибка переключения подпункта:', err);
      alert('Ошибка при обновлении подпункта');
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      const response = await fetch(`/api/personal-tasks/${taskId}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_name: user?.name }),
      });
      const data = await response.json();
      if (data.success) {
        loadTasks(true);
        if (selectedTask) {
          setSelectedTask(data.task);
          setTaskItems(data.task.items || []);
        }
      } else {
        alert(data.message || 'Ошибка при выполнении задачи');
      }
    } catch (err) {
      console.error('Ошибка выполнения задачи:', err);
      alert('Ошибка при выполнении задачи');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Удалить задачу?')) return;
    try {
      const response = await fetch(`/api/personal-tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: user?.name }),
      });
      const data = await response.json();
      if (data.success) {
        loadTasks(true);
        setIsModalOpen(false);
        setSelectedTask(null);
      } else {
        alert(data.message || 'Ошибка при удалении задачи');
      }
    } catch (err) {
      console.error('Ошибка удаления задачи:', err);
      alert('Ошибка при удалении задачи');
    }
  };

  const handleAddComment = async (taskId, text) => {
    try {
      const response = await fetch(`/api/personal-tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: user?.name || 'Неизвестно',
          text: text,
        }),
      });
      const result = await response.json();
      if (result.success) {
        await loadComments(taskId);
      } else {
        alert(result.message || 'Ошибка при добавлении комментария');
      }
    } catch (err) {
      console.error('Ошибка добавления комментария:', err);
      alert('Ошибка при добавлении комментария');
    }
  };

  const handleEditComment = async (commentId, newText) => {
    try {
      const response = await fetch(`/api/personal-tasks/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: user?.name,
          text: newText,
        }),
      });
      const result = await response.json();
      if (result.success) {
        if (selectedTask) {
          await loadComments(selectedTask.id);
        }
      } else {
        alert(result.message || 'Ошибка при редактировании комментария');
      }
    } catch (err) {
      console.error('Ошибка редактирования комментария:', err);
      alert('Ошибка при редактировании комментария');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Удалить комментарий?')) return;
    try {
      const response = await fetch(`/api/personal-tasks/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: user?.name,
        }),
      });
      const result = await response.json();
      if (result.success) {
        if (selectedTask) {
          await loadComments(selectedTask.id);
        }
      } else {
        alert(result.message || 'Ошибка при удалении комментария');
      }
    } catch (err) {
      console.error('Ошибка удаления комментария:', err);
      alert('Ошибка при удалении комментария');
    }
  };

  return (
    <div className="personal-tasks-hub">
      <div className="personal-tasks-header">
        <h1>📋 {config.title}</h1>
        <div className="personal-tasks-actions">
          <SearchBar
            onSearch={handleSearch}
            placeholder="Поиск по задачам..."
          />
          <label className="personal-tasks-filter">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={handleToggleHideCompleted}
            />
            <span>Скрыть выполненные</span>
          </label>
          <button className="personal-tasks-btn-create" onClick={() => setShowCreateModal(true)}>
            ➕ Создать задачу
          </button>
          <button className="personal-tasks-btn-back" onClick={handleBack}>
            ← Назад
          </button>
        </div>
      </div>

      {loading && tasks.length === 0 ? (
        <p className="personal-tasks-loading">Загрузка...</p>
      ) : tasks.length === 0 ? (
        <div className="personal-tasks-empty">
          <p>📋 Нет задач</p>
          <p className="personal-tasks-empty-hint">Создайте первую задачу, нажав кнопку "Создать задачу"</p>
        </div>
      ) : (
        <>
          <div className="personal-tasks-grid">
            {tasks.map((task) => (
              <PersonalTaskCard
                key={task.id}
                task={task}
                currentUser={user}
                onClick={handleTaskClick}
                onComplete={handleCompleteTask}
                onDelete={handleDeleteTask}
              />
            ))}
          </div>

          {hasNext && (
            <div className="personal-tasks-load-more">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="personal-tasks-load-more-btn"
              >
                {loadingMore ? 'Загрузка...' : 'Показать еще'}
              </button>
              <span className="personal-tasks-load-more-info">
                Показано {tasks.length} задач
              </span>
            </div>
          )}
        </>
      )}

      {/* Модалка создания задачи */}
      <PersonalTaskFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateTask}
        currentUser={user}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

export default TasksHub;