import React, { useState, useEffect, useRef } from 'react';
import { DocumentData, LineItem, FieldValue, BoundingBox, AuditLog, DocumentFieldConfig } from '../types';

interface DocumentDataDisplayProps {
  data: DocumentData;
  fileName: string;
  currentPage: number;
  disabled: boolean;
  onUpdateData: (data: DocumentData) => void;
  onFieldFocus: (bounds?: BoundingBox[], color?: string) => void;
  onFieldBlur: () => void;
  fieldConfig: DocumentFieldConfig[];
}

const FIELD_COLORS: { [key: string]: string } = {
  description: '#3b82f6', // blue-500
  quantity: '#f97316', // orange-500
  unit_price: '#10b981', // emerald-500
  total_price: '#8b5cf6', // violet-500
  tax_rate: '#ef4444', // red-500
};

const CsvIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const DeleteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const HistoryIcon: React.FC<{ hasHistory: boolean; onClick: (event: React.MouseEvent) => void }> = ({ hasHistory, onClick }) => {
    if (!hasHistory) return null;
    return (
        <button onClick={onClick} className="ml-2 text-gray-500 hover:text-blue-600 transition-colors" aria-label="変更履歴を表示">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
        </button>
    );
};

const HistoryPopup: React.FC<{ logs: AuditLog[]; onClose: () => void; position: { top: number, left: number } }> = ({ logs, onClose, position }) => {
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    return (
        <div 
            ref={popupRef}
            className="absolute z-50 bg-white border rounded-lg shadow-xl p-4 w-96"
            style={{ top: position.top, left: position.left }}
        >
            <h4 className="font-bold mb-2 text-gray-800">変更履歴</h4>
            <div className="max-h-60 overflow-y-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 text-left font-semibold">日時</th>
                            <th className="p-2 text-left font-semibold">変更前</th>
                            <th className="p-2 text-left font-semibold">変更後</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {logs.map((log, index) => (
                            <tr key={index}>
                                <td className="p-2 text-gray-600 whitespace-nowrap">{log.timestamp}</td>
                                <td className="p-2 text-red-600">{log.oldValue ?? '空白'}</td>
                                <td className="p-2 text-green-600">{log.newValue ?? '空白'}</td>
                            </tr>
                        )).reverse()}
                    </tbody>
                </table>
            </div>
            <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800">&times;</button>
        </div>
    );
};

