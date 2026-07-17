import sys
import io
import os

from flask import Flask
from flask_cors import CORS

from routes.health import register_health_routes
from routes.auth import register_auth_routes
from routes.orders import register_orders_routes
from routes.users import register_users_routes
from routes.roles import register_roles_routes
from routes.sse import register_sse_routes
from routes.tasks import register_tasks_routes
from routes.comments import register_comments_routes
from flask import send_from_directory
from routes.notifications import register_notifications_routes
from mail_parsers.scheduler import MailScheduler
from routes.regional_contractors import register_regional_contractors_routes
from routes.gallery import register_gallery_routes
from routes.push import register_push_routes
from routes.personal_tasks import register_personal_tasks_routes

# Переопределяем stdout ПОСЛЕ всех импортов
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False
CORS(app)

# Регистрация маршрутов
register_health_routes(app)
register_auth_routes(app)
register_orders_routes(app)
register_users_routes(app)
register_roles_routes(app)
register_sse_routes(app)
register_tasks_routes(app)
register_comments_routes(app)
register_notifications_routes(app)
register_regional_contractors_routes(app)
register_push_routes(app)
register_gallery_routes(app)
register_personal_tasks_routes(app)

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    upload_dir = os.path.join(os.path.dirname(__file__), 'data', 'uploads')
    return send_from_directory(upload_dir, filename)

@app.route('/uploads/photos/<filename>')
def uploaded_photo(filename):
    upload_dir = os.path.join(os.path.dirname(__file__), 'data', 'uploads', 'photos')
    return send_from_directory(upload_dir, filename)

@app.route('/uploads/invoices/<filename>')
def uploaded_invoice(filename):
    upload_dir = os.path.join(os.path.dirname(__file__), 'data', 'uploads', 'invoices')
    return send_from_directory(upload_dir, filename)

@app.route('/uploads/airtraffic/<filename>')
def uploaded_airtraffic(filename):
    upload_dir = os.path.join(os.path.dirname(__file__), 'data', 'uploads', 'airtraffic')
    return send_from_directory(upload_dir, filename)

# Запуск планировщика почты
mail_scheduler = MailScheduler()
mail_scheduler.start()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)