import { useState, useEffect } from 'react';
import './Calendar.css';

function Calendar({ onDaySelect, selectedDate, events = [], onMonthChange }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [days, setDays] = useState([]);
  const [monthName, setMonthName] = useState('');

  // Генерация дней месяца
  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Первый день месяца
    const firstDay = new Date(year, month, 1);
    // Последний день месяца
    const lastDay = new Date(year, month + 1, 0);
    
    // День недели первого дня (0 = воскресенье, 6 = суббота)
    // Нам нужно, чтобы неделя начиналась с понедельника
    let startDayOfWeek = firstDay.getDay();
    // Сдвигаем так, чтобы понедельник был 0
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    
    const daysInMonth = lastDay.getDate();
    const daysArray = [];
    
    // Пустые ячейки в начале месяца
    for (let i = 0; i < startDayOfWeek; i++) {
      daysArray.push(null);
    }
    
    // Дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      daysArray.push(date);
    }
    
    setDays(daysArray);
    
    // Название месяца
    const monthNames = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    setMonthName(monthNames[month]);
  }, [currentDate]);

  // Переключение месяца
  const prevMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(newDate);
    if (onMonthChange) {
      onMonthChange(newDate.getFullYear(), newDate.getMonth() + 1);
    }
  };

  const nextMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(newDate);
    if (onMonthChange) {
      onMonthChange(newDate.getFullYear(), newDate.getMonth() + 1);
    }
  };

  // Получение ТОЛЬКО точек для сетки календаря (_is_dot)
  const getDayDots = (date) => {
    if (!date) return [];
    // Нормализуем дату к локальному времени (без часового пояса)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    return events.filter(event => {
      const eventDate = event.date ? event.date.split('T')[0] : '';
      return eventDate === dateStr && event._is_dot === true;
    });
  };

  // Проверка, выбран ли день
  const isSelected = (date) => {
    if (!date || !selectedDate) return false;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const sYear = selectedDate.getFullYear();
    const sMonth = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const sDay = String(selectedDate.getDate()).padStart(2, '0');
    const sDateStr = `${sYear}-${sMonth}-${sDay}`;
    
    return dateStr === sDateStr;
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const tYear = today.getFullYear();
    const tMonth = String(today.getMonth() + 1).padStart(2, '0');
    const tDay = String(today.getDate()).padStart(2, '0');
    const tDateStr = `${tYear}-${tMonth}-${tDay}`;
    
    return dateStr === tDateStr;
  };

  const handleDayClick = (date) => {
    if (date && onDaySelect) {
      onDaySelect(date);
    }
  };

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button className="calendar-nav-btn" onClick={prevMonth}>‹</button>
        <span className="calendar-month">{monthName} {currentDate.getFullYear()}</span>
        <button className="calendar-nav-btn" onClick={nextMonth}>›</button>
      </div>

      <div className="calendar-grid">
        {/* Дни недели */}
        <div className="calendar-weekdays">
          <span>Пн</span>
          <span>Вт</span>
          <span>Ср</span>
          <span>Чт</span>
          <span>Пт</span>
          <span>Сб</span>
          <span>Вс</span>
        </div>

        {/* Ячейки дней */}
        <div className="calendar-days">
          {days.map((date, index) => {
            if (date === null) {
              return <div key={`empty-${index}`} className="calendar-day empty"></div>;
            }
            
            const dayDots = getDayDots(date);
            const isSelectedDay = isSelected(date);
            const isTodayDay = isToday(date);

            // Определяем цвет точки в зависимости от типа события (используем _is_dot)
            const getEventDotClass = () => {
              if (dayDots.length === 0) return '';
              // Если есть задачи — зелёный
              if (dayDots.some(e => e.type === 'task_dot' || e.type === 'task')) return 'dot-task';
              // Если есть дежурства — оранжевый
              if (dayDots.some(e => e.type === 'duty')) return 'dot-duty';
              // Если есть отпуска — фиолетовый
              if (dayDots.some(e => e.type === 'vacation')) return 'dot-vacation';
              // Если есть новости — красный
              if (dayDots.some(e => e.type === 'news')) return 'dot-news';
              return '';
            };

            // Определяем, есть ли просроченные задачи
            const hasOverdueTask = dayDots.some(e => 
              (e.type === 'task_dot' || e.type === 'task') && 
              e.is_overdue && 
              !e.is_completed
            );

            return (
              <div
                key={index}
                className={`calendar-day ${isSelectedDay ? 'selected' : ''} ${isTodayDay ? 'today' : ''} ${hasOverdueTask ? 'has-overdue' : ''}`}
                onClick={() => handleDayClick(date)}
              >
                <span className="calendar-day-number">{date.getDate()}</span>
                {dayDots.length > 0 && (
                  <div className={`calendar-day-dot ${getEventDotClass()}`}></div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Calendar;