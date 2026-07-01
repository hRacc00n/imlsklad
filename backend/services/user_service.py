from utils.file_loader import load_json, save_json

def get_all_users():
    """Получить всех пользователей"""
    return load_json('users.json')

def save_users(users):
    """Сохранить всех пользователей"""
    save_json('users.json', users)

def find_user_by_id(user_id):
    """Найти пользователя по ID"""
    users = get_all_users()
    for user in users:
        if user['id'] == user_id:
            return user
    return None

def find_user_by_login_and_password(login, password):
    """Найти пользователя по логину и паролю"""
    users = get_all_users()
    for user in users:
        if user.get('login') == login and user.get('password') == password:
            return user
    return None