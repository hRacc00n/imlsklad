import time
import threading
from datetime import datetime
from .invoice_parser import InvoiceParser
from .otgruzka_parser import OtgruzkaParser
from .parsing_config import (
    PARSING_INVOICES,
    PARSING_OTGRUZKAS,
    CHECK_INTERVAL,
    EMAIL_LIMIT
)
import sys
import os
import email
import base64
import uuid
import imaplib
from services.notification_service import NotificationService
from dotenv import load_dotenv

# Загружаем .env
load_dotenv('data/.env')

# Добавляем путь к backend для импорта моделей
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def log(msg):
    """Безопасный вывод в консоль"""
    try:
        sys.stderr.write(f"{msg}\n")
        sys.stderr.flush()
    except:
        pass


class MailScheduler:
    """Планировщик для периодической проверки почты"""
    
    def __init__(self):
        self.running = False
        self.thread = None
        self.interval = CHECK_INTERVAL
        self.email_limit = EMAIL_LIMIT
        self.environment = os.getenv('ENVIRONMENT', 'local')
        
        log(f"[SCHEDULER] Окружение: {self.environment}")
        log(f"[SCHEDULER] PARSING_INVOICES: {PARSING_INVOICES}")
        log(f"[SCHEDULER] PARSING_OTGRUZKAS: {PARSING_OTGRUZKAS}")
        log(f"[SCHEDULER] Интервал: {self.interval} сек")
        log(f"[SCHEDULER] Лимит писем: {self.email_limit}")
        
    def _is_parsing_enabled_for_type(self, config_value):
        """
        Проверяет, включен ли парсинг для данного типа в текущем окружении
        
        config_value может быть:
        - 'local'      → работает только на локальной машине
        - 'production' → работает только на сервере
        - 'false'      → выключен везде
        """
        if config_value == 'false':
            return False
        if config_value == 'local':
            return self.environment == 'local'
        if config_value == 'production':
            return self.environment == 'production'
        # На всякий случай, если значение неизвестно
        return False
    
    def process_invoices(self):
        """Обработка писем со счетами"""
        if not self._is_parsing_enabled_for_type(PARSING_INVOICES):
            log(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ⏭️ Парсинг счетов ОТКЛЮЧЕН (PARSING_INVOICES={PARSING_INVOICES})")
            return
        
        log(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Checking invoices...")
        
        parser = InvoiceParser()
        
        if not parser.connect():
            log("[ERROR] Failed to connect to mail server")
            return
        
        try:
            invoices = parser.get_unread_invoices(limit=self.email_limit)
            log(f"[DEBUG] get_unread_invoices returned: {len(invoices) if invoices else 0} emails")
            
            if invoices:
                log(f"[INVOICES] Found {len(invoices)} invoices to process")
                
                for invoice in invoices:
                    try:
                        log(f"[DEBUG] Processing invoice: {invoice['email_id']}")
                        log(f"[DEBUG] Invoice data: {invoice['data']}")
                        
                        task_id = self.create_invoice_task(invoice['data'], invoice['email_id'], parser.connection)
                        
                        if task_id:
                            parser.mark_as_read(invoice['email_id'])
                            log(f"[OK] Created task #{task_id} for invoice {invoice['email_id']}")
                        else:
                            log(f"[WARN] Failed to create task for invoice {invoice['email_id']}, NOT marking as read")
                            
                    except Exception as e:
                        log(f"[ERROR] Processing invoice {invoice.get('email_id', 'unknown')}: {e}")
                        import traceback
                        log(traceback.format_exc())
            else:
                log("[INVOICES] No new invoices found")
                
        except Exception as e:
            log(f"[ERROR] Process invoices error: {e}")
            import traceback
            log(traceback.format_exc())
        finally:
            parser.close()
    
    def process_otgruzkas(self):
        """Обработка писем с отгрузками"""
        if not self._is_parsing_enabled_for_type(PARSING_OTGRUZKAS):
            log(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ⏭️ Парсинг отгрузок ОТКЛЮЧЕН (PARSING_OTGRUZKAS={PARSING_OTGRUZKAS})")
            return
        
        log(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Checking otgruzkas...")
        
        parser = OtgruzkaParser()
        
        if not parser.connect():
            log("[ERROR] Failed to connect to mail server")
            return
        
        try:
            otgruzkas = parser.get_unread_otgruzkas(limit=self.email_limit)
            log(f"[DEBUG] get_unread_otgruzkas returned: {len(otgruzkas) if otgruzkas else 0} emails")
            
            if otgruzkas:
                log(f"[OTGRUZKAS] Found {len(otgruzkas)} otgruzkas to process")
                
                for otgruzka in otgruzkas:
                    try:
                        log(f"[DEBUG] Processing otgruzka: {otgruzka['email_id']}")
                        log(f"[DEBUG] Otgruzka data: {otgruzka['data']}")
                        
                        task_id = self.create_otgruzka_task(otgruzka['data'], otgruzka['email_id'], parser.connection)
                        
                        if task_id:
                            parser.mark_as_read(otgruzka['email_id'])
                            log(f"[OK] Created task #{task_id} for otgruzka {otgruzka['email_id']}")
                        else:
                            log(f"[WARN] Failed to create task for otgruzka {otgruzka['email_id']}, NOT marking as read")
                            
                    except Exception as e:
                        log(f"[ERROR] Processing otgruzka {otgruzka.get('email_id', 'unknown')}: {e}")
                        import traceback
                        log(traceback.format_exc())
            else:
                log("[OTGRUZKAS] No new otgruzkas found")
                
        except Exception as e:
            log(f"[ERROR] Process otgruzkas error: {e}")
            import traceback
            log(traceback.format_exc())
        finally:
            parser.close()

    def create_invoice_task(self, data, email_id=None, connection=None):
        """Создание задачи из данных письма и сохранение вложений"""
        from db.database import get_db
        from db.models import Order
        from routes.sse import sse_publisher
        import json
        from datetime import datetime, timedelta
        
        try:
            log(f"[DEBUG] create_invoice_task called for email: {email_id}")
            
            tracking = f"INV-{datetime.now().strftime('%Y%m%d%H%M%S')}"
            log(f"[DEBUG] Tracking: {tracking}")
            
            saved_files = []
            attachments = data.get('attachments', [])
            
            if attachments and email_id and connection:
                log(f"[DEBUG] Found {len(attachments)} attachments, saving...")
                
                upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'uploads', 'invoices')
                os.makedirs(upload_dir, exist_ok=True)
                
                try:
                    status, msg_data = connection.fetch(email_id, '(RFC822)')
                    if status == 'OK':
                        raw_email = msg_data[0][1]
                        msg = email.message_from_bytes(raw_email)
                        
                        if msg.is_multipart():
                            for part in msg.walk():
                                content_disposition = str(part.get("Content-Disposition"))
                                if "attachment" in content_disposition:
                                    filename = part.get_filename()
                                    if filename:
                                        from email.header import decode_header
                                        decoded_parts = decode_header(filename)
                                        decoded_filename = ''
                                        for part_text, encoding in decoded_parts:
                                            if isinstance(part_text, bytes):
                                                if encoding:
                                                    try:
                                                        decoded_filename += part_text.decode(encoding)
                                                    except:
                                                        decoded_filename += part_text.decode('utf-8', errors='ignore')
                                                else:
                                                    try:
                                                        decoded_filename += part_text.decode('utf-8', errors='ignore')
                                                    except:
                                                        decoded_filename += str(part_text)
                                            else:
                                                decoded_filename += part_text
                                        
                                        unique_id = uuid.uuid4().hex[:8]
                                        safe_filename = f"task_{tracking}_{unique_id}_{decoded_filename}"
                                        filepath = os.path.join(upload_dir, safe_filename)
                                        
                                        payload = part.get_payload(decode=True)
                                        with open(filepath, 'wb') as f:
                                            f.write(payload)
                                        
                                        saved_files.append({
                                            'name': decoded_filename,
                                            'path': f"/uploads/invoices/{safe_filename}"
                                        })
                                        log(f"[DEBUG] File saved: {decoded_filename} -> {safe_filename}")
                except Exception as e:
                    log(f"[ERROR] Saving attachments: {e}")
                    import traceback
                    log(traceback.format_exc())
                    saved_files = []
            
            email_data = {
                'title': data.get('title', ''),
                'supplier': data.get('supplier', ''),
                'city': data.get('city', ''),
                'amount': data.get('amount', ''),
                'initiator': data.get('initiator', ''),
                'comment': data.get('comment', ''),
                'files': saved_files,
                'from_email': data.get('from', ''),
            }
            log(f"[DEBUG] email_data: {email_data}")
            
            with get_db() as db:
                log(f"[DEBUG] DB connection acquired")
                
                new_task = Order(
                    tracking=tracking,
                    client=data.get('supplier', 'Неизвестно'),
                    type='invoices',
                    status='new',
                    description=data.get('comment', ''),
                    assigned_to=None,
                    created_at=datetime.utcnow(),
                    email_data=json.dumps(email_data, ensure_ascii=False)
                )
                log(f"[DEBUG] Order object created")
                
                db.add(new_task)
                log(f"[DEBUG] Added to session")
                
                db.commit()
                log(f"[DEBUG] Committed")
                
                db.refresh(new_task)
                log(f"[DEBUG] Refreshed, task ID: {new_task.id}")

                try:
                    log(f"[DEBUG] === START sending notifications for invoice task #{new_task.id} ===")
                    log(f"[DEBUG] supplier: {data.get('supplier', 'Неизвестно')}")
                    log(f"[DEBUG] task_id: {new_task.id}")
                    
                    NotificationService.send_to_hub(
                        hub_type='invoices',
                        supplier=data.get('supplier', 'Неизвестно'),
                        task_id=new_task.id,
                        author=None
                    )
                    log(f"[DEBUG] === FINISH notifications for invoice task #{new_task.id} ===")
                except Exception as e:
                    log(f"[ERROR] Notification error: {e}")
                    import traceback
                    log(traceback.format_exc())
                
                sse_publisher.publish('task_created', {
                    'task_id': new_task.id,
                    'type': 'invoices',
                    'task': {
                        'id': new_task.id,
                        'title': data.get('title', ''),
                        'supplier': data.get('supplier', ''),
                        'city': data.get('city', ''),
                        'amount': data.get('amount', ''),
                        'initiator': data.get('initiator', ''),
                        'comment': data.get('comment', ''),
                        'created_at': (new_task.created_at + timedelta(hours=3)).strftime('%Y-%m-%d %H:%M') if new_task.created_at else '',
                        'status': 'new',
                        'files': saved_files,
                        'comments_count': 0
                    }
                })
                log(f"[DEBUG] SSE event published")
                
                sse_publisher.publish('hub_stats_updated', {
                    'hub_type': 'invoices',
                    'action': 'created'
                })
                log(f"[DEBUG] Stats SSE event published")
                
                return new_task.id
                
        except Exception as e:
            log(f"[ERROR] Creating invoice task: {e}")
            import traceback
            log(traceback.format_exc())
            return None
    
    def create_otgruzka_task(self, data, email_id=None, connection=None):
        """Создание задачи из данных письма с отгрузкой"""
        from db.database import get_db
        from db.models import Order
        from routes.sse import sse_publisher
        import json
        from datetime import datetime, timedelta
        
        try:
            log(f"[DEBUG] create_otgruzka_task called for email: {email_id}")
            
            # Определяем тип хаба
            hub_type = data.get('hub_type', 'spb')
            log(f"[DEBUG] Hub type: {hub_type}")
            
            # Генерируем трек-номер
            if hub_type == 'regions':
                prefix = 'REG'
            else:
                prefix = 'SPB'
            tracking = f"{prefix}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
            log(f"[DEBUG] Tracking: {tracking}")
            
            # Формируем email_data
            email_data = {
                'order_full': data.get('order_full', ''),
                'order_number': data.get('order_number', ''),
                'subdivision': data.get('subdivision', ''),
                'contractor': data.get('contractor', ''),
                'initiator': data.get('initiator', ''),
                'comment': data.get('comment', ''),
                'items': data.get('items', []),
                'from_email': data.get('from', ''),
            }
            log(f"[DEBUG] email_data: {email_data}")
            
            # Название задачи - номер заказа
            title = data.get('order_number', 'Без номера')
            
            with get_db() as db:
                log(f"[DEBUG] DB connection acquired")
                
                new_task = Order(
                    tracking=tracking,
                    client=data.get('contractor', 'Неизвестно'),
                    type=hub_type,  # 'regions' или 'spb'
                    status='new',
                    description=data.get('comment', ''),
                    assigned_to=None,
                    created_at=datetime.utcnow(),
                    email_data=json.dumps(email_data, ensure_ascii=False)
                )
                log(f"[DEBUG] Order object created")
                
                db.add(new_task)
                log(f"[DEBUG] Added to session")
                
                db.commit()
                log(f"[DEBUG] Committed")
                
                db.refresh(new_task)
                log(f"[DEBUG] Refreshed, task ID: {new_task.id}")
                
                # ===== УВЕДОМЛЕНИЯ ПОЛЬЗОВАТЕЛЯМ С ДОСТУПОМ К ХАБУ =====
                try:
                    log(f"[DEBUG] === START sending notifications for {hub_type} task #{new_task.id} ===")
                    log(f"[DEBUG] supplier: {data.get('contractor', 'Неизвестно')}")
                    log(f"[DEBUG] task_id: {new_task.id}")
                    
                    NotificationService.send_to_hub(
                        hub_type=hub_type,  # 'regions' или 'spb'
                        supplier=data.get('contractor', 'Неизвестно'),
                        task_id=new_task.id,
                        author=None  # Автоматическая задача
                    )
                    log(f"[DEBUG] === FINISH notifications for {hub_type} task #{new_task.id} ===")
                except Exception as e:
                    log(f"[ERROR] Notification error: {e}")
                    import traceback
                    log(traceback.format_exc())
                
                # Отправляем SSE событие
                sse_publisher.publish('task_created', {
                    'task_id': new_task.id,
                    'type': hub_type,
                    'task': {
                        'id': new_task.id,
                        'title': title,
                        'order_number': data.get('order_number', ''),
                        'subdivision': data.get('subdivision', ''),
                        'contractor': data.get('contractor', ''),
                        'initiator': data.get('initiator', ''),
                        'comment': data.get('comment', ''),
                        'created_at': (new_task.created_at + timedelta(hours=3)).strftime('%Y-%m-%d %H:%M') if new_task.created_at else '',
                        'status': 'new',
                        'comments_count': 0
                    }
                })
                log(f"[DEBUG] SSE event published")
                
                # Отправляем обновление статистики
                sse_publisher.publish('hub_stats_updated', {
                    'hub_type': hub_type,
                    'action': 'created'
                })
                log(f"[DEBUG] Stats SSE event published")
                
                return new_task.id
                
        except Exception as e:
            log(f"[ERROR] Creating otgruzka task: {e}")
            import traceback
            log(traceback.format_exc())
            return None

    def run_once(self):
        """Запуск одного цикла проверки"""
        self.process_invoices()
        self.process_otgruzkas()
    
    def start(self):
        """Запуск планировщика в отдельном потоке"""
        if self.running:
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        log(f"[SCHEDULER] Started, checking every {self.interval} seconds")
    
    def _run_loop(self):
        """Основной цикл планировщика"""
        while self.running:
            try:
                self.process_invoices()
            except Exception as e:
                log(f"[SCHEDULER] Error in invoices: {e}")
            
            try:
                self.process_otgruzkas()
            except Exception as e:
                log(f"[SCHEDULER] Error in otgruzkas: {e}")
            
            for _ in range(self.interval):
                if not self.running:
                    break
                time.sleep(1)
    
    def stop(self):
        """Остановка планировщика"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=2)
        log("[SCHEDULER] Stopped")


if __name__ == "__main__":
    scheduler = MailScheduler()
    scheduler.run_forever()