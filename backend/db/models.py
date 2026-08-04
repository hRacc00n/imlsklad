from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from db.database import Base

class Order(Base):
    """Модель заказа (задача)"""
    __tablename__ = 'orders'
    
    id = Column(Integer, primary_key=True, index=True)
    tracking = Column(String(50), unique=True, index=True)  # Трек-номер
    client = Column(String(200))                           # Клиент
    type = Column(String(50))                              # Тип задачи: отгрузка, приемка, счет
    status = Column(String(50), default='Новая')           # Статус: Новая, В работе, Завершена
    description = Column(Text, nullable=True)              # Описание
    assigned_to = Column(Integer, nullable=True)           # ID пользователя (кто взял в работу)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Данные из почты (JSON)
    email_data = Column(Text, nullable=True)               # Храним как JSON строку
    attachments = Column(Text, nullable=True)              # Вложения (JSON)
    
    def to_dict(self):
        return {
            'id': self.id,
            'tracking': self.tracking,
            'client': self.client,
            'type': self.type,
            'status': self.status,
            'description': self.description,
            'assigned_to': self.assigned_to,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'email_data': self.email_data,
            'attachments': self.attachments
        }

class Hub(Base):
    """Модель хаба (склад/терминал)"""
    __tablename__ = 'hubs'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True)    # Название хаба
    address = Column(String(300), nullable=True)           # Адрес
    description = Column(Text, nullable=True)              # Описание
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'address': self.address,
            'description': self.description
        }

