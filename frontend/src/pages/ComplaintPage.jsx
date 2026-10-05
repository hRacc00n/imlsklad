import { useState, useEffect } from 'react';
import './ComplaintPage.css';

function ComplaintPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    text: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Загрузка категорий
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/complaint-categories');
        const data = await response.json();
        setCategories(data);
      } catch (err) {
        console.error('Ошибка загрузки категорий:', err);
      } finally {
        setLoading(false);
      }
    };
    loadCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Укажите ваше имя');
      return;
    }
    if (!formData.category_id) {
      setError('Выберите категорию');
      return;
    }
    if (!formData.text.trim()) {
      setError('Введите текст жалобы');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          category_id: parseInt(formData.category_id),
          text: formData.text.trim(),
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess(true);
        setFormData({ name: '', category_id: '', text: '' });
      } else {
        setError(data.message || 'Ошибка при отправке жалобы');
      }
    } catch (err) {
      console.error('Ошибка отправки:', err);
      setError('Ошибка при отправке жалобы');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="complaint-page">
        <div className="complaint-success">
          <div className="complaint-success-icon">✅</div>
          <h1>Спасибо за обратную связь!</h1>
          <p>Ваша жалоба отправлена и будет рассмотрена администратором.</p>
          <button
            className="complaint-btn-new"
            onClick={() => {
              setSuccess(false);
              setFormData({ name: '', category_id: '', text: '' });
            }}
          >
            Отправить ещё одну
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="complaint-page">
      <div className="complaint-card">
        <div className="complaint-header">
          <h1>📝 Оставить жалобу</h1>
          <p className="complaint-subtitle">
            Мы ценим вашу обратную связь и обязательно рассмотрим каждое обращение
          </p>
        </div>

        {loading ? (
          <p className="complaint-loading">Загрузка...</p>
        ) : (
          <form onSubmit={handleSubmit} className="complaint-form">
            <div className="complaint-form-group">
              <label>Ваше имя *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Введите ваше имя"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="complaint-form-group">
              <label>Категория жалобы *</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                required
                disabled={isSubmitting}
              >
                <option value="">Выберите категорию</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="complaint-form-group">
              <label>Текст жалобы *</label>
              <textarea
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                placeholder="Опишите ситуацию подробно..."
                rows={6}
                required
                disabled={isSubmitting}
              />
            </div>

            {error && <div className="complaint-error">{error}</div>}

            <button
              type="submit"
              className="complaint-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Отправка...' : '📤 Отправить жалобу'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ComplaintPage;