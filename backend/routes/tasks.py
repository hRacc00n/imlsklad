import os
import base64
import uuid
from flask import request, jsonify
from db.database import get_db
from db.models import Order, OrderHistory
import json
import glob
from datetime import datetime, timedelta, timezone
from routes.sse import sse_publisher

def register_tasks_routes(app):
    
    # ===== GET: Получить все задачи типа "arrival" =====
    @app.route('/api/tasks/arrivals', methods=['GET'])
    def get_arrivals():
        # Получаем параметры из запроса
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        hide_completed = request.args.get('hide_completed', 'false').lower() == 'true'
        offset = (page - 1) * per_page
        
        with get_db() as db:
            # Базовый запрос - только задачи типа "arrival"
            query = db.query(Order).filter(Order.type == 'arrival')
            
            # Если нужно скрыть выполненные - фильтруем
            if hide_completed:
                query = query.filter(Order.status != 'completed')
            
            # Получаем общее количество (с учётом фильтра)
            total_count = query.count()
            
            # Получаем задачи с пагинацией
            tasks = query.order_by(Order.created_at.desc())\
                .offset(offset)\
                .limit(per_page)\
                .all()
            
            # Формируем результат
            result = []
            for task in tasks:
                email_data = {}
                if task.email_data:
                    try:
                        email_data = json.loads(task.email_data)
                    except:
                        pass
                
                # Приводим статус к единому формату (на случай если в БД есть русские статусы)
                status = task.status
                if status == 'Новая':
                    status = 'new'
                elif status == 'В работе':
                    status = 'in_progress'
                elif status == 'Завершена':
                    status = 'completed'
                
                result.append({
                    'id': task.id,
                    'author': email_data.get('author', 'Неизвестно'),
                    'created_at': task.created_at.strftime('%Y-%m-%d %H:%M') if task.created_at else '',
                    'supplier': email_data.get('supplier', task.client or 'Неизвестно'),
                    'comment': task.description or '',
                    'assigned_to': task.assigned_to,
                    'status': status,
                    'comments_count': 0,
                    'photos': email_data.get('photos', []),
                })
            
            # Возвращаем данные с мета-информацией о пагинации
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
    
    # ===== POST: Создать задачу типа "arrival" =====
    @app.route('/api/tasks/arrivals', methods=['POST'])
    def create_arrival():
        data = request.get_json()
        supplier = data.get('supplier')
        comment = data.get('comment')
        author = data.get('author', 'Неизвестно')
        
        if not supplier:
            return jsonify({'success': False, 'message': 'Заполните поле "Кто привез"'}), 400
        
        with get_db() as db:
            new_task = Order(
                tracking=f"ARR-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                client=supplier,
                type='arrival',
                status='new',
                description=comment,
                assigned_to=None,
                created_at=datetime.now(),
                email_data=json.dumps({
                    'author': author,
                    'supplier': supplier,
                    'comment': comment
                })
            )
            db.add(new_task)
            db.commit()
            db.refresh(new_task)
            
            history = OrderHistory(
                order_id=new_task.id,
                user_id=0,
                action='created',
                new_status='new',
                comment='Задача создана'
            )
            db.add(history)
            db.commit()
            
            # ===== ОТПРАВЛЯЕМ СОБЫТИЕ =====
            sse_publisher.publish('task_created', {
                'task_id': new_task.id,
                'type': 'arrival'
            })
            
            return jsonify({
                'success': True,
                'task': {
                    'id': new_task.id,
                    'author': author,
                    'created_at': new_task.created_at.strftime('%Y-%m-%d %H:%M') if new_task.created_at else '',
                    'supplier': supplier,
                    'comment': comment,
                    'photos': [],
                    'assigned_to': None,
                    'status': 'new',
                    'comments_count': 0
                }
            }), 201
    
    # ===== PUT: Взять задачу в работу =====
    @app.route('/api/tasks/<int:task_id>/take', methods=['PUT'])
    def take_task(task_id):
        data = request.get_json()
        user_name = data.get('user_name', 'Неизвестно')
        
        with get_db() as db:
            task = db.query(Order).filter(Order.id == task_id).first()
            if not task:
                return jsonify({'success': False, 'message': 'Задача не найдена'}), 404
            
            if task.status != 'new':
                return jsonify({'success': False, 'message': 'Задача уже в работе'}), 400
            
            task.status = 'in_progress'
            task.assigned_to = user_name
            task.updated_at = datetime.utcnow()
            db.commit()
            
            # ===== ОТПРАВЛЯЕМ СОБЫТИЕ =====
            sse_publisher.publish('task_updated', {
                'task_id': task.id,
                'type': 'arrival',
                'action': 'taken',
                'assigned_to': user_name
            })
            
            return jsonify({'success': True, 'task': {
                'id': task.id,
                'status': task.status,
                'assigned_to': task.assigned_to
            }}), 200
    
    # ===== PUT: Выполнить задачу =====
    @app.route('/api/tasks/<int:task_id>/complete', methods=['PUT'])
    def complete_task(task_id):
        with get_db() as db:
            task = db.query(Order).filter(Order.id == task_id).first()
            if not task:
                return jsonify({'success': False, 'message': 'Задача не найдена'}), 404
            
            if task.status != 'in_progress':
                return jsonify({'success': False, 'message': 'Задача не в работе'}), 400
            
            task.status = 'completed'
            task.updated_at = datetime.utcnow()
            db.commit()
            
            # ===== ОТПРАВЛЯЕМ СОБЫТИЕ =====
            sse_publisher.publish('task_updated', {
                'task_id': task.id,
                'type': 'arrival',
                'action': 'completed'
            })
            
            return jsonify({'success': True, 'task': {
                'id': task.id,
                'status': task.status
            }}), 200
    
    # ===== PUT: Отказаться от задачи =====
    @app.route('/api/tasks/<int:task_id>/decline', methods=['PUT'])
    def decline_task(task_id):
        with get_db() as db:
            task = db.query(Order).filter(Order.id == task_id).first()
            if not task:
                return jsonify({'success': False, 'message': 'Задача не найдена'}), 404
            
            if task.status != 'in_progress':
                return jsonify({'success': False, 'message': 'Задача не в работе'}), 400
            
            task.status = 'new'
            task.assigned_to = None
            task.updated_at = datetime.utcnow()
            db.commit()
            
            # ===== ОТПРАВЛЯЕМ СОБЫТИЕ =====
            sse_publisher.publish('task_updated', {
                'task_id': task.id,
                'type': 'arrival',
                'action': 'declined'
            })
            
            return jsonify({'success': True, 'task': {
                'id': task.id,
                'status': task.status,
                'assigned_to': None
            }}), 200

      # ===== POST: Загрузить фото для задачи =====
    @app.route('/api/tasks/<int:task_id>/photos', methods=['POST'])
    def upload_photos(task_id):
        try:
            data = request.get_json()
            photos = data.get('photos', [])
            
            if not photos:
                return jsonify({'success': False, 'message': 'Нет фото для загрузки'}), 400
            
            saved_photos = []
            upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'uploads', 'photos')
            os.makedirs(upload_dir, exist_ok=True)
            
            for idx, photo_base64 in enumerate(photos):
                try:
                    # Проверяем, что это base64 строка
                    if not photo_base64:
                        continue
                        
                    # Убираем префикс data:image/jpeg;base64,
                    if ',' in photo_base64:
                        _, data_str = photo_base64.split(',', 1)
                    else:
                        data_str = photo_base64
                    
                    # Декодируем base64
                    image_data = base64.b64decode(data_str)
                    
                    # Проверяем, что это изображение (магия JPEG)
                    if len(image_data) < 100:
                        continue
                    
                    # Генерируем уникальное имя
                    filename = f"task_{task_id}_{uuid.uuid4().hex[:8]}.jpg"
                    filepath = os.path.join(upload_dir, filename)
                    
                    with open(filepath, 'wb') as f:
                        f.write(image_data)
                    
                    saved_photos.append(f"/uploads/photos/{filename}")
                    
                except Exception as e:
                    print(f"Ошибка обработки фото {idx}: {e}")
                    continue
            
            if not saved_photos:
                return jsonify({'success': False, 'message': 'Не удалось сохранить фото'}), 500
            
            # Обновляем БД
            with get_db() as db:
                task = db.query(Order).filter(Order.id == task_id).first()
                if not task:
                    return jsonify({'success': False, 'message': 'Задача не найдена'}), 404
                
                email_data = {}
                if task.email_data:
                    try:
                        email_data = json.loads(task.email_data)
                    except:
                        pass
                
                if 'photos' not in email_data:
                    email_data['photos'] = []
                
                email_data['photos'].extend(saved_photos)
                task.email_data = json.dumps(email_data, ensure_ascii=False)
                db.commit()
                
                return jsonify({
                    'success': True,
                    'photos': saved_photos
                }), 200
                
        except Exception as e:
            print(f"Ошибка в upload_photos: {e}")
            return jsonify({'success': False, 'message': str(e)}), 500

    # ===== PUT: Обновить задачу =====
    @app.route('/api/tasks/<int:task_id>', methods=['PUT'])
    def update_task(task_id):
        try:
            data = request.get_json()
            supplier = data.get('supplier')
            comment = data.get('comment')
            photos = data.get('photos', [])
            
            if not supplier:
                return jsonify({'success': False, 'message': 'Заполните поле "Кто привез"'}), 400
            
            with get_db() as db:
                task = db.query(Order).filter(Order.id == task_id).first()
                if not task:
                    return jsonify({'success': False, 'message': 'Задача не найдена'}), 404
                
                task.client = supplier
                task.description = comment
                task.updated_at = datetime.utcnow()
                
                email_data = {}
                if task.email_data:
                    try:
                        email_data = json.loads(task.email_data)
                    except:
                        pass
                
                email_data['supplier'] = supplier
                email_data['comment'] = comment
                
                if photos:
                    email_data['photos'] = photos
                
                task.email_data = json.dumps(email_data, ensure_ascii=False)
                
                history = OrderHistory(
                    order_id=task.id,
                    user_id=0,
                    action='updated',
                    new_status=task.status,
                    comment='Задача обновлена'
                )
                db.add(history)
                db.commit()
                db.refresh(task)
                
                # ===== ОТПРАВЛЯЕМ СОБЫТИЕ =====
                sse_publisher.publish('task_updated', {
                    'task_id': task.id,
                    'type': 'arrival',
                    'action': 'updated'
                })
                
                return jsonify({
                    'success': True,
                    'task': {
                        'id': task.id,
                        'author': email_data.get('author', 'Неизвестно'),
                        'created_at': task.created_at.strftime('%Y-%m-%d %H:%M') if task.created_at else '',
                        'supplier': supplier,
                        'comment': comment,
                        'photos': email_data.get('photos', []),
                        'assigned_to': task.assigned_to,
                        'status': task.status,
                        'comments_count': 0
                    }
                }), 200
                
        except Exception as e:
            print(f"Ошибка обновления задачи: {e}")
            return jsonify({'success': False, 'message': str(e)}), 500
    
    # ===== DELETE: Удалить задачу =====
    @app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
    def delete_task(task_id):
        try:
            with get_db() as db:
                task = db.query(Order).filter(Order.id == task_id).first()
                if not task:
                    return jsonify({'success': False, 'message': 'Задача не найдена'}), 404
                
                email_data = {}
                if task.email_data:
                    try:
                        email_data = json.loads(task.email_data)
                    except:
                        pass
                
                photos = email_data.get('photos', [])
                
                if photos:
                    upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'uploads', 'photos')
                    deleted_count = 0
                    for photo_path in photos:
                        try:
                            filename = os.path.basename(photo_path)
                            filepath = os.path.join(upload_dir, filename)
                            if os.path.exists(filepath):
                                os.remove(filepath)
                                deleted_count += 1
                                print(f"Удален файл: {filepath}")
                        except Exception as e:
                            print(f"Ошибка удаления файла {photo_path}: {e}")
                    
                    print(f"Удалено файлов: {deleted_count} из {len(photos)}")
                
                db.query(OrderHistory).filter(OrderHistory.order_id == task_id).delete()
                db.delete(task)
                db.commit()
                
                # ===== ОТПРАВЛЯЕМ СОБЫТИЕ =====
                sse_publisher.publish('task_deleted', {
                    'task_id': task_id,
                    'type': 'arrival'
                })
                
                return jsonify({
                    'success': True, 
                    'message': 'Задача удалена',
                    'deleted_photos': len(photos)
                }), 200
                
        except Exception as e:
            print(f"Ошибка удаления задачи: {e}")
            return jsonify({'success': False, 'message': str(e)}), 500

    # ===== PUT: Переназначить задачу на себя =====
    @app.route('/api/tasks/<int:task_id>/reassign', methods=['PUT'])
    def reassign_task(task_id):
        data = request.get_json()
        user_name = data.get('user_name', 'Неизвестно')
        
        with get_db() as db:
            task = db.query(Order).filter(Order.id == task_id).first()
            if not task:
                return jsonify({'success': False, 'message': 'Задача не найдена'}), 404
            
            if task.status != 'in_progress':
                return jsonify({'success': False, 'message': 'Задача не в работе'}), 400
            
            if task.assigned_to == user_name:
                return jsonify({'success': False, 'message': 'Задача уже назначена на вас'}), 400
            
            task.assigned_to = user_name
            task.updated_at = datetime.utcnow()
            db.commit()
            
            # ===== ОТПРАВЛЯЕМ СОБЫТИЕ =====
            sse_publisher.publish('task_updated', {
                'task_id': task.id,
                'type': 'arrival',
                'action': 'reassigned',
                'assigned_to': user_name
            })
            
            return jsonify({'success': True, 'task': {
                'id': task.id,
                'status': task.status,
                'assigned_to': task.assigned_to
            }}), 200