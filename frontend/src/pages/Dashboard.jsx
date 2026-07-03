import { useState, useEffect } from 'react';
import HubCard from '../components/hubs/HubCard';
import TasksTable from '../components/tasks/TasksTable';
import './Dashboard.css';

function Dashboard({ user, onLogout }) {
  const [hubs, setHubs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Конфигурация хабов: имя, иконка
  const hubConfig = [
    { name: 'Регионы', icon: '🌍' },
    { name: 'СПб', icon: '🏙️' },
    { name: 'Счета', icon: '📊' },
    { name: 'Поступления', icon: '📦' },
    { name: 'ЭйрТрафик', icon: '✈️' },
    { name: 'Задачи', icon: '📋' },
  ];

  useEffect(() => {
    // TODO: загружать реальные данные из БД
    // Пока заглушка
    const hubData = hubConfig.map((h, index) => ({
      ...h,
      count: Math.floor(Math.random() * 10), // временно случайные числа
    }));
    setHubs(hubData);

    // Временная заглушка для задач
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

  const handleHubClick = (hubName) => {
    console.log(`Переход в хаб: ${hubName}`);
    // TODO: переход на страницу хаба
  };

  return (
    <div className="dashboard">
      <main className="main">
        {/* Блок Хабы */}
        <section className="hubs-section">
          <div className="hubs-grid">
            {hubs.map((hub, index) => (
              <HubCard
                key={index}
                name={hub.name}
                icon={hub.icon}
                count={hub.count}
                onClick={() => handleHubClick(hub.name)}
              />
            ))}
          </div>
        </section>

        {/* Блок Актуальные задачи */}
        <section className="tasks-section">
          <h2 className="section-title">📋 Актуальные задачи</h2>
          <TasksTable tasks={tasks} loading={loading} />
        </section>
      </main>
    </div>
  );
}

export default Dashboard;