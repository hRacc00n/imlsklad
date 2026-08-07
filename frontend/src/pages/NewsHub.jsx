import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import ReactMarkdown from 'react-markdown';
import DateRangePicker from '../components/common/DateRangePicker';
import './NewsHub.css';

function NewsHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openModal } = useModal();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    event_date: '',
    show_from: '',
    show_to: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const isAdmin = user?.role === 'admin';

  const loadNews = async () => {
    try {
      const response = await fetch('/api/calendar/news');
      const data = await response.json();
      setNews(data);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка загрузки новостей:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  const handleBack = () => navigate('/');

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Укажите заголовок новости');
      return;
    }
    if (!formData.content.trim()) {
      setError('Укажите текст новости');
      return;
    }
    if (!formData.event_date) {
      setError('Укажите дату события');
      return;
    }
    if (!formData.show_from || !formData.show_to) {
      setError('Укажите период показа');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/calendar/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          author: user?.name,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setShowCreateModal(false);
        setFormData({ title: '', content: '', event_date: '', show_from: '', show_to: '' });
        loadNews();
      } else {
        setError(data.message || 'Ошибка при создании новости');
      }
    } catch (err) {
      setError('Ошибка при создании новости');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHide = async (newsId, isHidden) => {
    if (!isAdmin) return;
    try {
      const response = await fetch(`/api/calendar/news/${newsId}/hide`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: user?.name,
          is_hidden: isHidden,
        }),
      });
      const data = await response.json();
      if (data.success) {
        loadNews();
      }
    } catch (err) {
      console.error('Ошибка скрытия новости:', err);
    }
  };

  const handleDelete = async (newsId) => {
    if (!isAdmin) return;
    if (!confirm('Удалить новость?')) return;
    try {
      const response = await fetch(`/api/calendar/news/${newsId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: user?.name }),
      });
      const data = await response.json();
      if (data.success) {
        loadNews();
      }
    } catch (err) {
      console.error('Ошибка удаления новости:', err);
    }
  };

  // Функция для открытия модального окна с новостью
  const handleNewsClick = (newsItem) => {
    openModal(newsItem, 'news');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const isNewsActive = (newsItem) => {
    const today = new Date();
    const showFrom = new Date(newsItem.show_from);
    const showTo = new Date(newsItem.show_to);
    return today >= showFrom && today <= showTo && !newsItem.is_hidden;
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
    <div className="news-hub">
      <div className="news-hub-header">
        <h1>📰 Новости</h1>
        <div className="news-hub-actions">
          <button className="news-hub-btn-create" onClick={() => setShowCreateModal(true)}>
            ➕ Создать новость
          </button>
          <button className="news-hub-btn-back" onClick={handleBack}>
            ← Назад
          </button>
        </div>
      </div>

      {loading ? (
        <p className="news-hub-loading">Загрузка...</p>
      ) : news.length === 0 ? (
        <div className="news-hub-empty">
          <p>📰 Нет новостей</p>
          <p className="news-hub-empty-hint">Создайте первую новость, нажав кнопку "Создать новость"</p>
        </div>
      ) : (
        <div className="news-hub-grid">
          {news.map(item => (
            <div 
              key={item.id} 
              className={`news-card ${item.is_hidden ? 'news-card-hidden' : ''}`}
              onClick={() => handleNewsClick(item)}
            >
              <div className="news-card-header">
                <h3 className="news-card-title">{item.title}</h3>
                <div className="news-card-badge">
                  {item.is_hidden ? (
                    <span className="badge-hidden">Скрыта</span>
                  ) : isNewsActive(item) ? (
                    <span className="badge-active">Активна</span>
                  ) : (
                    <span className="badge-inactive">Неактивна</span>
                  )}
                </div>
              </div>

              <div className="news-card-meta">
                <span className="news-card-author">✍️ {item.author}</span>
                <span className="news-card-date">📅 {formatDate(item.event_date)}</span>
                <span className="news-card-period">
                  Показ: {formatDate(item.show_from)} — {formatDate(item.show_to)}
                </span>
              </div>

              <div className="news-card-content">
                {item.content.length > 200 ? (
                  <>
                    <ReactMarkdown>{item.content.slice(0, 200) + '...'}</ReactMarkdown>
                  </>
                ) : (
                  <ReactMarkdown>{item.content}</ReactMarkdown>
                )}
              </div>

              <div className="news-card-actions">
                {isAdmin && (
                  <>
                    <button
                      className="news-card-btn-hide"
                      onClick={() => handleHide(item.id, !item.is_hidden)}
                    >
                      {item.is_hidden ? '👁️ Показать' : '🙈 Скрыть'}
                    </button>
                    <button
                      className="news-card-btn-delete"
                      onClick={() => handleDelete(item.id)}
                    >
                      🗑️ Удалить
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модалка создания новости */}
      {showCreateModal && (
        <div className="news-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="news-modal-content" onClick={e => e.stopPropagation()}>
            <button className="news-modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
            <h2>📰 Создать новость</h2>

            <form onSubmit={handleCreate}>
              <div className="news-form-group">
                <label>Заголовок *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
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
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
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
                  value={normalizeDateForInput(formData.event_date)}
                  onChange={e => setFormData({ ...formData, event_date: e.target.value })}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="news-form-row">
                <div className="news-form-group">
                  <label>Показывать с *</label>
                  <input
                    type="datetime-local"
                    value={normalizeDateForInput(formData.show_from)}
                    onChange={e => setFormData({ ...formData, show_from: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="news-form-group">
                  <label>Показывать по *</label>
                  <input
                    type="datetime-local"
                    value={normalizeDateForInput(formData.show_to)}
                    onChange={e => setFormData({ ...formData, show_to: e.target.value })}
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
                  onClick={() => setShowCreateModal(false)}
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
      )}
    </div>
  );
}

export default NewsHub;