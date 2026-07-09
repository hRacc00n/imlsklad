from flask import request, jsonify
from db.database import get_db
from db.models import Comment, Order
from routes.sse import sse_publisher
from datetime import datetime

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
            # Проверяем, что задача существует
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
            
            # Отправляем SSE событие
            sse_publisher.publish('comment_created', {
                'task_id': task_id,
                'comment': comment.to_dict()
            })
            
            # Также отправляем обновление счётчика комментариев
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