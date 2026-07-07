import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModal } from '../contexts/ModalContext';
import TaskCard from '../components/tasks/TaskCard';
import ActionButton from '../components/common/ActionButton';
import { useAuth } from '../contexts/AuthContext';
import PhotoUploader from '../components/common/PhotoUploader';
import ImageGallery from '../components/common/ImageGallery';
import './ArrivalsHub.css';

function ArrivalsHub() {
  const navigate = useNavigate();
  const { openModal } = useModal();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTask, setNewTask] = useState({ supplier: '', comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const [newPhotos, setNewPhotos] = useState([]);

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryPhotos, setGalleryPhotos] = useState([]);

  // Состояние для редактирования
  const [editingTask, setEditingTask] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ supplier: '', comment: '' });
  const [editPhotos, setEditPhotos] = useState([]);
  const [editing, setEditing] = useState(false);

  const handlePhotoClick = (task, photoIndex) => {
    if (!task.photos || task.photos.length === 0) return;
    setGalleryPhotos(task.photos);
    setGalleryIndex(photoIndex);
    setGalleryOpen(true);
  };

  // Загрузка задач
  const loadTasks = async () => {
    try {
      const response = await fetch('/api/tasks/arrivals');
      const data = await response.json();
      setTasks(data);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка загрузки задач:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleBack = () => {
    navigate('/');
  };

  const handleTake = async (taskId) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/take`, {
        method: 'PUT',  // Заменили POST на PUT
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_name: user?.name || 'Неизвестно'  // Исправили поле
        }),
      });
      if (response.ok) {
        await loadTasks();
      } else {
        const data = await response.json();
        alert(data.message || 'Ошибка при взятии задачи');
      }
    } catch (err) {
      console.error('Ошибка при взятии задачи:', err);
      alert('Ошибка при взятии задачи');
    }
  };

  const handleComplete = async (taskId) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'PUT',  // Заменили POST на PUT
      });
      if (response.ok) {
        await loadTasks();
      } else {
        const data = await response.json();
        alert(data.message || 'Ошибка при выполнении задачи');
      }
    } catch (err) {
      console.error('Ошибка при выполнении задачи:', err);
      alert('Ошибка при выполнении задачи');
    }
  };

  const handleDecline = async (taskId) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/decline`, {
        method: 'PUT',  // Заменили POST на PUT
      });
      if (response.ok) {
        await loadTasks();
      } else {
        const data = await response.json();
        alert(data.message || 'Ошибка при отказе от задачи');
      }
    } catch (err) {
      console.error('Ошибка при отказе от задачи:', err);
      alert('Ошибка при отказе от задачи');
    }
  };

  const handleCardClick = (task) => {
    openModal(task, 'arrival');
  };

  // ===== Обработчики редактирования =====
  const handleEditTask = (task) => {
    setEditingTask(task);
    setEditForm({
      supplier: task.supplier || '',
      comment: task.comment || '',
    });
    setEditPhotos(task.photos || []);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.supplier) {
      alert('Заполните поле "Кто привез"');
      return;
    }

    setEditing(true);
    try {
      const response = await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier: editForm.supplier,
          comment: editForm.comment || '',
          photos: editPhotos,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setShowEditModal(false);
        setEditingTask(null);
        setEditForm({ supplier: '', comment: '' });
        setEditPhotos([]);
        await loadTasks();
      } else {
        alert(data.message || 'Ошибка при обновлении задачи');
      }
    } catch (err) {
      alert('Ошибка при обновлении задачи');
    } finally {
      setEditing(false);
    }
  };

  // ===== Обработчик удаления =====
  const handleDeleteTask = async (task) => {
    if (!window.confirm(`Вы уверены, что хотите удалить задачу от "${task.supplier}"?\n${task.photos?.length > 0 ? `\n⚠️ Будет удалено ${task.photos.length} фото` : ''}`)) {
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        // Показываем сколько фото удалено
        if (data.deleted_photos > 0) {
          console.log(`Удалено ${data.deleted_photos} фото`);
        }
        await loadTasks();
      } else {
        alert(data.message || 'Ошибка при удалении задачи');
      }
    } catch (err) {
      console.error('Ошибка удаления:', err);
      alert(`Ошибка при удалении задачи: ${err.message}`);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newTask.supplier) {
      alert('Заполните поле "Кто привез"');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/tasks/arrivals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier: newTask.supplier,
          comment: newTask.comment || '',
          author: user?.name || 'Неизвестно',
        }),
      });
      const data = await response.json();
      
      if (data.success) {
        if (newPhotos.length > 0) {
          try {
            const photoResponse = await fetch(`/api/tasks/${data.task.id}/photos`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                photos: newPhotos,
              }),
            });
            const photoData = await photoResponse.json();
            if (!photoData.success) {
              console.warn('Фото не загружены:', photoData.message);
            }
          } catch (photoErr) {
            console.error('Ошибка загрузки фото:', photoErr);
          }
        }

        setShowCreateModal(false);
        setNewTask({ supplier: '', comment: '' });
        setNewPhotos([]);
        loadTasks();
      } else {
        alert(data.message || 'Ошибка при создании задачи');
      }
    } catch (err) {
      alert('Ошибка при создании задачи');
    } finally {
      setSubmitting(false);
    }
  };

  // ===== Обработчик переназначения =====
  const handleReassign = async (task) => {
    if (!task || !user) return;
    
    try {
      const response = await fetch(`/api/tasks/${task.id}/reassign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_name: user?.name || 'Неизвестно'
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        await loadTasks();
      } else {
        alert(data.message || 'Ошибка при переназначении задачи');
      }
    } catch (err) {
      console.error('Ошибка при переназначении:', err);
      alert('Ошибка при переназначении задачи');
    }
  };

  return (
    <div className="arrivals-page">
      <div className="arrivals-header">
        <h1>📦 Поступление</h1>
        <div className="arrivals-actions">
          <button className="btn-create" onClick={() => setShowCreateModal(true)}>
            ➕ Создать поступление
          </button>
          <button className="back-btn" onClick={handleBack}>
            ← Назад
          </button>
        </div>
      </div>

      <div className="arrivals-content">
        {loading ? (
          <p>Загрузка...</p>
        ) : tasks.length === 0 ? (
          <div className="empty-state">Нет задач в этом хабе</div>
        ) : (
          <div className="tasks-grid">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                currentUser={user}
                onTake={handleTake}
                onComplete={handleComplete}
                onDecline={handleDecline}
                onReassign={handleReassign}
                onClick={handleCardClick}
                onPhotoClick={(photoIndex) => handlePhotoClick(task, photoIndex)}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
              />
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно создания */}
      {showCreateModal && (
        <div className="modal-overlay create-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content create-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="create-modal-header">
              <h2>➕ Создать поступление</h2>
              <button className="create-modal-close" onClick={() => setShowCreateModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="create-modal-body">
              <div className="create-form-group">
                <label>Кто привез *</label>
                <input
                  type="text"
                  value={newTask.supplier}
                  onChange={(e) => setNewTask({ ...newTask, supplier: e.target.value })}
                  placeholder="Введите поставщика или водителя"
                  required
                />
              </div>
              <div className="create-form-group">
                <label>Комментарий</label>
                <textarea
                  value={newTask.comment}
                  onChange={(e) => setNewTask({ ...newTask, comment: e.target.value })}
                  placeholder="Введите комментарий к задаче"
                  rows={4}
                />
              </div>
              <div className="create-form-group">
                <label>Фотографии</label>
                <PhotoUploader
                  onPhotosChange={setNewPhotos}
                  existingPhotos={[]}
                />
              </div>
              <div className="create-modal-footer">
                <button
                  type="button"
                  className="create-btn-cancel"
                  onClick={() => setShowCreateModal(false)}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="create-btn-submit"
                  disabled={submitting}
                >
                  {submitting ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования */}
      {showEditModal && editingTask && (
        <div className="modal-overlay create-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content create-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="create-modal-header">
              <h2>✏️ Редактировать поступление</h2>
              <button className="create-modal-close" onClick={() => setShowEditModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="create-modal-body">
              <div className="create-form-group">
                <label>Кто привез *</label>
                <input
                  type="text"
                  value={editForm.supplier}
                  onChange={(e) => setEditForm({ ...editForm, supplier: e.target.value })}
                  placeholder="Введите поставщика или водителя"
                  required
                />
              </div>
              <div className="create-form-group">
                <label>Комментарий</label>
                <textarea
                  value={editForm.comment}
                  onChange={(e) => setEditForm({ ...editForm, comment: e.target.value })}
                  placeholder="Введите комментарий к задаче"
                  rows={4}
                />
              </div>
              <div className="create-form-group">
                <label>Фотографии</label>
                <PhotoUploader
                  onPhotosChange={setEditPhotos}
                  existingPhotos={editPhotos}
                />
              </div>
              <div className="create-modal-footer">
                <button
                  type="button"
                  className="create-btn-cancel"
                  onClick={() => setShowEditModal(false)}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="create-btn-submit"
                  disabled={editing}
                >
                  {editing ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ImageGallery
        photos={galleryPhotos}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        initialIndex={galleryIndex}
      />
    </div>
  );
}

export default ArrivalsHub;