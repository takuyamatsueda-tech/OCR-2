
import React, { useState, useCallback, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { ProcessHistoryTable } from './components/ProcessHistoryTable';
import { ConfirmationModal } from './components/ConfirmationModal';
import { ProgressBar } from './components/ProgressBar';
import { SettingsModal } from './components/SettingsModal';
import { AddNewDocTypeModal } from './components/AddNewDocTypeModal';
import { extractDocumentData } from './services/geminiService';
import { ProcessResult, DocumentType, DocumentData, LineItem, DocumentConfig, DocumentFieldConfig, FieldValue } from './types';
import { DEFAULT_DOCUMENT_CONFIG } from './config/documentSettings';

const escapeCsvCell = (cell: any): string => {
  if (cell === null || cell === undefined) return '';
  const str = String(cell);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const applyFormatting = (value: any, format: string): any => {
    if (value === null || value === undefined) return value;
    if (format === 'date-yyyy-mm-dd') {
        try {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
        } catch (e) {
            // Ignore format error and return original value
        }
    }
    return value;
};


const DocumentIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const AddIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);


const App: React.FC = () => {
  const [processResults, setProcessResults] = useState<ProcessResult[]>([]);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);
  const [view, setView] = useState<'selection' | 'upload'>('selection');
  const [docType, setDocType] = useState<DocumentType | null>(null);
  const [documentConfig, setDocumentConfig] = useState<DocumentConfig>(() => {
    try {
      const savedConfig = localStorage.getItem('documentConfig');
      return savedConfig ? JSON.parse(savedConfig) : DEFAULT_DOCUMENT_CONFIG;
    } catch (error) {
      console.error("Failed to load config from localStorage", error);
      return DEFAULT_DOCUMENT_CONFIG;
    }
  });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDocType, setEditingDocType] = useState<DocumentType | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('documentConfig', JSON.stringify(documentConfig));
    } catch (error) {
      console.error("Failed to save config to localStorage", error);
    }
  }, [documentConfig]);

  const handleSaveConfig = (newConfig: DocumentConfig) => {
    setDocumentConfig(newConfig);
    setIsSettingsModalOpen(false);
  };
  
  const handleOpenSettings = (type: DocumentType, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDocType(type);
    setIsSettingsModalOpen(true);
  };
  
  const handleAddNewDocType = (newDocType: DocumentType, fields: DocumentFieldConfig[]) => {
    setDocumentConfig(prevConfig => ({
      ...prevConfig,
      [newDocType]: fields
    }));
    setIsAddModalOpen(false);
  };

  const handleFileUpload = (files: File[]) => {
    const newResults: ProcessResult[] = files.map(file => ({
      id: `${file.name}-${Date.now()}`,
      file,
      status: 'pending',
      data: null,
      error: null,
    }));
    setProcessResults(prev => [...newResults, ...prev]);
  };

  const handleProcessDocuments = useCallback(async () => {
    const pendingResults = processResults.filter(r => r.status === 'pending');
    if (pendingResults.length === 0 || !docType) return;

    setIsProcessing(true);
    setTotalToProcess(pendingResults.length);
    setCurrentProgress(0);
    
    const currentConfig = documentConfig[docType];

    for (const [index, result] of pendingResults.entries()) {
      setProcessResults(prev => 
          prev.map(r => r.id === result.id ? { ...r, status: 'processing' } : r)
      );
      try {
        const data = await extractDocumentData(result.file, docType, currentConfig);
        setProcessResults(prev => 
          prev.map(r => r.id === result.id ? { ...r, status: 'success', data, processedAt: new Date().toLocaleString('ja-JP') } : r)
        );
      } catch (error) {
        console.error(`Error processing ${result.file.name}:`, error);
        setProcessResults(prev => 
          prev.map(r => r.id === result.id ? { ...r, status: 'error', error: error instanceof Error ? error.message : 'Unknown error', processedAt: new Date().toLocaleString('ja-JP') } : r)
        );
      }
      setCurrentProgress(index + 1);
    }
    
    setIsProcessing(false);
    setTotalToProcess(0);
    setCurrentProgress(0);
  }, [processResults, docType, documentConfig]);
  
  const handleDataUpdate = (resultId: string, updatedData: DocumentData) => {
    setProcessResults(prevResults =>
      prevResults.map(result =>
        result.id === resultId ? { ...result, data: updatedData } : result
      )
    );
  };

  const handleConfirmDocument = (resultId: string) => {
    setProcessResults(prevResults =>
      prevResults.map(result =>
        result.id === resultId ? { ...result, status: 'confirmed' } : result
      )
    );
    setSelectedResultId(null); // Close modal
  };

  const handleExportAllCsv = () => {
    const confirmedResults = processResults.filter(r => r.status === 'confirmed');
    if (confirmedResults.length === 0) return;

    const allFields = new Map<string, DocumentFieldConfig>();
    confirmedResults.forEach(result => {
        if (result.data?.document_type) {
            const docType = result.data.document_type as DocumentType;
            const configForDocType = documentConfig[docType];
            if (configForDocType) {
                configForDocType.filter(field => field.enabled).forEach(field => {
                    if (!allFields.has(field.key)) {
                        allFields.set(field.key, field);
                    }
                });
            }
        }
    });

    const masterHeaderConfig = Array.from(allFields.values());
    masterHeaderConfig.sort((a, b) => a.key.localeCompare(b.key));

    const headers = ['ファイル名', 'ドキュメントタイプ', ...masterHeaderConfig.map(c => c.label)];
    const rows: (string | number | null | undefined)[][] = [];

    for (const result of confirmedResults) {
        if (!result.data) continue;
        const doc = result.data;
        const fileName = result.file.name;
        
        const items = doc.items && doc.items.length > 0 ? doc.items : [{} as LineItem];

        for (const item of items) {
            let row: (string | number | null | undefined)[] = [fileName, doc.document_type];
            masterHeaderConfig.forEach(c => {
                let value;
                if (c.isItemField) {
                    value = item[c.key]?.value;
                } else {
                    value = (doc[c.key] as FieldValue<string | number>)?.value;
                }
                row.push(applyFormatting(value, c.outputFormat));
            });
            rows.push(row);
        }
    }
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCsvCell).join(','))
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `all_documents_data_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSelectDocType = (type: DocumentType) => {
    setDocType(type);
    setView('upload');
    setProcessResults([]);
    setSelectedResultId(null);
    setIsProcessing(false);
    setCurrentProgress(0);
    setTotalToProcess(0);
  };

  const handleBackToSelection = () => {
    setView('selection');
    setDocType(null);
    setProcessResults([]);
    setSelectedResultId(null);
    setIsProcessing(false);
    setCurrentProgress(0);
    setTotalToProcess(0);
  };
  
  const getDocTypeLabel = (type: DocumentType) => {
    if (type === 'invoice') return '請求書';
    if (type === 'purchase_order') return '注文書';
    return type;
  }

  const selectedResult = processResults.find(r => r.id === selectedResultId);

  if (view === 'selection') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 font-sans">
        {isSettingsModalOpen && editingDocType && (
            <SettingsModal
                docType={editingDocType}
                config={documentConfig}
                onClose={() => setIsSettingsModalOpen(false)}
                onSave={handleSaveConfig}
            />
        )}
        {isAddModalOpen && (
            <AddNewDocTypeModal
                onClose={() => setIsAddModalOpen(false)}
                onSave={handleAddNewDocType}
                existingDocTypes={Object.keys(documentConfig)}
            />
        )}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800">帳票データ化 AI アプリ</h1>
          <p className="text-lg text-gray-600 mt-2">処理したいドキュメントタイプを選択してください。</p>
        </div>
        <div className="bg-white rounded-xl shadow-md border border-gray-200 max-w-2xl w-full">
          <ul className="divide-y divide-gray-200">
            {Object.keys(documentConfig).map(type => (
                 <li 
                  key={type}
                  onClick={() => handleSelectDocType(type as DocumentType)}
                  className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200 cursor-pointer group"
                >
                  <div className="flex items-center">
                    <div className="bg-blue-100 p-3 rounded-full mr-6">
                      <DocumentIcon />
                    </div>
                    <div className="flex-grow">
                      <h2 className="text-xl font-semibold text-gray-800">{getDocTypeLabel(type as DocumentType)}</h2>
                      <p className="text-gray-600 mt-1">{getDocTypeLabel(type as DocumentType)}をアップロードしてデータを抽出します。</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => handleOpenSettings(type as DocumentType, e)} className="text-gray-500 hover:text-blue-600 p-2 rounded-full transition-colors">
                      <SettingsIcon />
                    </button>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </li>
            ))}
            <li 
              onClick={() => setIsAddModalOpen(true)}
              className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200 cursor-pointer group"
            >
              <div className="flex items-center">
                <div className="bg-gray-100 p-3 rounded-full mr-6">
                  <AddIcon />
                </div>
                <div className="flex-grow">
                  <h2 className="text-xl font-semibold text-gray-800">新しい帳票を追加</h2>
                  <p className="text-gray-600 mt-1">新しい種類の帳票を登録してデータ化します。</p>
                </div>
              </div>
               <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <main className="container mx-auto p-4 md:p-8">
        <header className="mb-8">
          <button onClick={handleBackToSelection} className="flex items-center text-sm text-blue-600 hover:underline">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            ドキュメント選択に戻る
          </button>
          <h1 className="text-3xl font-bold text-gray-800 mt-1">
            {getDocTypeLabel(docType || '')}のデータ化
          </h1>
        </header>

        {/* Top Controls Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
                <div className="md:col-span-3">
                    <FileUpload onFileUpload={handleFileUpload} disabled={isProcessing} />
                </div>
                <div className="md:col-span-2 space-y-4 pt-7">
                    <div>
                        <button
                            onClick={handleProcessDocuments}
                            disabled={isProcessing || processResults.filter(r => r.status === 'pending').length === 0}
                            className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            {isProcessing ? '処理中...' : 'データ化を実行'}
                        </button>
                        {isProcessing && totalToProcess > 0 && (
                            <div className="mt-4">
                                <ProgressBar current={currentProgress} total={totalToProcess} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Bottom History Section */}
        <ProcessHistoryTable 
            results={processResults} 
            onConfirmClick={setSelectedResultId}
            onExportAllCsv={handleExportAllCsv}
        />

        {selectedResult && docType && (
            <ConfirmationModal
                result={selectedResult}
                onClose={() => setSelectedResultId(null)}
                onUpdateData={handleDataUpdate}
                onConfirm={handleConfirmDocument}
                fieldConfig={documentConfig[docType]}
            />
        )}
      </main>
    </div>
  );
};

export default App;