const EditableDataRow: React.FC<{ 
    label: string; 
    fieldValue: FieldValue<string | number>;
    onChange: (value: string) => void; 
    onFocus: () => void;
    onBlur: () => void;
    onShowHistory: (event: React.MouseEvent) => void;
    type?: string;
    disabled?: boolean;
}> = ({ label, fieldValue, onChange, onFocus, onBlur, onShowHistory, type = 'text', disabled = false }) => (
  <div className="grid grid-cols-3 gap-4 py-2 border-b items-center">
    <dt 
      className="text-sm font-medium text-gray-500 col-span-1 cursor-pointer flex items-center"
      onMouseEnter={onFocus}
      onMouseLeave={onBlur}
    >
      {label}
      <HistoryIcon hasHistory={!!fieldValue?.history && fieldValue.history.length > 0} onClick={onShowHistory} />
    </dt>
    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 col-span-2">
        <input
            type={type}
            value={fieldValue?.value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            disabled={disabled}
            className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
        />
    </dd>
  </div>
);

const ItemCell: React.FC<{
  item: LineItem,
  field: string,
  originalIndex: number,
  color: string,
  type?: string,
  disabled: boolean,
  handleItemChange: (itemIndex: number, field: string, value: string) => void,
  onFieldFocus: (bounds?: BoundingBox[], color?: string) => void,
  onFieldBlur: () => void,
  showHistory: (event: React.MouseEvent, logs?: AuditLog[]) => void,
}> = ({item, field, originalIndex, color, type = 'text', disabled, handleItemChange, onFieldFocus, onFieldBlur, showHistory}) => {
  const fieldValue = item[field] as FieldValue<string | number>;
  return (
    <td className="px-2 py-1">
      <div className="flex items-center">
        <input
          type={type}
          value={fieldValue?.value ?? ''}
          onChange={e => handleItemChange(originalIndex, field, e.target.value)}
          onFocus={() => onFieldFocus(fieldValue?.bounding_box, color)}
          onBlur={onFieldBlur}
          className="w-full p-1 border rounded-md text-sm text-right disabled:bg-gray-100 disabled:cursor-not-allowed"
          disabled={disabled}
        />
        <HistoryIcon hasHistory={!!fieldValue?.history && fieldValue.history.length > 0} onClick={(e) => showHistory(e, fieldValue.history)} />
      </div>
    </td>
  );
};

export const InvoiceDataDisplay: React.FC<DocumentDataDisplayProps> = ({ data, fileName, currentPage, disabled, onUpdateData, onFieldFocus, onFieldBlur, fieldConfig }) => {
  const [viewingHistory, setViewingHistory] = useState<{logs: AuditLog[], position: {top: number, left: number}} | null>(null);

  const enabledTopLevelFields = fieldConfig.filter(c => c.enabled && !c.isItemField);
  const enabledItemFields = fieldConfig.filter(c => c.enabled && c.isItemField);

  const showHistory = (event: React.MouseEvent, logs?: AuditLog[]) => {
      event.stopPropagation();
      if (logs && logs.length > 0) {
          const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
          setViewingHistory({
              logs,
              position: { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX }
          });
      }
  };

  const handleFieldChange = (field: string, value: string) => {
    const config = enabledTopLevelFields.find(f => f.key === field);
    if (!config) return;

    const fieldData = data[field] as FieldValue<string | number> | undefined;
    const n = parseFloat(value);
    const parsedValue = config.type === 'number' ? (isNaN(n) ? null : n) : value;

    const updatedFieldData = { ...fieldData, value: parsedValue };
    
    onUpdateData({ ...data, [field]: updatedFieldData });
  };

  const handleItemChange = (itemIndex: number, field: string, value: string) => {
    const config = enabledItemFields.find(f => f.key === field);
    if (!config) return;

    const newItems = [...(data.items || [])];
    const itemToUpdate = { ...newItems[itemIndex] };
    const fieldToUpdate = { ...itemToUpdate[field] };
    
    const n = parseFloat(value);
    const parsedValue = config.type === 'number' ? (isNaN(n) ? null : n) : value;
    
    fieldToUpdate.value = parsedValue;

    itemToUpdate[field] = fieldToUpdate;
    newItems[itemIndex] = itemToUpdate;
    onUpdateData({ ...data, items: newItems });
  };
  
  const handleAddItem = () => {
    const newItem: Partial<LineItem> = { page_number: { value: currentPage }};
    enabledItemFields.forEach(field => {
        newItem[field.key] = { value: field.type === 'number' ? null : '' };
    });

    const newItems = [...(data.items || []), newItem as LineItem];
    onUpdateData({ ...data, items: newItems });
  };

  const handleRemoveItem = (itemIndex: number) => {
    const newItems = (data.items || []).filter((_, i) => i !== itemIndex);
    onUpdateData({ ...data, items: newItems });
  };

  const handleExportCsv = () => {
    const headerConfig = fieldConfig.filter(c => c.enabled);
    const headers = headerConfig.map(c => c.label);
    
    const rows = (data.items && data.items.length > 0) ? data.items.map(item => {
        return headerConfig.map(c => {
            if (c.isItemField) {
                return item[c.key]?.value;
            }
            // FIX: Cast to FieldValue to access the 'value' property, resolving a TypeScript error caused by a broad index signature on DocumentData.
            return (data[c.key] as FieldValue<string | number>)?.value;
        });
    }) : [
        // FIX: Cast to FieldValue to access the 'value' property for the same reason as above.
        headerConfig.map(c => c.isItemField ? '' : (data[c.key] as FieldValue<string | number>)?.value)
    ];

    const escapeCsvCell = (cell: any) => {
      if (cell === null || cell === undefined) return '';
      const str = String(cell);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.map(escapeCsvCell).join(','),
      ...rows.map(row => row.map(escapeCsvCell).join(','))
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const csvFileName = `${fileName.substring(0, fileName.lastIndexOf('.')) || fileName}_data.csv`;
    link.setAttribute('download', csvFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // FIX: Restructure `currentItems` to avoid adding `originalIndex` to the `LineItem` object, which violates its index signature.
  // Instead, create an array of objects containing both the item and its original index.
  const currentItems = (data.items || [])
    .map((item, index) => ({ item, originalIndex: index }))
    .filter(({ item }) => item.page_number?.value === currentPage || (!item.page_number?.value && currentPage === 1));

  const TableHeader: React.FC<{ label: string, color: string }> = ({ label, color }) => (
    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></span>
        {label}
      </div>
    </th>
  );

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      {viewingHistory && <HistoryPopup logs={viewingHistory.logs} onClose={() => setViewingHistory(null)} position={viewingHistory.position} />}
      <div className="flex justify-between items-center mb-2 border-b pb-2">
        <h3 className="text-lg font-semibold">読み取り結果</h3>
        <button
          onClick={handleExportCsv}
          className="bg-green-600 text-white font-bold py-1 px-3 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
          aria-label="CSV形式でエクスポート"
        >
          <CsvIcon />
          <span>CSVエクスポート</span>
        </button>
      </div>
      {currentPage === 1 && (
        <>
            <div className="grid grid-cols-3 gap-4 py-2 border-b text-sm font-semibold text-gray-600 bg-gray-50 -mx-4 px-4">
                <span className="col-span-1">項目名</span>
                <span className="col-span-2">読み取り結果</span>
            </div>
            <dl>
                {enabledTopLevelFields.map(field => {
                    const fieldValue = data[field.key] as FieldValue<string | number>;
                    return (
                        <EditableDataRow 
                            key={field.key}
                            label={field.label}
                            fieldValue={fieldValue}
                            onChange={(val) => handleFieldChange(field.key, val)}
                            type={field.type}
                            onFocus={() => onFieldFocus(fieldValue?.bounding_box, 'gray')}
                            onBlur={onFieldBlur}
                            onShowHistory={(e) => showHistory(e, fieldValue?.history)}
                            disabled={disabled}
                        />
                    );
                })}
            </dl>
        </>
      )}
      
      <div className="mt-4">
        <h4 className="text-md font-semibold mb-2">品目リスト (ページ {currentPage})</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {enabledItemFields.map(field => (
                  <TableHeader key={field.key} label={field.label} color={FIELD_COLORS[field.key] || '#808080'} />
                ))}
                <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.map(({ item, originalIndex }, index) => (
                <tr key={originalIndex}>
                  {enabledItemFields.map(field => (
                    <ItemCell
                      key={field.key} 
                      item={item} 
                      field={field.key}
                      originalIndex={originalIndex}
                      color={FIELD_COLORS[field.key] || '#808080'}
                      type={field.type}
                      disabled={disabled}
                      handleItemChange={handleItemChange}
                      onFieldFocus={onFieldFocus}
                      onFieldBlur={onFieldBlur}
                      showHistory={showHistory}
                    />
                  ))}
                  <td className="px-2 py-1 text-center">
                    <button onClick={() => handleRemoveItem(originalIndex)} className="text-red-500 hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed" aria-label={`品目 ${index + 1} を削除`} disabled={disabled}>
                      <DeleteIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={handleAddItem}
          className="mt-4 bg-blue-100 text-blue-800 font-bold py-2 px-4 rounded-lg hover:bg-blue-200 transition-colors text-sm disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
          disabled={disabled}
        >
          品目を追加
        </button>
      </div>
    </div>
  );
};
