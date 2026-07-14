from .base_parser import BaseMailParser
import os
import re
import email


class OtgruzkaParser(BaseMailParser):
    """Парсер писем из папки Отгрузка"""
    
    def __init__(self):
        super().__init__()
        self.folder = os.getenv('OTGRUZKA_FOLDER_NAME', 'INBOX.Otgruzka')
        self.keyword = os.getenv('OTGRUZKA_KEYWORD', 'Отгрузить:')
        self.regional_contractors = self._load_regional_contractors()
        
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
    
    def _determine_hub_type(self, contractor):
        """Определить тип хаба по контрагенту"""
        if not contractor:
            return 'spb'
        
        contractor_lower = contractor.lower()
        for reg_name in self.regional_contractors:
            if reg_name.lower() in contractor_lower:
                return 'regions'
        return 'spb'
    
    def _extract_order_number(self, cell_text):
        """Извлечь номер заказа из ячейки"""
        if not cell_text:
            return '', ''
        
        # Убираем префикс "Заказ покупателя"
        text = cell_text.replace('Заказ покупателя', '').strip()
        return cell_text.strip(), text
    
    def _find_cell_value(self, cells, search_pattern, start_from=0):
        """Найти значение ячейки по шаблону"""
        for i in range(start_from, len(cells)):
            if search_pattern in cells[i]:
                if i + 1 < len(cells):
                    return cells[i + 1], i + 1
                return '', i
        return '', -1
    
    def _parse_items(self, cells, start_index):
        """Парсинг товаров из таблицы"""
        items = []
        i = start_index
        
        while i < len(cells):
            cell = cells[i].strip()
            
            # Проверяем, что это начало товара (код 1С начинается с 0000)
            if cell.startswith('0000'):
                code = cell
                
                # Артикул (следующая ячейка)
                article = cells[i + 1].strip() if i + 1 < len(cells) else ''
                if not article:
                    article = '-'
                
                # Наименование (следующая ячейка)
                name = cells[i + 2].strip() if i + 2 < len(cells) else ''
                if not name:
                    name = '-'
                
                # Серийный номер (следующая ячейка)
                serial = cells[i + 3].strip() if i + 3 < len(cells) else ''
                if not serial:
                    serial = '-'
                
                # Количество (следующая ячейка)
                quantity = cells[i + 4].strip() if i + 4 < len(cells) else '0'
                
                # Ед. измерения (следующая ячейка)
                unit = cells[i + 5].strip() if i + 5 < len(cells) else ''
                
                # Склад (следующая ячейка)
                warehouse = cells[i + 6].strip() if i + 6 < len(cells) else ''
                
                # Место хранения (следующая ячейка)
                storage_location = cells[i + 7].strip() if i + 7 < len(cells) else ''
                if not storage_location:
                    storage_location = '-'
                
                # Остаток (следующая ячейка)
                remainder = cells[i + 8].strip() if i + 8 < len(cells) else '0'
                
                # Проверяем, есть ли еще места хранения для этого товара
                # Смещаем указатель для проверки следующих ячеек
                j = i + 9
                extra_storages = []
                
                # Проверяем, есть ли еще строки с этим товаром
                while j < len(cells):
                    next_cell = cells[j].strip()
                    
                    # Если это "Всего:" или новый код 1С - выходим
                    if next_cell.startswith('Всего:') or next_cell.startswith('0000'):
                        break
                    
                    # Если это единица измерения (шт, м, кг и т.д.) - значит это еще одно место хранения
                    if next_cell in ['шт', 'м', 'кг', 'л', 'уп', 'компл', 'упак']:
                        # Это новое место хранения
                        warehouse_extra = cells[j + 1].strip() if j + 1 < len(cells) else ''
                        storage_extra = cells[j + 2].strip() if j + 2 < len(cells) else ''
                        if not storage_extra:
                            storage_extra = '-'
                        remainder_extra = cells[j + 3].strip() if j + 3 < len(cells) else '0'
                        
                        extra_storages.append({
                            'warehouse': warehouse_extra,
                            'storage_location': storage_extra,
                            'remainder': remainder_extra
                        })
                        
                        j += 4
                        continue
                    
                    j += 1
                
                # Создаем основную запись товара
                item = {
                    'code': code,
                    'article': article,
                    'name': name,
                    'serial': serial,
                    'quantity': quantity,
                    'unit': unit,
                    'warehouse': warehouse,
                    'storage_location': storage_location,
                    'remainder': remainder
                }
                
                # Добавляем дополнительные места хранения
                if extra_storages:
                    item['extra_storages'] = extra_storages
                
                items.append(item)
                
                # Перемещаем указатель
                i = j
            else:
                i += 1
        
        return items
    
    def parse_email(self, email_id):
        """Парсинг одного письма с отгрузкой"""
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
            
            # Получаем ячейки (сохраняем все строки)
            lines = body.split('\n')
            cells = []
            for line in lines:
                # Сохраняем все строки, включая пустые
                cells.append(line)
            
            # --- Извлекаем данные ---
            
            # 1. Заказ (ячейка 3)
            order_cell = cells[2].strip() if len(cells) > 2 else ''
            order_full, order_number = self._extract_order_number(order_cell)
            
            # 2. Подразделение (ячейка 12)
            subdivision = cells[11].strip() if len(cells) > 11 else ''
            
            # 3. Контрагент (ячейка 22)
            contractor = cells[21].strip() if len(cells) > 21 else ''
            
            # 4. Инициатор и комментарий
            initiator = ''
            comment = ''
            
            # Проверяем наличие ячейки "Инициатор:" (ячейка 26)
            has_initiator = False
            for i, cell in enumerate(cells):
                if 'Инициатор:' in cell:
                    has_initiator = True
                    if i + 1 < len(cells):
                        initiator = cells[i + 1].strip()
                    break
            
            # Комментарий: если есть инициатор - ячейка 32, иначе - ячейка 27
            if has_initiator:
                # Ищем "Комментарий:" после инициатора
                for i, cell in enumerate(cells):
                    if 'Комментарий:' in cell:
                        if i + 1 < len(cells):
                            comment = cells[i + 1].strip()
                        break
            else:
                # Ищем "Комментарий:" (ячейка 26 или 31)
                for i, cell in enumerate(cells):
                    if 'Комментарий:' in cell:
                        if i + 1 < len(cells):
                            comment = cells[i + 1].strip()
                        break
            
            # 5. Определяем хаб
            hub_type = self._determine_hub_type(contractor)
            
            # 6. Парсим товары
            items = []
            # Ищем начало таблицы с товарами (ячейка "№")
            start_index = -1
            for i, cell in enumerate(cells):
                if cell.strip() == '№':
                    start_index = i + 1  # Следующая ячейка после "№"
                    break
            
            if start_index != -1:
                items = self._parse_items(cells, start_index)
            
            # Формируем результат
            result = {
                'subject': subject,
                'from': from_addr,
                'date': date,
                'attachments': attachments,
                'order_full': order_full,
                'order_number': order_number,
                'subdivision': subdivision,
                'contractor': contractor,
                'initiator': initiator,
                'comment': comment,
                'hub_type': hub_type,
                'items': items
            }
            
            return result
            
        except Exception as e:
            print(f"[ERROR] Parsing email {email_id}: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def get_unread_otgruzkas(self, limit=10):
        """Получение непрочитанных писем с отгрузками"""
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