import os
import base64
import uuid
from flask import request, jsonify
from db.database import get_db
from db.models import Order, OrderHistory, Comment
import json
import glob
from datetime import datetime, timedelta, timezone
from routes.sse import sse_publisher
from sqlalchemy import or_, func

def register_tasks_routes(app):
    
    # ===== GET: Получить все задачи типа "arrival" =====
    @app.route('/api/tasks/arrivals', methods=['GET'])
    def get_arrivals():
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        hide_completed = request.args.get('hide_completed', 'false').lower() == 'true'
        search = request.args.get('search', '')
        offset = (page - 1) * per_page
        
        with get_db() as db:
            query = db.query(Order).filter(Order.type == 'arrival')
            
            # Поиск по полям (регистронезависимый через Python)
            if search:
                search_terms = search.strip().split()
                all_tasks = query.all()
                
                filtered_tasks = []
                for task in all_tasks:
                    text = f"{task.client or ''} {task.description or ''} {task.tracking or ''}".lower()
                    match = all(term.lower() in text for term in search_terms)
                    if match:
                        filtered_tasks.append(task)
                
                total_count = len(filtered_tasks)
                tasks = filtered_tasks[offset:offset + per_page]
            else:
                if hide_completed:
                    query = query.filter(Order.status != 'completed')
                total_count = query.count()
                tasks = query.order_by(Order.created_at.desc()).offset(offset).limit(per_page).all()
            
            # Формируем результат (как раньше)
            result = []
            for task in tasks:
                email_data = {}
                if task.email_data:
                    try:
                        email_data = json.loads(task.email_data)
                    except:
                        pass
                
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
                    'comments_count': db.query(Comment).filter(
                        Comment.task_id == task.id,
                        Comment.is_deleted == False
                    ).count(),
                    'photos': email_data.get('photos', []),
                })
            
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
    
    # ===== GET: Статистика по хабу =====
    @app.route('/api/tasks/arrivals/stats', methods=['GET'])
    def get_arrivals_stats():
        with get_db() as db:
            active_count = db.query(Order).filter(
                Order.type == 'arrival',
                Order.status != 'completed'
            ).count()
            
            total_count = db.query(Order).filter(Order.type == 'arrival').count()
            
            response = jsonify({
                'active_count': active_count,
                'total_count': total_count
            })
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            return response, 200

    # ===== POST: Создать задачу =====
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
            db.refresh(new_task)  # ← ДОБАВЛЕНО
            
            sse_publisher.publish('task_created', {
                'task_id': new_task.id,
                'type': 'arrival',
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
            })

            import time
            time.sleep(0.1)
            
            sse_publisher.publish('hub_stats_updated', {
                'hub_type': 'arrival',
                'action': 'created'
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
    
    # ===== PUT: Взять задачу в работу (УНИВЕРСАЛЬНЫЙ) =====
    @app.route('/api/tasks/<path:task_type>/<int:task_id>/take', methods=['PUT'])
    def take_task(task_type, task_id):
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
            
            sse_publisher.publish('task_updated', {
                'task_id': task.id,
                'type': task_type,
                'action': 'taken',
                'assigned_to': user_name
            })
            
            return jsonify({'success': True, 'task': {
                'id': task.id,
                'status': task.status,
                'assigned_to': task.assigned_to
            }}), 200
    
    # ===== PUT: Выполнить задачу (УНИВЕРСАЛЬНЫЙ) =====
    @app.route('/api/tasks/<path:task_type>/<int:task_id>/complete', methods=['PUT'])
    def complete_task(task_type, task_id):
        with get_db() as db:
            task = db.query(Order).filter(Order.id == task_id).first()
            if not task:
                return jsonify({'success': False, 'message': 'Задача не найдена'}), 404
            
            if task.status != 'in_progress':
                return jsonify({'success': False, 'message': 'Задача не в работе'}), 400
            
            task.status = 'completed'
            task.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(task)  # ← ДОБАВЛЕНО
            
            sse_publisher.publish('task_updated', {
                'task_id': task.id,
                'type': task_type,
                'action': 'completed'
            })

            import time
            time.sleep(0.1)
            
            sse_publisher.publish('hub_stats_updated', {
                'hub_type': 'arrival',
                'action': 'completed'
            })
            
            return jsonify({'success': True, 'task': {
                'id': task.id,
                'status': task.status
            }}), 200
    
    # ===== PUT: Отказаться от задачи (УНИВЕРСАЛЬНЫЙ) =====
    @app.route('/api/tasks/<path:task_type>/<int:task_id>/decline', methods=['PUT'])
    def decline_task(task_type, task_id):
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
            db.refresh(task)  # ← ДОБАВЛЕНО
            
            sse_publisher.publish('task_updated', {
                'task_id': task.id,
                'type': task_type,
                'action': 'declined'
            })

            import time
            time.sleep(0.1)
            
            sse_publisher.publish('hub_stats_updated', {
                'hub_type': 'arrival',
                'action': 'declined'
            })
            
            return jsonify({'success': True, 'task': {
                'id': task.id,
                'status': task.status,
                'assigned_to': None
            }}), 200
    
    # ===== PUT: Переназначить задачу (УНИВЕРСАЛЬНЫЙ) =====
    @app.route('/api/tasks/<path:task_type>/<int:task_id>/reassign', methods=['PUT'])
    def reassign_task(task_type, task_id):
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
            
            sse_publisher.publish('task_updated', {
                'task_id': task.id,
                'type': task_type,
                'action': 'reassigned',
                'assigned_to': user_name
            })
            
            return jsonify({'success': True, 'task': {
                'id': task.id,
                'status': task.status,
                'assigned_to': task.assigned_to
            }}), 200
    
    # ===== POST: Загрузить фото =====
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
                    if not photo_base64:
                        continue
                        
                    if ',' in photo_base64:
                        _, data_str = photo_base64.split(',', 1)
                    else:
                        data_str = photo_base64
                    
                    image_data = base64.b64decode(data_str)
                    
                    if len(image_data) < 100:
                        continue
                    
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

                sse_publisher.publish('task_updated', {
                    'task_id': task_id,
                    'type': 'arrival',
                    'action': 'photos_uploaded',
                    'photos': saved_photos
                })
                
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
                
                # Обновляем поля
                if supplier:
                    task.client = supplier
                if comment is not None:
                    task.description = comment
                
                # Обновляем email_data
                email_data = {}
                if task.email_data:
                    try:
                        email_data = json.loads(task.email_data)
                    except:
                        pass
                
                if supplier:
                    email_data['supplier'] = supplier
                if comment is not None:
                    email_data['comment'] = comment
                
                # Фото: если переданы, заменяем (фронтенд уже объединил старые и новые)
                if photos:
                    email_data['photos'] = photos
                
                task.email_data = json.dumps(email_data, ensure_ascii=False)
                task.updated_at = datetime.utcnow()
                db.commit()
                
                return jsonify({
                    'success': True,
                    'task': {
                        'id': task.id,
                        'supplier': task.client,
                        'comment': task.description,
                        'photos': email_data.get('photos', []),
                        'assigned_to': task.assigned_to,
                        'status': task.status,
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
                        except Exception as e:
                            print(f"Ошибка удаления файла {photo_path}: {e}")
                
                db.query(OrderHistory).filter(OrderHistory.order_id == task_id).delete()
                db.delete(task)
                db.commit()
                
                sse_publisher.publish('task_deleted', {
                    'task_id': task_id,
                    'type': 'arrival'
                })

                import time
                time.sleep(0.1)
                
                sse_publisher.publish('hub_stats_updated', {
                    'hub_type': 'arrival',
                    'action': 'deleted'
                })
                
                return jsonify({
                    'success': True, 
                    'message': 'Задача удалена',
                    'deleted_photos': len(photos)
                }), 200
                
        except Exception as e:
            print(f"Ошибка удаления задачи: {e}")  
            return jsonify({'success': False, 'message': str(e)}), 500