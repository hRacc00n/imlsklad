import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './ComplaintsPage.css';

function ComplaintsPage() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const isAdmin = user?.role === 'admin';

  const loadComplaints = async (currentPage = 1) => {
    setLoading(true);
    try {
      const url = `/api/complaints?status=${statusFilter}&page=${currentPage}&per_page=20`;
      const response = await fetch(url);
      const data = await response.json();
      
      setComplaints(data.data || []);
      setPage(data.pagination?.page || 1);
      setTotalPages(data.pagination?.total_pages || 1);
      setHasNext(data.pagination?.has_next || false);
      setHasPrevious(data.pagination?.has_previous || false);
    } catch (err) {
      console.error('Ошибка загрузки жалоб:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints(1);
  }, [statusFilter]);

  const handleStatusChange = async (complaintId, newStatus) => {
    if (!isAdmin) return;
    
    try {
      const response = await fetch(`/api/complaints/${complaintId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          author: user?.name,
        }),
      });
      const data = await response.json();
      if (data.success) {
        loadComplaints(page);
        if (selectedComplaint && selectedComplaint.id === complaintId) {
          setSelectedComplaint(data.complaint);
        }
      }
    } catch (err) {
      alert('Ошибка при изменении статуса');
    }
  };

  const openDetail = (complaint) => {
    setSelectedComplaint(complaint);
    setShowDetailModal(true);
  };

  const closeDetail = () => {
    setShowDetailModal(false);
    setSelectedComplaint(null);
  };

  const goToPage = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    loadComplaints(newPage);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return dateStr;
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'new': return '🆕 Новая';
      case 'confirmed': return '✅ Подтверждена';
      case 'rejected': return '❌ Отклонена';
      case 'archived': return '📦 В архиве';
      default: return status;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'new': return 'status-new';
      case 'confirmed': return 'status-confirmed';
      case 'rejected': return 'status-rejected';
      case 'archived': return 'status-archived';
      default: return '';
    }
  };

  return (
    <div className="complaints-content">
      <div className="complaints-header">
        <h1>😞 Жалобы</h1>
        <div className="complaints-filter">
          <label>Статус:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Все</option>
            <option value="new">Новые</option>
            <option value="confirmed">Подтверждённые</option>
            <option value="rejected">Отклонённые</option>
            <option value="archived">Архив</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p>Загрузка...</p>
      ) : complaints.length === 0 ? (
        <div className="complaints-empty">
          <p>😞 Нет жалоб</p>
        </div>
      ) : (
        <>
          <div className="complaints-list">
            {complaints.map(complaint => (
              <div 
                key={complaint.id} 
                className={`complaint-card-item ${getStatusClass(complaint.status)}`}
                onClick={() => openDetail(complaint)}
              >
                <div className="complaint-card-header">
                  <div className="complaint-card-name">
                    👤 {complaint.name}
                  </div>
                  <div className="complaint-card-status">
                    {getStatusLabel(complaint.status)}
                  </div>
                </div>
                <div className="complaint-card-category">
                  📂 {complaint.category_name || 'Без категории'}
                </div>
                <div className="complaint-card-text">
                  {complaint.text.length > 150 
                    ? complaint.text.slice(0, 150) + '...' 
                    : complaint.text}
                </div>
                <div className="complaint-card-date">
                  🕐 {formatDate(complaint.created_at)}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="complaints-pagination">
              <button onClick={() => goToPage(page - 1)} disabled={!hasPrevious}>
                ← Назад
              </button>
              <span>Страница {page} из {totalPages}</span>
              <button onClick={() => goToPage(page + 1)} disabled={!hasNext}>
                Вперёд →
              </button>
            </div>
          )}
        </>
      )}

      {/* Модалка просмотра */}
      {showDetailModal && selectedComplaint && (
        <div className="complaints-modal-overlay" onClick={closeDetail}>
          <div className="complaints-modal-content" onClick={e => e.stopPropagation()}>
            <button className="complaints-modal-close" onClick={closeDetail}>✕</button>
            
            <div className={`complaints-modal-status ${getStatusClass(selectedComplaint.status)}`}>
              {getStatusLabel(selectedComplaint.status)}
            </div>

            <div className="complaints-modal-body">
              <h2>Жалоба #{selectedComplaint.id}</h2>
              
              <div className="complaints-modal-field">
                <label>Имя</label>
                <span>👤 {selectedComplaint.name}</span>
              </div>

              <div className="complaints-modal-field">
                <label>Категория</label>
                <span>📂 {selectedComplaint.category_name || 'Без категории'}</span>
              </div>

              <div className="complaints-modal-field">
                <label>Дата</label>
                <span>🕐 {formatDate(selectedComplaint.created_at)}</span>
              </div>

              <div className="complaints-modal-field">
                <label>Текст жалобы</label>
                <div className="complaints-modal-text">
                  {selectedComplaint.text}
                </div>
              </div>

              {isAdmin && (
                <div className="complaints-modal-actions">
                  {selectedComplaint.status === 'new' && (
                    <>
                      <button
                        className="btn-confirm"
                        onClick={() => handleStatusChange(selectedComplaint.id, 'confirmed')}
                      >
                        ✅ Подтвердить
                      </button>
                      <button
                        className="btn-reject"
                        onClick={() => handleStatusChange(selectedComplaint.id, 'rejected')}
                      >
                        ❌ Отклонить
                      </button>
                    </>
                  )}
                  {selectedComplaint.status !== 'archived' && (
                    <button
                      className="btn-archive"
                      onClick={() => handleStatusChange(selectedComplaint.id, 'archived')}
                    >
                      📦 В архив
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ComplaintsPage;