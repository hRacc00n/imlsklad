import React, { useState, useEffect, useRef } from 'react';
import { useModal } from '../../contexts/ModalContext';
import { useAuth } from '../../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import ActionButton from '../common/ActionButton';
import ModalCloseButton from '../common/ModalCloseButton';
import ImageGallery from '../common/ImageGallery';
import PhotoUploader from '../common/PhotoUploader';
import { getAvailableActions } from '../../utils/taskActions';
import CommentList from '../comments/CommentList';
import './TaskModal.css';
import FileList from '../common/FileList';
import ItemsTable from '../common/ItemsTable';

function TaskModal({ onPhotoUploadStart, onPhotoUploadComplete }) {
  const { isOpen, task, taskType, actions, closeModal, updateTask } = useModal();
  const { user } = useAuth();
  const modalRef = useRef(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [editPhotos, setEditPhotos] = useState([]);

  // Состояния для ошибок
  const [errors, setErrors] = useState([]);
  const [errorTypes, setErrorTypes] = useState([]);
  const [showErrorForm, setShowErrorForm] = useState(false);
  const [newError, setNewError] = useState({ error_type_id: '', description: '' });
  const [isSubmittingError, setIsSubmittingError] = useState(false);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, closeModal]);

  // Загрузка ошибок при открытии задачи (только для отгрузок regions/spb)
  useEffect(() => {
    if (!isOpen || !task?.id) return;
    
    const isOrder = taskType === 'region' || taskType === 'spb' || 
                    task?.type === 'regions' || task?.type === 'spb';
    
    if (!isOrder) return;
    
    const loadErrors = async () => {
      try {
        const response = await fetch(`/api/orders/${task.id}/errors`);
        const data = await response.json();
        setErrors(data);
      } catch (err) {
        console.error('Ошибка загрузки ошибок:', err);
      }
    };
    
    const loadErrorTypes = async () => {
      try {
        const response = await fetch('/api/error-types');
        const data = await response.json();
        setErrorTypes(data);
      } catch (err) {
        console.error('Ошибка загрузки типов ошибок:', err);
      }
    };
    
    loadErrors();
    loadErrorTypes();
  }, [isOpen, task?.id, taskType]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) closeModal();
  };

  const handlePhotoClick = (index) => {
    if (!task?.photos || task.photos.length === 0) return;
    setGalleryIndex(index);
    setGalleryOpen(true);
  };

  const getStatusInfo = () => {
    switch (task?.status) {
      case 'new':
        return { label: 'Новая', class: 'status-new' };
      case 'in_progress':
        return { label: `В работе у ${task.assigned_to || '...'}`, class: 'status-in_progress' };
      case 'completed':
        return { label: '✅ Завершена', class: 'status-completed' };
      default:
        return { label: 'Неизвестно', class: '' };
    }
  };

  const statusInfo = getStatusInfo();
  const availableActions = getAvailableActions(user, task);

  const getTitle = () => {
    // Проверяем, является ли это новостью
    if (taskType === 'news' || task?.type === 'news') {
      return `📰 ${task?.title || 'Новость'}`;
    }
    
    // Проверяем, является ли задача счетом
    const isInvoice = taskType === 'invoice' || task?.type === 'invoices';
    
    if (isInvoice) {
      return `📊 Счет № ${task?.title || 'Без номера'}`;
    }
    
    // Проверяем, является ли задача отгрузкой (Регионы или СПб)
    const isOrder = taskType === 'region' || taskType === 'spb' || 
                    task?.type === 'regions' || task?.type === 'spb';
    
    if (isOrder) {
      const orderNumber = task?.order_number || task?.title || 'Без номера';
      const hubIcon = task?.type === 'regions' ? '🌍' : '🏙️';
      return `${hubIcon} Заказ № ${orderNumber}`;
    }
    
    // Проверяем, является ли задача ЭйрТрафик
    const isAirTraffic = taskType === 'air_traffic' || task?.type === 'air_traffic';
    
    if (isAirTraffic) {
      return `✈️ AWB ${task?.awb_number || task?.title || 'Без номера'}`;
    }
    
    switch (taskType) {
      case 'arrival':
        return `📦 Поступление от ${task?.supplier || 'Неизвестно'}`;
      default:
        return `📋 Задача #${task?.id}`;
    }
  };

  const updateTaskInModal = (updatedData) => {
    if (updateTask) {
      updateTask({ ...task, ...updatedData });
    }
  };

  const handleTake = async () => {
    if (!task || !actions.onTake) return;
    setIsLoading(true);
    try {
      const result = await actions.onTake(task.id);
      if (result && result.task) {
        updateTaskInModal(result.task);
        if (actions.onRefresh) actions.onRefresh();
      }
    } catch (err) {
      alert('Ошибка при взятии задачи');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!task || !actions.onComplete) return;
    setIsLoading(true);
    try {
      const result = await actions.onComplete(task.id);
      if (result && result.task) {
        updateTaskInModal(result.task);
        if (actions.onRefresh) actions.onRefresh();
      }
    } catch (err) {
      alert('Ошибка при выполнении задачи');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!task || !actions.onDecline) return;
    setIsLoading(true);
    try {
      const result = await actions.onDecline(task.id);
      if (result && result.task) {
        updateTaskInModal(result.task);
        if (actions.onRefresh) actions.onRefresh();
      }
    } catch (err) {
      alert('Ошибка при отказе от задачи');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReassign = async () => {
    if (!task || !actions.onReassign) return;
    setIsLoading(true);
    try {
      const result = await actions.onReassign(task.id);
      if (result && result.task) {
        updateTaskInModal(result.task);
        if (actions.onRefresh) actions.onRefresh();
      }
    } catch (err) {
      alert('Ошибка при переназначении задачи');
    } finally {
      setIsLoading(false);
    }
  };

  // Добавить ошибку
  const handleAddError = async () => {
    if (!newError.error_type_id) {
      alert('Выберите тип ошибки');
      return;
    }
    
    setIsSubmittingError(true);
    try {
      const response = await fetch(`/api/orders/${task.id}/errors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error_type_id: parseInt(newError.error_type_id),
          description: newError.description,
          author: user?.name,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setErrors(prev => [data.error, ...prev]);
        setNewError({ error_type_id: '', description: '' });
        setShowErrorForm(false);
      } else {
        alert(data.message || 'Ошибка при добавлении');
      }
    } catch (err) {
      console.error('Ошибка добавления:', err);
      alert('Ошибка при добавлении');
    } finally {
      setIsSubmittingError(false);
    }
  };

  // Удалить ошибку
  const handleDeleteError = async (errorId) => {
    if (!confirm('Удалить эту ошибку?')) return;
    try {
      const response = await fetch(`/api/orders/errors/${errorId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: user?.name }),
      });
      const data = await response.json();
      if (data.success) {
        setErrors(prev => prev.filter(e => e.id !== errorId));
      }
    } catch (err) {
      console.error('Ошибка удаления:', err);
      alert('Ошибка при удалении');
    }
  };

  // Режим редактирования
  const enableEditing = () => {
    setIsEditing(true);
    setEditValues({
      supplier: task.supplier || '',
      comment: task.comment || '',
    });
    // Передаём существующие фото в PhotoUploader
    setEditPhotos(task.photos || []);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditValues({});
    setEditPhotos([]);
  };

  const handleSaveEdit = async () => {
    if (!task) return;
    setIsLoading(true);
    try {
      // 1. Определяем, какие фото новые (base64) и какие старые (ссылки)
      const oldPhotos = task.photos || [];
      
      // 2. Разделяем: если строка начинается с 'data:image' — это новое фото (base64)
      const newBase64Photos = editPhotos.filter(p => p.startsWith('data:image'));
      const existingPhotoUrls = editPhotos.filter(p => !p.startsWith('data:image'));
      
      // 3. Загружаем только новые фото
      let uploadedPhotoUrls = [];
      if (newBase64Photos.length > 0 && actions.onUploadPhotos) {
        try {
          uploadedPhotoUrls = await actions.onUploadPhotos(task.id, newBase64Photos);
        } catch (photoErr) {
          console.warn('Ошибка загрузки фото:', photoErr);
          uploadedPhotoUrls = [];
        }
      }
      
      // 4. Объединяем старые и новые фото
      const allPhotos = [...oldPhotos, ...uploadedPhotoUrls];
      
      // 5. Обновляем задачу
      const result = await actions.onEdit(task.id, editValues, allPhotos);
      if (result && result.task) {
        updateTaskInModal(result.task);
        setIsEditing(false);
        if (actions.onRefresh) actions.onRefresh();
      } else {
        const updatedTask = { ...task, ...editValues, photos: allPhotos };
        updateTaskInModal(updatedTask);
        setIsEditing(false);
        if (actions.onRefresh) actions.onRefresh();
      }
    } catch (err) {
      alert('Ошибка при сохранении: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !task) return null;

  const renderTypeSpecificFields = () => {
    // Проверяем, является ли это новостью
    if (taskType === 'news' || task?.type === 'news') {
      return (
        <>
          <div className="modal-field">
            <label>📅 Дата события</label>
            <span>{task?.event_date || '—'}</span>
          </div>
          <div className="modal-field">
            <label>📅 Период показа</label>
            <span>{task?.show_from || '—'} — {task?.show_to || '—'}</span>
          </div>
          <div className="modal-field">
            <label>✍️ Автор</label>
            <span>{task?.author || '—'}</span>
          </div>
          <div className="modal-field">
            <label>📄 Текст новости</label>
            <div className="modal-comment-box">
              <ReactMarkdown>{task?.content || '—'}</ReactMarkdown>
            </div>
          </div>
        </>
      );
    }

    // Проверяем, является ли задача отгрузкой (Регионы или СПб)
    const isOrder = taskType === 'region' || taskType === 'spb' || 
                    task?.type === 'regions' || task?.type === 'spb';
    
    if (isOrder) {
      return (
        <>
          <div className="modal-field">
            <label>Заказ</label>
            <span>{task?.order_number || task?.title || '—'}</span>
          </div>
          <div className="modal-field">
            <label>Подразделение</label>
            <span>{task?.subdivision || '—'}</span>
          </div>
          <div className="modal-field">
            <label>Контрагент</label>
            <span>{task?.contractor || 'Неизвестно'}</span>
          </div>
          {task?.initiator && (
            <div className="modal-field">
              <label>Инициатор</label>
              <span>{task.initiator}</span>
            </div>
          )}
          <div className="modal-field">
            <label>Комментарий</label>
            <div className="modal-comment-box">{task?.comment || '—'}</div>
          </div>
          <div className="modal-field">
            <label>Товары</label>
              <ItemsTable items={task?.items || []} />
            </div>

            {/* ===== БЛОК ОШИБОК ===== */}
            {user?.role === 'admin' && (
              <div className="modal-field modal-errors-section">
                <div className="modal-errors-header">
                  <label>⚠️ Ошибки ({errors.length})</label>
                  {!showErrorForm && (
                    <button
                      type="button"
                      className="modal-error-add-btn"
                      onClick={() => setShowErrorForm(true)}
                    >
                      + Отметить ошибку
                    </button>
                  )}
                </div>

                {showErrorForm && (
                  <div className="modal-error-form">
                    <select
                      value={newError.error_type_id}
                      onChange={(e) => setNewError({ ...newError, error_type_id: e.target.value })}
                      className="modal-error-select"
                    >
                      <option value="">Выберите тип ошибки</option>
                      {errorTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                    <textarea
                      value={newError.description}
                      onChange={(e) => setNewError({ ...newError, description: e.target.value })}
                      placeholder="Описание ошибки (необязательно)"
                      className="modal-error-textarea"
                      rows={2}
                    />
                    <div className="modal-error-form-actions">
                      <button
                        type="button"
                        className="modal-error-cancel"
                        onClick={() => {
                          setShowErrorForm(false);
                          setNewError({ error_type_id: '', description: '' });
                        }}
                        disabled={isSubmittingError}
                      >
                        Отмена
                      </button>
                      <button
                        type="button"
                        className="modal-error-submit"
                        onClick={handleAddError}
                        disabled={isSubmittingError}
                      >
                        {isSubmittingError ? 'Сохранение...' : 'Сохранить'}
                      </button>
                    </div>
                  </div>
                )}

                {errors.length > 0 && (
                  <div className="modal-errors-list">
                    {errors.map(error => (
                      <div key={error.id} className="modal-error-item">
                        <div className="modal-error-item-header">
                          <span className="modal-error-type">{error.error_type_name}</span>
                          <button
                            type="button"
                            className="modal-error-delete"
                            onClick={() => handleDeleteError(error.id)}
                            title="Удалить"
                          >
                            🗑️
                          </button>
                        </div>
                        {error.description && (
                          <div className="modal-error-description">{error.description}</div>
                        )}
                        <div className="modal-error-meta">
                          👤 {error.author} · 🕐 {error.created_at}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {errors.length === 0 && !showErrorForm && (
                  <div className="modal-errors-empty">Нет отмеченных ошибок</div>
                )}
              </div>
            )}
          </>
        );
      }

    // Проверяем, является ли задача ЭйрТрафик
    const isAirTraffic = taskType === 'air_traffic' || task?.type === 'air_traffic';
    
    if (isAirTraffic) {
      return (
        <>
          <div className="modal-field">
            <label>AWB №</label>
            <span>{task?.awb_number || task?.title || '—'}</span>
          </div>
          <div className="modal-field">
            <label>Город</label>
            <span>{task?.city || 'Не указан'}</span>
          </div>
          {task?.image && (
            <div className="modal-field">
              <label>Изображение</label>
              <div className="modal-airtraffic-image">
                <img 
                  src={task.image} 
                  alt="AWB" 
                  className="modal-airtraffic-img"
                  onClick={() => handlePhotoClick(0)}
                />
              </div>
            </div>
          )}
          {task?.file && task.file.name && (
            <div className="modal-field">
              <label>Файл</label>
              <FileList
                files={[task.file]}
                onView={(file) => {
                  const url = file.path.startsWith('/') ? file.path : `/${file.path}`;
                  window.open(url, '_blank');
                }}
              />
            </div>
          )}
        </>
      );
    }
    
    // Проверяем, является ли задача счетом
    const isInvoice = taskType === 'invoice' || task?.type === 'invoices';
    
    if (isInvoice) {
      return (
        <>
          <div className="modal-field">
            <label>Счет №</label>
            <span>{task.title || '—'}</span>
          </div>
          <div className="modal-field">
            <label>Контрагент</label>
            <span>{task.supplier || '—'}</span>
          </div>
          <div className="modal-field">
            <label>Город</label>
            <span>{task.city || '—'}</span>
          </div>
          <div className="modal-field">
            <label>Сумма</label>
            <span>{task.amount || '—'}</span>
          </div>
          <div className="modal-field">
            <label>Инициатор</label>
            <span>{task.initiator || '—'}</span>
          </div>
          <div className="modal-field">
            <label>Комментарий</label>
            <div className="modal-comment-box">{task.comment || '—'}</div>
          </div>
          <div className="modal-field">
            <label>Вложения</label>
            <FileList
              files={task.files || []}
              onView={(file) => {
                const url = file.path.startsWith('/') ? file.path : `/${file.path}`;
                window.open(url, '_blank');
              }}
            />
          </div>
        </>
      );
    }

    // Обычные задачи (arrival и др.)
    switch (taskType) {
      case 'arrival':
        return (
          <>
            <div className="modal-field">
              <label>Кто привез</label>
              {isEditing ? (
                <input
                  type="text"
                  className="modal-edit-input"
                  value={editValues.supplier || ''}
                  onChange={(e) => setEditValues({ ...editValues, supplier: e.target.value })}
                />
              ) : (
                <span>{task.supplier || '—'}</span>
              )}
            </div>
            <div className="modal-field">
              <label>Комментарий</label>
              {isEditing ? (
                <textarea
                  className="modal-edit-textarea"
                  value={editValues.comment || ''}
                  onChange={(e) => setEditValues({ ...editValues, comment: e.target.value })}
                  rows={4}
                />
              ) : (
                <div className="modal-comment-box">{task.comment || '—'}</div>
              )}
            </div>
            <div className="modal-field">
              <label>Фотографии</label>
              {isEditing ? (
                <PhotoUploader
                  onPhotosChange={setEditPhotos}
                  existingPhotos={editPhotos}
                  onUploadStart={actions.onPhotoUploadStart}
                  onUploadComplete={actions.onPhotoUploadComplete}
                />
              ) : (
                task.photos && task.photos.length > 0 && (
                  <div className="modal-photos">
                    {task.photos.map((photo, idx) => (
                      <img
                        key={idx}
                        src={photo}
                        alt={`Фото ${idx + 1}`}
                        className="modal-photo"
                        onClick={() => handlePhotoClick(idx)}
                      />
                    ))}
                  </div>
                )
              )}
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="task-modal-overlay" onClick={handleOverlayClick}>
      <div className="task-modal-content" ref={modalRef}>
        <div className={`modal-status-bar ${statusInfo.class}`}>
          {statusInfo.label}
        </div>

        <div className="modal-header">
          <h2>{getTitle()}</h2>
          <ModalCloseButton onClick={closeModal} />
        </div>

        <div className="modal-body">
          <div className="modal-meta">
            {task.type !== 'invoices' && task.author && (
              <span className="modal-author">✍️ {task.author}</span>
            )}
            <span className="modal-date">🕐 {task.created_at || '—'}</span>
          </div>

          {renderTypeSpecificFields()}

          <div className="modal-comments">
            <CommentList taskId={task.id} currentUser={user} />
          </div>
        </div>

        <div className="modal-footer">
          {isEditing ? (
            // Режим редактирования
            <>
              <ActionButton variant="outline" size="large" onClick={cancelEditing}>
                Отмена
              </ActionButton>
              <ActionButton variant="success" size="large" onClick={handleSaveEdit} disabled={isLoading}>
                💾 Сохранить
              </ActionButton>
            </>
          ) : (
            // Режим просмотра
            <>
              {availableActions.canTake && (
                <ActionButton variant="primary" size="large" onClick={handleTake} disabled={isLoading}>
                  Взять в работу
                </ActionButton>
              )}
              {availableActions.canComplete && (
                <ActionButton variant="success" size="large" onClick={handleComplete} disabled={isLoading}>
                  ✅ Выполнить
                </ActionButton>
              )}
              {availableActions.canDecline && (
                <ActionButton variant="danger" size="large" onClick={handleDecline} disabled={isLoading}>
                  ❌ Отказаться
                </ActionButton>
              )}
              {availableActions.canReassign && (
                <ActionButton variant="warning" size="large" onClick={handleReassign} disabled={isLoading}>
                  📥 Забрать задачу
                </ActionButton>
              )}
              {task.status === 'completed' && (
                <span className="status-completed-modal">✅ Задача завершена</span>
              )}

              {/* Кнопка редактирования */}
              {user?.role === 'admin' || user?.name === task?.author ? (
                <ActionButton variant="outline" size="large" onClick={enableEditing}>
                  ✏️ Редактировать
                </ActionButton>
              ) : null}

              <ActionButton variant="outline" size="large" onClick={closeModal}>
                Закрыть
              </ActionButton>
            </>
          )}
        </div>
      </div>

      <ImageGallery
        photos={task.photos || []}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        initialIndex={galleryIndex}
      />
    </div>
  );
}

export default TaskModal;