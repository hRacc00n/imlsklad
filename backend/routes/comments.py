from flask import request, jsonify
from db.database import get_db
from db.models import Comment, Order
from routes.sse import sse_publisher
from datetime import datetime
import json

def register_comments_routes(app):
    
    # ===== GET: Получить все комментарии к задаче =====
    @app.route('/api/tasks/<int:task_id>/comments', methods=['GET'])
    def get_comments(task_id):
        with get_db() as db:
            comments = db.query(Comment).filter(
                Comment.task_id == task_id
            ).order_by(Comment.created_at.asc()).all()
            
            return jsonify([c.to_dict() for c in comments]), 200
    
    # ===== POST: Создать комментарий =====
    @app.route('/api/tasks/<int:task_id>/comments', methods=['POST'])
    def create_comment(task_id):
        data = request.get_json()
        author = data.get('author')
        text = data.get('text')
        
        if not author or not text:
            return jsonify({'success': False, 'message': 'Заполните все поля'}), 400
        
        with get_db() as db:
            task = db.query(Order).filter(Order.id == task_id).first()
            if not task:
                return jsonify({'success': False, 'message': 'Задача не найдена'}), 404
            
            comment = Comment(
                task_id=task_id,
                author=author,
                text=text
            )
            db.add(comment)
            db.commit()
            db.refresh(comment)
            
            # ===== УВЕДОМЛЕНИЯ =====
            from services.notification_service import NotificationService
            
            # 1. Добавляем автора в подписчики задачи
            email_data = {}
            if task.email_data:
                try:
                    email_data = json.loads(task.email_data)
                except:
                    pass
            
            if 'comment_subscribers' not in email_data:
                email_data['comment_subscribers'] = []
            
            if author not in email_data['comment_subscribers']:
                email_data['comment_subscribers'].append(author)
                task.email_data = json.dumps(email_data, ensure_ascii=False)
                db.commit()
            
            # 2. Определяем получателей уведомлений
            # Получаем всех пользователей с доступом к хабу
            from utils.file_loader import load_json
            users = load_json('users.json')
            roles = load_json('roles.json')
            hubs = load_json('hubs.json')
            
            hub_type = task.type
            hub = None
            for h in hubs:
                if h['key'] == hub_type:
                    hub = h
                    break
            
            hub_id = hub['id'] if hub else None
            
            # Роли с доступом к хабу
            roles_with_access = []
            if hub_id:
                for role in roles:
                    if 'hub_access' in role and hub_id in role.get('hub_access', []):
                        roles_with_access.append(role['role_key'])
            
            # Получатели: все с доступом к хабу + подписчики на задачу
            subscribers = set(email_data.get('comment_subscribers', []))
            
            for user in users:
                user_name = user['name']
                
                # Пропускаем автора комментария
                if user_name == author:
                    continue
                
                # Проверяем доступ к хабу
                has_access = user.get('role') in roles_with_access
                
                # Проверяем подписку на задачу
                is_subscriber = user_name in subscribers
                
                if has_access or is_subscriber:
                    # Проверяем настройки пользователя
                    settings = user.get('settings', {})
                    if settings.get('notifications_enabled') != False:
                        NotificationService.send(
                            user_name=user_name,
                            notification_type='comment_added',
                            title='Новый комментарий',
                            text=f'{author} оставил комментарий: "{text[:100]}{"..." if len(text) > 100 else ""}"',
                            link=f'/hub/{hub_type}',
                            task_id=task_id
                        )
            
            # ===== SSE события =====
            sse_publisher.publish('comment_created', {
                'task_id': task_id,
                'comment': comment.to_dict()
            })
            
            sse_publisher.publish('comment_count_updated', {
                'task_id': task_id,
                'action': 'created'
            })
            
            return jsonify({
                'success': True,
                'comment': comment.to_dict()
            }), 201
    
    # ===== PUT: Редактировать комментарий =====
    @app.route('/api/comments/<int:comment_id>', methods=['PUT'])
    def update_comment(comment_id):
        data = request.get_json()
        text = data.get('text')
        author = data.get('author')
        
        if not text:
            return jsonify({'success': False, 'message': 'Текст комментария обязателен'}), 400
        
        with get_db() as db:
            comment = db.query(Comment).filter(Comment.id == comment_id).first()
            if not comment:
                return jsonify({'success': False, 'message': 'Комментарий не найден'}), 404
            
            # Проверяем, что автор совпадает
            if comment.author != author:
                return jsonify({'success': False, 'message': 'Нет прав на редактирование'}), 403
            
            comment.text = text
            comment.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(comment)
            
            # Отправляем SSE событие
            sse_publisher.publish('comment_updated', {
                'comment_id': comment_id,
                'comment': comment.to_dict()
            })
            
            return jsonify({
                'success': True,
                'comment': comment.to_dict()
            }), 200
    
    # ===== DELETE: Удалить комментарий (soft delete) =====
    @app.route('/api/comments/<int:comment_id>', methods=['DELETE'])
    def delete_comment(comment_id):
        data = request.get_json() or {}
        author = data.get('author')
        
        with get_db() as db:
            comment = db.query(Comment).filter(Comment.id == comment_id).first()
            if not comment:
                return jsonify({'success': False, 'message': 'Комментарий не найден'}), 404
            
            # Проверяем, что автор совпадает
            if comment.author != author:
                return jsonify({'success': False, 'message': 'Нет прав на удаление'}), 403
            
            comment.is_deleted = True
            comment.updated_at = datetime.utcnow()
            db.commit()
            
            # Отправляем SSE событие
            sse_publisher.publish('comment_deleted', {
                'comment_id': comment_id,
                'task_id': comment.task_id
            })
            
            # Отправляем обновление счётчика
            sse_publisher.publish('comment_count_updated', {
                'task_id': comment.task_id,
                'action': 'deleted'
            })
            
            return jsonify({
                'success': True,
                'message': 'Комментарий удалён'
            }), 200