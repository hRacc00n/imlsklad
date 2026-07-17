import './TaskItemList.css';

function TaskItemList({ items, onToggle, isAuthor, isAssigned, currentUser }) {
  if (!items || items.length === 0) {
    return (
      <div className="task-item-list-empty">
        <p>Нет подпунктов</p>
      </div>
    );
  }

  const handleToggle = (itemId, isCompleted) => {
    if (onToggle) {
      onToggle(itemId, !isCompleted);
    }
  };

  return (
    <div className="task-item-list">
      <div className="task-item-list-header">
        <span>📋 Подпункты ({items.length})</span>
      </div>
      <div className="task-item-list-items">
        {items.map((item) => (
          <div key={item.id} className="task-item">
            <label className="task-item-checkbox">
              <input
                type="checkbox"
                checked={item.is_completed}
                onChange={() => handleToggle(item.id, item.is_completed)}
                disabled={!isAuthor && currentUser?.role !== 'admin' && !isAssigned}
              />
              <span className={`task-item-text ${item.is_completed ? 'completed' : ''}`}>
                {item.text}
                {item.is_completed && item.completed_by && (
                  <span className="task-item-completed-by">
                    {item.completed_by}
                  </span>
                )}
              </span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TaskItemList;