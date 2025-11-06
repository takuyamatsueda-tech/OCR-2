
import React, { useState } from 'react';
import { DocumentType, DocumentConfig, DocumentFieldConfig } from '../types';
import { FieldSettingsEditor } from './FieldSettingsEditor';

interface SettingsModalProps {
    docType: DocumentType;
    config: DocumentConfig;
    onClose: () => void;
    onSave: (newConfig: DocumentConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ docType, config, onClose, onSave }) => {
    const [fields, setFields] = useState<DocumentFieldConfig[]>(JSON.parse(JSON.stringify(config[docType] || [])));

    const handleSave = () => {
        const newConfig = {
            ...config,
            [docType]: fields
        };
        onSave(newConfig);
    };

    const docTypeLabel = docType === 'invoice' ? '請求書' : docType === 'purchase_order' ? '注文書' : docType;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-auto max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">{docTypeLabel} - 読み取り項目設定（AIへの指示）</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors" aria-label="閉じる">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </header>
                <main className="flex-grow p-6 overflow-y-auto">
                   <FieldSettingsEditor fields={fields} onFieldsChange={setFields} />
                </main>
                <footer className="flex justify-end items-center p-4 border-t bg-gray-50 rounded-b-xl">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors mr-2">
                        キャンセル
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                        設定を保存
                    </button>
                </footer>
            </div>
        </div>
    );
};
