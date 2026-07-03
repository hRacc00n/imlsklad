import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import init_db
from db.models import Order, Hub, OrderHistory

def create_tables():
    print("Creating tables...")
    init_db()
    print("OK: Tables created!")

if __name__ == "__main__":
    create_tables()