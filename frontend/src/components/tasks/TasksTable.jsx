import './TasksTable.css';

// ===== Соответствие типа задачи и иконки хаба =====
const HUB_ICONS = {
  'arrival': '📦',
  'regions': '🌍',
  'spb': '🏙️',
  'invoices': '📊',
  'air_traffic': '✈️',
  'tasks': '📋',
};

function TasksTable({ tasks, loading, onRowClick }) {
  if (loading) {
    return <p className="tasks-loading">Загрузка...</p>;
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="tasks-table-wrap">
        <table className="tasks-table">
          <thead>
            <tr>
              <th>Заказ</th>
              <th>Контрагент</th>
              <th>Комментарий</th>
              <th>Исполнитель</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan="4" className="empty-row">Нет актуальных задач</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="tasks-table-wrap">
      <table className="tasks-table">
        <thead>
          <tr>
            <th>Заказ</th>
            <th>Контрагент</th>
            <th>Комментарий</th>
            <th>Исполнитель</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const icon = HUB_ICONS[task.type] || '📋';
            return (
              <tr 
                key={task.id} 
                className="task-row-clickable"
                onClick={() => onRowClick && onRowClick(task)}
              >
                <td>
                  <span className="task-tracking">
                    {icon} {task.supplier || '—'}
                  </span>
                  {task.comments_count > 0 && (
                    <span className="task-comments-badge">💬 {task.comments_count}</span>
                  )}
                </td>
                <td>{task.author || '—'}</td>
                <td className="task-description">{task.comment || '—'}</td>
                <td>{task.assigned_to || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default TasksTable;