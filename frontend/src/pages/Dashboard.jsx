import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HubCard from '../components/hubs/HubCard';
import TasksTable from '../components/tasks/TasksTable';
import { useModal } from '../contexts/ModalContext';
import './Dashboard.css';

function Dashboard({ user, onLogout }) {
  const [hubs, setHubs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});

  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  const { openModal, updateTask } = useModal();

  const hubConfig = [
    { name: 'Регионы', icon: '🌍', route: '/hub/regions' },
    { name: 'СПб', icon: '🏙️', route: '/hub/spb' },
    { name: 'Счета', icon: '📊', route: '/hub/invoices' },
    { name: 'Поступления', icon: '📦', route: '/hub/arrivals' },
    { name: 'ЭйрТрафик', icon: '✈️', route: '/hub/airtraffic' },
    { name: 'Задачи', icon: '📋', route: '/hub/tasks' },
  ];

  const loadActiveTasks = async (page = 1) => {
    try {
      const response = await fetch(`/api/tasks/active?user_name=${encodeURIComponent(user?.name || '')}&user_role=${user?.role || ''}&page=${page}&per_page=10`);
      const data = await response.json();
      setTasks(data.data || []);
      setCurrentPage(data.pagination?.page || 1);
      setTotalPages(data.pagination?.total_pages || 1);
      setHasNext(data.pagination?.has_next || false);
      setHasPrevious(data.pagination?.has_previous || false);
    } catch (err) {
      console.error('Ошибка загрузки активных задач:', err);
    }
  };

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    loadActiveTasks(page);
  };

  const handleTaskClick = (task) => {
    const taskType = task.type || 'arrival';
    
    openModal(task, taskType, {
      onTake: async (taskId) => {
        try {
          const response = await fetch(`/api/tasks/${taskType}/${taskId}/take`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_name: user?.name || 'Неизвестно' }),
          });
          const data = await response.json();
          if (data.success) {
            const updatedTask = { ...task, status: 'in_progress', assigned_to: user?.name };
            updateTask(updatedTask);
            await loadActiveTasks();
          }
        } catch (err) {
          console.error(err);
        }
      },
      onComplete: async (taskId) => {
        try {
          const response = await fetch(`/api/tasks/${taskType}/${taskId}/complete`, {
            method: 'PUT',
          });
          const data = await response.json();
          if (data.success) {
            const updatedTask = { ...task, status: 'completed' };
            updateTask(updatedTask);
            await loadActiveTasks();
          }
        } catch (err) {
          console.error(err);
        }
      },
      onDecline: async (taskId) => {
        try {
          const response = await fetch(`/api/tasks/${taskType}/${taskId}/decline`, {
            method: 'PUT',
          });
          const data = await response.json();
          if (data.success) {
            const updatedTask = { ...task, status: 'new', assigned_to: null };
            updateTask(updatedTask);
            await loadActiveTasks();
          }
        } catch (err) {
          console.error(err);
        }
      },
      onReassign: async (taskId) => {
        try {
          const response = await fetch(`/api/tasks/${taskType}/${taskId}/reassign`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_name: user?.name || 'Неизвестно' }),
          });
          const data = await response.json();
          if (data.success) {
            const updatedTask = { ...task, assigned_to: user?.name };
            updateTask(updatedTask);
            await loadActiveTasks();
          }
        } catch (err) {
          console.error(err);
        }
      },
      onEdit: async (taskId, values, photos) => {
        try {
          const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...values, photos }),
          });
          const data = await response.json();
          if (data.success) {
            const updatedTask = { ...task, ...data.task };
            updateTask(updatedTask);
            await loadActiveTasks();
          }
        } catch (err) {
          console.error(err);
        }
      },
      onUploadPhotos: async (taskId, photos) => {
        try {
          const response = await fetch(`/api/tasks/${taskId}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photos }),
          });
          const data = await response.json();
          if (data.success) {
            const updatedTask = { ...task, photos: data.photos };
            updateTask(updatedTask);
            await loadActiveTasks();
          }
        } catch (err) {
          console.error(err);
        }
      },
      onRefresh: loadActiveTasks,
      onPhotoUploadStart: () => {},
      onPhotoUploadComplete: () => {},
    });
  };

  const loadStats = async () => {
    try {
      console.log('[Dashboard] Загрузка статистики...');
      const timestamp = Date.now();
      const response = await fetch(`/api/tasks/arrivals/stats?_=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const data = await response.json();
      console.log('[Dashboard] Статистика получена:', data);
      
      // Принудительно обновляем состояние
      setStats({ ...data });
      
      // Обновляем хабы с новым значением
      setHubs(prevHubs => {
        console.log('[Dashboard] prevHubs:', prevHubs);
        const updated = prevHubs.map(hub => {
          if (hub.name === 'Поступления') {
            console.log(`[Dashboard] Обновляем Поступления с ${hub.count} на ${data.active_count}`);
            return { ...hub, count: data.active_count || 0 };
          }
          return { ...hub };
        });
        console.log('[Dashboard] updated hubs:', updated);
        return updated;
      });
    } catch (err) {
      console.error('Ошибка загрузки статистики:', err);
    }
  };

  useEffect(() => {
    // Инициализация хабов
    const hubData = hubConfig.map((h) => ({
      ...h,
      count: 0,
    }));
    console.log('[Dashboard] Инициализация хабов:', hubData);
    setHubs(hubData);
    
    // Загрузка реальных данных
    loadStats();

    loadActiveTasks();
    setLoading(false);

    const handleSSEEvent = (event) => {
      const data = event.detail;
      console.log('[Dashboard] SSE Event received:', data);
      
      // Проверяем правильный путь к hub_type
      if (data.type === 'hub_stats_updated' && data.data?.hub_type === 'arrival') {
        console.log('[Dashboard] Обновление счетчика Поступления');
        loadStats();
      }
      if (data.type === 'task_created' || 
          data.type === 'task_updated' || 
          data.type === 'task_deleted' ||
          data.type === 'comment_count_updated') {
        loadActiveTasks();
      }
    };

    window.addEventListener('sse-message', handleSSEEvent);
    console.log('[Dashboard] Подписка на SSE события');

    return () => {
      window.removeEventListener('sse-message', handleSSEEvent);
      console.log('[Dashboard] Отписка от SSE');
    };
  }, []);

  const handleHubClick = (hubName, route) => {
    navigate(route);
  };

  return (
    <div className="dashboard">
      <main className="main">
        <section className="hubs-section">
          <div className="hubs-grid">
            {hubs.map((hub, index) => (
              <HubCard
                key={`${hub.name}-${hub.count}`} // ← добавляем count в key
                name={hub.name}
                icon={hub.icon}
                count={hub.count}
                onClick={() => handleHubClick(hub.name, hub.route)}
              />
            ))}
          </div>
        </section>

        <section className="tasks-section">
          <h2 className="section-title">📋 Актуальные задачи</h2>
          <TasksTable tasks={tasks} loading={loading} onRowClick={handleTaskClick} />
          
          {totalPages > 1 && (
            <div className="pagination">
              <button onClick={() => goToPage(currentPage - 1)} disabled={!hasPrevious}>
                ← Назад
              </button>
              <span>Страница {currentPage} из {totalPages}</span>
              <button onClick={() => goToPage(currentPage + 1)} disabled={!hasNext}>
                Вперед →
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Dashboard;