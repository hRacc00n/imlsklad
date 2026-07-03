import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import get_db
from db.models import Hub

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HUBS_PATH = os.path.join(BASE_DIR, 'data', 'hubs.json')

def seed_hubs():
    if not os.path.exists(HUBS_PATH):
        print("ERROR: hubs.json not found")
        return
    
    with open(HUBS_PATH, 'r', encoding='utf-8') as f:
        hubs_data = json.load(f)
    
    with get_db() as db:
        for hub_data in hubs_data:
            existing = db.query(Hub).filter(Hub.name == hub_data['name']).first()
            if not existing:
                hub = Hub(
                    id=hub_data['id'],
                    name=hub_data['name'],
                    address=hub_data.get('address', ''),
                    description=hub_data.get('description', '')
                )
                db.add(hub)
        db.commit()
        print(f"OK: Added {len(hubs_data)} hubs")

if __name__ == "__main__":
    seed_hubs()