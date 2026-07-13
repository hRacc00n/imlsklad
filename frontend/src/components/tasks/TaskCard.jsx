import ActionButton from '../common/ActionButton';
import IconButton from '../common/IconButton';
import PhotoViewer from '../common/PhotoViewer';
import { canEditTask, canDeleteTask } from '../../utils/taskPermissions';
import { getAvailableActions } from '../../utils/taskActions';
import './TaskCard.css';

function TaskCard({ 
  task, 
  onTake, 
  onComplete, 
  onDecline, 
  onReassign,
  onClick, 
  onPhotoClick,
  onEdit,
  onDelete,
  currentUser,
  type, 
}) {
  const {
    id,
    author,
    created_at,
    supplier,
    comment,
    photos = [],
    assigned_to,
    status,
    comments_count = 0,
  } = task;

  const getStatusInfo = () => {
    switch (status) {
      case 'new':
        return { label: 'Новая', class: 'status-new' };
      case 'in_progress':
        return { label: `В работе у ${assigned_to || '...'}`, class: 'status-in_progress' };
      case 'completed':
        return { label: '✅ Завершена', class: 'status-completed' };
      default:
        return { label: 'Неизвестно', class: '' };
    }
  };

  const statusInfo = getStatusInfo();
  
  const canEdit = canEditTask(currentUser, task);
  const canDelete = canDeleteTask(currentUser, task);
  const actions = getAvailableActions(currentUser, task);

  const handleClick = (e) => {
    if (e.target.closest('.task-actions')) return;
    if (e.target.closest('.task-admin-actions')) return;
    if (onClick) onClick(task);
  };

  const truncateComment = (text, maxLength = 200) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    if (onEdit) onEdit(task);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(task);
  };

  const handleReassignClick = (e) => {
    e.stopPropagation();
    if (onReassign) onReassign(task);
  };

  return (
    <div className="task-card" onClick={handleClick}>
      <div className={`task-status-bar ${statusInfo.class}`}>
        <span>{statusInfo.label}</span>
        {(canEdit || canDelete) && (
          <div className="task-admin-actions" onClick={(e) => e.stopPropagation()}>
            {canEdit && (
              <IconButton
                icon="✏️"
                variant="primary"
                size="small"
                onClick={() => onEdit && onEdit(task)}
                title="Редактировать задачу"
                ariaLabel="Редактировать"
              />
            )}
            {canDelete && (
              <IconButton
                icon="🗑️"
                variant="danger"
                size="small"
                onClick={handleDeleteClick}
                title="Удалить задачу"
                ariaLabel="Удалить"
              />
            )}
          </div>
        )}
      </div>

      <div className="task-card-body">
        <div className="task-card-header">
        <span className="task-author">
          {task.type === 'invoices' ? (
            <span className="task-invoice-title">📊 {task.title || 'Без номера'}</span>
          ) : (
            <>
              <span className="task-author-label">Автор:</span> {author}
            </>
          )}
        </span>
        <span className="task-date">🕐 {created_at}</span>
      </div>

        {task.type === 'invoices' ? (
          // Отображение для счетов
          <>
            <div className="task-invoice-field">
              <strong>Контрагент:</strong> {task.supplier || 'Неизвестно'}
            </div>
            <div className="task-invoice-field">
              <strong>Город:</strong> {task.city || '—'}
            </div>
            <div className="task-invoice-field">
              <strong>Сумма:</strong> {task.amount || '—'}
            </div>
            <div className="task-comment-box">
              {truncateComment(task.comment)}
            </div>
          </>
        ) : (
          // Отображение для обычных задач
          <>
            <div className="task-supplier">
              <strong>Кто привез:</strong> {supplier}
            </div>
            <div className="task-comment-box">
              {truncateComment(comment)}
            </div>
            <PhotoViewer photos={photos} onPhotoClick={onPhotoClick} />
          </>
        )}

        <div className="task-card-footer">
          <div className="task-footer-row">
            {comments_count > 0 && (
              <div className="task-comments-indicator">
                💬 {comments_count}
              </div>
            )}
          </div>

          <div className="task-actions" onClick={(e) => e.stopPropagation()}>
            {/* Новая задача - только "Взять в работу" */}
            {actions.canTake && (
              <ActionButton
                variant="primary"
                size="medium"
                onClick={() => onTake && onTake(id)}
              >
                Взять в работу
              </ActionButton>
            )}

            {/* Задача в работе у текущего пользователя */}
            {actions.canComplete && (
              <ActionButton
                variant="success"
                size="medium"
                onClick={() => onComplete && onComplete(id)}
              >
                Выполнить
              </ActionButton>
            )}
            {actions.canDecline && (
              <ActionButton
                variant="danger"
                size="medium"
                onClick={() => onDecline && onDecline(id)}
              >
                Отказаться
              </ActionButton>
            )}

            {/* Задача в работе у другого пользователя */}
            {actions.canReassign && (
              <ActionButton
                variant="warning"
                size="medium"
                onClick={handleReassignClick}
              >
                📥 Забрать задачу
              </ActionButton>
            )}

            {/* Завершенная задача */}
            {status === 'completed' && (
              <span className="status-completed">✅ Завершена</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskCard;