from flask import Flask
from flask_cors import CORS

from routes.health import register_health_routes
from routes.auth import register_auth_routes

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False
CORS(app)

# Регистрация маршрутов
register_health_routes(app)
register_auth_routes(app)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)