import SearchBar from '../common/SearchBar';
import './HubHeader.css';

function HubHeader({
  title,
  hideCompleted,
  onHideCompletedChange,
  onCreate,
  onBack,
  isConnected,
  onSearch,
  searchPlaceholder = 'Поиск...',
}) {
  return (
    <div className="hub-header">
      <h1>{title}</h1>
      <div className="hub-actions">
        <SearchBar
          onSearch={onSearch}
          placeholder={searchPlaceholder}
        />
        <label className="hub-filter-checkbox">
          <input
            type="checkbox"
            checked={hideCompleted}
            onChange={(e) => onHideCompletedChange(e.target.checked)}
          />
          <span>Скрыть выполненные</span>
          {isConnected && <span className="hub-sse-status">🟢</span>}
        </label>
        <button className="hub-btn-create" onClick={onCreate}>
          ➕ Создать
        </button>
        <button className="hub-btn-back" onClick={onBack}>
          ← Назад
        </button>
      </div>
    </div>
  );
}

export default HubHeader;