from db.database import get_db
from db.models import Notification
from routes.sse import sse_publisher
from datetime import datetime
import sys
import traceback

class NotificationService:
    
    @staticmethod
    def send(user_name, notification_type, title, text, link=None, task_id=None):
        """Отправить уведомление конкретному пользователю"""
        with get_db() as db:
            notification = Notification(
                user_id=user_name,
                type=notification_type,
                title=title,
                text=text,
                link=link,
                task_id=task_id,
                is_read=False,
                created_at=datetime.utcnow()
            )
            db.add(notification)
            db.commit()
            
            print(f"[Notification] ✅ Уведомление сохранено для {user_name}: {title}")
            
            # Отправляем SSE событие
            sse_publisher.publish('notification_created', {
                'user_name': user_name,
                'notification': notification.to_dict()
            })
            
            # Отправляем обновление счётчика
            count = db.query(Notification).filter(
                Notification.user_id == user_name,
                Notification.is_read == False
            ).count()
            
            sse_publisher.publish('notification_count_updated', {
                'user_name': user_name,
                'count': count
            })
            
            # Отправляем push-уведомление
            try:
                from services.push_service import send_push_to_user
                send_push_to_user(
                    user_name=user_name,
                    title=title,
                    body=text,
                    url=link or '/',
                    task_id=task_id
                )
            except Exception as e:
                print(f"[Notification] ❌ Ошибка отправки push: {e}")
            
            return notification
    
    @staticmethod
    def send_to_hub(hub_type, supplier, task_id, author=None):
        """Отправить уведомления всем, у кого есть доступ к хабу"""
        from utils.file_loader import load_json
        
        print(f"[Notification] 🔔=== START send_to_hub ===")
        print(f"[Notification] hub_type={hub_type}, supplier={supplier}, task_id={task_id}, author={author}")
        sys.stdout.flush()
        
        try:
            users = load_json('users.json')
            roles = load_json('roles.json')
            hubs = load_json('hubs.json')
            
            print(f"[Notification] Загружено: {len(users)} пользователей, {len(roles)} ролей, {len(hubs)} хабов")
            
            # Находим хаб по типу
            hub = None
            for h in hubs:
                if h['key'] == hub_type:
                    hub = h
                    break
            
            if not hub:
                print(f"[Notification] ❌ Хаб с типом {hub_type} не найден")
                return
            
            hub_id = hub['id']
            print(f"[Notification] 📍 Найден хаб: {hub['name']} (id: {hub_id})")
            
            # Находим все роли с доступом к этому хабу
            roles_with_access = []
            for role in roles:
                if 'hub_access' in role and hub_id in role.get('hub_access', []):
                    roles_with_access.append(role['role_key'])
                    print(f"[Notification] Роль {role['name']} ({role['role_key']}) имеет доступ")
            
            if not roles_with_access:
                print(f"[Notification] ❌ Нет ролей с доступом к хабу {hub['name']}")
                return
            
            print(f"[Notification] 🎯 Роли с доступом: {roles_with_access}")
            
            # Формируем текст уведомления
            if hub_type == 'arrival':
                title = 'Новое поступление'
                text = f'Новое поступление от {supplier}'
            else:
                title = f'Новая задача в {hub["name"]}'
                text = f'Новая задача в {hub["name"]} от {supplier}'
            
            print(f"[Notification] Title: {title}, Text: {text}")
            
            sent_count = 0
            
            # Отправляем уведомления
            for user in users:
                user_name = user['name']
                
                # Пропускаем автора
                if author and user_name == author:
                    print(f"[Notification] ⏭️ Пропускаем автора: {user_name}")
                    continue
                
                # Проверяем, что у пользователя есть доступ к хабу
                if user.get('role') not in roles_with_access:
                    print(f"[Notification] ⏭️ Пользователь {user_name} (роль {user.get('role')}) не имеет доступа")
                    continue
                
                print(f"[Notification] 📨 Отправка уведомления пользователю: {user_name}")
                NotificationService.send(
                    user_name=user_name,
                    notification_type='task_created',
                    title=title,
                    text=text,
                    link=f'/hub/{hub_type}',
                    task_id=task_id
                )
                sent_count += 1
            
            # Отправляем push-уведомления
            # try:
            #     from services.push_service import send_push_to_hub as send_push_hub
            #     push_sent = send_push_hub(hub_type, supplier, task_id, title, text)
            #     print(f"[Notification] 📱 Отправлено push-уведомлений: {push_sent}")
            # except Exception as e:
            #     print(f"[Notification] ❌ Ошибка отправки push для хаба: {e}")
            
            print(f"[Notification] ✅ Отправлено уведомлений: {sent_count}")
            
        except Exception as e:
            print(f"[Notification] ❌ Ошибка в send_to_hub: {e}")
            traceback.print_exc()
        
        print(f"[Notification] 🔔=== END send_to_hub ===")
        sys.stdout.flush()

    @staticmethod
    def send_comment_notification(task_id, author, task_type, comment_text):
        """Отправить уведомления о новом комментарии"""
        from utils.file_loader import load_json
        
        users = load_json('users.json')
        roles = load_json('roles.json')
        hubs = load_json('hubs.json')
        
        # Находим хаб по типу
        hub = None
        for h in hubs:
            if h['key'] == task_type:
                hub = h
                break
        
        if not hub:
            print(f"[Notification] Хаб с типом {task_type} не найден")
            return
        
        hub_id = hub['id']
        
        # Находим роли с доступом к этому хабу
        roles_with_access = []
        for role in roles:
            if 'hub_access' in role and hub_id in role.get('hub_access', []):
                roles_with_access.append(role['role_key'])
        
        # Получаем подписчиков задачи из email_data
        from db.database import get_db
        from db.models import Order
        with get_db() as db:
            task = db.query(Order).filter(Order.id == task_id).first()
            if not task:
                print(f"[Notification] Задача {task_id} не найдена")
                return
            
            email_data = {}
            if task.email_data:
                try:
                    import json
                    email_data = json.loads(task.email_data)
                except:
                    pass
            
            subscribers = email_data.get('comment_subscribers', [])
        
        # Отправляем уведомления
        sent_count = 0
        for user in users:
            user_name = user['name']
            
            # Пропускаем автора комментария
            if user_name == author:
                continue
            
            # Проверяем: есть ли доступ к хабу ИЛИ пользователь в подписчиках
            has_access = user.get('role') in roles_with_access
            is_subscriber = user_name in subscribers
            
            if not has_access and not is_subscriber:
                continue
            
            # Проверяем настройки пользователя
            settings = user.get('settings', {})
            if settings.get('notifications_enabled') == False:
                continue
            
            # Отправляем уведомление
            NotificationService.send(
                user_name=user_name,
                notification_type='comment_added',
                title='Новый комментарий',
                text=f'{author} оставил комментарий: "{comment_text[:50]}..."',
                link=f'/hub/{task_type}',
                task_id=task_id
            )
            sent_count += 1
        
        print(f"[Notification] ✅ Отправлено уведомлений о комментарии: {sent_count}")

    @staticmethod
    def send_personal_task_notification(task_id, title, author, assigned_to, action='created', comment_text=None, actor=None):
        """
        Отправить уведомления о личной задаче
        
        Логика:
        - Создание задачи: уведомляются только исполнители (НЕ автор)
        - Выполнение задачи: если выполнил НЕ автор → уведомляется автор
        - Выполнение подпункта: если выполнил НЕ автор → уведомляется автор
        - Комментарий: уведомляются автор задачи и все исполнители (кроме автора комментария)
        
        Args:
            task_id: ID задачи
            title: заголовок задачи
            author: автор задачи
            assigned_to: список исполнителей
            action: 'created', 'completed', 'completed_by_items', 'comment'
            comment_text: текст комментария (для action='comment')
            actor: кто выполнил действие (для проверки, кто выполнил задачу/подпункт)
        """
        from utils.file_loader import load_json
        
        print(f"[Notification] 🔔=== START send_personal_task_notification ===")
        print(f"[Notification] task_id={task_id}, title={title}, author={author}, action={action}, actor={actor}")
        sys.stdout.flush()
        
        try:
            users = load_json('users.json')
            
            # Определяем получателей в зависимости от действия
            recipients = set()
            
            if action == 'created':
                # Создание задачи: уведомляем ТОЛЬКО исполнителей, НЕ автора
                if assigned_to:
                    recipients.update(assigned_to)
                # Исключаем автора
                recipients.discard(author)
                
                notification_title = f'📋 Новая личная задача'
                notification_text = f'{author} создал(а) задачу: "{title}"'
                link = f'/hub/tasks'
                
            elif action == 'completed':
                # Выполнение задачи (без подпунктов)
                # Если выполнил НЕ автор → уведомляем автора
                if actor and actor != author:
                    recipients.add(author)
                
                notification_title = f'✅ Задача выполнена'
                notification_text = f'{actor} выполнил(а) задачу: "{title}"'
                link = f'/hub/tasks'
                
            elif action == 'completed_by_items':
                # Все подпункты выполнены → задача автоматически завершена
                # Уведомляем автора, если подпункты выполнил НЕ автор
                if actor and actor != author:
                    recipients.add(author)
                
                notification_title = f'✅ Все подпункты выполнены'
                notification_text = f'{actor} выполнил(а) все подпункты в задаче "{title}"'
                link = f'/hub/tasks'
                
            elif action == 'comment':
                # Комментарий: уведомляем автора задачи и всех исполнителей (кроме автора комментария)
                recipients.add(author)
                if assigned_to:
                    recipients.update(assigned_to)
                # Исключаем автора комментария
                if actor:
                    recipients.discard(actor)
                
                notification_title = f'💬 Новый комментарий'
                notification_text = f'{actor} оставил(а) комментарий в задаче "{title}": "{comment_text[:50]}..."'
                link = f'/hub/tasks'
            else:
                notification_title = f'📋 Обновление задачи'
                notification_text = f'Обновление в задаче "{title}"'
                link = f'/hub/tasks'
            
            # Если получателей нет — выходим
            if not recipients:
                print(f"[Notification] ⏭️ Нет получателей для уведомления")
                return
            
            print(f"[Notification] 📨 Получатели: {recipients}")
            
            sent_count = 0
            for user in users:
                user_name = user['name']
                
                # Проверяем, должен ли пользователь получить уведомление
                if user_name not in recipients:
                    continue
                
                # Проверяем настройки пользователя
                settings = user.get('settings', {})
                if settings.get('notifications_enabled') == False:
                    continue
                
                print(f"[Notification] 📨 Отправка уведомления пользователю: {user_name}")
                NotificationService.send(
                    user_name=user_name,
                    notification_type='personal_task',
                    title=notification_title,
                    text=notification_text,
                    link=link,
                    task_id=task_id
                )
                sent_count += 1
            
            print(f"[Notification] ✅ Отправлено уведомлений о личной задаче: {sent_count}")
            
        except Exception as e:
            print(f"[Notification] ❌ Ошибка в send_personal_task_notification: {e}")
            traceback.print_exc()
        
        print(f"[Notification] 🔔=== END send_personal_task_notification ===")
        sys.stdout.flush()