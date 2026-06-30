from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False
CORS(app)

@app.route('/api/health')
def health():
    return jsonify({
        'status': 'ok',
        'message': 'Логистический центр работает'
    })

@app.route('/api/orders')
def get_orders():
    return jsonify([
        {
            'id': 1,
            'tracking': 'LOG-001',
            'client': 'ООО "Транспортник"',
            'status': 'В пути',
            'date': '2026-06-30'
        },
        {
            'id': 2,
            'tracking': 'LOG-002',
            'client': 'ИП "Грузовичок"',
            'status': 'Доставлен',
            'date': '2026-06-29'
        }
    ])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)