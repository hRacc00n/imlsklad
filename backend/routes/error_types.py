import os
import sys
from flask import request, jsonify
from datetime import datetime
from db.database import get_db
from db.models import ErrorType
from utils.file_loader import load_json


def register_error_types_routes(app):
    
    # ===== GET: Список всех типов ошибок =====
    @app.route('/api/error-types', methods=['GET'])
    def get_error_types():
        include_inactive = request.args.get('include_inactive', 'false').lower() == 'true'
        
        with get_db() as db:
            query = db.query(ErrorType)
            if not include_inactive:
                query = query.filter(ErrorType.is_active == True)
            
            types = query.order_by(ErrorType.name.asc()).all()
            return jsonify([t.to_dict() for t in types]), 200
    
    # ===== POST: Создать тип ошибки (только админ) =====
    @app.route('/api/error-types', methods=['POST'])
    def create_error_type():
        data = request.get_json()
        name = data.get('name', '').strip()
        author = data.get('author', '')
        
        if not name:
            return jsonify({'success': False, 'message': 'Укажите название типа ошибки'}), 400
        
        # Проверка прав (только админ)
        users = load_json('users.json')
        is_admin = False
        for u in users:
            if u.get('name') == author and u.get('role') == 'admin':
                is_admin = True
                break
        
        if not is_admin:
            return jsonify({'success': False, 'message': 'Только администратор может создавать типы ошибок'}), 403
        
        with get_db() as db:
            # Проверяем, нет ли уже такого типа
            existing = db.query(ErrorType).filter(ErrorType.name == name).first()
            if existing:
                return jsonify({'success': False, 'message': 'Такой тип ошибки уже существует'}), 400
            
            new_type = ErrorType(
                name=name,
                is_active=True,
                created_at=datetime.utcnow()
            )
            db.add(new_type)
            db.commit()
            db.refresh(new_type)
            
            return jsonify({
                'success': True,
                'error_type': new_type.to_dict()
            }), 201
    
    # ===== PUT: Обновить тип ошибки (только админ) =====
    @app.route('/api/error-types/<int:type_id>', methods=['PUT'])
    def update_error_type(type_id):
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
            return jsonify({'success': False, 'message': 'Только администратор может редактировать типы ошибок'}), 403
        
        with get_db() as db:
            error_type = db.query(ErrorType).filter(ErrorType.id == type_id).first()
            if not error_type:
                return jsonify({'success': False, 'message': 'Тип ошибки не найден'}), 404
            
            if name:
                # Проверяем уникальность
                existing = db.query(ErrorType).filter(
                    ErrorType.name == name,
                    ErrorType.id != type_id
                ).first()
                if existing:
                    return jsonify({'success': False, 'message': 'Такой тип ошибки уже существует'}), 400
                error_type.name = name
            
            if is_active is not None:
                error_type.is_active = is_active
            
            error_type.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(error_type)
            
            return jsonify({
                'success': True,
                'error_type': error_type.to_dict()
            }), 200
    
    # ===== DELETE: Удалить тип ошибки (только админ) =====
    @app.route('/api/error-types/<int:type_id>', methods=['DELETE'])
    def delete_error_type(type_id):
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
            return jsonify({'success': False, 'message': 'Только администратор может удалять типы ошибок'}), 403
        
        with get_db() as db:
            error_type = db.query(ErrorType).filter(ErrorType.id == type_id).first()
            if not error_type:
                return jsonify({'success': False, 'message': 'Тип ошибки не найден'}), 404
            
            # Мягкое удаление (деактивация)
            error_type.is_active = False
            error_type.updated_at = datetime.utcnow()
            db.commit()
            
            return jsonify({
                'success': True,
                'message': 'Тип ошибки деактивирован'
            }), 200