import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './ComplaintCategoriesPage.css';

function ComplaintCategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', is_active: true });
  const [error, setError] = useState('');

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/complaint-categories?include_inactive=true');
      const data = await response.json();
      setCategories(data);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка загрузки категорий:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Укажите название категории');
      return;
    }

    try {
      const url = editingCategory
        ? `/api/complaint-categories/${editingCategory.id}`
        : '/api/complaint-categories';
      
      const method = editingCategory ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          is_active: formData.is_active,
          author: user?.name,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowModal(false);
        setEditingCategory(null);
        setFormData({ name: '', is_active: true });
        loadCategories();
      } else {
        setError(data.message || 'Ошибка при сохранении');
      }
    } catch (err) {
      setError('Ошибка при сохранении');
    }
  };

  const handleDelete = async (categoryId) => {
    if (!confirm('Деактивировать эту категорию?')) return;
    
    try {
      const response = await fetch(`/api/complaint-categories/${categoryId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: user?.name }),
      });
      const data = await response.json();
      if (data.success) {
        loadCategories();
      }
    } catch (err) {
      alert('Ошибка при удалении');
    }
  };

  const handleRestore = async (categoryId) => {
    try {
      const response = await fetch(`/api/complaint-categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: true,
          author: user?.name,
        }),
      });
      const data = await response.json();
      if (data.success) {
        loadCategories();
      }
    } catch (err) {
      alert('Ошибка при восстановлении');
    }
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, is_active: category.is_active });
    setShowModal(true);
    setError('');
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({ name: '', is_active: true });
    setShowModal(true);
    setError('');
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: '', is_active: true });
    setError('');
  };

  return (
    <div className="complaint-categories-content">
      <div className="complaint-categories-header">
        <h1>📂 Категории жалоб</h1>
        <button className="btn-add" onClick={openCreateModal}>
          ➕ Добавить категорию
        </button>
      </div>

      {loading ? (
        <p>Загрузка...</p>
      ) : (
        <div className="complaint-categories-table-wrap">
          <table className="complaint-categories-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Название</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan="4" className="complaint-categories-empty">
                    Нет категорий
                  </td>
                </tr>
              ) : (
                categories.map(cat => (
                  <tr key={cat.id} className={!cat.is_active ? 'inactive-row' : ''}>
                    <td>{cat.id}</td>
                    <td>{cat.name}</td>
                    <td>
                      {cat.is_active ? (
                        <span className="status-badge active">Активна</span>
                      ) : (
                        <span className="status-badge inactive">Неактивна</span>
                      )}
                    </td>
                    <td className="actions">
                      <button className="btn-edit" onClick={() => openEditModal(cat)}>
                        ✏️
                      </button>
                      {cat.is_active ? (
                        <button className="btn-delete" onClick={() => handleDelete(cat.id)}>
                          🗑️
                        </button>
                      ) : (
                        <button className="btn-restore" onClick={() => handleRestore(cat.id)}>
                          ♻️
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Модальное окно */}
      {showModal && (
        <div className="categories-modal-overlay" onClick={closeModal}>
          <div className="categories-modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editingCategory ? 'Редактировать категорию' : 'Создать категорию'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Название</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Например: Качество товара"
                  required
                />
              </div>

              {error && <div className="error-msg">{error}</div>}

              <div className="categories-modal-actions">
                <button type="button" className="btn-cancel" onClick={closeModal}>
                  Отмена
                </button>
                <button type="submit" className="btn-save">
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ComplaintCategoriesPage;