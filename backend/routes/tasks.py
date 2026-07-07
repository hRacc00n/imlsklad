import os
import base64
import uuid
from flask import request, jsonify
from db.database import get_db
from db.models import Order, OrderHistory
import json
from datetime import datetime, timedelta, timezone

def register_tasks_routes(app):
    
    # ===== GET: Получить все задачи типа "arrival" =====
    @app.route('/api/tasks/arrivals', methods=['GET'])
    def get_arrivals():
        with get_db() as db:
            tasks = db.query(Order).filter(Order.type == 'arrival').order_by(Order.created_at.desc()).all()
            result = []
            for task in tasks:
                # Парсим email_data для получения supplier и author
                email_data = {}
                if task.email_data:
                    try:
                        email_data = json.loads(task.email_data)
                    except:
                        pass
                
                result.append({
                    'id': task.id,
                    'author': email_data.get('author', 'Неизвестно'),
                    'created_at': task.created_at.strftime('%Y-%m-%d %H:%M') if task.created_at else '',
                    'supplier': email_data.get('supplier', task.client or 'Неизвестно'),
                    'comment': task.description or '',
                    'photos': [],  # TODO: реализовать загрузку фото
                    'assigned_to': task.assigned_to,
                    'status': task.status,
                    'comments_count': 0,  # TODO: реализовать комментарии
                    'photos': email_data.get('photos', []),
                })
            return jsonify(result), 200
    
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
            
            # Создаём запись в истории
            history = OrderHistory(
                order_id=new_task.id,
                user_id=0,
                action='created',
                new_status='new',
                comment='Задача создана'
            )
            db.add(history)
            db.commit()
            
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