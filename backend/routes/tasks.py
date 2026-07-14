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
from services.notification_service import NotificationService

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
                    'created_at': (task.created_at + timedelta(hours=3)).strftime('%Y-%m-%d %H:%M') if task.created_at else '',
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

    # ===== GET: Актуальные задачи для пользователя =====
    @app.route('/api/tasks/active', methods=['GET'])
    def get_active_tasks():
        """Получить актуальные задачи для текущего пользователя"""
        user_name = request.args.get('user_name', '')
        user_role = request.args.get('user_role', '')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        if not user_name:
            return jsonify({'error': 'user_name required'}), 400
        
        with get_db() as db:
            # 1. Получаем роль пользователя
            from utils.file_loader import load_json
            users = load_json('users.json')
            roles = load_json('roles.json')
            
            user_data = None
            for u in users:
                if u.get('name') == user_name:
                    user_data = u
                    break
            
            if not user_data:
                return jsonify({'error': 'User not found'}), 404
            
            role_key = user_data.get('role', '')
            user_role_obj = None
            for r in roles:
                if r.get('role_key') == role_key:
                    user_role_obj = r
                    break
            
            # 2. Получаем хабы, к которым у пользователя есть доступ
            hub_ids = []
            if user_role_obj and 'hub_access' in user_role_obj:
                hub_ids = user_role_obj['hub_access']
            
            # 3. Запрос к БД: невыполненные задачи
            query = db.query(Order).filter(Order.status != 'completed')
            
            # Фильтр по хабам (если есть ограничения)
            if hub_ids:
                hubs = load_json('hubs.json')
                hub_keys = []
                for hub in hubs:
                    if hub['id'] in hub_ids:
                        hub_keys.append(hub['key'])
                
                if hub_keys:
                    query = query.filter(Order.type.in_(hub_keys))
            
            # 4. Добавляем задачи, которые пользователь взял в работу (даже если не в его роли)
            assigned_tasks = db.query(Order).filter(
                Order.status != 'completed',
                Order.assigned_to == user_name
            ).all()
            
            # 5. Объединяем и убираем дубликаты
            main_tasks = query.all()
            task_ids = set()
            result_tasks = []
            
            for task in main_tasks:
                if task.id not in task_ids:
                    task_ids.add(task.id)
                    result_tasks.append(task)
            
            for task in assigned_tasks:
                if task.id not in task_ids:
                    task_ids.add(task.id)
                    result_tasks.append(task)
            
            # 6. Сортируем по дате (новые сверху)
            result_tasks.sort(key=lambda x: x.created_at, reverse=True)
            
            # 7. Пагинация
            total = len(result_tasks)
            start = (page - 1) * per_page
            end = start + per_page
            paginated_tasks = result_tasks[start:end]
            
            # 8. Форматируем результат
            result = []
            for task in paginated_tasks:
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
                    'created_at': (task.created_at + timedelta(hours=3)).strftime('%Y-%m-%d %H:%M') if task.created_at else '',
                    'supplier': email_data.get('supplier', task.client or 'Неизвестно'),
                    'title': email_data.get('title', ''),
                    'city': email_data.get('city', ''),
                    'amount': email_data.get('amount', ''),
                    'initiator': email_data.get('initiator', ''),
                    'files': email_data.get('files', []),
                    'comment': task.description or '',
                    'assigned_to': task.assigned_to,
                    'status': status,
                    'comments_count': db.query(Comment).filter(
                        Comment.task_id == task.id,
                        Comment.is_deleted == False
                    ).count(),
                    'photos': email_data.get('photos', []),
                    'type': task.type,
                    # ===== ПОЛЯ ДЛЯ ОТГРУЗОК (РЕГИОНЫ И СПБ) =====
                    'order_number': email_data.get('order_number', ''),
                    'subdivision': email_data.get('subdivision', ''),
                    'contractor': email_data.get('contractor', ''),
                    'items': email_data.get('items', []),
                })
            
            return jsonify({
                'data': result,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': total,
                    'total_pages': (total + per_page - 1) // per_page,
                    'has_next': end < total,
                    'has_previous': page > 1
                }
            }), 200

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
                created_at=datetime.utcnow(),
                email_data=json.dumps({
                    'author': author,
                    'supplier': supplier,
                    'comment': comment
                })
            )
            db.add(new_task)
            db.commit()
            db.refresh(new_task)

            # ===== УВЕДОМЛЕНИЯ ПОЛЬЗОВАТЕЛЯМ С ДОСТУПОМ К ХАБУ =====
            try:
                NotificationService.send_to_hub(
                    hub_type='arrival',
                    supplier=supplier,
                    task_id=new_task.id,
                    author=author
                )
            except Exception as e:
                print(f"[Notification] Ошибка отправки уведомлений: {e}")
            
            history = OrderHistory(
                order_id=new_task.id,
                user_id=0,
                action='created',
                new_status='new',
                comment='Задача создана'
            )
            db.add(history)
            db.commit()
            db.refresh(new_task)
            
            sse_publisher.publish('task_created', {
                'task_id': new_task.id,
                'type': 'arrival',
                'task': {
                    'id': new_task.id,
                    'author': author,
                    'created_at': (new_task.created_at + timedelta(hours=3)).strftime('%Y-%m-%d %H:%M') if new_task.created_at else '',
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
            db.refresh(task)
            
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
            db.refresh(task)
            
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

    # ===== GET: Получить задачу по ID =====
    @app.route('/api/tasks/<int:task_id>', methods=['GET'])
    def get_task_by_id(task_id):
        with get_db() as db:
            task = db.query(Order).filter(Order.id == task_id).first()
            if not task:
                return jsonify({'error': 'Task not found'}), 404
            
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
            
            return jsonify({
                'id': task.id,
                'author': email_data.get('author', 'Неизвестно'),
                'created_at': (task.created_at + timedelta(hours=3)).strftime('%Y-%m-%d %H:%M') if task.created_at else '',
                'supplier': email_data.get('supplier', task.client or 'Неизвестно'),
                'comment': task.description or '',
                'assigned_to': task.assigned_to,
                'status': status,
                'photos': email_data.get('photos', []),
                'type': task.type,
                'comments_count': db.query(Comment).filter(
                    Comment.task_id == task.id,
                    Comment.is_deleted == False
                ).count(),
            }), 200

    # ===== GET: Получить все задачи типа "invoices" =====
    @app.route('/api/tasks/invoices', methods=['GET'])
    def get_invoices():
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        hide_completed = request.args.get('hide_completed', 'false').lower() == 'true'
        search = request.args.get('search', '')
        offset = (page - 1) * per_page
        
        with get_db() as db:
            query = db.query(Order).filter(Order.type == 'invoices')
            
            # Поиск по полям (контрагент, номер счета, комментарий)
            if search:
                search_terms = search.strip().split()
                all_tasks = query.all()
                
                filtered_tasks = []
                for task in all_tasks:
                    # Получаем email_data
                    email_data = {}
                    if task.email_data:
                        try:
                            email_data = json.loads(task.email_data)
                        except:
                            pass
                    
                    # Собираем текст для поиска
                    text = f"{email_data.get('supplier', '')} {email_data.get('title', '')} {task.description or ''}".lower()
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
            
            # Формируем результат
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
                    'title': email_data.get('title', 'Счет'),
                    'supplier': email_data.get('supplier', 'Неизвестно'),
                    'city': email_data.get('city', ''),
                    'amount': email_data.get('amount', ''),
                    'initiator': email_data.get('initiator', ''),
                    'comment': task.description or email_data.get('comment', ''),
                    'files': email_data.get('files', []),
                    'assigned_to': task.assigned_to,
                    'status': status,
                    'created_at': (task.created_at + timedelta(hours=3)).strftime('%Y-%m-%d %H:%M') if task.created_at else '',
                    'comments_count': db.query(Comment).filter(
                        Comment.task_id == task.id,
                        Comment.is_deleted == False
                    ).count(),
                    'type': task.type,
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

    # ===== GET: Статистика по хабу "Счета" =====
    @app.route('/api/tasks/invoices/stats', methods=['GET'])
    def get_invoices_stats():
        with get_db() as db:
            active_count = db.query(Order).filter(
                Order.type == 'invoices',
                Order.status != 'completed'
            ).count()
            
            total_count = db.query(Order).filter(Order.type == 'invoices').count()
            
            response = jsonify({
                'active_count': active_count,
                'total_count': total_count
            })
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            return response, 200

    # ===== GET: Получить все задачи типа "regions" =====
    @app.route('/api/tasks/regions', methods=['GET'])
    def get_regions():
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        hide_completed = request.args.get('hide_completed', 'false').lower() == 'true'
        search = request.args.get('search', '')
        offset = (page - 1) * per_page
        
        with get_db() as db:
            query = db.query(Order).filter(Order.type == 'regions')
            
            # Поиск по полям (контрагент, номер заказа, комментарий)
            if search:
                search_terms = search.strip().split()
                all_tasks = query.all()
                
                filtered_tasks = []
                for task in all_tasks:
                    email_data = {}
                    if task.email_data:
                        try:
                            email_data = json.loads(task.email_data)
                        except:
                            pass
                    
                    text = f"{email_data.get('contractor', '')} {email_data.get('order_number', '')} {task.description or ''}".lower()
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
                
                # Формируем данные для ответа
                order_number = email_data.get('order_number', '')
                title = order_number if order_number else 'Без номера'
                
                result.append({
                    'id': task.id,
                    'title': title,
                    'order_number': order_number,
                    'subdivision': email_data.get('subdivision', ''),
                    'contractor': email_data.get('contractor', 'Неизвестно'),
                    'initiator': email_data.get('initiator', ''),
                    'comment': task.description or email_data.get('comment', ''),
                    'items': email_data.get('items', []),
                    'assigned_to': task.assigned_to,
                    'status': status,
                    'created_at': (task.created_at + timedelta(hours=3)).strftime('%Y-%m-%d %H:%M') if task.created_at else '',
                    'comments_count': db.query(Comment).filter(
                        Comment.task_id == task.id,
                        Comment.is_deleted == False
                    ).count(),
                    'type': task.type,
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

    # ===== GET: Статистика по хабу "Регионы" =====
    @app.route('/api/tasks/regions/stats', methods=['GET'])
    def get_regions_stats():
        with get_db() as db:
            active_count = db.query(Order).filter(
                Order.type == 'regions',
                Order.status != 'completed'
            ).count()
            
            total_count = db.query(Order).filter(Order.type == 'regions').count()
            
            response = jsonify({
                'active_count': active_count,
                'total_count': total_count
            })
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            return response, 200

    # ===== GET: Получить все задачи типа "spb" =====
    @app.route('/api/tasks/spb', methods=['GET'])
    def get_spb():
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        hide_completed = request.args.get('hide_completed', 'false').lower() == 'true'
        search = request.args.get('search', '')
        offset = (page - 1) * per_page
        
        with get_db() as db:
            query = db.query(Order).filter(Order.type == 'spb')
            
            if search:
                search_terms = search.strip().split()
                all_tasks = query.all()
                
                filtered_tasks = []
                for task in all_tasks:
                    email_data = {}
                    if task.email_data:
                        try:
                            email_data = json.loads(task.email_data)
                        except:
                            pass
                    
                    text = f"{email_data.get('contractor', '')} {email_data.get('order_number', '')} {task.description or ''}".lower()
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
                
                order_number = email_data.get('order_number', '')
                title = order_number if order_number else 'Без номера'
                
                result.append({
                    'id': task.id,
                    'title': title,
                    'order_number': order_number,
                    'subdivision': email_data.get('subdivision', ''),
                    'contractor': email_data.get('contractor', 'Неизвестно'),
                    'initiator': email_data.get('initiator', ''),
                    'comment': task.description or email_data.get('comment', ''),
                    'items': email_data.get('items', []),
                    'assigned_to': task.assigned_to,
                    'status': status,
                    'created_at': (task.created_at + timedelta(hours=3)).strftime('%Y-%m-%d %H:%M') if task.created_at else '',
                    'comments_count': db.query(Comment).filter(
                        Comment.task_id == task.id,
                        Comment.is_deleted == False
                    ).count(),
                    'type': task.type,
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

    # ===== GET: Статистика по хабу "СПб" =====
    @app.route('/api/tasks/spb/stats', methods=['GET'])
    def get_spb_stats():
        with get_db() as db:
            active_count = db.query(Order).filter(
                Order.type == 'spb',
                Order.status != 'completed'
            ).count()
            
            total_count = db.query(Order).filter(Order.type == 'spb').count()
            
            response = jsonify({
                'active_count': active_count,
                'total_count': total_count
            })
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            return response, 200