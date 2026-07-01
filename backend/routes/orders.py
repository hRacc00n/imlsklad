import json

def register_orders_routes(app):
    @app.route('/api/orders')
    def get_orders():
        return json.dumps([
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
        ], ensure_ascii=False), 200, {'Content-Type': 'application/json; charset=utf-8'}