from flask import request, jsonify
import json
import os
from utils.file_loader import load_json, save_json
import sys
import traceback

# Файл для хранения подписок
PUSH_SUBSCRIPTIONS_FILE = 'push_subscriptions.json'

def get_subscriptions():
    """Загрузить все подписки"""
    try:
        data = load_json(PUSH_SUBSCRIPTIONS_FILE)
        if isinstance(data, dict):
            return data
        return {}
    except:
        return {}

def save_subscriptions(subscriptions):
    """Сохранить подписки"""
    save_json(PUSH_SUBSCRIPTIONS_FILE, subscriptions)

def register_push_routes(app):
    
    @app.route('/api/push/subscribe', methods=['POST'])
    def subscribe_push():
        """Сохранить push-подписку пользователя"""
        try:
            data = request.get_json()
            user_name = data.get('user_name')
            subscription = data.get('subscription')
            
            if not user_name or not subscription:
                return jsonify({'success': False, 'error': 'Недостаточно данных'}), 400
            
            # Загружаем существующие подписки
            subscriptions = get_subscriptions()
            
            # Проверяем, есть ли уже подписка для этого пользователя
            if user_name in subscriptions:
                # Проверяем, не изменился ли endpoint
                existing_endpoint = subscriptions[user_name].get('endpoint')
                new_endpoint = subscription.get('endpoint')
                
                if existing_endpoint == new_endpoint:
                    # Та же подписка, обновляем только если изменились ключи
                    if subscriptions[user_name] != subscription:
                        subscriptions[user_name] = subscription
                        save_subscriptions(subscriptions)
                    return jsonify({'success': True, 'message': 'Подписка уже существует'}), 200
            
            # Сохраняем подписку
            subscriptions[user_name] = subscription
            save_subscriptions(subscriptions)
            
            print(f"[Push] ✅ Подписка сохранена для {user_name}")
            
            return jsonify({'success': True, 'message': 'Подписка сохранена'}), 200
            
        except Exception as e:
            print(f"[Push] ❌ Ошибка сохранения подписки: {e}")
            traceback.print_exc()
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/push/unsubscribe', methods=['POST'])
    def unsubscribe_push():
        """Удалить push-подписку пользователя"""
        try:
            data = request.get_json()
            user_name = data.get('user_name')
            endpoint = data.get('endpoint')
            
            if not user_name:
                return jsonify({'success': False, 'error': 'user_name required'}), 400
            
            subscriptions = get_subscriptions()
            
            if user_name in subscriptions:
                # Если передан endpoint, проверяем что он совпадает
                if endpoint and subscriptions[user_name].get('endpoint') != endpoint:
                    return jsonify({'success': False, 'error': 'Подписка не найдена'}), 404
                
                del subscriptions[user_name]
                save_subscriptions(subscriptions)
                print(f"[Push] ✅ Подписка удалена для {user_name}")
            
            return jsonify({'success': True, 'message': 'Подписка удалена'}), 200
            
        except Exception as e:
            print(f"[Push] ❌ Ошибка удаления подписки: {e}")
            traceback.print_exc()
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/push/subscriptions', methods=['GET'])
    def get_push_subscriptions():
        """Получить список всех подписок (админский эндпоинт)"""
        try:
            subscriptions = get_subscriptions()
            return jsonify({
                'total': len(subscriptions),
                'users': list(subscriptions.keys())
            }), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/api/push/vapid_public_key', methods=['GET'])
    def get_vapid_public_key():
        """Получить публичный VAPID ключ для фронтенда"""
        from dotenv import load_dotenv
        import os
        load_dotenv('data/.env')
        
        public_key = os.getenv('VAPID_PUBLIC_KEY')
        if not public_key:
            return jsonify({'error': 'VAPID_PUBLIC_KEY не настроен'}), 500
        
        return jsonify({'public_key': public_key}), 200