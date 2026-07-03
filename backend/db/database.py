import os
import sqlite3
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from contextlib import contextmanager

# Путь к файлу БД (в папке data, которая в .gitignore)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'data', 'imlsklad.db')
DB_URL = f'sqlite:///{DB_PATH}'

# Создаём движок с WAL-режимом
engine = create_engine(
    DB_URL,
    connect_args={
        'check_same_thread': False,
        'timeout': 30,
    }
)

# Включаем WAL-режим при каждом подключении
@contextmanager
def get_connection():
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.execute('PRAGMA journal_mode=WAL')
    conn.execute('PRAGMA synchronous=NORMAL')
    conn.execute('PRAGMA cache_size=-20000')
    try:
        yield conn
    finally:
        conn.close()

# ORM база
Base = declarative_base()
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

@contextmanager
def get_db():
    """Контекстный менеджер для сессий SQLAlchemy"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Создаёт все таблицы"""
    Base.metadata.create_all(bind=engine)