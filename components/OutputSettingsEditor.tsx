
import React, { useState } from 'react';
import { OutputFieldConfig } from '../types';

interface OutputSettingsEditorProps {
    fields: OutputFieldConfig[];
    onFieldsChange: (fields: OutputFieldConfig[]) => void;
}

const DragHandleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
    </svg>
);


const FieldRow: React.FC<{
    field: OutputFieldConfig;
    onChange: (key: string, newField: Partial<OutputFieldConfig>) => void;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, key: string) => void;
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>, key: string) => void;
    onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
    isDragging: boolean;
}> = ({ field, onChange, onDragStart, onDragOver, onDrop, onDragEnd, isDragging }) => {
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, field.key)}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, field.key)}
            onDragEnd={onDragEnd}
            className={`grid grid-cols-12 gap-x-4 items-center py-3 border-b ${isDragging ? 'opacity-50 bg-blue-50' : ''}`}
        >
            <div className="col-span-1 flex justify-center cursor-move" title="ドラッグして並べ替え">
                <DragHandleIcon />
            </div>
            <div className="col-span-1 flex justify-center">
                <input
                    type="checkbox"
                    checked={field.enabled}
                    onChange={(e) => onChange(field.key, { enabled: e.target.checked })}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
            </div>
            <div className="col-span-4">
                <input
                    type="text"
                    value={field.label}
                    onChange={(e) => onChange(field.key, { label: e.target.value })}
                    disabled={!field.enabled}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-400"
                />
            </div>
            <div className="col-span-6">
                <input
                    type="text"
                    value={field.formatInstruction}
                    onChange={(e) => onChange(field.key, { formatInstruction: e.target.value })}
                    disabled={!field.enabled}
                    placeholder="例: {value} 円 ( {value} に値が入ります)"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-400"
                />
            </div>
        </div>
    );
};

export const OutputSettingsEditor: React.FC<OutputSettingsEditorProps> = ({ fields, onFieldsChange }) => {
    const [draggedKey, setDraggedKey] = useState<string | null>(null);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, key: string) => {
        setDraggedKey(key);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        setDraggedKey(null);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDrop = (targetKey: string) => {
        if (!draggedKey || draggedKey === targetKey) return;

        const newFields = [...fields];
        const draggedItem = newFields.find(f => f.key === draggedKey);
        const targetItem = newFields.find(f => f.key === targetKey);

        if (!draggedItem || !targetItem || draggedItem.isItemField !== targetItem.isItemField) return;

        const draggedIndex = newFields.findIndex(f => f.key === draggedKey);
        
        newFields.splice(draggedIndex, 1);
        const targetIndex = newFields.findIndex(f => f.key === targetKey);
        newFields.splice(targetIndex, 0, draggedItem);
        
        onFieldsChange(newFields);
    };

    const handleFieldChange = (key: string, newField: Partial<OutputFieldConfig>) => {
        const newFields = fields.map(field =>
            field.key === key ? { ...field, ...newField } : field
        );
        onFieldsChange(newFields);
    };

    const topLevelFields = fields.filter(f => !f.isItemField);
    const itemFields = fields.filter(f => f.isItemField);

    return (
        <div>
            <p className="text-sm text-gray-600 mb-4">
                CSVファイルに出力する項目をここで設定します。ドラッグ＆ドロップで列の順番を並べ替えることができます。
            </p>
            <div className="grid grid-cols-12 gap-x-4 text-sm font-semibold text-gray-600 px-2 mb-2">
                <div className="col-span-1 text-center">並べ替え</div>
                <div className="col-span-1 text-center">出力</div>
                <div className="col-span-4">CSVヘッダー名</div>
                <div className="col-span-6">出力フォーマット指示</div>
            </div>

            <h3 className="text-md font-semibold text-gray-700 mt-4 mb-2">基本項目</h3>
            {topLevelFields.map(field => (
                <FieldRow
                    key={field.key}
                    field={field}
                    onChange={handleFieldChange}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    isDragging={draggedKey === field.key}
                />
            ))}

            <h3 className="text-md font-semibold text-gray-700 mt-6 mb-2">品目項目</h3>
            {itemFields.map(field => (
                <FieldRow
                    key={field.key}
                    field={field}
                    onChange={handleFieldChange}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    isDragging={draggedKey === field.key}
                />
            ))}
        </div>
    );
};
