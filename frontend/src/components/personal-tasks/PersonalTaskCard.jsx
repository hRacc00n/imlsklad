import './PersonalTaskCard.css';

function PersonalTaskCard({ task, currentUser, onClick, onComplete, onDelete }) {
  const {
    id,
    title,
    description,
    author,
    assigned_to = [],
    status,
    items_count = 0,
    completed_items_count = 0,
    comments_count = 0,
    created_at,
  } = task;

  const isAuthor = currentUser?.name === author;
  const isAssigned = assigned_to.includes(currentUser?.name);
  const isCompleted = status === 'completed';
  const hasItems = items_count > 0;
  const allItemsCompleted = hasItems && completed_items_count === items_count;

  // Если есть подпункты и все выполнены - задача завершена
  const isActuallyCompleted = isCompleted || (hasItems && allItemsCompleted);

  const getStatusLabel = () => {
    if (isActuallyCompleted) return { label: '✅ Выполнена', class: 'status-completed' };
    return { label: '🔄 В работе', class: 'status-active' };
  };

  const statusInfo = getStatusLabel();

  const handleComplete = (e) => {
    e.stopPropagation();
    if (onComplete && !hasItems) {
      onComplete(id);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(id);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return dateStr;
  };

  // Проверяем, может ли пользователь выполнить задачу (автор или исполнитель, и нет подпунктов)
  const canComplete = !isActuallyCompleted && !hasItems && (isAuthor || isAssigned);

  // Проверяем, может ли пользователь удалить задачу (только автор)
  const canDelete = isAuthor;

  return (
    <div className="personal-task-card" onClick={() => onClick && onClick(task)}>
      <div className={`personal-task-status-bar ${statusInfo.class}`}>
        <span>{statusInfo.label}</span>
        {canDelete && (
          <button
            className="personal-task-delete-btn"
            onClick={handleDelete}
            title="Удалить задачу"
          >
            🗑️
          </button>
        )}
      </div>

      <div className="personal-task-card-body">
        <div className="personal-task-card-header">
          <h3 className="personal-task-title">{title}</h3>
          <span className="personal-task-date">🕐 {formatDate(created_at)}</span>
        </div>

        <div className="personal-task-meta">
          <span className="personal-task-author">👤 {author}</span>
          {assigned_to.length > 0 && (
            <span className="personal-task-assigned">
              👥 {assigned_to.join(', ')}
            </span>
          )}
        </div>

        {description && (
          <p className="personal-task-description">{description}</p>
        )}

        <div className="personal-task-footer">
          <div className="personal-task-stats">
            {hasItems && (
              <span className="personal-task-items">
                📋 {completed_items_count}/{items_count}
              </span>
            )}
            {comments_count > 0 && (
              <span className="personal-task-comments">
                💬 {comments_count}
              </span>
            )}
          </div>

          <div className="personal-task-actions">
            {canComplete && (
              <button
                className="personal-task-complete-btn"
                onClick={handleComplete}
              >
                ✅ Выполнить
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PersonalTaskCard;