import { useState, useEffect } from 'react';
import { useModal } from '../../contexts/ModalContext';
import { useAuth } from '../../contexts/AuthContext';
import TaskItemList from './TaskItemList';
import FileList from '../common/FileList';
import './PersonalTaskModal.css';

function PersonalTaskModal() {
  const { isOpen, task, closeModal } = useModal();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Загрузка подпунктов и комментариев при открытии
  useEffect(() => {
    if (isOpen && task) {
      loadTaskData();
    }
  }, [isOpen, task]);

  const loadTaskData = async () => {
    if (!task?.id) return;
    try {
      // Загружаем подпункты
      const response = await fetch(`/api/personal-tasks/${task.id}`);
      const data = await response.json();
      setItems(data.items || []);
      
      // Загружаем комментарии
      const commentsResponse = await fetch(`/api/personal-tasks/${task.id}/comments`);
      const commentsData = await commentsResponse.json();
      setComments(commentsData || []);
    } catch (err) {
      console.error('Ошибка загрузки данных задачи:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCommentText('');
      setEditingCommentId(null);
      setEditingCommentText('');
    }
  }, [isOpen]);

  if (!isOpen || !task) return null;

  const isAuthor = user?.name === task.author;
  const isAssigned = task.assigned_to?.includes(user?.name);
  const isAdmin = user?.role === 'admin';
  const isCompleted = task.status === 'completed';
  const hasItems = items.length > 0;
  const allItemsCompleted = hasItems && items.every(item => item.is_completed);
  const isActuallyCompleted = isCompleted || (hasItems && allItemsCompleted);

  const canToggleItems = isAuthor || isAdmin || isAssigned;
  const canComplete = !isActuallyCompleted && !hasItems && (isAuthor || isAssigned);
  const canDelete = isAuthor || isAdmin;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return dateStr;
  };

  const handleToggleItem = async (itemId, isCompleted) => {
    try {
      const response = await fetch(`/api/personal-tasks/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          is_completed: isCompleted,
          user_name: user?.name || ''  // <-- ДОБАВИТЬ
        }),
      });
      const data = await response.json();
      if (data.success) {
        setItems(data.task.items || []);
        if (data.task.status === 'completed') {
          task.status = 'completed';
        }
      }
    } catch (err) {
      console.error('Ошибка переключения подпункта:', err);
      alert('Ошибка при обновлении подпункта');
    }
  };

  const handleCompleteTask = async () => {
    try {
      const response = await fetch(`/api/personal-tasks/${task.id}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_name: user?.name }),
      });
      const data = await response.json();
      if (data.success) {
        task.status = 'completed';
        setItems(data.task.items || []);
      } else {
        alert(data.message || 'Ошибка при выполнении задачи');
      }
    } catch (err) {
      console.error('Ошибка выполнения задачи:', err);
      alert('Ошибка при выполнении задачи');
    }
  };

  const handleDeleteTask = async () => {
    if (!confirm('Удалить задачу?')) return;
    try {
      const response = await fetch(`/api/personal-tasks/${task.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: user?.name }),
      });
      const data = await response.json();
      if (data.success) {
        closeModal();
        // Отправляем SSE событие для обновления списка
        window.dispatchEvent(new CustomEvent('sse-message', {
          detail: { type: 'personal_task_deleted', task_id: task.id }
        }));
      } else {
        alert(data.message || 'Ошибка при удалении задачи');
      }
    } catch (err) {
      console.error('Ошибка удаления задачи:', err);
      alert('Ошибка при удалении задачи');
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    setIsSubmittingComment(true);
    try {
      const response = await fetch(`/api/personal-tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: user?.name || 'Неизвестно',
          text: commentText.trim(),
        }),
      });
      const result = await response.json();
      if (result.success) {
        setComments(prev => [...prev, result.comment]);
        setCommentText('');
      } else {
        alert(result.message || 'Ошибка при добавлении комментария');
      }
    } catch (err) {
      console.error('Ошибка добавления комментария:', err);
      alert('Ошибка при добавлении комментария');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleEditComment = async (commentId, newText) => {
    try {
      const response = await fetch(`/api/personal-tasks/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: user?.name,
          text: newText,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setComments(prev => prev.map(c => c.id === commentId ? result.comment : c));
        setEditingCommentId(null);
        setEditingCommentText('');
      } else {
        alert(result.message || 'Ошибка при редактировании комментария');
      }
    } catch (err) {
      console.error('Ошибка редактирования комментария:', err);
      alert('Ошибка при редактировании комментария');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Удалить комментарий?')) return;
    try {
      const response = await fetch(`/api/personal-tasks/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: user?.name }),
      });
      const result = await response.json();
      if (result.success) {
        setComments(prev => prev.filter(c => c.id !== commentId));
      } else {
        alert(result.message || 'Ошибка при удалении комментария');
      }
    } catch (err) {
      console.error('Ошибка удаления комментария:', err);
      alert('Ошибка при удалении комментария');
    }
  };

  const handleViewFile = (file) => {
    if (file.path) {
      window.open(file.path, '_blank');
    }
  };

  return (
    <div className="personal-task-modal-overlay" onClick={closeModal}>
      <div className="personal-task-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="personal-task-modal-close" onClick={closeModal}>✕</button>

        <div className={`personal-task-modal-status ${isActuallyCompleted ? 'status-completed' : 'status-active'}`}>
          {isActuallyCompleted ? '✅ Выполнена' : '🔄 В работе'}
        </div>

        <div className="personal-task-modal-body">
          <div className="personal-task-modal-header">
            <h2>{task.title}</h2>
            <div className="personal-task-modal-meta">
              <span>👤 {task.author}</span>
              <span>🕐 {formatDate(task.created_at)}</span>
            </div>
          </div>

          {task.assigned_to && task.assigned_to.length > 0 && (
            <div className="personal-task-modal-assigned">
              <strong>Исполнители:</strong> {task.assigned_to.join(', ')}
            </div>
          )}

          {task.description && (
            <div className="personal-task-modal-description">
              <p>{task.description}</p>
            </div>
          )}

          {/* Подпункты */}
          <div className="personal-task-modal-items">
            <TaskItemList
              items={items}
              onToggle={canToggleItems ? handleToggleItem : null}
              isAuthor={isAuthor}
              isAssigned={isAssigned}
              currentUser={user}
            />
          </div>

          {/* Файлы */}
          {task.files && task.files.length > 0 && (
            <div className="personal-task-modal-files">
              <h4>📎 Файлы</h4>
              <FileList
                files={task.files}
                onView={handleViewFile}
              />
            </div>
          )}

          {/* Кнопки действий */}
          <div className="personal-task-modal-actions">
            {canComplete && (
              <button
                className="personal-task-modal-complete-btn"
                onClick={handleCompleteTask}
              >
                ✅ Выполнить задачу
              </button>
            )}
            {canDelete && (
              <button
                className="personal-task-modal-delete-btn"
                onClick={handleDeleteTask}
              >
                🗑️ Удалить
              </button>
            )}
          </div>

          {/* Комментарии */}
          <div className="personal-task-modal-comments">
            <h4>💬 Комментарии ({comments.length})</h4>

            {comments.length === 0 ? (
              <p className="personal-task-modal-no-comments">Нет комментариев</p>
            ) : (
              <div className="personal-task-modal-comments-list">
                {comments.map((comment) => (
                  <div key={comment.id} className="personal-task-modal-comment">
                    <div className="personal-task-modal-comment-header">
                      <span className="personal-task-modal-comment-author">
                        {comment.author}
                      </span>
                      <span className="personal-task-modal-comment-date">
                        {formatDate(comment.created_at)}
                        {comment.is_edited && ' (ред.)'}
                      </span>
                    </div>

                    {editingCommentId === comment.id ? (
                      <div className="personal-task-modal-comment-edit">
                        <textarea
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                          rows={2}
                        />
                        <div className="personal-task-modal-comment-edit-actions">
                          <button onClick={() => setEditingCommentId(null)}>Отмена</button>
                          <button
                            onClick={() => handleEditComment(comment.id, editingCommentText)}
                            disabled={!editingCommentText.trim()}
                          >
                            Сохранить
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="personal-task-modal-comment-text">
                          {comment.text}
                        </div>
                        {user?.name === comment.author && (
                          <div className="personal-task-modal-comment-actions">
                            <button
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditingCommentText(comment.text);
                              }}
                              className="personal-task-modal-comment-edit-btn"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="personal-task-modal-comment-delete-btn"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="personal-task-modal-comment-input">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Написать комментарий..."
                rows={2}
                disabled={isSubmittingComment}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendComment();
                  }
                }}
              />
              <button
                onClick={handleSendComment}
                disabled={!commentText.trim() || isSubmittingComment}
              >
                {isSubmittingComment ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PersonalTaskModal;