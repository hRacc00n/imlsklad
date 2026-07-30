import json
from flask import request, jsonify
from datetime import datetime, timedelta
from db.database import get_db
from db.models import PersonalTask, Duty, Vacation, News
from utils.file_loader import load_json

def register_calendar_routes(app):
    
    # ===== GET: Получить события за месяц =====
    @app.route('/api/calendar/events', methods=['GET'])
    def get_calendar_events():
        year = request.args.get('year', type=int)
        month = request.args.get('month', type=int)
        user_name = request.args.get('user_name', '')
        
        if not year or not month:
            return jsonify({'error': 'year and month required'}), 400
        
        if not user_name:
            return jsonify({'error': 'user_name required'}), 400
        
        # Определяем начало и конец месяца
        start_date = datetime(year, month, 1, 0, 0, 0)
        if month == 12:
            end_date = datetime(year + 1, 1, 1, 0, 0, 0)
        else:
            end_date = datetime(year, month + 1, 1, 0, 0, 0)
        
        events = []
        
        with get_db() as db:
            # ===== 1. Личные задачи =====
            # Получаем ВСЕ задачи с дедлайном (без фильтрации по месяцу)
            tasks = db.query(PersonalTask).filter(
                PersonalTask.due_date.isnot(None)
            ).all()
            
            # Загружаем пользователей для определения ролей и доступа
            users = load_json('users.json')
            roles = load_json('roles.json')
            
            # Определяем, какие задачи видны пользователю
            user_roles = []
            for u in users:
                if u.get('name') == user_name:
                    user_role_key = u.get('role', '')
                    for r in roles:
                        if r.get('role_key') == user_role_key:
                            user_roles = r.get('hub_access', [])
                            break
                    break
            
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            
            for task in tasks:
                # Проверяем, видит ли пользователь задачу
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
                    continue
                
                # Если задача выполнена — пропускаем
                # (фильтрация будет на фронтенде через чекбокс "Скрыть выполненные")
                
                # Нормализуем дату дедлайна
                due_date_normalized = task.due_date.replace(hour=0, minute=0, second=0, microsecond=0)
                
                # ===== ТОЧКИ В КАЛЕНДАРЕ (всегда только в день дедлайна) =====
                # Проверяем, попадает ли день дедлайна в текущий месяц
                if start_date <= due_date_normalized < end_date:
                    events.append({
                        'id': task.id,
                        'type': 'task_dot',
                        'title': task.title,
                        'date': due_date_normalized.isoformat(),
                        'is_overdue': due_date_normalized < today,
                        'is_completed': task.status == 'completed',
                        'priority': task.priority,
                        'show_only_on_day': task.show_only_on_day,
                        'author': task.author,
                        '_is_dot': True,
                    })
                
                # ===== СПИСОК СОБЫТИЙ (зависит от show_only_on_day) =====
                if task.show_only_on_day:
                    # Показываем только в день дедлайна (если попадает в текущий месяц)
                    if start_date <= due_date_normalized < end_date:
                        events.append({
                            'id': task.id,
                            'type': 'task',
                            'title': task.title,
                            'date': due_date_normalized.isoformat(),
                            'is_overdue': due_date_normalized < today,
                            'is_completed': task.status == 'completed',
                            'priority': task.priority,
                            'show_only_on_day': True,
                            'days_left': (due_date_normalized - today).days if due_date_normalized >= today else 0,
                            'author': task.author,
                            '_is_event': True,
                        })
                else:
                    # Показываем каждый день от СЕГОДНЯ до дедлайна
                    # НО для выполненных задач — ТОЛЬКО в день дедлайна!
                    is_completed = task.status == 'completed'
                    
                    if is_completed:
                        # Выполненные задачи показываем только в день дедлайна
                        if start_date <= due_date_normalized < end_date:
                            days_left = (due_date_normalized - today).days
                            events.append({
                                'id': task.id,
                                'type': 'task',
                                'title': task.title,
                                'date': due_date_normalized.isoformat(),
                                'is_overdue': due_date_normalized < today,
                                'is_completed': True,
                                'priority': task.priority,
                                'show_only_on_day': False,
                                'days_left': days_left if days_left >= 0 else 0,
                                'author': task.author,
                                '_is_event': True,
                            })
                    else:
                        # Активные задачи показываем каждый день от сегодня до дедлайна
                        current_date = task.created_at.replace(hour=0, minute=0, second=0, microsecond=0)
                        
                        # Если задача создана раньше сегодня — начинаем с сегодня
                        if current_date < today:
                            current_date = today
                        
                        # Если задача создана в будущем — начинаем с даты создания
                        if current_date < task.created_at.replace(hour=0, minute=0, second=0, microsecond=0):
                            current_date = task.created_at.replace(hour=0, minute=0, second=0, microsecond=0)
                        
                        # Не показываем дни до начала месяца (для текущего месяца)
                        if current_date < start_date:
                            current_date = start_date
                        
                        # Цикл до дедлайна, но только в пределах текущего месяца
                        while current_date < end_date and current_date <= due_date_normalized:
                            days_left = (due_date_normalized - current_date).days
                            events.append({
                                'id': task.id,
                                'type': 'task',
                                'title': task.title,
                                'date': current_date.isoformat(),
                                'is_overdue': due_date_normalized < today,
                                'is_completed': False,
                                'priority': task.priority,
                                'show_only_on_day': False,
                                'days_left': days_left if days_left >= 0 else 0,
                                'author': task.author,
                                '_is_event': True,
                            })
                            current_date += timedelta(days=1)
            
            # ===== 2. Дежурства =====
            duties = db.query(Duty).filter(
                Duty.date_start < end_date,
                Duty.date_end >= start_date
            ).all()
            
            for duty in duties:
                # Определяем день начала для отображения (используем date_start)
                events.append({
                    'id': duty.id,
                    'type': 'duty',
                    'user_id': duty.user_id,
                    'date': duty.date_start.isoformat(),
                    'date_end': duty.date_end.isoformat(),
                })
            
            # ===== 3. Отпуска =====
            vacations = db.query(Vacation).filter(
                Vacation.date_start < end_date,
                Vacation.date_end >= start_date
            ).all()
            
            for vacation in vacations:
                events.append({
                    'id': vacation.id,
                    'type': 'vacation',
                    'user_id': vacation.user_id,
                    'date_start': vacation.date_start.isoformat(),
                    'date_end': vacation.date_end.isoformat(),
                })
            
            # ===== 4. Новости =====
            news = db.query(News).filter(
                News.date >= start_date,
                News.date < end_date
            ).all()
            
            for item in news:
                events.append({
                    'id': item.id,
                    'type': 'news',
                    'title': item.title,
                    'content': item.content,
                    'author': item.author,
                    'date': item.date.isoformat(),
                })
        
        # Загружаем пользователей для отображения имён
        users = load_json('users.json')
        user_map = {u.get('id'): u.get('name', 'Неизвестно') for u in users}
        
        # Обогащаем события именами пользователей
        for event in events:
            if event.get('user_id'):
                event['user_name'] = user_map.get(event['user_id'], 'Неизвестно')
        
        return jsonify({
            'events': events,
            'count': len(events)
        }), 200
    
    # ===== GET: Получить события на конкретную дату =====
    @app.route('/api/calendar/events/day', methods=['GET'])
    def get_calendar_events_day():
        date_str = request.args.get('date', '')
        user_name = request.args.get('user_name', '')
        
        if not date_str:
            return jsonify({'error': 'date required'}), 400
        
        if not user_name:
            return jsonify({'error': 'user_name required'}), 400
        
        try:
            target_date = datetime.fromisoformat(date_str)
        except:
            return jsonify({'error': 'Invalid date format'}), 400
        
        # Получаем все события за месяц, а затем фильтруем по дню
        year = target_date.year
        month = target_date.month
        
        # Используем существующий эндпоинт для получения всех событий
        with app.test_request_context(f'/api/calendar/events?year={year}&month={month}&user_name={user_name}'):
            response = get_calendar_events()
            data = response.get_json()
            
            if not data:
                return jsonify({'events': [], 'count': 0}), 200
            
            # Фильтруем события по дате
            date_str = target_date.strftime('%Y-%m-%d')
            filtered_events = []
            for event in data.get('events', []):
                event_date = event.get('date', '')[:10]
                if event_date == date_str:
                    filtered_events.append(event)
            
            return jsonify({
                'events': filtered_events,
                'count': len(filtered_events),
                'date': date_str
            }), 200
    
    # ===== POST: Создать дежурство (только админ) =====
    @app.route('/api/calendar/duties', methods=['POST'])
    def create_duty():
        data = request.get_json()
        user_id = data.get('user_id')
        date_start = data.get('date_start')
        date_end = data.get('date_end')
        author = data.get('author', '')
        
        if not user_id or not date_start or not date_end:
            return jsonify({'success': False, 'message': 'Не все поля заполнены'}), 400
        
        # Проверяем права (только админ)
        users = load_json('users.json')
        is_admin = False
        for u in users:
            if u.get('name') == author and u.get('role') == 'admin':
                is_admin = True
                break
        
        if not is_admin:
            return jsonify({'success': False, 'message': 'Только администратор может создавать дежурства'}), 403
        
        try:
            date_start_parsed = datetime.fromisoformat(date_start.replace('T', ' '))
            date_end_parsed = datetime.fromisoformat(date_end.replace('T', ' '))
        except:
            return jsonify({'success': False, 'message': 'Неверный формат даты'}), 400
        
        with get_db() as db:
            new_duty = Duty(
                user_id=user_id,
                date_start=date_start_parsed,
                date_end=date_end_parsed,
                created_at=datetime.utcnow()
            )
            db.add(new_duty)
            db.commit()
            db.refresh(new_duty)
            
            return jsonify({
                'success': True,
                'duty': new_duty.to_dict()
            }), 201
    
    # ===== DELETE: Удалить дежурство (только админ) =====
    @app.route('/api/calendar/duties/<int:duty_id>', methods=['DELETE'])
    def delete_duty(duty_id):
        data = request.get_json()
        author = data.get('author', '')
        
        # Проверяем права (только админ)
        users = load_json('users.json')
        is_admin = False
        for u in users:
            if u.get('name') == author and u.get('role') == 'admin':
                is_admin = True
                break
        
        if not is_admin:
            return jsonify({'success': False, 'message': 'Только администратор может удалять дежурства'}), 403
        
        with get_db() as db:
            duty = db.query(Duty).filter(Duty.id == duty_id).first()
            if not duty:
                return jsonify({'success': False, 'message': 'Дежурство не найдено'}), 404
            
            db.delete(duty)
            db.commit()
            
            return jsonify({'success': True, 'message': 'Дежурство удалено'}), 200
    
    # ===== POST: Создать отпуск (только админ) =====
    @app.route('/api/calendar/vacations', methods=['POST'])
    def create_vacation():
        data = request.get_json()
        user_id = data.get('user_id')
        date_start = data.get('date_start')
        date_end = data.get('date_end')
        author = data.get('author', '')
        
        if not user_id or not date_start or not date_end:
            return jsonify({'success': False, 'message': 'Не все поля заполнены'}), 400
        
        # Проверяем права (только админ)
        users = load_json('users.json')
        is_admin = False
        for u in users:
            if u.get('name') == author and u.get('role') == 'admin':
                is_admin = True
                break
        
        if not is_admin:
            return jsonify({'success': False, 'message': 'Только администратор может создавать отпуска'}), 403
        
        try:
            date_start_parsed = datetime.fromisoformat(date_start.replace('T', ' '))
            date_end_parsed = datetime.fromisoformat(date_end.replace('T', ' '))
        except:
            return jsonify({'success': False, 'message': 'Неверный формат даты'}), 400
        
        with get_db() as db:
            new_vacation = Vacation(
                user_id=user_id,
                date_start=date_start_parsed,
                date_end=date_end_parsed,
                created_at=datetime.utcnow()
            )
            db.add(new_vacation)
            db.commit()
            db.refresh(new_vacation)
            
            return jsonify({
                'success': True,
                'vacation': new_vacation.to_dict()
            }), 201
    
    # ===== DELETE: Удалить отпуск (только админ) =====
    @app.route('/api/calendar/vacations/<int:vacation_id>', methods=['DELETE'])
    def delete_vacation(vacation_id):
        data = request.get_json()
        author = data.get('author', '')
        
        # Проверяем права (только админ)
        users = load_json('users.json')
        is_admin = False
        for u in users:
            if u.get('name') == author and u.get('role') == 'admin':
                is_admin = True
                break
        
        if not is_admin:
            return jsonify({'success': False, 'message': 'Только администратор может удалять отпуска'}), 403
        
        with get_db() as db:
            vacation = db.query(Vacation).filter(Vacation.id == vacation_id).first()
            if not vacation:
                return jsonify({'success': False, 'message': 'Отпуск не найден'}), 404
            
            db.delete(vacation)
            db.commit()
            
            return jsonify({'success': True, 'message': 'Отпуск удалён'}), 200
    
    # ===== GET: Получить всех пользователей для админки =====
    @app.route('/api/calendar/users', methods=['GET'])
    def get_calendar_users():
        users = load_json('users.json')
        result = []
        for u in users:
            result.append({
                'id': u.get('id'),
                'name': u.get('name'),
                'role': u.get('role')
            })
        return jsonify(result), 200