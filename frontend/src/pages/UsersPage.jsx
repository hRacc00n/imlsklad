import { useState, useEffect } from 'react';
import axios from 'axios';
import './UsersPage.css';

function UsersPage({ user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', login: '', password: '', role: 'logist' });
  const [error, setError] = useState('');

  const loadUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка загрузки пользователей:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDelete = async (userId, userName) => {
    if (!confirm(`Удалить пользователя "${userName}"?`)) return;
    try {
      await axios.delete(`/api/users/${userId}`);
      loadUsers();
    } catch (err) {
      alert('Ошибка при удалении');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.login || !formData.password) {
      setError('Заполните все поля');
      return;
    }

    try {
      if (editingUser) {
        // Редактирование
        await axios.put(`/api/users/${editingUser.id}`, formData);
      } else {
        // Создание
        await axios.post('/api/users', formData);
      }
      setShowModal(false);
      setEditingUser(null);
      setFormData({ name: '', login: '', password: '', role: 'logist' });
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка при сохранении');
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      login: user.login,
      password: '', // пароль не показываем
      role: user.role,
    });
    setShowModal(true);
    setError('');
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ name: '', login: '', password: '', role: 'logist' });
    setShowModal(true);
    setError('');
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({ name: '', login: '', password: '', role: 'logist' });
    setError('');
  };

  const getRoleLabel = (role) => {
    const map = { admin: 'Админ', manager: 'Менеджер', logist: 'Логист' };
    return map[role] || role;
  };

  return (
    <div className="users-page">

      <div className="users-content">
        <div className="users-header">
          <h1>👥 Управление пользователями</h1>
          <button className="btn-add" onClick={openCreateModal}>➕ Добавить</button>
        </div>

        {loading ? (
          <p>Загрузка...</p>
        ) : (
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Имя</th>
                  <th>Логин</th>
                  <th>Роль</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.name}</td>
                    <td>{u.login}</td>
                    <td><span className={`role-tag ${u.role}`}>{getRoleLabel(u.role)}</span></td>
                    <td className="actions">
                      <button className="btn-edit" onClick={() => openEditModal(u)}>✏️</button>
                      <button className="btn-delete" onClick={() => handleDelete(u.id, u.name)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Модальное окно */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editingUser ? 'Редактировать пользователя' : 'Создать пользователя'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Имя</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Логин</label>
                <input
                  type="text"
                  value={formData.login}
                  onChange={e => setFormData({ ...formData, login: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>{editingUser ? 'Новый пароль (оставьте пустым, чтобы не менять)' : 'Пароль'}</label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? 'Оставьте пустым' : 'Введите пароль'}
                  required={!editingUser}
                />
              </div>
              <div className="form-group">
                <label>Роль</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="logist">Логист</option>
                  <option value="manager">Менеджер</option>
                  <option value="admin">Админ</option>
                </select>
              </div>

              {error && <div className="error-msg">{error}</div>}

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={closeModal}>Отмена</button>
                <button type="submit" className="btn-save">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersPage;