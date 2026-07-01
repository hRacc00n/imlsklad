import { useState, useEffect } from 'react';
import axios from 'axios';
import Header from '../components/Header';
import './Dashboard.css';

function Dashboard({ user, onLogout }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/orders')
      .then(response => {
        setOrders(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Ошибка загрузки заказов:', error);
        setLoading(false);
      });
  }, []);

  return (
    <div className="dashboard">
      <Header user={user} onLogout={onLogout} />

      <main className="main">
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Всего заказов</h3>
            <span className="stat-number">{orders.length}</span>
          </div>
          <div className="stat-card">
            <h3>В пути</h3>
            <span className="stat-number">
              {orders.filter(o => o.status === 'В пути').length}
            </span>
          </div>
          <div className="stat-card">
            <h3>Доставлено</h3>
            <span className="stat-number">
              {orders.filter(o => o.status === 'Доставлен').length}
            </span>
          </div>
        </div>

        <div className="orders-table">
          <h2>📋 Активные заказы</h2>
          {loading ? (
            <p>Загрузка данных...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Трек-номер</th>
                  <th>Клиент</th>
                  <th>Статус</th>
                  <th>Дата</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td><strong>{order.tracking}</strong></td>
                    <td>{order.client}</td>
                    <td>
                      <span className={`status-badge status-${order.status === 'Доставлен' ? 'delivered' : 'transit'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>{order.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;