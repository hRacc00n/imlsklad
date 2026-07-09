import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAppContext } from '../../contexts/AppContext';
import { useModal } from '../../contexts/ModalContext';
import TaskCard from '../tasks/TaskCard';
import ImageGallery from '../common/ImageGallery';
import HubHeader from './HubHeader';
import HubTaskFormModal from './HubTaskFormModal';
import useTasks from '../../hooks/useTasks';
import useTaskList from '../../hooks/useTaskList';
import useTaskActions from '../../hooks/useTaskActions';
import HubTaskEditModal from './HubTaskEditModal';
import './HubPage.css';

function HubPage({ config }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sse } = useAppContext();
  const { openModal } = useModal();
  const { getActions, canEdit, canDelete } = useTaskActions();

  // Галерея
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryPhotos, setGalleryPhotos] = useState([]);

  // Модалка создания
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isPhotosUploading, setIsPhotosUploading] = useState(false);

  // Состояния для модалки редактирования
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Хуки для работы с задачами
  const { 
    tasks, 
    loading, 
    loadingMore, 
    hasNext, 
    hideCompleted,
    toggleHideCompleted,
    loadMore,
    refresh,
    searchQuery,
    setSearchQuery,
  } = useTaskList({
    apiUrl: config.apiUrl,
    perPage: config.perPage || 10,
    hideCompletedByDefault: config.hideCompletedByDefault !== false,
    storageKey: `${config.id}_hide_completed`,
  });

  const {
    createTask,
    updateTask,
    deleteTask,
    takeTask,
    completeTask,
    declineTask,
    reassignTask,
    uploadPhotos,
    loading: taskLoading,
  } = useTasks({
    apiUrl: config.apiUrl,
    onSuccess: () => refresh(),
  });

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (taskId, values, photos) => {
    try {
      await updateTask(taskId, values, photos);
      setShowEditModal(false);
      setEditingTask(null);
      await refresh();
    } catch (err) {
      alert('Ошибка при обновлении задачи');
    }
  };

  const handleSearch = (query) => {
    console.log('[HubPage] Поиск:', query);
    setSearchQuery(query);
  };

  // Обработка SSE событий
  useEffect(() => {
    const handleSSEEvent = (event) => {
      const data = event.detail;
      if (data.type === 'task_created' || 
          data.type === 'task_updated' || 
          data.type === 'task_deleted') {
        
        // Если это событие обновления фото — обновляем только фото у задачи
        if (data.action === 'photos_uploaded' && data.task_id) {
          refresh();
          return;
        }
        
        refresh();
      }
    };

    window.addEventListener('sse-message', handleSSEEvent);
    return () => window.removeEventListener('sse-message', handleSSEEvent);
  }, [refresh]);

  // Обновляем список при изменении поискового запроса
  useEffect(() => {
    refresh();
  }, [searchQuery]);

  // Обработчики
  const handleBack = () => navigate('/');

  const handlePhotoClick = (task, photoIndex) => {
    if (!task.photos || task.photos.length === 0) return;
    setGalleryPhotos(task.photos);
    setGalleryIndex(photoIndex);
    setGalleryOpen(true);
  };

  const handleCardClick = (task) => {
    openModal(task, config.modalType || config.id, {
      onTake: takeTask,
      onComplete: completeTask,
      onDecline: declineTask,
      onReassign: reassignTask,
      onDelete: deleteTask,
      onEdit: updateTask,
      onUploadPhotos: uploadPhotos, // ← добавляем
      onRefresh: refresh,
      onPhotoUploadStart: handlePhotoUploadStart,
      onPhotoUploadComplete: handlePhotoUploadComplete,
    });
  };

  const handlePhotoUploadStart = () => setIsPhotosUploading(true);
  const handlePhotoUploadComplete = () => setIsPhotosUploading(false);

  const handleCreateSubmit = async (values, photos) => {
    await createTask(values, photos);
    setShowCreateModal(false);
  };

  // Формируем поля формы из конфигурации
  const formFields = config.formFields || [];

  return (
    <div className="hub-page">
      <div className="hub-content">
        <HubHeader
          title={config.title}
          hideCompleted={hideCompleted}
          onHideCompletedChange={toggleHideCompleted}
          onCreate={() => setShowCreateModal(true)}
          onBack={handleBack}
          isConnected={sse?.isConnected}
          onSearch={handleSearch}
          searchPlaceholder={`Поиск по ${config.title.toLowerCase()}...`}
        />

        {loading && tasks.length === 0 ? (
          <p>Загрузка...</p>
        ) : tasks.length === 0 ? (
          <div className="hub-empty-state">
            {hideCompleted ? 'Все задачи выполнены 🎉' : 'Нет задач'}
          </div>
        ) : (
          <>
            <div className="hub-tasks-grid">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  currentUser={user}
                  onTake={() => takeTask(task.id)}
                  onComplete={() => completeTask(task.id)}
                  onDecline={() => declineTask(task.id)}
                  onReassign={() => reassignTask(task.id)}
                  onClick={handleCardClick}
                  onPhotoClick={(photoIndex) => handlePhotoClick(task, photoIndex)}
                  onEdit={handleEditTask} // ← открывает HubTaskEditModal
                  onDelete={() => {
                    if (confirm(`Удалить задачу от "${task.supplier || task.title}"?`)) {
                      deleteTask(task.id);
                    }
                  }}
                />
              ))}
            </div>

            {hasNext && (
              <div className="hub-load-more-wrapper">
                <button
                  className="hub-load-more-btn"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Загрузка...' : 'Показать еще'}
                </button>
                <span className="hub-load-more-info">
                  Показано {tasks.length} задач
                </span>
              </div>
            )}
          </>
        )}
      </div>

      <HubTaskFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateSubmit}
        title={`➕ ${config.title}`}
        fields={formFields}
        initialValues={{}}
        initialPhotos={[]}
        submitLabel="Создать"
        isSubmitting={taskLoading}
        isPhotosUploading={isPhotosUploading}
        onPhotoUploadStart={handlePhotoUploadStart}
        onPhotoUploadComplete={handlePhotoUploadComplete}
      />

      <HubTaskEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingTask(null);
        }}
        onSubmit={handleEditSubmit}
        task={editingTask}
        fields={formFields}
        isSubmitting={taskLoading}
        isPhotosUploading={isPhotosUploading}
        onPhotoUploadStart={handlePhotoUploadStart}
        onPhotoUploadComplete={handlePhotoUploadComplete}
      />

      <ImageGallery
        photos={galleryPhotos}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        initialIndex={galleryIndex}
      />
    </div>
  );
}

export default HubPage;