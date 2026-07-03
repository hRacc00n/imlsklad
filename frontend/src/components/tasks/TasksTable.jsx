import './TasksTable.css';

function TasksTable({ tasks, loading }) {
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
          {tasks.map((task, index) => (
            <tr key={index}>
              <td>
                <span className="task-tracking">{task.tracking}</span>
                {task.comments_count > 0 && (
                  <span className="task-comments-badge">💬 {task.comments_count}</span>
                )}
              </td>
              <td>{task.client}</td>
              <td className="task-description">{task.description || '—'}</td>
              <td>{task.assigned_to || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TasksTable;