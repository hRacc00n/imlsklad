from flask import request, jsonify
from db.database import get_db
from db.models import Notification
from routes.sse import sse_publisher
from datetime import datetime, timedelta

def register_notifications_routes(app):
    
    @app.route('/api/notifications', methods=['GET'])
    def get_notifications():
        user_name = request.args.get('user_name', '')
        limit = request.args.get('limit', 20, type=int)
        only_unread = request.args.get('only_unread', 'false').lower() == 'true'
        
        if not user_name:
            return jsonify({'error': 'user_name required'}), 400
        
        with get_db() as db:
            query = db.query(Notification).filter(Notification.user_id == user_name)
            
            if only_unread:
                query = query.filter(Notification.is_read == False)
            
            notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()
            
            return jsonify([n.to_dict() for n in notifications]), 200
    
    @app.route('/api/notifications/unread_count', methods=['GET'])
    def get_unread_count():
        user_name = request.args.get('user_name', '')
        
        if not user_name:
            return jsonify({'error': 'user_name required'}), 400
        
        with get_db() as db:
            count = db.query(Notification).filter(
                Notification.user_id == user_name,
                Notification.is_read == False
            ).count()
            
            return jsonify({'count': count}), 200
    
    @app.route('/api/notifications/<int:notification_id>/read', methods=['PUT'])
    def mark_as_read(notification_id):
        with get_db() as db:
            notification = db.query(Notification).filter(Notification.id == notification_id).first()
            if not notification:
                return jsonify({'error': 'Notification not found'}), 404
            
            notification.is_read = True
            db.commit()
            
            # Обновляем счётчик
            user_name = notification.user_id
            count = db.query(Notification).filter(
                Notification.user_id == user_name,
                Notification.is_read == False
            ).count()
            
            sse_publisher.publish('notification_count_updated', {
                'user_name': user_name,
                'count': count
            })
            
            return jsonify({'success': True}), 200
    
    @app.route('/api/notifications/mark_all_read', methods=['PUT'])
    def mark_all_read():
        user_name = request.args.get('user_name', '')
        
        if not user_name:
            return jsonify({'error': 'user_name required'}), 400
        
        with get_db() as db:
            db.query(Notification).filter(
                Notification.user_id == user_name,
                Notification.is_read == False
            ).update({'is_read': True})
            db.commit()
            
            sse_publisher.publish('notification_count_updated', {
                'user_name': user_name,
                'count': 0
            })
            
            return jsonify({'success': True}), 200