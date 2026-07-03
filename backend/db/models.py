from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
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
