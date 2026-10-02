import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import ReactMarkdown from 'react-markdown';
import NewsFormModal from '../components/news/NewsFormModal';
import './NewsHub.css';

function NewsHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openModal } = useModal();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleCreate = async (values) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/calendar/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (data.success) {
        setShowCreateModal(false);
        loadNews();
      } else {
        alert(data.message || 'Ошибка при создании новости');
      }
    } catch (err) {
      alert('Ошибка при создании новости');
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
                  <ReactMarkdown>{item.content.slice(0, 200) + '...'}</ReactMarkdown>
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
      <NewsFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        currentUser={user}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

export default NewsHub;