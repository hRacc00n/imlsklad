import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModal } from '../contexts/ModalContext';
import TaskCard from '../components/tasks/TaskCard';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
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
  const { sse } = useAppContext(); // ← Добавляем SSE контекст
  const [newPhotos, setNewPhotos] = useState([]);

  const [hideCompleted, setHideCompleted] = useState(() => {
    const saved = localStorage.getItem('arrivals_hide_completed');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryPhotos, setGalleryPhotos] = useState([]);

  const [editingTask, setEditingTask] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ supplier: '', comment: '' });
  const [editPhotos, setEditPhotos] = useState([]);
  const [editing, setEditing] = useState(false);

  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [isPhotosUploading, setIsPhotosUploading] = useState(false);

  // Реф для отслеживания обновлений
  const isUpdatingRef = useRef(false);

  const handlePhotoClick = (task, photoIndex) => {
    if (!task.photos || task.photos.length === 0) return;
    setGalleryPhotos(task.photos);
    setGalleryIndex(photoIndex);
    setGalleryOpen(true);
  };

  // ===== Функции для отслеживания загрузки фото =====
  const handlePhotoUploadStart = () => {
    setIsPhotosUploading(true);
  };

  const handlePhotoUploadComplete = () => {
    setIsPhotosUploading(false);
  };

  // ===== Загрузка задач =====
  const loadTasks = useCallback(async (pageNum = 1, append = false) => {
    // Предотвращаем множественные обновления
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;

    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const url = `/api/tasks/arrivals?page=${pageNum}&per_page=${perPage}&hide_completed=${hideCompleted}`;
      console.log('[SSE] Загрузка задач:', url);
      
      const response = await fetch(url);
      const data = await response.json();

      if (append) {
        setTasks(prev => [...prev, ...data.data]);
      } else {
        setTasks(data.data);
      }

      setTotalPages(data.pagination.total_pages);
      setHasNext(data.pagination.has_next);

    } catch (err) {
      console.error('Ошибка загрузки задач:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isUpdatingRef.current = false;
    }
  }, [perPage, hideCompleted]);

  // ===== Обработка SSE событий =====
  useEffect(() => {
    const handleSSEEvent = (event) => {
      const data = event.detail;
      console.log('[ArrivalsHub] SSE event received:', data);
      
      // Обновляем задачи в зависимости от типа события
      if (data.type === 'task_created' || 
          data.type === 'task_updated' || 
          data.type === 'task_deleted') {
        console.log('[ArrivalsHub] Reloading tasks...');
        // Перезагружаем первую страницу
        setPage(1);
        loadTasks(1, false);
      }
    };

    // Подписываемся на событие
    window.addEventListener('sse-message', handleSSEEvent);
    console.log('[ArrivalsHub] Subscribed to sse-message events');

    return () => {
      window.removeEventListener('sse-message', handleSSEEvent);
      console.log('[ArrivalsHub] Unsubscribed from sse-message events');
    };
  }, [loadTasks]); // ← Убрали зависимости от sse и page

  // Загружаем первую страницу при монтировании или изменении фильтра
  useEffect(() => {
    setPage(1);
    loadTasks(1, false);
  }, [hideCompleted, loadTasks]);

  // ===== Обработчик переключения чекбокса =====
  const handleHideCompletedChange = (e) => {
    const value = e.target.checked;
    setHideCompleted(value);
    localStorage.setItem('arrivals_hide_completed', JSON.stringify(value));
  };

  // ===== Обработчик загрузки следующей страницы =====
  const handleLoadMore = () => {
    if (!loadingMore && hasNext) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadTasks(nextPage, true);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  // ===== Обработчики действий с задачами =====
  const handleTake = async (taskId) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/take`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_name: user?.name || 'Неизвестно'
        }),
      });
      if (response.ok) {
        // SSE обновит задачи автоматически
        // loadTasks(page, false); // Не нужно, SSE сделает это
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
        method: 'PUT',
      });
      if (response.ok) {
        // SSE обновит задачи автоматически
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
        method: 'PUT',
      });
      if (response.ok) {
        // SSE обновит задачи автоматически
      } else {
        const data = await response.json();
        alert(data.message || 'Ошибка при отказе от задачи');
      }
    } catch (err) {
      console.error('Ошибка при отказе от задачи:', err);
      alert('Ошибка при отказе от задачи');
    }
  };

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
      
      if (response.ok) {
        // SSE обновит задачи автоматически
      } else {
        const data = await response.json();
        alert(data.message || 'Ошибка при переназначении задачи');
      }
    } catch (err) {
      console.error('Ошибка при переназначении:', err);
      alert('Ошибка при переназначении задачи');
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
        // SSE обновит задачи автоматически
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
        if (data.deleted_photos > 0) {
          console.log(`Удалено ${data.deleted_photos} фото`);
        }
        // SSE обновит задачи автоматически
      } else {
        alert(data.message || 'Ошибка при удалении задачи');
      }
    } catch (err) {
      console.error('Ошибка удаления:', err);
      alert(`Ошибка при удалении задачи: ${err.message}`);
    }
  };

  // ===== Обработчик создания задачи =====
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    
    // Проверяем заполненность поля "Кто привез"
    if (!newTask.supplier) {
      alert('Заполните поле "Кто привез"');
      return;
    }
    
    // ===== НОВОЕ: Проверяем наличие хотя бы одного фото =====
    if (newPhotos.length === 0) {
      alert('Добавьте хотя бы одну фотографию');
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
        // Загружаем фото
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
            alert('Задача создана, но фото не загружены');
          }
        } catch (photoErr) {
          console.error('Ошибка загрузки фото:', photoErr);
          alert('Задача создана, но фото не загружены');
        }

        setShowCreateModal(false);
        setNewTask({ supplier: '', comment: '' });
        setNewPhotos([]);
        // SSE обновит задачи автоматически
      } else {
        alert(data.message || 'Ошибка при создании задачи');
      }
    } catch (err) {
      alert('Ошибка при создании задачи');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="arrivals-page">
      <div className="arrivals-header">
        <h1>📦 Поступление</h1>
        <div className="arrivals-actions">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={handleHideCompletedChange}
            />
            <span>Скрыть выполненные</span>
            {sse?.isConnected && (
              <span className="sse-status">🟢</span>
            )}
          </label>
          <button className="btn-create" onClick={() => setShowCreateModal(true)}>
            ➕ Создать поступление
          </button>
          <button className="back-btn" onClick={handleBack}>
            ← Назад
          </button>
        </div>
      </div>

      <div className="arrivals-content">
        {loading && tasks.length === 0 ? (
          <p>Загрузка...</p>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            {hideCompleted ? 'Все задачи выполнены 🎉' : 'Нет задач в этом хабе'}
          </div>
        ) : (
          <>
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
            
            {hasNext && (
              <div className="load-more-wrapper">
                <button 
                  className="load-more-btn"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Загрузка...' : 'Показать еще'}
                </button>
                <span className="load-more-info">
                  Показано {tasks.length} задач
                </span>
              </div>
            )}
          </>
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
                <label>
                  Фотографии <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <PhotoUploader
                  onPhotosChange={setNewPhotos}
                  existingPhotos={[]}
                  onUploadStart={handlePhotoUploadStart}
                  onUploadComplete={handlePhotoUploadComplete}
                />
                {newPhotos.length === 0 && !isPhotosUploading && (
                  <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                    ⚠️ Добавьте хотя бы одну фотографию
                  </div>
                )}
                {isPhotosUploading && (
                  <div style={{ color: '#f59e0b', fontSize: '12px', marginTop: '4px' }}>
                    ⏳ Загрузка фотографий...
                  </div>
                )}
                {newPhotos.length > 0 && !isPhotosUploading && (
                  <div style={{ color: '#22c55e', fontSize: '12px', marginTop: '4px' }}>
                    ✅ Загружено {newPhotos.length} фото
                  </div>
                )}
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
                  disabled={submitting || isPhotosUploading || newPhotos.length === 0}
                >
                  {submitting ? 'Создание...' : isPhotosUploading ? 'Загрузка фото...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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