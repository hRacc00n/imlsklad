"""
Скрипт для нормализации статусов в базе данных.
Приводит все статусы к единому формату: new, in_progress, completed
"""

import os
import sys
from pathlib import Path

# Устанавливаем кодировку для Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Добавляем путь к проекту
sys.path.append(str(Path(__file__).parent.parent))

from db.database import get_db
from db.models import Order
import json

def normalize_statuses():
    """Приводит все статусы заказов к единому формату"""
    
    # Маппинг старых статусов на новые
    status_mapping = {
        # Русские варианты
        'Новая': 'new',
        'В работе': 'in_progress',
        'Завершена': 'completed',
        # Варианты с разным регистром
        'новая': 'new',
        'в работе': 'in_progress',
        'завершена': 'completed',
        # Английские варианты с опечатками
        'in progress': 'in_progress',
        'in-progress': 'in_progress',
        'complete': 'completed',
        'done': 'completed',
        'finished': 'completed',
    }
    
    print("=" * 60)
    print("Начинаем нормализацию статусов заказов")
    print("=" * 60)
    
    with get_db() as db:
        # Получаем все заказы
        orders = db.query(Order).all()
        total_count = len(orders)
        updated_count = 0
        skipped_count = 0
        
        print(f"Найдено заказов: {total_count}")
        print("-" * 60)
        
        for order in orders:
            old_status = order.status
            new_status = status_mapping.get(old_status)
            
            if new_status and old_status != new_status:
                # Обновляем статус
                order.status = new_status
                updated_count += 1
                print(f"[OK] Заказ #{order.id}: '{old_status}' -> '{new_status}'")
                
                # Обновляем email_data если есть
                if order.email_data:
                    try:
                        email_data = json.loads(order.email_data)
                        email_data['status'] = new_status
                        order.email_data = json.dumps(email_data, ensure_ascii=False)
                    except:
                        pass
            else:
                skipped_count += 1
                if old_status != new_status:
                    print(f"[WARN] Заказ #{order.id}: статус '{old_status}' не найден в маппинге")
        
        # Сохраняем изменения
        if updated_count > 0:
            db.commit()
            print("-" * 60)
            print(f"[OK] Обновлено заказов: {updated_count}")
            print(f"[SKIP] Пропущено заказов: {skipped_count}")
        else:
            print("[OK] Все статусы уже нормализованы")
        
        print("=" * 60)
        print("Нормализация завершена!")
        
        # Показываем статистику по статусам после нормализации
        print("\nСтатистика статусов после нормализации:")
        from sqlalchemy import func
        stats = db.query(Order.status, func.count(Order.id)).group_by(Order.status).all()
        for status, count in stats:
            print(f"  {status}: {count}")
        print("=" * 60)

def check_statuses():
    """Проверяет текущие статусы в БД"""
    print("\nПроверка текущих статусов:")
    with get_db() as db:
        from sqlalchemy import func
        stats = db.query(Order.status, func.count(Order.id)).group_by(Order.status).all()
        if not stats:
            print("  Нет заказов в базе данных")
        else:
            for status, count in stats:
                print(f"  '{status}': {count}")

if __name__ == '__main__':
    # Сначала показываем текущие статусы
    check_statuses()
    
    # Спрашиваем подтверждение
    print("\n[WARNING] ВНИМАНИЕ! Это изменит статусы в базе данных.")
    response = input("Продолжить? (y/n): ")
    
    if response.lower() == 'y':
        normalize_statuses()
        check_statuses()
    else:
        print("Операция отменена")