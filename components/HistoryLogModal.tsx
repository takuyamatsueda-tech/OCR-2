import React from 'react';
import { DocumentData, FieldValue, AuditLog } from '../types';

interface HistoryLogModalProps {
  data: DocumentData | null;
  onClose: () => void;
}

// Helper to get a display name for a field key
const getFieldLabel = (key: string): string => {
  const labels: { [key: string]: string } = {
    invoice_number: '請求書番号',
    issue_date: '発行日',
    due_date: '支払期限',
    issuer_name: '発行元',
    recipient_name: '宛名',
    order_number: '注文番号',
    order_date: '注文日',
    vendor_name: 'ベンダー名',
    shipping_address: '配送先住所',
    total_amount: '合計金額',
    description: '品名・処理内容',
    quantity: '数量',
    unit_price: '単価',
    total_price: '金額',
    tax_rate: '税率',
  };
  return labels[key] || key;
};

interface FormattedLog extends AuditLog {
  field: string;
  itemIndex?: number;
}

export const HistoryLogModal: React.FC<HistoryLogModalProps> = ({ data, onClose }) => {
  if (!data) return null;

  const allLogs: FormattedLog[] = [];

  // Extract logs from top-level fields
  Object.keys(data).forEach(key => {
    if (key === 'items' || key === 'document_type') return;
    const field = (data as any)[key] as FieldValue<any>;
    if (field?.history) {
      field.history.forEach(log => {
        allLogs.push({ ...log, field: getFieldLabel(key) });
      });
    }
  });

  // Extract logs from line items
  data.items?.forEach((item, index) => {
    Object.keys(item).forEach(key => {
      if (key === 'page_number') return;
      const field = (item as any)[key] as FieldValue<any>;
      if (field?.history) {
        field.history.forEach(log => {
          allLogs.push({ ...log, field: getFieldLabel(key), itemIndex: index + 1 });
        });
      }
    });
  });
  
  // Sort logs by timestamp descending
  allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">変更履歴</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors" aria-label="閉じる">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </header>
        <main className="flex-grow p-6 overflow-y-auto">
          {allLogs.length > 0 ? (
            <table className="min-w-full text-sm divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="p-3 text-left font-semibold text-gray-600">日時</th>
                  <th className="p-3 text-left font-semibold text-gray-600">項目</th>
                  <th className="p-3 text-left font-semibold text-gray-600">変更前</th>
                  <th className="p-3 text-left font-semibold text-gray-600">変更後</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {allLogs.map((log, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="p-3 text-gray-600 whitespace-nowrap">{log.timestamp}</td>
                    <td className="p-3 font-medium text-gray-800">
                        {log.field}
                        {log.itemIndex && <span className="text-xs text-gray-500 ml-1">(品目 {log.itemIndex})</span>}
                    </td>
                    <td className="p-3 text-red-600">{String(log.oldValue ?? '空白')}</td>
                    <td className="p-3 text-green-600">{String(log.newValue ?? '空白')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex justify-center items-center h-full">
                <p className="text-gray-500">変更履歴はありません。</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};