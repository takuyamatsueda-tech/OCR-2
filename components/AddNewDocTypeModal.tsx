import React, { useState, useCallback } from 'react';
import { DocumentFieldConfig, DocumentType } from '../types';
import { suggestFieldsForDocument } from '../services/geminiService';
import { FileUpload } from './FileUpload';
import { FieldSettingsEditor } from './FieldSettingsEditor';
import { LoadingSpinner } from './LoadingSpinner';

interface AddNewDocTypeModalProps {
    onClose: () => void;
    onSave: (docType: DocumentType, fields: DocumentFieldConfig[]) => void;
    existingDocTypes: string[];
}

type Step = 'initial' | 'loading' | 'editing';

export const AddNewDocTypeModal: React.FC<AddNewDocTypeModalProps> = ({ onClose, onSave, existingDocTypes }) => {
    const [step, setStep] = useState<Step>('initial');
    const [file, setFile] = useState<File | null>(null);
    const [docTypeName, setDocTypeName] = useState('');
    const [fields, setFields] = useState<DocumentFieldConfig[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = useCallback((files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
            setError(null);
        }
    }, []);

    const handleAnalyze = async () => {
        if (!file) {
            setError('帳票のサンプルPDFをアップロードしてください。');
            return;
        }
        if (!docTypeName) {
            setError('帳票の名前を入力してください。');
            return;
        }
        if (existingDocTypes.includes(docTypeName)) {
            setError('この帳票名は既に使用されています。');
            return;
        }

        setStep('loading');
        setError(null);
        try {
            const result = await suggestFieldsForDocument(file);
            // If AI suggests a name, use it, otherwise keep user input
            if(result.docTypeName && !docTypeName) {
                setDocTypeName(result.docTypeName);
            }
            setFields(result.fields);
            setStep('editing');
        } catch (e) {
            console.error(e);
            setError('項目の自動提案に失敗しました。手動で項目を追加してください。');
            setFields([]); // Start with empty fields on error
            setStep('editing');
        }
    };
    
    const handleFinalSave = () => {
        if (!docTypeName) {
            setError('帳票の名前は必須です。');
            return;
        }
        onSave(docTypeName, fields);
    }
    
    const renderContent = () => {
        switch (step) {
            case 'initial':
                return (
                    <div>
                        <p className="text-sm text-gray-600 mb-4">新しい帳票を登録します。まず、帳票の名前を入力し、サンプルのPDFファイルをアップロードしてください。AIがファイルを解析し、自動で読み取り項目を提案します。</p>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="docTypeName" className="block text-sm font-medium text-gray-700 mb-1">帳票の名前</label>
                                <input
                                    type="text"
                                    id="docTypeName"
                                    value={docTypeName}
                                    onChange={e => setDocTypeName(e.target.value)}
                                    placeholder="例: 納品書"
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                />
                            </div>
                            <div>
                               <label className="block text-sm font-medium text-gray-700 mb-1">サンプルPDF</label>
                               <FileUpload onFileUpload={handleFileChange} disabled={false} />
                               {file && <p className="text-sm text-gray-500 mt-2">選択中のファイル: {file.name}</p>}
                            </div>
                        </div>
                    </div>
                );
            case 'loading':
                return (
                    <div className="flex flex-col items-center justify-center h-48">
                        <LoadingSpinner />
                        <p className="mt-4 text-gray-600">AIが帳票を解析しています...</p>
                    </div>
                );
            case 'editing':
                return (
                    <div>
                         <p className="text-sm text-gray-600 mb-4">AIによる項目の提案結果です。内容を確認し、必要に応じて項目を追加・削除・編集してください。</p>
                         <FieldSettingsEditor fields={fields} onFieldsChange={setFields} />
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-auto max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">新しい帳票の追加</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors" aria-label="閉じる">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </header>
                <main className="flex-grow p-6 overflow-y-auto">
                    {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert"><p>{error}</p></div>}
                    {renderContent()}
                </main>
                <footer className="flex justify-between items-center p-4 border-t bg-gray-50 rounded-b-xl">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                        キャンセル
                    </button>
                    {step === 'initial' && (
                         <button onClick={handleAnalyze} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                            解析して項目を編集
                        </button>
                    )}
                    {step === 'editing' && (
                        <button onClick={handleFinalSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                            この内容で帳票を登録
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
};