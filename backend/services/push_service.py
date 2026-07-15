from pywebpush import webpush, WebPushException
import json
import os
from dotenv import load_dotenv
import sys
import traceback

# Загружаем .env
load_dotenv('data/.env')

# VAPID ключи из .env
VAPID_PRIVATE_KEY = os.getenv('VAPID_PRIVATE_KEY')
VAPID_PUBLIC_KEY = os.getenv('VAPID_PUBLIC_KEY')
VAPID_CLAIM_EMAIL = os.getenv('VAPID_CLAIM_EMAIL')


def send_push_notification(subscription_info, title, body, url='/', task_id=None):
    """
    Отправить push-уведомление одному получателю
    
    Args:
        subscription_info: dict с endpoint, keys (p256dh, auth)
        title: заголовок уведомления
        body: текст уведомления
        url: ссылка для открытия при клике
        task_id: ID задачи для открытия модалки
    """
    try:
        if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
            print("[Push] ❌ VAPID ключи не настроены")
            return False
        
        # Формируем данные для отправки
        data = {
            'title': title,
            'body': body,
            'url': url,
            'task_id': task_id,
            'icon': '/favicon.svg',
            'badge': '/favicon.svg',
        }
        
        # Отправляем уведомление
        webpush(
            subscription_info=subscription_info,
            data=json.dumps(data),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={
                'sub': f'mailto:{VAPID_CLAIM_EMAIL}',
            },
            content_encoding='aesgcm',
            ttl=86400,  # 24 часа
        )
        
        print(f"[Push] ✅ Отправлено уведомление: {title}")
        return True
        
    except WebPushException as e:
        print(f"[Push] ❌ Ошибка отправки: {e}")
        # Если ошибка 410 (Gone) или 404 (Not Found) - подписка устарела
        if e.response and e.response.status_code in [404, 410]:
            print(f"[Push] Подписка устарела (статус: {e.response.status_code})")
            return 'expired'
        return False
    except Exception as e:
        print(f"[Push] ❌ Ошибка: {e}")
        traceback.print_exc()
        return False


def send_push_to_user(user_name, title, body, url='/', task_id=None):
    """
    Отправить push-уведомление пользователю
    
    Args:
        user_name: имя пользователя
        title: заголовок уведомления
        body: текст уведомления
        url: ссылка для открытия
        task_id: ID задачи
    """
    from utils.file_loader import load_json
    
    try:
        # Загружаем подписки
        subscriptions = load_json('push_subscriptions.json')
        
        if not subscriptions or user_name not in subscriptions:
            print(f"[Push] ⏭️ Нет подписки для {user_name}")
            return False
        
        subscription_info = subscriptions[user_name]
        
        # Проверяем, что есть все необходимые поля
        if not subscription_info.get('endpoint'):
            print(f"[Push] ❌ Нет endpoint для {user_name}")
            return False
        
        # Преобразуем ключи в нужный формат
        keys = subscription_info.get('keys', {})
        if not keys.get('p256dh') or not keys.get('auth'):
            print(f"[Push] ❌ Нет ключей для {user_name}")
            return False
        
        subscription = {
            'endpoint': subscription_info['endpoint'],
            'keys': {
                'p256dh': keys['p256dh'],
                'auth': keys['auth'],
            }
        }
        
        result = send_push_notification(subscription, title, body, url, task_id)
        
        # Если подписка устарела - удаляем
        if result == 'expired':
            # Удаляем подписку
            del subscriptions[user_name]
            from utils.file_loader import save_json
            save_json('push_subscriptions.json', subscriptions)
            print(f"[Push] 🗑️ Удалена устаревшая подписка для {user_name}")
            return False
        
        return result
        
    except Exception as e:
        print(f"[Push] ❌ Ошибка отправки пользователю {user_name}: {e}")
        traceback.print_exc()
        return False


def send_push_to_hub(hub_type, supplier, task_id, title, text):
    """
    Отправить push-уведомления всем пользователям с доступом к хабу
    
    Args:
        hub_type: тип хаба
        supplier: поставщик/контрагент
        task_id: ID задачи
        title: заголовок уведомления
        text: текст уведомления
    """
    from utils.file_loader import load_json
    
    try:
        users = load_json('users.json')
        roles = load_json('roles.json')
        hubs = load_json('hubs.json')
        
        # Находим хаб
        hub = None
        for h in hubs:
            if h['key'] == hub_type:
                hub = h
                break
        
        if not hub:
            print(f"[Push] ❌ Хаб {hub_type} не найден")
            return
        
        hub_id = hub['id']
        
        # Находим роли с доступом
        roles_with_access = []
        for role in roles:
            if 'hub_access' in role and hub_id in role.get('hub_access', []):
                roles_with_access.append(role['role_key'])
        
        if not roles_with_access:
            print(f"[Push] ❌ Нет ролей с доступом к хабу {hub['name']}")
            return
        
        # Отправляем уведомления
        sent_count = 0
        for user in users:
            user_name = user['name']
            
            # Проверяем доступ
            if user.get('role') not in roles_with_access:
                continue
            
            # Проверяем настройки пользователя
            settings = user.get('settings', {})
            if settings.get('push_enabled') == False:
                continue
            
            # Отправляем push
            url = f'/hub/{hub_type}'
            result = send_push_to_user(user_name, title, text, url, task_id)
            
            if result:
                sent_count += 1
        
        print(f"[Push] ✅ Отправлено push-уведомлений: {sent_count}")
        return sent_count
        
    except Exception as e:
        print(f"[Push] ❌ Ошибка: {e}")
        traceback.print_exc()
        return 0