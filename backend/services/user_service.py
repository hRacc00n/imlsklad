from utils.file_loader import load_json

def get_all_users():
    """Получить всех пользователей"""
    return load_json('users.json')

def find_user_by_login_and_password(login, password):
    """Найти пользователя по логину и паролю"""
    users = get_all_users()
    for user in users:
        if user.get('login') == login and user.get('password') == password:
            return user
    return None
