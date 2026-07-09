import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HubCard from '../components/hubs/HubCard';
import TasksTable from '../components/tasks/TasksTable';
import './Dashboard.css';

function Dashboard({ user, onLogout }) {
  const [hubs, setHubs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});

  const navigate = useNavigate();

  const hubConfig = [
    { name: 'Регионы', icon: '🌍', route: '/hub/regions' },
    { name: 'СПб', icon: '🏙️', route: '/hub/spb' },
    { name: 'Счета', icon: '📊', route: '/hub/invoices' },
    { name: 'Поступления', icon: '📦', route: '/hub/arrivals' },
    { name: 'ЭйрТрафик', icon: '✈️', route: '/hub/airtraffic' },
    { name: 'Задачи', icon: '📋', route: '/hub/tasks' },
  ];

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

    // Загрузка задач (заглушка)
    setTasks([
      {
        tracking: 'ARR-2025-001',
        client: 'ООО "Транспортник"',
        description: 'Приемка товара, 5 паллет',
        assigned_to: 'Анна Менеджер',
        comments_count: 3,
      },
      {
        tracking: 'SHIP-2025-042',
        client: 'ИП "Грузовичок"',
        description: 'Отгрузка в СПб',
        assigned_to: '—',
        comments_count: 0,
      },
    ]);
    setLoading(false);

    const handleSSEEvent = (event) => {
      const data = event.detail;
      console.log('[Dashboard] SSE Event received:', data);
      
      // Проверяем правильный путь к hub_type
      if (data.type === 'hub_stats_updated' && data.data?.hub_type === 'arrival') {
        console.log('[Dashboard] Обновление счетчика Поступления');
        loadStats();
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
          <TasksTable tasks={tasks} loading={loading} />
        </section>
      </main>
    </div>
  );
}

export default Dashboard;