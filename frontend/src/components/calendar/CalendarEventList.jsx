import { useState } from 'react';
import './CalendarEventList.css';

function CalendarEventList({ events = [], date, onTaskClick, eventTypeFilters: externalFilters, onEventTypeFiltersChange }) {
  // Загружаем состояние из localStorage
  const [hideCompleted, setHideCompleted] = useState(() => {
    const saved = localStorage.getItem('calendar_hide_completed');
    return saved === 'true';
  });

  // Фильтр типов событий
  const eventTypeFilters = externalFilters || { tasks: true, duties: true, vacations: true, news: true };
  const setEventTypeFilters = (newFilters) => {
    if (onEventTypeFiltersChange) {
      onEventTypeFiltersChange(newFilters);
    }
    localStorage.setItem('calendar_event_type_filters', JSON.stringify(newFilters));
  };

  // Фильтруем только события для списка (_is_event)
  const filteredEvents = Array.isArray(events) 
    ? events.filter(e => {
        // Только _is_event
        if (e._is_event !== true) return false;
        
        // Фильтр по типу события
        if (e.type === 'task' && !eventTypeFilters.tasks) return false;
        if (e.type === 'duty' && !eventTypeFilters.duties) return false;
        if (e.type === 'vacation' && !eventTypeFilters.vacations) return false;
        if (e.type === 'news' && !eventTypeFilters.news) return false;
        
        // Если включен hideCompleted, скрываем выполненные задачи
        if (hideCompleted && e.is_completed === true) return false;
        
        // Просроченные задачи показываем всегда (is_overdue === true)
        // или если days_left < 0 (просрочена)
        if (e.is_overdue === true) return true;
        if (e.days_left !== undefined && e.days_left < 0) return true;
        
        // Если есть days_left, показываем только если >= 0 (не просрочена)
        if (e.days_left !== undefined && e.days_left < 0) return false;
        
        return true;
      }) 
    : [];

  if (!date) {
    return (
      <div className="calendar-event-list">
        <div className="calendar-event-list-empty">
          <p>Выберите день в календаре</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    // Добавляем часовой пояс MSK (UTC+3)
    const mskDate = new Date(date.getTime() + 3 * 60 * 60 * 1000);
    return mskDate.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Moscow'
    });
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'task':
        return '📋';
      case 'duty':
        return '🔄';
      case 'vacation':
        return '🏖️';
      case 'news':
        return '📰';
      default:
        return '📌';
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'task':
        return 'event-task';
      case 'duty':
        return 'event-duty';
      case 'vacation':
        return 'event-vacation';
      case 'news':
        return 'event-news';
      default:
        return '';
    }
  };

  const getEventLabel = (type) => {
    switch (type) {
      case 'task':
        return 'Задача';
      case 'duty':
        return 'Дежурство';
      case 'vacation':
        return 'Отпуск';
      case 'news':
        return 'Новость';
      default:
        return 'Событие';
    }
  };

  const handleEventClick = (event) => {
    // Для задач и новостей - передаём ID
    if ((event.type === 'task' || event.type === 'news') && onTaskClick) {
      // Передаём ID и тип события
      onTaskClick(event.id, event.type);
    }
  };

  if (filteredEvents.length === 0) {
    return (
      <div className="calendar-event-list">
        <div className="calendar-event-list-header">
          <h3>📅 {formatDate(date)}</h3>
          <div className="calendar-event-list-controls">
            {/* Фильтр типов событий */}
            <div className="calendar-event-type-filters">
              <label className={`filter-label filter-task ${eventTypeFilters.tasks ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  checked={eventTypeFilters.tasks}
                  onChange={(e) => {
                    const newFilters = { ...eventTypeFilters, tasks: e.target.checked };
                    setEventTypeFilters(newFilters);
                    localStorage.setItem('calendar_event_type_filters', JSON.stringify(newFilters));
                  }}
                />
                <span className="filter-dot dot-task"></span>
                <span className="filter-name">Задачи</span>
              </label>
              <label className={`filter-label filter-duty ${eventTypeFilters.duties ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  checked={eventTypeFilters.duties}
                  onChange={(e) => {
                    const newFilters = { ...eventTypeFilters, duties: e.target.checked };
                    setEventTypeFilters(newFilters);
                    localStorage.setItem('calendar_event_type_filters', JSON.stringify(newFilters));
                  }}
                />
                <span className="filter-dot dot-duty"></span>
                <span className="filter-name">Дежурства</span>
              </label>
              <label className={`filter-label filter-vacation ${eventTypeFilters.vacations ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  checked={eventTypeFilters.vacations}
                  onChange={(e) => {
                    const newFilters = { ...eventTypeFilters, vacations: e.target.checked };
                    setEventTypeFilters(newFilters);
                    localStorage.setItem('calendar_event_type_filters', JSON.stringify(newFilters));
                  }}
                />
                <span className="filter-dot dot-vacation"></span>
                <span className="filter-name">Отпуска</span>
              </label>
              <label className={`filter-label filter-news ${eventTypeFilters.news ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  checked={eventTypeFilters.news}
                  onChange={(e) => {
                    const newFilters = { ...eventTypeFilters, news: e.target.checked };
                    setEventTypeFilters(newFilters);
                    localStorage.setItem('calendar_event_type_filters', JSON.stringify(newFilters));
                  }}
                />
                <span className="filter-dot dot-news"></span>
                <span className="filter-name">Новости</span>
              </label>
            </div>
            <label className="calendar-event-list-hide-completed">
              <input
                type="checkbox"
                checked={hideCompleted}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setHideCompleted(checked);
                  localStorage.setItem('calendar_hide_completed', String(checked));
                }}
              />
              <span>Скрыть выполненные</span>
            </label>
          </div>
        </div>
        <div className="calendar-event-list-empty">
          <p>Нет событий на этот день</p>
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-event-list">
      <div className="calendar-event-list-header">
        <h3>📅 {formatDate(date)}</h3>
        <div className="calendar-event-list-controls">
          {/* Фильтр типов событий */}
          <div className="calendar-event-type-filters">
            <label className={`filter-label filter-task ${eventTypeFilters.tasks ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={eventTypeFilters.tasks}
                onChange={(e) => {
                  const newFilters = { ...eventTypeFilters, tasks: e.target.checked };
                  setEventTypeFilters(newFilters);
                  localStorage.setItem('calendar_event_type_filters', JSON.stringify(newFilters));
                }}
              />
              <span className="filter-dot dot-task"></span>
              <span className="filter-name">Задачи</span>
            </label>
            <label className={`filter-label filter-duty ${eventTypeFilters.duties ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={eventTypeFilters.duties}
                onChange={(e) => {
                  const newFilters = { ...eventTypeFilters, duties: e.target.checked };
                  setEventTypeFilters(newFilters);
                  localStorage.setItem('calendar_event_type_filters', JSON.stringify(newFilters));
                }}
              />
              <span className="filter-dot dot-duty"></span>
              <span className="filter-name">Дежурства</span>
            </label>
            <label className={`filter-label filter-vacation ${eventTypeFilters.vacations ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={eventTypeFilters.vacations}
                onChange={(e) => {
                  const newFilters = { ...eventTypeFilters, vacations: e.target.checked };
                  setEventTypeFilters(newFilters);
                  localStorage.setItem('calendar_event_type_filters', JSON.stringify(newFilters));
                }}
              />
              <span className="filter-dot dot-vacation"></span>
              <span className="filter-name">Отпуска</span>
            </label>
            <label className={`filter-label filter-news ${eventTypeFilters.news ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={eventTypeFilters.news}
                onChange={(e) => {
                  const newFilters = { ...eventTypeFilters, news: e.target.checked };
                  setEventTypeFilters(newFilters);
                  localStorage.setItem('calendar_event_type_filters', JSON.stringify(newFilters));
                }}
              />
              <span className="filter-dot dot-news"></span>
              <span className="filter-name">Новости</span>
            </label>
          </div>
          <label className="calendar-event-list-hide-completed">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={(e) => {
                const checked = e.target.checked;
                setHideCompleted(checked);
                localStorage.setItem('calendar_hide_completed', String(checked));
              }}
            />
            <span>Скрыть выполненные</span>
          </label>
          <span className="calendar-event-count">{filteredEvents.length} событий</span>
        </div>
      </div>

      <div className="calendar-event-list-items">
        {filteredEvents.map((event, index) => (
          <div
            key={`${event.id}-${index}`}
            className={`calendar-event-item ${getEventColor(event.type)} ${(event.type === 'task' || event.type === 'news') ? 'clickable' : ''}`}
            onClick={() => handleEventClick(event)}
          >
            <div className="calendar-event-item-icon">
              {getEventIcon(event.type)}
            </div>
            <div className="calendar-event-item-content">
              <div className="calendar-event-item-header">
                <span className="calendar-event-item-type">
                  {getEventLabel(event.type)}
                </span>
                {/* Время не показываем для задач */}
              </div>
              <div className="calendar-event-item-title">
                {event.title || event.user_name || 'Событие'}
                {event.type === 'task' && event.title && (
                  <div className="calendar-event-item-description">
                    {event.description 
                      ? (event.description.length > 80 
                          ? event.description.slice(0, 80) + '...' 
                          : event.description)
                      : ''}
                  </div>
                )}
                {event.type === 'task' && event.items_count !== undefined && event.items_count > 0 && (
                  <div className="calendar-event-item-subtasks">
                    📋 {event.completed_items_count || 0}/{event.items_count} подпунктов выполнено
                  </div>
                )}
              </div>
              {event.type === 'task' && event.is_overdue && !event.is_completed && (
                <div className="calendar-event-item-badge overdue">Просрочена</div>
              )}
              {event.type === 'task' && event.is_completed && (
                <div className="calendar-event-item-badge completed">✅ Выполнена</div>
              )}
              {event.type === 'task' && !event.is_completed && !event.is_overdue && event.days_left !== undefined && (
                <div className="calendar-event-item-badge days-left">
                  {event.days_left === 0 ? (
                    <span>Сегодня</span>
                  ) : event.days_left === 1 ? (
                    <span>Остался 1 день</span>
                  ) : event.days_left > 1 ? (
                    <span>Осталось {event.days_left} дн.</span>
                  ) : null}
                </div>
              )}
              {event.type === 'duty' && (
                <div className="calendar-event-item-user">
                  👤 {event.user_name || 'Неизвестно'}
                  {event.date_end && event.date !== event.date_end && (
                    <span className="calendar-event-item-period">
                      {' '}до {new Date(event.date_end).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </span>
                  )}
                </div>
              )}
              {event.type === 'vacation' && (
                <div className="calendar-event-item-user">
                  👤 {event.user_name || 'Неизвестно'}
                  {event.date_end && event.date !== event.date_end && (
                    <span className="calendar-event-item-period">
                      {' '}до {new Date(event.date_end).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </span>
                  )}
                </div>
              )}
              {event.type === 'news' && event.content && (
                <div className="calendar-event-item-description">
                  {event.content.length > 100 ? event.content.slice(0, 100) + '...' : event.content}
                </div>
              )}
              {event.type === 'news' && event.author && (
                <div className="calendar-event-item-user">
                  ✍️ {event.author}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CalendarEventList;