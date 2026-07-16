import os
import json
import uuid
import base64
from flask import request, jsonify, send_from_directory
from datetime import datetime, timedelta
from db.database import get_db
from db.models import GalleryAlbum, GalleryComment
from routes.sse import sse_publisher

def register_gallery_routes(app):
    
    # ===== GET: Список альбомов (с пагинацией и поиском) =====
    @app.route('/api/gallery', methods=['GET'])
    def get_gallery_albums():
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '')
        offset = (page - 1) * per_page
        
        with get_db() as db:
            query = db.query(GalleryAlbum)
            all_albums = query.order_by(GalleryAlbum.created_at.desc()).all()
            
            # Поиск по полям (регистронезависимый через Python, как в других хабах)
            if search:
                search_terms = search.strip().split()
                filtered_albums = []
                for album in all_albums:
                    # Собираем текст для поиска (город + описание)
                    text = f"{album.city or ''} {album.description or ''}".lower()
                    # Проверяем, что все термы входят в текст
                    match = all(term.lower() in text for term in search_terms)
                    if match:
                        filtered_albums.append(album)
                
                total_count = len(filtered_albums)
                albums = filtered_albums[offset:offset + per_page]
            else:
                total_count = len(all_albums)
                albums = all_albums[offset:offset + per_page]
            
            result = []
            for album in albums:
                album_dict = album.to_dict()
                comments_count = db.query(GalleryComment).filter(
                    GalleryComment.album_id == album.id,
                    GalleryComment.is_deleted == False
                ).count()
                album_dict['comments_count'] = comments_count
                result.append(album_dict)
            
            return jsonify({
                'data': result,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': total_count,
                    'total_pages': (total_count + per_page - 1) // per_page,
                    'has_next': page * per_page < total_count,
                    'has_previous': page > 1
                }
            }), 200
    
    # ===== GET: Статистика галереи =====
    @app.route('/api/gallery/stats', methods=['GET'])
    def get_gallery_stats():
        with get_db() as db:
            total_count = db.query(GalleryAlbum).count()
            
            response = jsonify({
                'active_count': total_count,
                'total_count': total_count
            })
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            return response, 200
    
    # ===== POST: Создать альбом =====
    @app.route('/api/gallery', methods=['POST'])
    def create_gallery_album():
        data = request.get_json()
        city = data.get('city', '').strip()
        description = data.get('description', '').strip()
        author = data.get('author', 'Неизвестно')
        photos = data.get('photos', [])
        
        if not city:
            return jsonify({'success': False, 'message': 'Укажите город'}), 400
        
        # Сохраняем фото
        saved_photos = []
        if photos:
            upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'uploads', 'gallery')
            os.makedirs(upload_dir, exist_ok=True)
            
            for idx, photo_base64 in enumerate(photos):
                try:
                    if not photo_base64:
                        continue
                    
                    if ',' in photo_base64:
                        _, data_str = photo_base64.split(',', 1)
                    else:
                        data_str = photo_base64
                    
                    image_data = base64.b64decode(data_str)
                    
                    if len(image_data) < 100:
                        continue
                    
                    filename = f"album_{uuid.uuid4().hex[:8]}_{datetime.now().strftime('%Y%m%d%H%M%S')}.jpg"
                    filepath = os.path.join(upload_dir, filename)
                    
                    with open(filepath, 'wb') as f:
                        f.write(image_data)
                    
                    saved_photos.append(f"/uploads/gallery/{filename}")
                    
                except Exception as e:
                    print(f"Ошибка сохранения фото: {e}")
                    continue
        
        with get_db() as db:
            new_album = GalleryAlbum(
                city=city,
                author=author,
                description=description,
                photos=json.dumps(saved_photos, ensure_ascii=False) if saved_photos else None,
                created_at=datetime.utcnow()
            )
            db.add(new_album)
            db.commit()
            db.refresh(new_album)

            # Отправляем SSE событие
            sse_publisher.publish('gallery_updated', {
                'action': 'created',
                'album_id': new_album.id,
                'album': new_album.to_dict()
            })
            
            return jsonify({
                'success': True,
                'album': new_album.to_dict()
            }), 201
    
    # ===== GET: Получить альбом по ID =====
    @app.route('/api/gallery/<int:album_id>', methods=['GET'])
    def get_gallery_album(album_id):
        with get_db() as db:
            album = db.query(GalleryAlbum).filter(GalleryAlbum.id == album_id).first()
            if not album:
                return jsonify({'error': 'Альбом не найден'}), 404
            
            return jsonify(album.to_dict()), 200
    
    # ===== PUT: Обновить альбом (добавить фото, изменить описание) =====
    @app.route('/api/gallery/<int:album_id>', methods=['PUT'])
    def update_gallery_album(album_id):
        data = request.get_json()
        description = data.get('description')
        photos = data.get('photos', [])
        author = data.get('author', '')
        
        with get_db() as db:
            album = db.query(GalleryAlbum).filter(GalleryAlbum.id == album_id).first()
            if not album:
                return jsonify({'success': False, 'message': 'Альбом не найден'}), 404
            
            # Проверка прав: только автор может менять описание
            # Если description передан и отличается от текущего, и пользователь не автор — ошибка
            if description is not None and description != album.description and album.author != author:
                return jsonify({'success': False, 'message': 'Только автор может менять описание'}), 403
            
            # Обновляем описание (только если оно изменилось)
            if description is not None and description != album.description:
                album.description = description
            
            # Сохраняем новые фото (может любой пользователь)
            if photos:
                upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'uploads', 'gallery')
                os.makedirs(upload_dir, exist_ok=True)
                
                saved_photos = []
                
                # Загружаем существующие фото
                existing_photos = []
                if album.photos:
                    try:
                        existing_photos = json.loads(album.photos)
                    except:
                        pass
                
                # Добавляем новые фото
                for idx, photo_base64 in enumerate(photos):
                    try:
                        if not photo_base64:
                            continue
                        
                        if ',' in photo_base64:
                            _, data_str = photo_base64.split(',', 1)
                        else:
                            data_str = photo_base64
                        
                        image_data = base64.b64decode(data_str)
                        
                        if len(image_data) < 100:
                            continue
                        
                        filename = f"album_{uuid.uuid4().hex[:8]}_{datetime.now().strftime('%Y%m%d%H%M%S')}.jpg"
                        filepath = os.path.join(upload_dir, filename)
                        
                        with open(filepath, 'wb') as f:
                            f.write(image_data)
                        
                        saved_photos.append(f"/uploads/gallery/{filename}")
                        
                    except Exception as e:
                        print(f"Ошибка сохранения фото: {e}")
                        continue
                
                # Объединяем старые и новые фото
                all_photos = existing_photos + saved_photos
                album.photos = json.dumps(all_photos, ensure_ascii=False)
            
            album.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(album)
            
            # Отправляем SSE событие
            sse_publisher.publish('gallery_updated', {
                'action': 'updated',
                'album_id': album.id,
                'album': album.to_dict()
            })
            
            return jsonify({
                'success': True,
                'album': album.to_dict()
            }), 200
    
    # ===== DELETE: Удалить альбом =====
    @app.route('/api/gallery/<int:album_id>', methods=['DELETE'])
    def delete_gallery_album(album_id):
        data = request.get_json()
        author = data.get('author', '')
        user_role = data.get('user_role', '')
        
        with get_db() as db:
            album = db.query(GalleryAlbum).filter(GalleryAlbum.id == album_id).first()
            if not album:
                return jsonify({'success': False, 'message': 'Альбом не найден'}), 404
            
            # Проверка прав: только автор или администратор
            if album.author != author and user_role != 'admin':
                return jsonify({'success': False, 'message': 'Нет прав на удаление этого альбома'}), 403
            
            # Удаляем файлы фото
            if album.photos:
                try:
                    photos_list = json.loads(album.photos)
                    upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'uploads', 'gallery')
                    for photo_path in photos_list:
                        try:
                            filename = os.path.basename(photo_path)
                            filepath = os.path.join(upload_dir, filename)
                            if os.path.exists(filepath):
                                os.remove(filepath)
                        except Exception as e:
                            print(f"Ошибка удаления фото {photo_path}: {e}")
                except:
                    pass
            
            # Удаляем комментарии к альбому
            db.query(GalleryComment).filter(GalleryComment.album_id == album_id).delete()
            
            # Удаляем альбом
            db.delete(album)
            db.commit()

            # Отправляем SSE событие
            sse_publisher.publish('gallery_updated', {
                'action': 'deleted',
                'album_id': album_id
            })
            
            return jsonify({
                'success': True,
                'message': 'Альбом удалён'
            }), 200
    
    # ===== GET: Комментарии к альбому =====
    @app.route('/api/gallery/<int:album_id>/comments', methods=['GET'])
    def get_gallery_comments(album_id):
        with get_db() as db:
            comments = db.query(GalleryComment).filter(
                GalleryComment.album_id == album_id,
                GalleryComment.is_deleted == False
            ).order_by(GalleryComment.created_at.asc()).all()
            
            result = [comment.to_dict() for comment in comments]
            return jsonify(result), 200
    
    # ===== POST: Добавить комментарий к альбому =====
    @app.route('/api/gallery/<int:album_id>/comments', methods=['POST'])
    def create_gallery_comment(album_id):
        data = request.get_json()
        author = data.get('author', 'Неизвестно')
        text = data.get('text', '').strip()
        
        if not text:
            return jsonify({'success': False, 'message': 'Текст комментария не может быть пустым'}), 400
        
        with get_db() as db:
            # Проверяем, существует ли альбом
            album = db.query(GalleryAlbum).filter(GalleryAlbum.id == album_id).first()
            if not album:
                return jsonify({'success': False, 'message': 'Альбом не найден'}), 404
            
            new_comment = GalleryComment(
                album_id=album_id,
                author=author,
                text=text,
                created_at=datetime.utcnow()
            )
            db.add(new_comment)
            db.commit()
            db.refresh(new_comment)

            # Отправляем SSE событие
            sse_publisher.publish('gallery_updated', {
                'action': 'comment_created',
                'album_id': album_id,
                'comment': new_comment.to_dict()
            })
            
            return jsonify({
                'success': True,
                'comment': new_comment.to_dict()
            }), 201
    
    # ===== PUT: Редактировать комментарий =====
    @app.route('/api/gallery/comments/<int:comment_id>', methods=['PUT'])
    def update_gallery_comment(comment_id):
        data = request.get_json()
        author = data.get('author', '')
        text = data.get('text', '').strip()
        
        if not text:
            return jsonify({'success': False, 'message': 'Текст комментария не может быть пустым'}), 400
        
        with get_db() as db:
            comment = db.query(GalleryComment).filter(GalleryComment.id == comment_id).first()
            if not comment:
                return jsonify({'success': False, 'message': 'Комментарий не найден'}), 404
            
            # Проверка прав: только автор может редактировать
            if comment.author != author:
                return jsonify({'success': False, 'message': 'Нет прав на редактирование этого комментария'}), 403
            
            comment.text = text
            comment.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(comment)

            # Отправляем SSE событие
            sse_publisher.publish('gallery_updated', {
                'action': 'comment_updated',
                'album_id': comment.album_id,
                'comment': comment.to_dict()
            })
            
            return jsonify({
                'success': True,
                'comment': comment.to_dict()
            }), 200
    
    # ===== DELETE: Удалить комментарий (soft delete) =====
    @app.route('/api/gallery/comments/<int:comment_id>', methods=['DELETE'])
    def delete_gallery_comment(comment_id):
        data = request.get_json()
        author = data.get('author', '')
        
        with get_db() as db:
            comment = db.query(GalleryComment).filter(GalleryComment.id == comment_id).first()
            if not comment:
                return jsonify({'success': False, 'message': 'Комментарий не найден'}), 404
            
            # Проверка прав: только автор может удалить
            if comment.author != author:
                return jsonify({'success': False, 'message': 'Нет прав на удаление этого комментария'}), 403
            
            comment.is_deleted = True
            comment.updated_at = datetime.utcnow()
            db.commit()

            # Отправляем SSE событие
            sse_publisher.publish('gallery_updated', {
                'action': 'comment_deleted',
                'album_id': comment.album_id,
                'comment_id': comment_id
            })
            
            return jsonify({
                'success': True,
                'message': 'Комментарий удалён'
            }), 200
    
    # ===== GET: Раздача файлов галереи =====
    @app.route('/uploads/gallery/<filename>')
    def uploaded_gallery(filename):
        upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'uploads', 'gallery')
        return send_from_directory(upload_dir, filename)