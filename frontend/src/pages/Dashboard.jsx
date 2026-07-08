import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HubCard from '../components/hubs/HubCard';
import TasksTable from '../components/tasks/TasksTable';
import './Dashboard.css';

function Dashboard({ user, onLogout }) {
  const [hubs, setHubs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // Конфигурация хабов: имя, иконка, маршрут
  const hubConfig = [
    { name: 'Регионы', icon: '🌍', route: '/hub/regions' },
    { name: 'СПб', icon: '🏙️', route: '/hub/spb' },
    { name: 'Счета', icon: '📊', route: '/hub/invoices' },
    { name: 'Поступления', icon: '📦', route: '/hub/arrivals' },
    { name: 'ЭйрТрафик', icon: '✈️', route: '/hub/airtraffic' },
    { name: 'Задачи', icon: '📋', route: '/hub/tasks' },
  ];

  useEffect(() => {
    // TODO: загружать реальные данные из БД
    const hubData = hubConfig.map((h, index) => ({
      ...h,
      count: Math.floor(Math.random() * 10),
    }));
    setHubs(hubData);

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
                key={index}
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