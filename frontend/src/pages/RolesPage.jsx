import { useState, useEffect } from 'react';
import axios from 'axios';
import './RolesPage.css';

function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({ name: '', role_key: '', description: '' });
  const [error, setError] = useState('');

  const loadRoles = async () => {
    try {
      const response = await axios.get('/api/roles');
      setRoles(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка загрузки ролей:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const handleDelete = async (roleId, roleName, roleKey) => {
    if (roleKey === 'admin') {
      alert('Нельзя удалить роль Администратора');
      return;
    }
    if (!confirm(`Удалить роль "${roleName}"?`)) return;
    try {
      await axios.delete(`/api/roles/${roleId}`);
      loadRoles();
    } catch (err) {
      alert(err.response?.data?.message || 'Ошибка при удалении');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.role_key) {
      setError('Заполните название и ключ роли');
      return;
    }

    try {
      if (editingRole) {
        await axios.put(`/api/roles/${editingRole.id}`, formData);
      } else {
        await axios.post('/api/roles', formData);
      }
      setShowModal(false);
      setEditingRole(null);
      setFormData({ name: '', role_key: '', description: '' });
      loadRoles();
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка при сохранении');
    }
  };

  const openEditModal = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      role_key: role.role_key || '',
      description: role.description || '',
    });
    setShowModal(true);
    setError('');
  };

  const openCreateModal = () => {
    setEditingRole(null);
    setFormData({ name: '', role_key: '', description: '' });
    setShowModal(true);
    setError('');
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRole(null);
    setFormData({ name: '', role_key: '', description: '' });
    setError('');
  };

  return (
    <div className="roles-content">
      <div className="roles-header">
        <h1>🔑 Управление ролями</h1>
        <button className="btn-add" onClick={openCreateModal}>➕ Добавить роль</button>
      </div>

      {loading ? (
        <p>Загрузка...</p>
      ) : (
        <div className="roles-table-wrap">
          <table className="roles-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Название</th>
                <th>Ключ</th>
                <th>Описание</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {roles.map(r => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td><strong>{r.name}</strong></td>
                  <td><code className="role-key">{r.role_key}</code></td>
                  <td>{r.description || '—'}</td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => openEditModal(r)}>✏️</button>
                    <button 
                      className="btn-delete" 
                      onClick={() => handleDelete(r.id, r.name, r.role_key)}
                      disabled={r.role_key === 'admin'}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Модальное окно */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editingRole ? 'Редактировать роль' : 'Создать роль'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Название роли</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Например: Супервайзер"
                  required
                />
              </div>
              <div className="form-group">
                <label>Ключ роли (уникальный идентификатор)</label>
                <input
                  type="text"
                  value={formData.role_key}
                  onChange={e => setFormData({ ...formData, role_key: e.target.value })}
                  placeholder="Например: supervisor"
                  required
                  disabled={editingRole?.role_key === 'admin'}
                />
                <small style={{ color: '#94a3b8', fontSize: '12px' }}>
                  Используется в коде для проверки прав доступа
                </small>
              </div>
              <div className="form-group">
                <label>Описание</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Краткое описание роли"
                />
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

export default RolesPage;