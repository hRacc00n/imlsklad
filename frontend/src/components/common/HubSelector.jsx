import { useState, useEffect } from 'react';
import './HubSelector.css';

function HubSelector({ selected = [], onChange }) {
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHubs = async () => {
      try {
        const response = await fetch('/api/hubs');
        const data = await response.json();
        setHubs(data);
      } catch (err) {
        console.error('Ошибка загрузки хабов:', err);
      } finally {
        setLoading(false);
      }
    };
    loadHubs();
  }, []);

  const toggleHub = (hubId) => {
    const newSelected = selected.includes(hubId)
      ? selected.filter(id => id !== hubId)
      : [...selected, hubId];
    onChange(newSelected);
  };

  if (loading) {
    return <div className="hub-selector-loading">Загрузка хабов...</div>;
  }

  if (hubs.length === 0) {
    return <div className="hub-selector-empty">Нет доступных хабов</div>;
  }

  return (
    <div className="hub-selector">
      <div className="hub-selector-grid">
        {hubs.map(hub => (
          <div
            key={hub.id}
            className={`hub-selector-item ${selected.includes(hub.id) ? 'selected' : ''}`}
            onClick={() => toggleHub(hub.id)}
          >
            <span className="hub-selector-check">
              {selected.includes(hub.id) ? '✅' : '⬜'}
            </span>
            <span className="hub-selector-name">{hub.name}</span>
          </div>
        ))}
      </div>
      <div className="hub-selector-info">
        Выбрано: <strong>{selected.length}</strong> из {hubs.length}
      </div>
    </div>
  );
}

export default HubSelector;