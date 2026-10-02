import { useState, useEffect } from 'react';
import './NewsFormModal.css';

function NewsFormModal({ isOpen, onClose, onSubmit, currentUser, isSubmitting = false }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [showFrom, setShowFrom] = useState('');
  const [showTo, setShowTo] = useState('');
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setContent('');
      setEventDate('');
      setShowFrom('');
      setShowTo('');
      setError('');
      setShowHelp(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Укажите заголовок новости');
      return;
    }
    if (!content.trim()) {
      setError('Укажите текст новости');
      return;
    }
    if (!eventDate) {
      setError('Укажите дату события');
      return;
    }
    if (!showFrom || !showTo) {
      setError('Укажите период показа');
      return;
    }

    onSubmit({
      title: title.trim(),
      content: content.trim(),
      event_date: eventDate,
      show_from: showFrom,
      show_to: showTo,
      author: currentUser?.name,
    });
  };

  const normalizeDateForInput = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <div className="news-modal-overlay" onClick={onClose}>
      <div className="news-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="news-modal-close" onClick={onClose}>✕</button>
        <h2>📰 Создать новость</h2>

        <form onSubmit={handleSubmit}>
          <div className="news-form-group">
            <label>Заголовок *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Введите заголовок новости"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="news-form-group">
            <label>
              Текст новости *
              <button
                type="button"
                className="news-help-btn"
                onClick={() => setShowHelp(!showHelp)}
              >
                ?
              </button>
            </label>
            {showHelp && (
              <div className="news-help-box">
                <p><strong>Markdown — простой язык разметки:</strong></p>
                <ul>
                  <li><code>**жирный текст**</code> → <strong>жирный текст</strong></li>
                  <li><code>*курсив*</code> → <em>курсив</em></li>
                  <li><code># Заголовок</code> → заголовок</li>
                  <li><code>- пункт списка</code> → список</li>
                  <li>Пустые строки создают новые абзацы</li>
                </ul>
              </div>
            )}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Введите текст новости (поддерживается Markdown)"
              rows={6}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="news-form-group">
            <label>Дата события *</label>
            <input
              type="datetime-local"
              value={normalizeDateForInput(eventDate)}
              onChange={(e) => setEventDate(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="news-form-row">
            <div className="news-form-group">
              <label>Показывать с *</label>
              <input
                type="datetime-local"
                value={normalizeDateForInput(showFrom)}
                onChange={(e) => setShowFrom(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="news-form-group">
              <label>Показывать по *</label>
              <input
                type="datetime-local"
                value={normalizeDateForInput(showTo)}
                onChange={(e) => setShowTo(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          {error && <div className="news-form-error">{error}</div>}

          <div className="news-form-actions">
            <button
              type="button"
              className="news-form-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="news-form-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Создание...' : '📰 Создать новость'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewsFormModal;