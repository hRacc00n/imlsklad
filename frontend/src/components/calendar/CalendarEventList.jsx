import { useState } from 'react';
import './CalendarEventList.css';

function CalendarEventList({ events = [], date, onTaskClick }) {
  // Загружаем состояние из localStorage
  const [hideCompleted, setHideCompleted] = useState(() => {
    const saved = localStorage.getItem('calendar_hide_completed');
    return saved === 'true';
  });
  // Фильтруем только события для списка (_is_event)
  const filteredEvents = Array.isArray(events) 
    ? events.filter(e => {
        // Только _is_event
        if (e._is_event !== true) return false;
        
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
    if (event.type === 'task' && onTaskClick) {
      onTaskClick(event.id);
    }
  };

  if (filteredEvents.length === 0) {
    return (
      <div className="calendar-event-list">
        <div className="calendar-event-list-header">
          <h3>📅 {formatDate(date)}</h3>
          <div className="calendar-event-list-controls">
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
            className={`calendar-event-item ${getEventColor(event.type)} ${event.type === 'task' ? 'clickable' : ''}`}
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
                {event.date && (
                  <span className="calendar-event-item-time">
                    {formatTime(event.date)}
                  </span>
                )}
              </div>
              <div className="calendar-event-item-title">
                {event.title || event.user_name || 'Событие'}
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
              {event.type === 'duty' && event.user_name && (
                <div className="calendar-event-item-user">
                  👤 {event.user_name}
                </div>
              )}
              {event.type === 'vacation' && event.user_name && (
                <div className="calendar-event-item-user">
                  👤 {event.user_name}
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