class OrderHistory(Base):
    """История изменений заказа"""
    __tablename__ = 'order_history'
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey('orders.id'), index=True)
    user_id = Column(Integer)                              # ID пользователя, сделавшего изменение
    action = Column(String(50))                            # Действие: создание, взятие, завершение
    old_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'user_id': self.user_id,
            'action': self.action,
            'old_status': self.old_status,
            'new_status': self.new_status,
            'comment': self.comment,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Comment(Base):
    """Модель комментария к задаче"""
    __tablename__ = 'comments'
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey('orders.id'), index=True, nullable=False)
    author = Column(String(100), nullable=False)
    text = Column(Text, nullable=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        is_edited = False
        if self.updated_at and self.created_at:
            diff = (self.updated_at - self.created_at).total_seconds()
            is_edited = diff > 1
        
        # Конвертируем в +3 часовой пояс (Москва)
        local_tz = timedelta(hours=3)
        
        created_local = (self.created_at + local_tz).strftime('%Y-%m-%d %H:%M') if self.created_at else None
        updated_local = (self.updated_at + local_tz).strftime('%Y-%m-%d %H:%M') if self.updated_at else None
        
        return {
            'id': self.id,
            'task_id': self.task_id,
            'author': self.author,
            'text': self.text if not self.is_deleted else None,
            'is_deleted': self.is_deleted,
            'created_at': created_local,
            'updated_at': updated_local,
            'is_edited': is_edited
        }

class Notification(Base):
    """Модель уведомления"""
    __tablename__ = 'notifications'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), nullable=False, index=True)
    type = Column(String(50), nullable=False)                  # task_created
    title = Column(String(200), nullable=False)
    text = Column(Text, nullable=False)
    link = Column(String(500), nullable=True)                  # /hub/arrivals
    is_read = Column(Boolean, default=False)
    task_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        diff = datetime.utcnow() - self.created_at
        seconds = diff.total_seconds()
        if seconds < 60:
            time_ago = 'только что'
        elif seconds < 3600:
            minutes = int(seconds // 60)
            time_ago = f'{minutes} мин назад'
        elif seconds < 86400:
            hours = int(seconds // 3600)
            time_ago = f'{hours} ч назад'
        else:
            days = int(seconds // 86400)
            time_ago = f'{days} д назад'
        
        return {
            'id': self.id,
            'user_id': self.user_id,
            'type': self.type,
            'title': self.title,
            'text': self.text,
            'link': self.link,
            'is_read': self.is_read,
            'task_id': self.task_id,
            'created_at': (self.created_at + timedelta(hours=3)).strftime('%Y-%m-%d %H:%M') if self.created_at else '',
            'time_ago': time_ago
        }

class GalleryAlbum(Base):
    """Модель альбома для галереи отгрузок"""
    __tablename__ = 'gallery_albums'
    
    id = Column(Integer, primary_key=True, index=True)
    city = Column(String(200), nullable=False)          # Город
    date = Column(DateTime, default=datetime.utcnow)    # Дата создания альбома
    author = Column(String(100), nullable=False)        # Кто создал
    description = Column(Text, nullable=True)           # Описание/комментарий
    photos = Column(Text, nullable=True)                # JSON список путей к фото
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        import json
        photos_list = []
        if self.photos:
            try:
                photos_list = json.loads(self.photos)
            except:
                pass
        
        # Конвертируем в +3 часовой пояс (Москва)
        local_tz = timedelta(hours=3)
        
        return {
            'id': self.id,
            'city': self.city,
            'date': (self.date + local_tz).strftime('%Y-%m-%d %H:%M') if self.date else '',
            'author': self.author,
            'description': self.description,
            'photos': photos_list,
            'photos_count': len(photos_list),
            'created_at': (self.created_at + local_tz).strftime('%Y-%m-%d %H:%M') if self.created_at else '',
            'updated_at': (self.updated_at + local_tz).strftime('%Y-%m-%d %H:%M') if self.updated_at else '',
        }


class GalleryComment(Base):
    """Модель комментария к альбому галереи (без уведомлений)"""
    __tablename__ = 'gallery_comments'
    
    id = Column(Integer, primary_key=True, index=True)
    album_id = Column(Integer, ForeignKey('gallery_albums.id'), index=True, nullable=False)
    author = Column(String(100), nullable=False)
    text = Column(Text, nullable=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        is_edited = False
        if self.updated_at and self.created_at:
            diff = (self.updated_at - self.created_at).total_seconds()
            is_edited = diff > 1
        
        # Конвертируем в +3 часовой пояс (Москва)
        local_tz = timedelta(hours=3)
        
        created_local = (self.created_at + local_tz).strftime('%Y-%m-%d %H:%M') if self.created_at else None
        updated_local = (self.updated_at + local_tz).strftime('%Y-%m-%d %H:%M') if self.updated_at else None
        
        return {
            'id': self.id,
            'album_id': self.album_id,
            'author': self.author,
            'text': self.text if not self.is_deleted else None,
            'is_deleted': self.is_deleted,
            'created_at': created_local,
            'updated_at': updated_local,
            'is_edited': is_edited
        }

class PersonalTask(Base):
    """Модель личной задачи"""
    __tablename__ = 'personal_tasks'
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)          # Заголовок задачи
    description = Column(Text, nullable=True)            # Описание
    author = Column(String(100), nullable=False)         # Кто создал
    assigned_to = Column(Text, nullable=True)            # JSON список исполнителей
    status = Column(String(50), default='active')        # active, completed
    files = Column(Text, nullable=True)                  # JSON список файлов
    due_date = Column(DateTime, nullable=True)           # <--  (срок выполнения)
    show_only_on_day = Column(Boolean, default=False)    # <-- 
    completed_at = Column(DateTime, nullable=True)       # <--  (когда выполнена)
    priority = Column(String(20), default='medium')      # <-- (low, medium, high)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        import json
        assigned_list = []
        if self.assigned_to:
            try:
                assigned_list = json.loads(self.assigned_to)
            except:
                pass
        
        files_list = []
        if self.files:
            try:
                files_list = json.loads(self.files)
            except:
                pass
        
        local_tz = timedelta(hours=3)
        
        # Проверяем, просрочена ли задача
        is_overdue = False
        if self.due_date and self.status != 'completed':
            if datetime.utcnow() > self.due_date:
                is_overdue = True
        
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'author': self.author,
            'assigned_to': assigned_list,
            'status': self.status,
            'files': files_list,
            'due_date': (self.due_date + local_tz).strftime('%Y-%m-%d %H:%M') if self.due_date else None,  # <-- ДОБАВИТЬ
            'show_only_on_day': self.show_only_on_day,  # <-- ДОБАВИТЬ
            'completed_at': (self.completed_at + local_tz).strftime('%Y-%m-%d %H:%M') if self.completed_at else None,  # <-- ДОБАВИТЬ
            'priority': self.priority,  # <-- ДОБАВИТЬ
            'is_overdue': is_overdue,  # <-- ДОБАВИТЬ
            'created_at': (self.created_at + local_tz).strftime('%Y-%m-%d %H:%M') if self.created_at else '',
            'updated_at': (self.updated_at + local_tz).strftime('%Y-%m-%d %H:%M') if self.updated_at else '',
        }


class TaskItem(Base):
    """Модель подпункта личной задачи (чекбокс)"""
    __tablename__ = 'task_items'
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey('personal_tasks.id'), index=True, nullable=False)
    text = Column(String(500), nullable=False)           # Текст подпункта
    is_completed = Column(Boolean, default=False)       # Выполнен ли
    completed_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        local_tz = timedelta(hours=3)
        return {
            'id': self.id,
            'task_id': self.task_id,
            'text': self.text,
            'is_completed': self.is_completed,
            'completed_by': self.completed_by,
            'created_at': (self.created_at + local_tz).strftime('%Y-%m-%d %H:%M') if self.created_at else '',
            'updated_at': (self.updated_at + local_tz).strftime('%Y-%m-%d %H:%M') if self.updated_at else '',
        }


class PersonalTaskComment(Base):
    """Модель комментария к личной задаче"""
    __tablename__ = 'personal_task_comments'
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey('personal_tasks.id'), index=True, nullable=False)
    author = Column(String(100), nullable=False)
    text = Column(Text, nullable=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        is_edited = False
        if self.updated_at and self.created_at:
            diff = (self.updated_at - self.created_at).total_seconds()
            is_edited = diff > 1
        
        local_tz = timedelta(hours=3)
        
        created_local = (self.created_at + local_tz).strftime('%Y-%m-%d %H:%M') if self.created_at else None
        updated_local = (self.updated_at + local_tz).strftime('%Y-%m-%d %H:%M') if self.updated_at else None
        
        return {
            'id': self.id,
            'task_id': self.task_id,
            'author': self.author,
            'text': self.text if not self.is_deleted else None,
            'is_deleted': self.is_deleted,
            'created_at': created_local,
            'updated_at': updated_local,
            'is_edited': is_edited
        }

class Duty(Base):
    """Модель дежурства (администрирование)"""
    __tablename__ = 'duties'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)              # ID пользователя из users.json
    date_start = Column(DateTime, nullable=False)          # Дата начала (один день или диапазон)
    date_end = Column(DateTime, nullable=False)            # Дата окончания
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        local_tz = timedelta(hours=3)
        return {
            'id': self.id,
            'user_id': self.user_id,
            'date_start': self.date_start.strftime('%Y-%m-%d %H:%M') if self.date_start else '',
            'date_end': self.date_end.strftime('%Y-%m-%d %H:%M') if self.date_end else '',
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M') if self.created_at else '',
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M') if self.updated_at else '',
        }

