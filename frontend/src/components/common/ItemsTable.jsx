import './ItemsTable.css';

function ItemsTable({ items }) {
  if (!items || items.length === 0) {
    return <div className="items-table-empty">Нет товаров</div>;
  }

  // Разворачиваем товары с несколькими местами хранения
  const expandedItems = [];
  items.forEach((item) => {
    // Основная строка
    expandedItems.push({
      code: item.code,
      article: item.article || '-',
      name: item.name,
      serial: item.serial || '-',
      quantity: item.quantity,
      unit: item.unit,
      warehouse: item.warehouse,
      storage_location: item.storage_location || '-',
      remainder: item.remainder,
      is_main: true,
    });

    // Дополнительные места хранения
    if (item.extra_storages && item.extra_storages.length > 0) {
      item.extra_storages.forEach((storage) => {
        expandedItems.push({
          code: '',
          article: '',
          name: '',
          serial: '',
          quantity: '',
          unit: item.unit,
          warehouse: storage.warehouse,
          storage_location: storage.storage_location || '-',
          remainder: storage.remainder,
          is_main: false,
        });
      });
    }
  });

  return (
    <div className="items-table-wrap">
      <table className="items-table">
        <thead>
          <tr>
            <th>Код 1С</th>
            <th>Артикул</th>
            <th>Наименование</th>
            <th>Серийный номер</th>
            <th>Кол-во</th>
            <th>Ед.</th>
            <th>Склад</th>
            <th>Место хранения</th>
            <th>Остаток</th>
          </tr>
        </thead>
        <tbody>
          {expandedItems.map((item, index) => (
            <tr key={index} className={item.is_main ? 'item-main' : 'item-storage'}>
              <td>{item.code || ''}</td>
              <td>{item.article}</td>
              <td>{item.name}</td>
              <td>{item.serial}</td>
              <td>{item.quantity}</td>
              <td>{item.unit}</td>
              <td>{item.warehouse}</td>
              <td>{item.storage_location}</td>
              <td>{item.remainder}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ItemsTable;