from .base_parser import BaseMailParser
import os
import re
import email
import base64
import uuid
from bs4 import BeautifulSoup
import PyPDF2
import io
from datetime import datetime


class AirTrafficParser(BaseMailParser):
    """Парсер писем из папки AirTraffic"""
    
    def __init__(self):
        super().__init__()
        self.folder = os.getenv('AIRTRAFFIC_FOLDER_NAME', 'INBOX.AirTraffic')
        self.keyword = os.getenv('AIRTRAFFIC_KEYWORD', 'Отправка груза по')
        self.regional_contractors = self._load_regional_contractors()
        self.upload_dir = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), 
            'data', 'uploads', 'airtraffic'
        )
        
    def _load_regional_contractors(self):
        """Загрузить список региональных контрагентов"""
        try:
            from utils.file_loader import load_json
            data = load_json('regional_contractors.json')
            if isinstance(data, dict) and 'contractors' in data:
                return data['contractors']
            return []
        except:
            return []
    
    def _extract_awb_number(self, subject):
        """Извлечь номер авианакладной из темы письма"""
        if not subject:
            return ''
        
        # Убираем префикс "Отправка груза по"
        text = subject.replace('Отправка груза по', '').strip()
        
        # Ищем AWB номер (формат: AWB 555-48352426 или 555-48352426)
        match = re.search(r'(AWB\s*)?(\d{3}-\d{8,})', text)
        if match:
            awb = match.group(2) if match.group(2) else match.group(0)
            if not awb.startswith('AWB'):
                awb = f"AWB {awb}"
            return awb
        
        # Если не нашли по шаблону, возвращаем очищенный текст
        return text
    
    def _extract_city_from_pdf(self, pdf_content):
        """Извлечь город из содержимого PDF файла (поиск с конца)"""
        try:
            # Создаем объект PDF из байтов
            pdf_file = io.BytesIO(pdf_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            # Собираем весь текст из PDF
            full_text = ''
            for page in pdf_reader.pages:
                full_text += page.extract_text() + '\n'
            
            # Разбиваем на строки
            lines = full_text.split('\n')
            
            # Идем с конца документа
            for i in range(len(lines) - 1, -1, -1):
                line = lines[i].strip()
                if not line:
                    continue
                
                # Проверяем каждое слово в строке
                for contractor in self.regional_contractors:
                    if contractor.lower() in line.lower():
                        return contractor
            
            return None
            
        except Exception as e:
            print(f"[ERROR] Extracting city from PDF: {e}")
            return None
    
    def _extract_image_from_body(self, body):
        """Извлечь изображение из тела письма"""
        try:
            # Ищем base64 изображение в HTML
            # Паттерн для data:image
            pattern = r'data:image/[^;]+;base64,([A-Za-z0-9+/=]+)'
            matches = re.findall(pattern, body)
            
            if matches:
                # Берем первое изображение
                img_data = matches[0]
                # Декодируем base64
                try:
                    image_bytes = base64.b64decode(img_data)
                    return image_bytes
                except:
                    pass
            
            # Если не нашли data:image, ищем img src
            soup = BeautifulSoup(body, 'html.parser')
            img_tags = soup.find_all('img')
            for img in img_tags:
                src = img.get('src', '')
                if src.startswith('data:image'):
                    # Извлекаем base64 часть
                    parts = src.split(',')
                    if len(parts) == 2:
                        try:
                            image_bytes = base64.b64decode(parts[1])
                            return image_bytes
                        except:
                            pass
            
            return None
            
        except Exception as e:
            print(f"[ERROR] Extracting image from body: {e}")
            return None
    
    def _save_image(self, image_bytes, task_tracking):
        """Сохранить изображение на диск"""
        try:
            os.makedirs(self.upload_dir, exist_ok=True)
            
            filename = f"task_{task_tracking}_{uuid.uuid4().hex[:8]}.jpg"
            filepath = os.path.join(self.upload_dir, filename)
            
            with open(filepath, 'wb') as f:
                f.write(image_bytes)
            
            return f"/uploads/airtraffic/{filename}"
            
        except Exception as e:
            print(f"[ERROR] Saving image: {e}")
            return None
    
    def _save_file(self, file_data, filename, task_tracking):
        """Сохранить приложенный файл на диск"""
        try:
            os.makedirs(self.upload_dir, exist_ok=True)
            
            # Генерируем уникальное имя
            unique_id = uuid.uuid4().hex[:8]
            safe_filename = f"task_{task_tracking}_{unique_id}_{filename}"
            filepath = os.path.join(self.upload_dir, safe_filename)
            
            with open(filepath, 'wb') as f:
                f.write(file_data)
            
            return {
                'name': filename,
                'path': f"/uploads/airtraffic/{safe_filename}"
            }
            
        except Exception as e:
            print(f"[ERROR] Saving file: {e}")
            return None
    
    def parse_email(self, email_id):
        """Парсинг одного письма из AirTraffic"""
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
            attachments = self.get_attachments_with_data(msg)
            
            # 1. Извлекаем AWB номер из темы
            awb_number = self._extract_awb_number(subject)
            
            # 2. Извлекаем город из PDF (ищем с конца)
            city = None
            pdf_file = None
            for att in attachments:
                if att['name'].lower().endswith('.pdf'):
                    pdf_file = att
                    city = self._extract_city_from_pdf(att['data'])
                    break
            
            # 3. Извлекаем изображение из тела письма
            image_bytes = self._extract_image_from_body(body)
            
            # 4. Генерируем tracking
            tracking = f"AT-{datetime.now().strftime('%Y%m%d%H%M%S')}-{email_id}"
            
            # 5. Сохраняем изображение
            image_path = None
            if image_bytes:
                image_path = self._save_image(image_bytes, tracking)
            
            # 6. Сохраняем PDF файл
            saved_file = None
            if pdf_file:
                saved_file = self._save_file(pdf_file['data'], pdf_file['name'], tracking)
            
            result = {
                'subject': subject,
                'from': from_addr,
                'date': date,
                'awb_number': awb_number,
                'city': city or 'Не указан',
                'image_path': image_path,
                'file': saved_file,
                'tracking': tracking,
                'attachments': attachments
            }
            
            return result
            
        except Exception as e:
            print(f"[ERROR] Parsing email {email_id}: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def get_attachments_with_data(self, msg):
        """Получить вложения с данными"""
        attachments = []
        if msg.is_multipart():
            for part in msg.walk():
                content_disposition = str(part.get("Content-Disposition"))
                if "attachment" in content_disposition:
                    filename = part.get_filename()
                    if filename:
                        decoded_filename = self.decode_header_value(filename)
                        payload = part.get_payload(decode=True)
                        attachments.append({
                            'name': decoded_filename,
                            'data': payload
                        })
        return attachments
    
    def get_unread_airtraffic(self, limit=10):
        """Получение непрочитанных писем из папки AirTraffic"""
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