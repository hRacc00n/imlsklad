import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { useModal } from '../contexts/ModalContext';
import GalleryCard from '../components/gallery/GalleryCard';
import GalleryModal from '../components/gallery/GalleryModal';
import SearchBar from '../components/common/SearchBar';
import HubTaskFormModal from '../components/hub/HubTaskFormModal';
import { HUB_TYPES, getHubConfig } from '../config/hubConfigs';
import './GalleryHub.css';

function GalleryHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sse } = useAppContext();
  const { openModal } = useModal();
  const config = getHubConfig(HUB_TYPES.GALLERY);

  // Состояния
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const perPage = config.perPage || 10;

  // Загрузка альбомов
  const loadAlbums = useCallback(async (resetPage = true) => {
    try {
      if (resetPage) setPage(1);
      const currentPage = resetPage ? 1 : page;
      
      const url = `${config.apiUrl}?page=${currentPage}&per_page=${perPage}&search=${encodeURIComponent(searchQuery)}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (resetPage) {
        setAlbums(data.data || []);
      } else {
        setAlbums(prev => [...prev, ...(data.data || [])]);
      }
      
      setTotalPages(data.pagination?.total_pages || 1);
      setHasNext(data.pagination?.has_next || false);
      setLoading(false);
      setLoadingMore(false);
    } catch (err) {
      console.error('Ошибка загрузки альбомов:', err);
      setLoading(false);
      setLoadingMore(false);
    }
  }, [config.apiUrl, page, perPage, searchQuery]);

  // Загрузка комментариев к альбому
  const loadComments = async (albumId) => {
    try {
      setIsLoadingComments(true);
      const response = await fetch(`/api/gallery/${albumId}/comments`);
      const data = await response.json();
      setComments(data || []);
    } catch (err) {
      console.error('Ошибка загрузки комментариев:', err);
    } finally {
      setIsLoadingComments(false);
    }
  };

  // Обновление при поиске
  useEffect(() => {
    loadAlbums(true);
  }, [searchQuery]);

  // SSE обновления
  // SSE обновления
  useEffect(() => {
    const handleSSEEvent = (event) => {
        const data = event.detail;
        console.log('[GalleryHub] SSE событие:', data);
        
        if (data.type === 'gallery_updated') {
            // Перезагружаем список альбомов
            loadAlbums(true);
            
            // Если открыт альбом и он обновлён — перезагружаем его
            if (selectedAlbum && data.data?.album_id === selectedAlbum.id) {
                // Перезагружаем комментарии
                loadComments(selectedAlbum.id);
                
                // Перезагружаем данные альбома
                fetch(`/api/gallery/${selectedAlbum.id}`)
                    .then(r => r.json())
                    .then(updatedAlbum => {
                        setSelectedAlbum(updatedAlbum);
                    })
                    .catch(err => console.error('Ошибка обновления альбома:', err));
            }
            
            // Если комментарий добавлен/изменён/удалён и открыт альбом
            if (selectedAlbum && (
                data.data?.action === 'comment_created' ||
                data.data?.action === 'comment_updated' ||
                data.data?.action === 'comment_deleted'
            )) {
                loadComments(selectedAlbum.id);
            }
            
            // Если фото добавлены и открыт альбом
            if (selectedAlbum && data.data?.action === 'updated') {
                // Перезагружаем данные альбома, чтобы обновить список фото
                fetch(`/api/gallery/${selectedAlbum.id}`)
                    .then(r => r.json())
                    .then(updatedAlbum => {
                        setSelectedAlbum(updatedAlbum);
                    })
                    .catch(err => console.error('Ошибка обновления альбома:', err));
            }
        }
    };

    window.addEventListener('sse-message', handleSSEEvent);
    return () => window.removeEventListener('sse-message', handleSSEEvent);
}, [loadAlbums, selectedAlbum]);

  // Обработчики
  const handleBack = () => navigate('/');

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleLoadMore = () => {
    if (hasNext && !loadingMore) {
      setLoadingMore(true);
      setPage(prev => prev + 1);
      loadAlbums(false);
    }
  };

  const handleCreateSubmit = async (values, photos) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: values.city,
          description: values.description || '',
          author: user?.name || 'Неизвестно',
          photos: photos || [],
        }),
      });
      const data = await response.json();
      if (data.success) {
        setShowCreateModal(false);
        loadAlbums(true);
        
        // Отправляем SSE событие об обновлении
        window.dispatchEvent(new CustomEvent('sse-message', {
          detail: { type: 'gallery_updated' }
        }));
      } else {
        alert(data.message || 'Ошибка при создании альбома');
      }
    } catch (err) {
      console.error('Ошибка создания альбома:', err);
      alert('Ошибка при создании альбома');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAlbumClick = async (album) => {
    setSelectedAlbum(album);
    await loadComments(album.id);
    setIsModalOpen(true);
  };

  const handleUpdateAlbum = async (albumId, data) => {
    try {
      const response = await fetch(`/api/gallery/${albumId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.success) {
        loadAlbums(true);
        setSelectedAlbum(result.album);
        await loadComments(albumId);
        
        window.dispatchEvent(new CustomEvent('sse-message', {
          detail: { type: 'gallery_updated' }
        }));
      } else {
        alert(result.message || 'Ошибка при обновлении альбома');
      }
    } catch (err) {
      console.error('Ошибка обновления альбома:', err);
      alert('Ошибка при обновлении альбома');
    }
  };

  const handleDeleteAlbum = async (albumId) => {
    try {
      const response = await fetch(`/api/gallery/${albumId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: user?.name,
          user_role: user?.role,
        }),
      });
      const result = await response.json();
      if (result.success) {
        loadAlbums(true);
        setIsModalOpen(false);
        setSelectedAlbum(null);
        
        window.dispatchEvent(new CustomEvent('sse-message', {
          detail: { type: 'gallery_updated' }
        }));
      } else {
        alert(result.message || 'Ошибка при удалении альбома');
      }
    } catch (err) {
      console.error('Ошибка удаления альбома:', err);
      alert('Ошибка при удалении альбома');
    }
  };

  const handleAddComment = async (albumId, text) => {
    try {
      const response = await fetch(`/api/gallery/${albumId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: user?.name || 'Неизвестно',
          text: text,
        }),
      });
      const result = await response.json();
      if (result.success) {
        await loadComments(albumId);
        // Обновляем альбом чтобы обновить счетчик комментариев
        const updatedAlbum = await fetch(`/api/gallery/${albumId}`).then(r => r.json());
        setSelectedAlbum(updatedAlbum);
      } else {
        alert(result.message || 'Ошибка при добавлении комментария');
      }
    } catch (err) {
      console.error('Ошибка добавления комментария:', err);
      alert('Ошибка при добавлении комментария');
    }
  };

  const handleEditComment = async (commentId, newText) => {
    try {
      const response = await fetch(`/api/gallery/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: user?.name,
          text: newText,
        }),
      });
      const result = await response.json();
      if (result.success) {
        if (selectedAlbum) {
          await loadComments(selectedAlbum.id);
        }
      } else {
        alert(result.message || 'Ошибка при редактировании комментария');
      }
    } catch (err) {
      console.error('Ошибка редактирования комментария:', err);
      alert('Ошибка при редактировании комментария');
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const response = await fetch(`/api/gallery/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: user?.name,
        }),
      });
      const result = await response.json();
      if (result.success) {
        if (selectedAlbum) {
          await loadComments(selectedAlbum.id);
        }
      } else {
        alert(result.message || 'Ошибка при удалении комментария');
      }
    } catch (err) {
      console.error('Ошибка удаления комментария:', err);
      alert('Ошибка при удалении комментария');
    }
  };

  // Формируем поля формы из конфигурации
  const formFields = config.formFields || [];

  return (
    <div className="gallery-hub">
      <div className="gallery-hub-header">
        <h1>🖼️ {config.title}</h1>
        <div className="gallery-hub-actions">
          <SearchBar
            onSearch={handleSearch}
            placeholder="Поиск по городу..."
          />
          <button className="gallery-hub-btn-create" onClick={() => setShowCreateModal(true)}>
            ➕ Создать альбом
          </button>
          <button className="gallery-hub-btn-back" onClick={handleBack}>
            ← Назад
          </button>
        </div>
      </div>

      {loading && albums.length === 0 ? (
        <p className="gallery-hub-loading">Загрузка...</p>
      ) : albums.length === 0 ? (
        <div className="gallery-hub-empty">
          <p>📷 Нет альбомов</p>
          <p className="gallery-hub-empty-hint">Создайте первый альбом, нажав кнопку "Создать альбом"</p>
        </div>
      ) : (
        <>
          <div className="gallery-hub-grid">
            {albums.map((album) => (
              <GalleryCard
                key={album.id}
                album={album}
                onClick={handleAlbumClick}
                onDelete={handleDeleteAlbum}
                currentUser={user}
                userRole={user?.role}
              />
            ))}
          </div>

          {hasNext && (
            <div className="gallery-hub-load-more">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="gallery-hub-load-more-btn"
              >
                {loadingMore ? 'Загрузка...' : 'Показать еще'}
              </button>
              <span className="gallery-hub-load-more-info">
                Показано {albums.length} альбомов
              </span>
            </div>
          )}
        </>
      )}

      {/* Модалка создания альбома */}
      <HubTaskFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateSubmit}
        title="🖼️ Создать альбом"
        fields={formFields}
        initialValues={{}}
        initialPhotos={[]}
        submitLabel="Создать"
        isSubmitting={isSubmitting}
      />

      {/* Модалка просмотра альбома */}
      <GalleryModal
        isOpen={isModalOpen}
        album={selectedAlbum}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAlbum(null);
          setComments([]);
        }}
        onUpdate={handleUpdateAlbum}
        onAddComment={handleAddComment}
        currentUser={user}
        userRole={user?.role}
        comments={comments}
        onCommentEdit={handleEditComment}
        onCommentDelete={handleDeleteComment}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

export default GalleryHub;