import os
import sys
import io
import imaplib
import email
from email.header import decode_header
from dotenv import load_dotenv
from bs4 import BeautifulSoup

load_dotenv('data/.env')


class BaseMailParser:
    """Базовый класс для парсинга почты"""
    
    def __init__(self):
        self.imap_server = os.getenv('IMAP_SERVER')
        self.email_address = os.getenv('EMAIL_ADDRESS')
        self.email_password = os.getenv('EMAIL_PASSWORD')
        self.connection = None
        
    def connect(self):
        """Подключение к IMAP серверу"""
        try:
            self.connection = imaplib.IMAP4_SSL(self.imap_server)
            self.connection.login(self.email_address, self.email_password)
            print(f"[OK] Connected to {self.imap_server}")
            return True
        except Exception as e:
            print(f"[ERROR] Connection error: {e}")
            return False
    
    def select_folder(self, folder_name):
        """Выбор папки на почте"""
        try:
            folder_name = folder_name.strip('"')
            if any(c in folder_name for c in [' ', '(', ')', '[', ']', '\\', '"']):
                encoded_folder = f'"{folder_name}"'
            else:
                encoded_folder = folder_name
            
            status, messages = self.connection.select(encoded_folder)
            if status != 'OK':
                print(f"[ERROR] Folder '{folder_name}' not found")
                return False
            print(f"[FOLDER] {folder_name}")
            return True
        except Exception as e:
            print(f"[ERROR] Folder select error: {e}")
            return False
    
    def decode_header_value(self, header):
        """Декодирование заголовка письма"""
        if header is None:
            return ''
        decoded_parts = decode_header(header)
        result = ''
        for part, encoding in decoded_parts:
            if isinstance(part, bytes):
                if encoding:
                    try:
                        result += part.decode(encoding)
                    except:
                        result += part.decode('utf-8', errors='ignore')
                else:
                    try:
                        result += part.decode('utf-8', errors='ignore')
                    except:
                        result += str(part)
            else:
                result += part
        return result
    
    def get_body_text(self, msg):
        """Извлечение текста из письма"""
        body = ''
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition"))
                
                if content_type == "text/plain" and "attachment" not in content_disposition:
                    try:
                        payload = part.get_payload(decode=True)
                        body = payload.decode('utf-8', errors='ignore')
                    except:
                        pass
                elif content_type == "text/html" and not body:
                    try:
                        payload = part.get_payload(decode=True)
                        html = payload.decode('utf-8', errors='ignore')
                        soup = BeautifulSoup(html, 'html.parser')
                        body = soup.get_text()
                    except:
                        pass
        else:
            content_type = msg.get_content_type()
            if content_type == "text/plain":
                try:
                    payload = msg.get_payload(decode=True)
                    body = payload.decode('utf-8', errors='ignore')
                except:
                    pass
            elif content_type == "text/html":
                try:
                    payload = msg.get_payload(decode=True)
                    html = payload.decode('utf-8', errors='ignore')
                    soup = BeautifulSoup(html, 'html.parser')
                    body = soup.get_text()
                except:
                    pass
        
        return body
    
    def get_attachments(self, msg):
        """Извлечение вложений из письма"""
        attachments = []
        if msg.is_multipart():
            for part in msg.walk():
                content_disposition = str(part.get("Content-Disposition"))
                if "attachment" in content_disposition:
                    filename = part.get_filename()
                    if filename:
                        attachments.append(self.decode_header_value(filename))
        return attachments
    
    def get_email_cells(self, body):
        """Разбивка текста письма на ячейки (строки)"""
        lines = body.split('\n')
        cells = []
        for line in lines:
            line = line.strip()
            if line:
                cells.append(line)
        return cells
    
    def close(self):
        """Закрытие соединения"""
        if self.connection:
            try:
                self.connection.close()
            except:
                pass
            self.connection.logout()
            print("[CLOSED] Connection closed")