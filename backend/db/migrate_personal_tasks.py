# backend/db/migrate_personal_tasks.py
from db.database import engine
from sqlalchemy import text

def migrate_personal_tasks():
    """Добавляет новые колонки в таблицу personal_tasks"""
    with engine.connect() as conn:
        # Проверяем существующие колонки
        result = conn.execute(text('PRAGMA table_info(personal_tasks)'))
        columns = [row[1] for row in result]
        print('Существующие колонки:', columns)
        
        # Добавляем колонки, если их нет
        if 'due_date' not in columns:
            print('Добавляем колонку due_date...')
            conn.execute(text('ALTER TABLE personal_tasks ADD COLUMN due_date DATETIME'))
            conn.commit()
        
        if 'show_only_on_day' not in columns:
            print('Добавляем колонку show_only_on_day...')
            conn.execute(text('ALTER TABLE personal_tasks ADD COLUMN show_only_on_day BOOLEAN DEFAULT 0'))
            conn.commit()
        
        if 'completed_at' not in columns:
            print('Добавляем колонку completed_at...')
            conn.execute(text('ALTER TABLE personal_tasks ADD COLUMN completed_at DATETIME'))
            conn.commit()
        
        if 'priority' not in columns:
            print('Добавляем колонку priority...')
            conn.execute(text("ALTER TABLE personal_tasks ADD COLUMN priority VARCHAR(20) DEFAULT 'medium'"))
            conn.commit()
        
        print('✅ Все колонки добавлены!')

if __name__ == '__main__':
    migrate_personal_tasks()