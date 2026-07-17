import os
import json
import uuid
import base64
from flask import request, jsonify, send_from_directory
from datetime import datetime, timedelta
from db.database import get_db
from db.models import PersonalTask, TaskItem, PersonalTaskComment
from routes.sse import sse_publisher
from services.notification_service import NotificationService

def register_personal_tasks_routes(app):
    
    # ===== GET: Список личных задач (только автор + исполнители) =====
    @app.route('/api/personal-tasks', methods=['GET'])
    def get_personal_tasks():
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        hide_completed = request.args.get('hide_completed', 'false').lower() == 'true'
        search = request.args.get('search', '')
        user_name = request.args.get('user_name', '')
        offset = (page - 1) * per_page
        
        if not user_name:
            return jsonify({'error': 'user_name required'}), 400
        
        with get_db() as db:
            query = db.query(PersonalTask)
            
            # Фильтр: пользователь должен быть автором ИЛИ исполнителем
            # Используем LIKE для поиска в JSON массиве
            all_tasks = query.all()
            
            filtered_tasks = []
            for task in all_tasks:
                # Проверяем, является ли пользователь автором
                is_author = task.author == user_name
                
                # Проверяем, является ли пользователь исполнителем
                is_assigned = False
                if task.assigned_to:
                    try:
                        assigned_list = json.loads(task.assigned_to)
                        if user_name in assigned_list:
                            is_assigned = True
                    except:
                        pass
                
                if is_author or is_assigned:
                    filtered_tasks.append(task)
            
            # Поиск по заголовку и описанию
            if search:
                search_terms = search.strip().split()
                search_filtered = []
                for task in filtered_tasks:
                    text = f"{task.title or ''} {task.description or ''}".lower()
                    match = all(term.lower() in text for term in search_terms)
                    if match:
                        search_filtered.append(task)
                filtered_tasks = search_filtered
            
            # Фильтр по статусу
            if hide_completed:
                filtered_tasks = [t for t in filtered_tasks if t.status != 'completed']
            
            # Сортировка по дате (новые сверху)
            filtered_tasks.sort(key=lambda x: x.created_at, reverse=True)
            
            total_count = len(filtered_tasks)
            tasks = filtered_tasks[offset:offset + per_page]
            
            result = []
            for task in tasks:
                task_dict = task.to_dict()
                # Считаем количество подпунктов
                items = db.query(TaskItem).filter(TaskItem.task_id == task.id).all()
                task_dict['items_count'] = len(items)
                task_dict['completed_items_count'] = sum(1 for i in items if i.is_completed)
                task_dict['has_items'] = len(items) > 0
                
                # Считаем комментарии
                comments_count = db.query(PersonalTaskComment).filter(
                    PersonalTaskComment.task_id == task.id,
                    PersonalTaskComment.is_deleted == False
                ).count()
                task_dict['comments_count'] = comments_count
                
                result.append(task_dict)
            
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
    
    # ===== GET: Статистика по личным задачам =====
    @app.route('/api/personal-tasks/stats', methods=['GET'])
    def get_personal_tasks_stats():
        user_name = request.args.get('user_name', '')
        
        if not user_name:
            return jsonify({'error': 'user_name required'}), 400
        
        with get_db() as db:
            all_tasks = db.query(PersonalTask).all()
            
            active_count = 0
            total_count = 0
            
            for task in all_tasks:
                is_author = task.author == user_name
                is_assigned = False
                if task.assigned_to:
                    try:
                        assigned_list = json.loads(task.assigned_to)
                        if user_name in assigned_list:
                            is_assigned = True
                    except:
                        pass
                
                if is_author or is_assigned:
                    total_count += 1
                    if task.status != 'completed':
                        active_count += 1
            
            response = jsonify({
                'active_count': active_count,
                'total_count': total_count
            })
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            return response, 200
    
    # ===== POST: Создать личную задачу =====
    @app.route('/api/personal-tasks', methods=['POST'])
    def create_personal_task():
        data = request.get_json()
        title = data.get('title', '').strip()
        description = data.get('description', '').strip()
        author = data.get('author', '')
        assigned_to = data.get('assigned_to', [])
        items = data.get('items', [])
        files = data.get('files', [])
        
        if not title:
            return jsonify({'success': False, 'message': 'Укажите заголовок задачи'}), 400
        
        if not author:
            return jsonify({'success': False, 'message': 'Автор не указан'}), 400
        
        # Если исполнители не выбраны, автор сам является исполнителем
        if not assigned_to:
            assigned_to = [author]
        
        # Сохраняем файлы
        saved_files = []
        if files:
            upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'uploads', 'personal_tasks')
            os.makedirs(upload_dir, exist_ok=True)
            
            for file_data in files:
                try:
                    if not file_data.get('base64'):
                        continue
                    
                    # Извлекаем base64
                    base64_str = file_data['base64']
                    if ',' in base64_str:
                        _, data_str = base64_str.split(',', 1)
                    else:
                        data_str = base64_str
                    
                    file_bytes = base64.b64decode(data_str)
                    
                    if len(file_bytes) < 100:
                        continue
                    
                    # Генерируем имя файла
                    original_name = file_data.get('name', 'file')
                    ext = original_name.split('.')[-1] if '.' in original_name else 'bin'
                    filename = f"task_{uuid.uuid4().hex[:8]}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{ext}"
                    filepath = os.path.join(upload_dir, filename)
                    
                    with open(filepath, 'wb') as f:
                        f.write(file_bytes)
                    
                    saved_files.append({
                        'name': original_name,
                        'path': f"/uploads/personal_tasks/{filename}",
                        'size': len(file_bytes)
                    })
                    
                except Exception as e:
                    print(f"Ошибка сохранения файла: {e}")
                    continue
        
        with get_db() as db:
            new_task = PersonalTask(
                title=title,
                description=description,
                author=author,
                assigned_to=json.dumps(assigned_to, ensure_ascii=False),
                status='active',
                files=json.dumps(saved_files, ensure_ascii=False) if saved_files else None,
                created_at=datetime.utcnow()
            )
            db.add(new_task)
            db.commit()
            db.refresh(new_task)
            
            # Создаём подпункты
            for item_text in items:
                if item_text.strip():
                    task_item = TaskItem(
                        task_id=new_task.id,
                        text=item_text.strip(),
                        is_completed=False,
                        created_at=datetime.utcnow()
                    )
                    db.add(task_item)
            
            db.commit()
            
            # Отправляем SSE событие
            task_dict = new_task.to_dict()
            task_dict['items_count'] = len(items)
            task_dict['completed_items_count'] = 0
            task_dict['has_items'] = len(items) > 0
            task_dict['comments_count'] = 0
            
            sse_publisher.publish('personal_task_created', {
                'task_id': new_task.id,
                'task': task_dict
            })

            # Отправляем событие обновления статистики для хаба "Задачи"
            sse_publisher.publish('hub_stats_updated', {
                'hub_type': 'tasks',
                'action': 'created'
            })
            
            # Отправляем уведомления исполнителям
            try:
                NotificationService.send_personal_task_notification(
                    task_id=new_task.id,
                    title=title,
                    author=author,
                    assigned_to=assigned_to,
                    action='created'
                )
            except Exception as e:
                print(f"[Notification] Ошибка отправки уведомлений: {e}")
            
            return jsonify({
                'success': True,
                'task': task_dict
            }), 201
    
    # ===== GET: Получить задачу по ID =====
    @app.route('/api/personal-tasks/<int:task_id>', methods=['GET'])
    def get_personal_task(task_id):
        with get_db() as db:
            task = db.query(PersonalTask).filter(PersonalTask.id == task_id).first()
            if not task:
                return jsonify({'error': 'Задача не найдена'}), 404
            
            task_dict = task.to_dict()
            
            # Получаем подпункты
            items = db.query(TaskItem).filter(TaskItem.task_id == task_id).order_by(TaskItem.created_at.asc()).all()
            task_dict['items'] = [item.to_dict() for item in items]
            task_dict['items_count'] = len(items)
            task_dict['completed_items_count'] = sum(1 for i in items if i.is_completed)
            task_dict['has_items'] = len(items) > 0
            
            # Считаем комментарии
            comments_count = db.query(PersonalTaskComment).filter(
                PersonalTaskComment.task_id == task_id,
                PersonalTaskComment.is_deleted == False
            ).count()
            task_dict['comments_count'] = comments_count
            
            return jsonify(task_dict), 200
    
    # ===== PUT: Обновить задачу (только автор) =====
    @app.route('/api/personal-tasks/<int:task_id>', methods=['PUT'])
    def update_personal_task(task_id):
        data = request.get_json()
        title = data.get('title')
        description = data.get('description')
        assigned_to = data.get('assigned_to')
        files = data.get('files')
        author = data.get('author', '')
        
        with get_db() as db:
            task = db.query(PersonalTask).filter(PersonalTask.id == task_id).first()
            if not task:
                return jsonify({'success': False, 'message': 'Задача не найдена'}), 404
            
            # Проверка прав: только автор может редактировать
            if task.author != author:
                return jsonify({'success': False, 'message': 'Только автор может редактировать задачу'}), 403
            
            if title is not None:
                task.title = title
            if description is not None:
                task.description = description
            if assigned_to is not None:
                if not assigned_to:
                    assigned_to = [author]
                task.assigned_to = json.dumps(assigned_to, ensure_ascii=False)
            
            task.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(task)
            
            # Получаем обновлённые данные
            task_dict = task.to_dict()
            items = db.query(TaskItem).filter(TaskItem.task_id == task_id).all()
            task_dict['items'] = [item.to_dict() for item in items]
            task_dict['items_count'] = len(items)
            task_dict['completed_items_count'] = sum(1 for i in items if i.is_completed)
            task_dict['has_items'] = len(items) > 0
            
            sse_publisher.publish('personal_task_updated', {
                'task_id': task_id,
                'task': task_dict
            })
            
            return jsonify({
                'success': True,
                'task': task_dict
            }), 200
    
    # ===== DELETE: Удалить задачу (только автор) =====
    @app.route('/api/personal-tasks/<int:task_id>', methods=['DELETE'])
    def delete_personal_task(task_id):
        data = request.get_json()
        author = data.get('author', '')
        
        with get_db() as db:
            task = db.query(PersonalTask).filter(PersonalTask.id == task_id).first()
            if not task:
                return jsonify({'success': False, 'message': 'Задача не найдена'}), 404
            
            if task.author != author:
                return jsonify({'success': False, 'message': 'Только автор может удалить задачу'}), 403
            
            # Удаляем подпункты
            db.query(TaskItem).filter(TaskItem.task_id == task_id).delete()
            
            # Удаляем комментарии
            db.query(PersonalTaskComment).filter(PersonalTaskComment.task_id == task_id).delete()
            
            db.delete(task)
            db.commit()
            
            sse_publisher.publish('personal_task_deleted', {
                'task_id': task_id
            })

            # Отправляем событие обновления статистики для хаба "Задачи"
            sse_publisher.publish('hub_stats_updated', {
                'hub_type': 'tasks',
                'action': 'deleted'
            })
            
            return jsonify({
                'success': True,
                'message': 'Задача удалена'
            }), 200
    
    # ===== POST: Добавить подпункт =====
    @app.route('/api/personal-tasks/<int:task_id>/items', methods=['POST'])
    def add_task_item(task_id):
        data = request.get_json()
        text = data.get('text', '').strip()
        author = data.get('author', '')
        
        if not text:
            return jsonify({'success': False, 'message': 'Текст подпункта не может быть пустым'}), 400
        
        with get_db() as db:
            task = db.query(PersonalTask).filter(PersonalTask.id == task_id).first()
            if not task:
                return jsonify({'success': False, 'message': 'Задача не найдена'}), 404
            
            # Проверка прав: только автор может добавлять подпункты
            if task.author != author:
                return jsonify({'success': False, 'message': 'Только автор может добавлять подпункты'}), 403
            
            new_item = TaskItem(
                task_id=task_id,
                text=text,
                is_completed=False,
                created_at=datetime.utcnow()
            )
            db.add(new_item)
            db.commit()
            db.refresh(new_item)
            
            # Обновляем задачу
            task.updated_at = datetime.utcnow()
            db.commit()
            
            # Получаем обновлённые данные
            task_dict = task.to_dict()
            items = db.query(TaskItem).filter(TaskItem.task_id == task_id).all()
            task_dict['items'] = [item.to_dict() for item in items]
            task_dict['items_count'] = len(items)
            task_dict['completed_items_count'] = sum(1 for i in items if i.is_completed)
            task_dict['has_items'] = len(items) > 0
            
            sse_publisher.publish('personal_task_updated', {
                'task_id': task_id,
                'task': task_dict
            })

            # Отправляем событие обновления статистики для хаба "Задачи"
            sse_publisher.publish('hub_stats_updated', {
                'hub_type': 'tasks',
                'action': 'completed'
            })
            
            return jsonify({
                'success': True,
                'item': new_item.to_dict(),
                'task': task_dict
            }), 201
    
    # ===== PUT: Переключить статус подпункта =====
    @app.route('/api/personal-tasks/items/<int:item_id>', methods=['PUT'])
    def toggle_task_item(item_id):
        data = request.get_json()
        is_completed = data.get('is_completed', False)
        user_name = data.get('user_name', '')
        
        with get_db() as db:
            item = db.query(TaskItem).filter(TaskItem.id == item_id).first()
            if not item:
                return jsonify({'success': False, 'message': 'Подпункт не найден'}), 404
            
            item.is_completed = is_completed
            item.completed_by = user_name if is_completed else None
            item.updated_at = datetime.utcnow()
            db.commit()
            
            # Обновляем задачу
            task = db.query(PersonalTask).filter(PersonalTask.id == item.task_id).first()
            if task:
                task.updated_at = datetime.utcnow()
                db.commit()
                
                # Проверяем, все ли подпункты выполнены
                all_items = db.query(TaskItem).filter(TaskItem.task_id == task.id).all()
                all_completed = all(i.is_completed for i in all_items) if all_items else False
                
                # Если все подпункты выполнены, задача завершается
                if all_completed and all_items:
                    task.status = 'completed'
                    db.commit()
                    
                    # Отправляем SSE событие обновления статистики
                    sse_publisher.publish('hub_stats_updated', {
                        'hub_type': 'tasks',
                        'action': 'completed'
                    })
                    
                    # Отправляем уведомление автору
                    try:
                        NotificationService.send_personal_task_notification(
                            task_id=task.id,
                            title=task.title,
                            author=task.author,
                            assigned_to=[],
                            action='completed_by_items',
                            actor=user_name
                        )
                    except Exception as e:
                        print(f"[Notification] Ошибка отправки уведомления: {e}")
            
            # Получаем обновлённые данные
            task_dict = task.to_dict() if task else {}
            items = db.query(TaskItem).filter(TaskItem.task_id == item.task_id).all()
            task_dict['items'] = [i.to_dict() for i in items]
            task_dict['items_count'] = len(items)
            task_dict['completed_items_count'] = sum(1 for i in items if i.is_completed)
            task_dict['has_items'] = len(items) > 0
            
            sse_publisher.publish('personal_task_updated', {
                'task_id': item.task_id,
                'task': task_dict
            })
            
            return jsonify({
                'success': True,
                'item': item.to_dict(),
                'task': task_dict
            }), 200
    
    # ===== DELETE: Удалить подпункт (только автор) =====
    @app.route('/api/personal-tasks/items/<int:item_id>', methods=['DELETE'])
    def delete_task_item(item_id):
        data = request.get_json()
        author = data.get('author', '')
        
        with get_db() as db:
            item = db.query(TaskItem).filter(TaskItem.id == item_id).first()
            if not item:
                return jsonify({'success': False, 'message': 'Подпункт не найден'}), 404
            
            # Получаем задачу для проверки прав
            task = db.query(PersonalTask).filter(PersonalTask.id == item.task_id).first()
            if not task:
                return jsonify({'success': False, 'message': 'Задача не найдена'}), 404
            
            if task.author != author:
                return jsonify({'success': False, 'message': 'Только автор может удалять подпункты'}), 403
            
            db.delete(item)
            db.commit()
            
            # Обновляем задачу
            task.updated_at = datetime.utcnow()
            db.commit()
            
            # Получаем обновлённые данные
            task_dict = task.to_dict()
            items = db.query(TaskItem).filter(TaskItem.task_id == task.id).all()
            task_dict['items'] = [i.to_dict() for i in items]
            task_dict['items_count'] = len(items)
            task_dict['completed_items_count'] = sum(1 for i in items if i.is_completed)
            task_dict['has_items'] = len(items) > 0
            
            sse_publisher.publish('personal_task_updated', {
                'task_id': task.id,
                'task': task_dict
            })
            
            return jsonify({
                'success': True,
                'task': task_dict
            }), 200
    
    # ===== GET: Комментарии к личной задаче =====
    @app.route('/api/personal-tasks/<int:task_id>/comments', methods=['GET'])
    def get_personal_task_comments(task_id):
        with get_db() as db:
            comments = db.query(PersonalTaskComment).filter(
                PersonalTaskComment.task_id == task_id,
                PersonalTaskComment.is_deleted == False
            ).order_by(PersonalTaskComment.created_at.asc()).all()
            
            result = [comment.to_dict() for comment in comments]
            return jsonify(result), 200
    
    # ===== POST: Добавить комментарий к личной задаче =====
    @app.route('/api/personal-tasks/<int:task_id>/comments', methods=['POST'])
    def create_personal_task_comment(task_id):
        data = request.get_json()
        author = data.get('author', 'Неизвестно')
        text = data.get('text', '').strip()
        
        if not text:
            return jsonify({'success': False, 'message': 'Текст комментария не может быть пустым'}), 400
        
        with get_db() as db:
            task = db.query(PersonalTask).filter(PersonalTask.id == task_id).first()
            if not task:
                return jsonify({'success': False, 'message': 'Задача не найдена'}), 404
            
            new_comment = PersonalTaskComment(
                task_id=task_id,
                author=author,
                text=text,
                created_at=datetime.utcnow()
            )
            db.add(new_comment)
            db.commit()
            db.refresh(new_comment)
            
            # Отправляем уведомления автору и исполнителям
            try:
                assigned_list = []
                if task.assigned_to:
                    try:
                        assigned_list = json.loads(task.assigned_to)
                    except:
                        pass
                
                # Отправляем одно уведомление всем получателям сразу
                NotificationService.send_personal_task_notification(
                    task_id=task.id,
                    title=task.title,
                    author=task.author,
                    assigned_to=assigned_list,
                    action='comment',
                    comment_text=text,
                    actor=author
                )
            except Exception as e:
                print(f"[Notification] Ошибка отправки уведомления: {e}")
            
            return jsonify({
                'success': True,
                'comment': new_comment.to_dict()
            }), 201
    
    # ===== PUT: Редактировать комментарий =====
    @app.route('/api/personal-tasks/comments/<int:comment_id>', methods=['PUT'])
    def update_personal_task_comment(comment_id):
        data = request.get_json()
        author = data.get('author', '')
        text = data.get('text', '').strip()
        
        if not text:
            return jsonify({'success': False, 'message': 'Текст комментария не может быть пустым'}), 400
        
        with get_db() as db:
            comment = db.query(PersonalTaskComment).filter(PersonalTaskComment.id == comment_id).first()
            if not comment:
                return jsonify({'success': False, 'message': 'Комментарий не найден'}), 404
            
            if comment.author != author:
                return jsonify({'success': False, 'message': 'Нет прав на редактирование'}), 403
            
            comment.text = text
            comment.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(comment)
            
            return jsonify({
                'success': True,
                'comment': comment.to_dict()
            }), 200
    
    # ===== DELETE: Удалить комментарий (soft delete) =====
    @app.route('/api/personal-tasks/comments/<int:comment_id>', methods=['DELETE'])
    def delete_personal_task_comment(comment_id):
        data = request.get_json()
        author = data.get('author', '')
        
        with get_db() as db:
            comment = db.query(PersonalTaskComment).filter(PersonalTaskComment.id == comment_id).first()
            if not comment:
                return jsonify({'success': False, 'message': 'Комментарий не найден'}), 404
            
            if comment.author != author:
                return jsonify({'success': False, 'message': 'Нет прав на удаление'}), 403
            
            comment.is_deleted = True
            comment.updated_at = datetime.utcnow()
            db.commit()
            
            return jsonify({
                'success': True,
                'message': 'Комментарий удалён'
            }), 200
    
    # ===== PUT: Выполнить задачу (без подпунктов) =====
    @app.route('/api/personal-tasks/<int:task_id>/complete', methods=['PUT'])
    def complete_personal_task(task_id):
        data = request.get_json()
        user_name = data.get('user_name', '')
        
        with get_db() as db:
            task = db.query(PersonalTask).filter(PersonalTask.id == task_id).first()
            if not task:
                return jsonify({'success': False, 'message': 'Задача не найдена'}), 404
            
            # Проверяем, есть ли подпункты
            items = db.query(TaskItem).filter(TaskItem.task_id == task_id).all()
            if items:
                return jsonify({'success': False, 'message': 'У задачи есть подпункты. Отмечайте их по отдельности.'}), 400
            
            # Проверяем права: автор или исполнитель может выполнить
            is_author = task.author == user_name
            is_assigned = False
            if task.assigned_to:
                try:
                    assigned_list = json.loads(task.assigned_to)
                    if user_name in assigned_list:
                        is_assigned = True
                except:
                    pass
            
            if not is_author and not is_assigned:
                return jsonify({'success': False, 'message': 'Нет прав на выполнение задачи'}), 403
            
            task.status = 'completed'
            task.updated_at = datetime.utcnow()
            db.commit()
            
            # Получаем обновлённые данные
            task_dict = task.to_dict()
            task_dict['items'] = [item.to_dict() for item in items]
            task_dict['items_count'] = len(items)
            task_dict['completed_items_count'] = sum(1 for i in items if i.is_completed)
            task_dict['has_items'] = len(items) > 0
            
            sse_publisher.publish('personal_task_updated', {
                'task_id': task_id,
                'task': task_dict
            })

            # Отправляем событие обновления статистики для хаба "Задачи"
            sse_publisher.publish('hub_stats_updated', {
                'hub_type': 'tasks',
                'action': 'completed'
            })
            
            # Отправляем уведомление автору
            try:
                NotificationService.send_personal_task_notification(
                    task_id=task.id,
                    title=task.title,
                    author=task.author,
                    assigned_to=[],
                    action='completed',
                    actor=user_name
                )
            except Exception as e:
                print(f"[Notification] Ошибка отправки уведомления: {e}")
            
            return jsonify({
                'success': True,
                'task': task_dict
            }), 200
    
    # ===== GET: Раздача файлов личных задач =====
    @app.route('/uploads/personal_tasks/<filename>')
    def uploaded_personal_task(filename):
        upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'uploads', 'personal_tasks')
        return send_from_directory(upload_dir, filename)