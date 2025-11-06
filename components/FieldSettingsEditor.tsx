import React from 'react';
import { DocumentFieldConfig, OutputFormat } from '../types';

interface FieldSettingsEditorProps {
    fields: DocumentFieldConfig[];
    onFieldsChange: (fields: DocumentFieldConfig[]) => void;
}

const DeleteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const FieldRow: React.FC<{
    field: DocumentFieldConfig;
    onChange: (key: string, newField: Partial<DocumentFieldConfig>) => void;
    onDelete: (key: string) => void;
}> = ({ field, onChange, onDelete }) => {
    return (
        <div className="grid grid-cols-12 gap-x-4 items-center py-3 border-b">
            <div className="col-span-1 flex justify-center">
                <input
                    type="checkbox"
                    checked={field.enabled}
                    onChange={(e) => onChange(field.key, { enabled: e.target.checked })}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
            </div>
            <div className="col-span-3">
                 <input
                    type="text"
                    value={field.label}
                    onChange={(e) => onChange(field.key, { label: e.target.value })}
                    disabled={!field.enabled}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-400"
                />
            </div>
             <div className="col-span-4">
                 <input
                    type="text"
                    value={field.instruction || ''}
                    onChange={(e) => onChange(field.key, { instruction: e.target.value })}
                    disabled={!field.enabled}
                    placeholder="例: 「請求書番号」を探して"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-400"
                />
            </div>
            <div className="col-span-3">
                <select
                    value={field.outputFormat}
                    onChange={(e) => onChange(field.key, { outputFormat: e.target.value as OutputFormat })}
                    disabled={!field.enabled}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-400"
                >
                    <option value="none">加工なし</option>
                    {field.type === 'string' && (
                        <>
                          <option value="date-yyyy-mm-dd">日付形式 (YYYY-MM-DD)</option>
                        </>
                    )}
                </select>
            </div>
             <div className="col-span-1 flex justify-center">
                <button onClick={() => onDelete(field.key)} className="text-gray-400 hover:text-red-600 p-1 rounded-full transition-colors" aria-label="項目を削除">
                    <DeleteIcon />
                </button>
            </div>
        </div>
    );
}

export const FieldSettingsEditor: React.FC<FieldSettingsEditorProps> = ({ fields, onFieldsChange }) => {

    const handleFieldChange = (key: string, newField: Partial<DocumentFieldConfig>) => {
        const newFields = fields.map(field =>
            field.key === key ? { ...field, ...newField } : field
        );
        onFieldsChange(newFields);
    };
    
    const handleFieldAdd = (isItemField: boolean) => {
      const newField: DocumentFieldConfig = {
          key: `custom_${Date.now()}`,
          label: '新しい項目',
          enabled: true,
          isItemField,
          outputFormat: 'none',
          type: 'string',
          instruction: '',
      };
      const newFields = [...fields, newField];
      onFieldsChange(newFields);
    };

    const handleFieldDelete = (key: string) => {
        const newFields = fields.filter(field => field.key !== key);
        onFieldsChange(newFields);
    };

    const topLevelFields = fields.filter(f => !f.isItemField);
    const itemFields = fields.filter(f => f.isItemField);

    return (
        <div>
            <div className="grid grid-cols-12 gap-x-4 text-sm font-semibold text-gray-600 px-2 mb-2">
                <div className="col-span-1 text-center">有効</div>
                <div className="col-span-3">項目名</div>
                <div className="col-span-4">読み取り指示 (AIへのヒント)</div>
                <div className="col-span-3">出力加工</div>
                <div className="col-span-1 text-center">削除</div>
            </div>
            
            <h3 className="text-md font-semibold text-gray-700 mt-4 mb-2">基本項目</h3>
            {topLevelFields.map(field => (
                <FieldRow key={field.key} field={field} onChange={handleFieldChange} onDelete={handleFieldDelete} />
            ))}
            <div className="mt-2">
                <button onClick={() => handleFieldAdd(false)} className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">+ 項目を追加</button>
            </div>
            
            <h3 className="text-md font-semibold text-gray-700 mt-6 mb-2">品目項目</h3>
            {itemFields.map(field => (
                <FieldRow key={field.key} field={field} onChange={handleFieldChange} onDelete={handleFieldDelete} />
            ))}
             <div className="mt-2">
                <button onClick={() => handleFieldAdd(true)} className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">+ 項目を追加</button>
            </div>
        </div>
    );
};