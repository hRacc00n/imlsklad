import os
import sys
from flask import request, jsonify
from datetime import datetime
from db.database import get_db
from db.models import Complaint, ComplaintCategory
from utils.file_loader import load_json
from routes.sse import sse_publisher


def register_complaints_routes(app):
    
    # ===== СПРАВОЧНИК КАТЕГОРИЙ =====
    
    # ===== GET: Список категорий жалоб =====
    @app.route('/api/complaint-categories', methods=['GET'])
    def get_complaint_categories():
        include_inactive = request.args.get('include_inactive', 'false').lower() == 'true'
        
        with get_db() as db:
            query = db.query(ComplaintCategory)
            if not include_inactive:
                query = query.filter(ComplaintCategory.is_active == True)
            
            categories = query.order_by(ComplaintCategory.name.asc()).all()
            return jsonify([c.to_dict() for c in categories]), 200
    
    # ===== POST: Создать категорию (только админ) =====
    @app.route('/api/complaint-categories', methods=['POST'])
    def create_complaint_category():
        data = request.get_json()
        name = data.get('name', '').strip()
        author = data.get('author', '')
        
        if not name:
            return jsonify({'success': False, 'message': 'Укажите название категории'}), 400
        
        # Проверка прав (только админ)
        users = load_json('users.json')
        is_admin = False
        for u in users:
            if u.get('name') == author and u.get('role') == 'admin':
                is_admin = True
                break
        
        if not is_admin:
            return jsonify({'success': False, 'message': 'Только администратор может создавать категории'}), 403
        
        with get_db() as db:
            existing = db.query(ComplaintCategory).filter(ComplaintCategory.name == name).first()
            if existing:
                return jsonify({'success': False, 'message': 'Такая категория уже существует'}), 400
            
            new_category = ComplaintCategory(
                name=name,
                is_active=True,
                created_at=datetime.utcnow()
            )
            db.add(new_category)
            db.commit()
            db.refresh(new_category)
            
            return jsonify({
                'success': True,
                'category': new_category.to_dict()
            }), 201
    
    # ===== PUT: Обновить категорию (только админ) =====
    @app.route('/api/complaint-categories/<int:category_id>', methods=['PUT'])
    def update_complaint_category(category_id):
        data = request.get_json()
        name = data.get('name', '').strip()
        is_active = data.get('is_active')
        author = data.get('author', '')
        
        # Проверка прав (только админ)
        users = load_json('users.json')
        is_admin = False
        for u in users:
            if u.get('name') == author and u.get('role') == 'admin':
                is_admin = True
                break
        
        if not is_admin:
            return jsonify({'success': False, 'message': 'Только администратор может редактировать категории'}), 403
        
        with get_db() as db:
            category = db.query(ComplaintCategory).filter(ComplaintCategory.id == category_id).first()
            if not category:
                return jsonify({'success': False, 'message': 'Категория не найдена'}), 404
            
            if name:
                existing = db.query(ComplaintCategory).filter(
                    ComplaintCategory.name == name,
                    ComplaintCategory.id != category_id
                ).first()
                if existing:
                    return jsonify({'success': False, 'message': 'Такая категория уже существует'}), 400
                category.name = name
            
            if is_active is not None:
                category.is_active = is_active
            
            category.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(category)
            
            return jsonify({
                'success': True,
                'category': category.to_dict()
            }), 200
    
    # ===== DELETE: Удалить категорию (только админ) =====
    @app.route('/api/complaint-categories/<int:category_id>', methods=['DELETE'])
    def delete_complaint_category(category_id):
        data = request.get_json() or {}
        author = data.get('author', '')
        
        # Проверка прав (только админ)
        users = load_json('users.json')
        is_admin = False
        for u in users:
            if u.get('name') == author and u.get('role') == 'admin':
                is_admin = True
                break
        
        if not is_admin:
            return jsonify({'success': False, 'message': 'Только администратор может удалять категории'}), 403
        
        with get_db() as db:
            category = db.query(ComplaintCategory).filter(ComplaintCategory.id == category_id).first()
            if not category:
                return jsonify({'success': False, 'message': 'Категория не найдена'}), 404
            
            # Мягкое удаление
            category.is_active = False
            category.updated_at = datetime.utcnow()
            db.commit()
            
            return jsonify({
                'success': True,
                'message': 'Категория деактивирована'
            }), 200
    
    # ===== ЖАЛОБЫ =====
    
    # ===== POST: Создать жалобу (ПУБЛИЧНЫЙ, без авторизации) =====
    @app.route('/api/complaints', methods=['POST'])
    def create_complaint():
        data = request.get_json()
        name = data.get('name', '').strip()
        category_id = data.get('category_id')
        text = data.get('text', '').strip()
        
        if not name:
            return jsonify({'success': False, 'message': 'Укажите имя'}), 400
        
        if not category_id:
            return jsonify({'success': False, 'message': 'Выберите категорию'}), 400
        
        if not text:
            return jsonify({'success': False, 'message': 'Введите текст жалобы'}), 400
        
        with get_db() as db:
            # Проверяем, что категория существует
            category = db.query(ComplaintCategory).filter(
                ComplaintCategory.id == category_id,
                ComplaintCategory.is_active == True
            ).first()
            if not category:
                return jsonify({'success': False, 'message': 'Категория не найдена'}), 404
            
            new_complaint = Complaint(
                name=name,
                category_id=category_id,
                text=text,
                status='new',
                created_at=datetime.utcnow()
            )
            db.add(new_complaint)
            db.commit()
            db.refresh(new_complaint)
            
            complaint_dict = new_complaint.to_dict()
            complaint_dict['category_name'] = category.name
            
            # Отправляем уведомления всем админам
            try:
                users = load_json('users.json')
                for u in users:
                    if u.get('role') == 'admin':
                        from services.notification_service import NotificationService
                        NotificationService.send(
                            user_name=u['name'],
                            notification_type='complaint_created',
                            title='😞 Новая жалоба',
                            text=f'{name}: {text[:50]}...',
                            link='/admin/complaints',
                            task_id=new_complaint.id
                        )
            except Exception as e:
                print(f"[Complaint] Ошибка отправки уведомлений: {e}")
            
            # SSE для админов
            sse_publisher.publish('complaint_created', {
                'complaint': complaint_dict
            })
            
            return jsonify({
                'success': True,
                'complaint': complaint_dict
            }), 201
    
    # ===== GET: Список жалоб (админ) =====
    @app.route('/api/complaints', methods=['GET'])
    def get_complaints():
        status_filter = request.args.get('status', '')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        offset = (page - 1) * per_page
        
        with get_db() as db:
            query = db.query(Complaint)
            
            if status_filter:
                query = query.filter(Complaint.status == status_filter)
            
            total_count = query.count()
            complaints = query.order_by(Complaint.created_at.desc()).offset(offset).limit(per_page).all()
            
            result = []
            for complaint in complaints:
                complaint_dict = complaint.to_dict()
                # Добавляем название категории
                category = db.query(ComplaintCategory).filter(
                    ComplaintCategory.id == complaint.category_id
                ).first()
                if category:
                    complaint_dict['category_name'] = category.name
                result.append(complaint_dict)
            
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
    
    # ===== GET: Одна жалоба =====
    @app.route('/api/complaints/<int:complaint_id>', methods=['GET'])
    def get_complaint(complaint_id):
        with get_db() as db:
            complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
            if not complaint:
                return jsonify({'error': 'Жалоба не найдена'}), 404
            
            complaint_dict = complaint.to_dict()
            category = db.query(ComplaintCategory).filter(
                ComplaintCategory.id == complaint.category_id
            ).first()
            if category:
                complaint_dict['category_name'] = category.name
            
            return jsonify(complaint_dict), 200
    
    # ===== PUT: Изменить статус жалобы (админ) =====
    @app.route('/api/complaints/<int:complaint_id>/status', methods=['PUT'])
    def update_complaint_status(complaint_id):
        data = request.get_json()
        status = data.get('status', '')
        author = data.get('author', '')
        
        if status not in ['new', 'confirmed', 'rejected', 'archived']:
            return jsonify({'success': False, 'message': 'Неверный статус'}), 400
        
        # Проверка прав (только админ)
        users = load_json('users.json')
        is_admin = False
        for u in users:
            if u.get('name') == author and u.get('role') == 'admin':
                is_admin = True
                break
        
        if not is_admin:
            return jsonify({'success': False, 'message': 'Только администратор может изменять статус'}), 403
        
        with get_db() as db:
            complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
            if not complaint:
                return jsonify({'success': False, 'message': 'Жалоба не найдена'}), 404
            
            complaint.status = status
            complaint.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(complaint)
            
            complaint_dict = complaint.to_dict()
            category = db.query(ComplaintCategory).filter(
                ComplaintCategory.id == complaint.category_id
            ).first()
            if category:
                complaint_dict['category_name'] = category.name
            
            # SSE
            sse_publisher.publish('complaint_updated', {
                'complaint': complaint_dict
            })
            
            return jsonify({
                'success': True,
                'complaint': complaint_dict
            }), 200