import time
import threading
from datetime import datetime
from .invoice_parser import InvoiceParser
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
        self.interval = 60  # секунд (1 минута)
        self.environment = os.getenv('ENVIRONMENT', 'local')
        log(f"[SCHEDULER] Окружение: {self.environment}")
        
    def process_invoices(self):
        """Обработка писем со счетами"""
        # Проверяем окружение
        if self.environment == 'local':
            log(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ⏭️ Пропускаем парсинг счетов (локальное окружение)")
            return
        
        log(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Checking invoices...")
        
        parser = InvoiceParser()
        
        if not parser.connect():
            log("[ERROR] Failed to connect to mail server")
            return
        
        try:
            invoices = parser.get_unread_invoices()
            log(f"[DEBUG] get_unread_invoices returned: {invoices}")
            
            if invoices:
                log(f"[INVOICES] Found {len(invoices)} invoices to process")
                
                for invoice in invoices:
                    try:
                        log(f"[DEBUG] Processing invoice: {invoice}")
                        log(f"[DEBUG] Invoice data: {invoice['data']}")
                        
                        task_id = self.create_invoice_task(invoice['data'], invoice['email_id'], parser.connection)
                        
                        if task_id:
                            parser.mark_as_read(invoice['email_id'])
                            log(f"[OK] Created task #{task_id} for invoice")
                        else:
                            log(f"[WARN] Failed to create task for invoice, NOT marking as read")
                            
                    except Exception as e:
                        log(f"[ERROR] Processing invoice: {e}")
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
    
    def create_invoice_task(self, data, email_id=None, connection=None):
        """Создание задачи из данных письма и сохранение вложений"""
        from db.database import get_db
        from db.models import Order
        from routes.sse import sse_publisher
        import json
        from datetime import datetime, timedelta
        
        try:
            log(f"[DEBUG] create_invoice_task called with data: {data}")
            
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
    
    def run_once(self):
        """Запуск одного цикла проверки"""
        self.process_invoices()
    
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
                log(f"[SCHEDULER] Error: {e}")
            
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