class Vacation(Base):
    """Модель отпуска (администрирование)"""
    __tablename__ = 'vacations'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)              # ID пользователя из users.json
    date_start = Column(DateTime, nullable=False)          # Дата начала отпуска
    date_end = Column(DateTime, nullable=False)            # Дата окончания отпуска
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        local_tz = timedelta(hours=3)
        return {
            'id': self.id,
            'user_id': self.user_id,
            'date_start': self.date_start.strftime('%Y-%m-%d %H:%M') if self.date_start else '',
            'date_end': self.date_end.strftime('%Y-%m-%d %H:%M') if self.date_end else '',
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M') if self.created_at else '',
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M') if self.updated_at else '',
        }

class News(Base):
    """Модель новости (отображается в календаре и хабе Новости)"""
    __tablename__ = 'news'
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)            # Заголовок новости
    content = Column(Text, nullable=False)                 # Текст новости (Markdown)
    author = Column(String(100), nullable=False)           # Автор
    event_date = Column(DateTime, nullable=False)          # Дата события (точка в календаре)
    show_from = Column(DateTime, nullable=False)           # Дата начала показа в списке событий
    show_to = Column(DateTime, nullable=False)             # Дата окончания показа в списке событий
    is_hidden = Column(Boolean, default=False)             # Скрыта ли новость (только для админа)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        local_tz = timedelta(hours=3)
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'author': self.author,
            'event_date': self.event_date.strftime('%Y-%m-%d %H:%M') if self.event_date else '',
            'show_from': self.show_from.strftime('%Y-%m-%d %H:%M') if self.show_from else '',
            'show_to': self.show_to.strftime('%Y-%m-%d %H:%M') if self.show_to else '',
            'is_hidden': self.is_hidden,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M') if self.created_at else '',
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M') if self.updated_at else '',
        }