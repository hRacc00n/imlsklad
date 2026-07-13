from .base_parser import BaseMailParser
import os
import email
from utils.text_normalizer import normalize_commen


class InvoiceParser(BaseMailParser):
    """Парсер писем со счетами"""
    
    def __init__(self):
        super().__init__()
        self.folder = os.getenv('INVOICE_FOLDER_NAME', 'INBOX.Scheta(Piskarevka)')
        self.keyword = os.getenv('INVOICE_KEYWORD', 'Утвержден счет')
        
        # Маппинг ячеек
        self.CELL_MAPPING = {
            'title': 13,      # Счет № 107/46022559 от 08.07.2026
            'supplier': 7,    # Контрагент
            'city': 9,        # Город
            'amount': 19,     # Сумма
            'initiator': 21,  # Инициатор
            'comment': 15,    # Обоснование
        }
    
    def parse_email(self, email_id):
        """Парсинг одного письма и возврат данных для создания задачи"""
        try:
            status, msg_data = self.connection.fetch(email_id, '(RFC822)')
            if status != 'OK':
                return None
            
            raw_email = msg_data[0][1]
            msg = email.message_from_bytes(raw_email)
            
            subject = self.decode_header_value(msg.get('Subject'))
            from_addr = self.decode_header_value(msg.get('From'))
            date = self.decode_header_value(msg.get('Date'))
            
            body = self.get_body_text(msg)
            attachments = self.get_attachments(msg)
            
            # Получаем ячейки
            cells = self.get_email_cells(body)
            
            # Извлекаем данные по маппингу
            extracted_data = {}
            for field, cell_index in self.CELL_MAPPING.items():
                if cell_index <= len(cells):
                    extracted_data[field] = cells[cell_index - 1]
                else:
                    extracted_data[field] = ''

            # Нормализуем комментарий (ячейка 15)
            if 'comment' in extracted_data and extracted_data['comment']:
                extracted_data['comment'] = normalize_comment(extracted_data['comment'])
            
            # Дополнительные поля
            extracted_data['subject'] = subject
            extracted_data['from'] = from_addr
            extracted_data['date'] = date
            extracted_data['attachments'] = attachments
            
            return extracted_data
            
        except Exception as e:
            print(f"[ERROR] Parsing email {email_id}: {e}")
            return None
    
    def get_unread_invoices(self, limit=10):
        """Получение непрочитанных писем со счетами"""
        if not self.select_folder(self.folder):
            return []
        
        try:
            status, messages = self.connection.search(None, 'UNSEEN')
            if status != 'OK':
                print("[ERROR] Search error")
                return []
            
            email_ids = messages[0].split()
            total = len(email_ids)
            print(f"\n[EMAILS] Unread emails: {total}")
            
            if not email_ids:
                print("No unread emails")
                return []
            
            if total > limit:
                email_ids = email_ids[-limit:]
                print(f"[EMAILS] Processing last {limit} emails")
            
            # Фильтруем по ключевому слову
            filtered_ids = []
            for email_id in email_ids:
                try:
                    status, msg_data = self.connection.fetch(email_id, '(BODY.PEEK[HEADER.FIELDS (SUBJECT)])')
                    if status != 'OK':
                        continue
                    
                    header_data = msg_data[0][1]
                    header_str = header_data.decode('utf-8', errors='ignore')
                    decoded_subject = self.decode_header_value(header_str)
                    
                    if self.keyword in decoded_subject or self.keyword.lower() in decoded_subject.lower():
                        filtered_ids.append(email_id)
                except:
                    continue
            
            print(f"[EMAILS] Found {len(filtered_ids)} emails with keyword '{self.keyword}'")
            
            # Парсим каждое письмо
            results = []
            for email_id in filtered_ids:
                data = self.parse_email(email_id)
                if data:
                    results.append({
                        'email_id': email_id.decode() if isinstance(email_id, bytes) else str(email_id),
                        'data': data
                    })
            
            return results
            
        except Exception as e:
            print(f"[ERROR] Parsing error: {e}")
            return []
    
    def mark_as_read(self, email_id):
        """Пометить письмо как прочитанное"""
        try:
            self.connection.store(email_id, '+FLAGS', '\\Seen')
            return True
        except Exception as e:
            print(f"[ERROR] Mark as read error: {e}")
            return False