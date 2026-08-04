import { useState } from 'react';
import { DateRange } from 'react-date-range';
import { ru } from 'date-fns/locale';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import './DateRangePicker.css';

function DateRangePicker({ 
  value, 
  onChange, 
  placeholder = 'Выберите дату',
  disabled = false 
}) {
  const [showPicker, setShowPicker] = useState(false);
  const normalizeDate = (date) => {
    if (!date) return new Date();
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const [selection, setSelection] = useState({
    startDate: value?.startDate ? normalizeDate(value.startDate) : normalizeDate(new Date()),
    endDate: value?.endDate ? normalizeDate(value.endDate) : normalizeDate(new Date()),
    key: 'selection',
  });

  const handleSelect = (ranges) => {
    const { selection } = ranges;
    setSelection(selection);
    
    // Нормализуем даты к началу дня в локальном времени
    const normalizeDate = (date) => {
      if (!date) return null;
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };
    
    onChange({
      startDate: normalizeDate(selection.startDate),
      endDate: normalizeDate(selection.endDate),
    });
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getDisplayText = () => {
    if (value?.startDate && value?.endDate) {
      const start = formatDate(value.startDate);
      const end = formatDate(value.endDate);
      if (start === end) {
        return start;
      }
      return `${start} — ${end}`;
    }
    return placeholder;
  };

  const isRange = value?.startDate && value?.endDate && 
    value.startDate.toDateString() !== value.endDate.toDateString();

  return (
    <div className="date-range-picker">
      <div 
        className={`date-range-picker-input ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setShowPicker(!showPicker)}
      >
        <span className="date-range-picker-text">{getDisplayText()}</span>
        <span className="date-range-picker-icon">📅</span>
        {isRange && (
          <span className="date-range-picker-badge">диапазон</span>
        )}
      </div>

      {showPicker && !disabled && (
        <div className="date-range-picker-popup">
          <div className="date-range-picker-popup-header">
            <span>Выберите дату или диапазон</span>
            <button 
              className="date-range-picker-popup-close"
              onClick={() => setShowPicker(false)}
            >
              ✕
            </button>
          </div>
          <DateRange
            ranges={[selection]}
            onChange={handleSelect}
            locale={ru}
            rangeColors={['#667eea']}
            minDate={new Date()}
            showMonthAndYearPickers={true}
            months={2}
            direction="horizontal"
            showDateDisplay={false}
          />
          <div className="date-range-picker-popup-footer">
            <span className="date-range-picker-hint">
              {!isRange ? 'Нажмите вторую дату для выбора диапазона' : 'Диапазон выбран'}
            </span>
            <button 
              className="date-range-picker-popup-apply"
              onClick={() => setShowPicker(false)}
            >
              Применить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DateRangePicker;