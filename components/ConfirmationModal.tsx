import React, { useState, useEffect } from 'react';
import { ProcessResult, DocumentData, BoundingBox, FieldValue, AuditLog, DocumentFieldConfig } from '../types';
import { PdfViewer } from './PdfViewer';
import { InvoiceDataDisplay } from './InvoiceDataDisplay';
import { HistoryLogModal } from './HistoryLogModal';

interface ConfirmationModalProps {
  result: ProcessResult;
  onClose: () => void;
  onUpdateData: (resultId: string, updatedData: DocumentData) => void;
  onConfirm: (resultId: string) => void;
  fieldConfig: DocumentFieldConfig[];
}

interface ActiveHighlight {
  bounds: BoundingBox[];
  color: string;
}

const generateAuditLogs = (beforeData: DocumentData, afterData: DocumentData): DocumentData => {
    const updatedData = JSON.parse(JSON.stringify(afterData));
    const timestamp = new Date().toLocaleString('ja-JP');

    const compareAndLog = (beforeField: FieldValue<any> | undefined, afterField: FieldValue<any>) => {
        const oldValue = beforeField?.value ?? null;
        const newValue = afterField.value ?? null;

        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            const newLog: AuditLog = {
                timestamp,
                oldValue,
                newValue,
            };
            afterField.history = [...(afterField.history || []), newLog];
        }
    };

    // Compare top-level fields
    Object.keys(updatedData).forEach(key => {
        if (key !== 'items' && key !== 'document_type') {
            const beforeField = (beforeData as any)[key];
            const afterField = (updatedData as any)[key];
            if (afterField && typeof afterField === 'object' && 'value' in afterField) {
                compareAndLog(beforeField, afterField);
            }
        }
    });

    // Compare items
    const maxItems = Math.max(beforeData.items?.length || 0, afterData.items?.length || 0);
    for (let i = 0; i < maxItems; i++) {
        const beforeItem = beforeData.items?.[i];
        const afterItem = updatedData.items?.[i];

        if (afterItem) {
            Object.keys(afterItem).forEach(key => {
                if (key !== 'page_number') {
                    const beforeField = beforeItem ? (beforeItem as any)[key] : undefined;
                    const afterField = (afterItem as any)[key];
                    if (afterField && typeof afterField === 'object' && 'value' in afterField) {
                         compareAndLog(beforeField, afterField);
                    }
                }
            });
        }
    }

    return updatedData;
};


export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ result, onClose, onUpdateData, onConfirm, fieldConfig }) => {
  const [activeHighlight, setActiveHighlight] = useState<ActiveHighlight | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [originalData, setOriginalData] = useState<DocumentData | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const isConfirmed = result.status === 'confirmed';

  useEffect(() => {
    if (result.data) {
        setOriginalData(JSON.parse(JSON.stringify(result.data)));
    }
    if (!isConfirmed) {
      setIsEditing(true);
    } else {
      setIsEditing(false);
    }
  }, [result.id, isConfirmed]);


  const handleFieldFocus = (bounds?: BoundingBox[], color?: string) => {
    if (bounds && color) {
      setActiveHighlight({ bounds, color });
    }
  };
  
  const handleFieldBlur = () => {
    setActiveHighlight(null);
  };

  const handleUpdate = (updatedData: DocumentData) => {
    onUpdateData(result.id, updatedData);
  }

  const handleConfirmAndSave = () => {
    if (originalData && result.data) {
        const dataWithNewHistory = generateAuditLogs(originalData, result.data);
        onUpdateData(result.id, dataWithNewHistory);
        setOriginalData(dataWithNewHistory); 
        onConfirm(result.id);
    } else {
        onConfirm(result.id);
    }
    setIsEditing(false);
  }

  const handleStartEditing = () => {
    if (result.data) {
        setOriginalData(JSON.parse(JSON.stringify(result.data))); 
    }
    setIsEditing(true);
  };
  
  const handleSaveChanges = () => {
    if (originalData && result.data) {
        const dataWithNewHistory = generateAuditLogs(originalData, result.data);
        onUpdateData(result.id, dataWithNewHistory);
        setOriginalData(dataWithNewHistory);
    }
    setIsEditing(false);
  };
  
  const handleCancelChanges = () => {
    if (originalData) {
      onUpdateData(result.id, originalData);
    }
    setIsEditing(false);
  };
  
  const isDisabled = isConfirmed && !isEditing;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        className="bg-gray-100 flex flex-col w-full h-full relative"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex-shrink-0 flex justify-between items-center p-4 border-b bg-white">
            <h2 id="modal-title" className="text-xl font-bold text-gray-800">読み取り確認</h2>
            <div className="flex gap-2">
                <button 
                  onClick={() => setIsHistoryModalOpen(true)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  変更履歴
                </button>
                {isConfirmed ? (
                    isEditing ? (
                        <>
                            <button 
                                onClick={handleCancelChanges}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                                キャンセル
                            </button>
                            <button 
                                onClick={handleSaveChanges}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                                変更を保存
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={handleStartEditing}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                            編集する
                        </button>
                    )
                ) : (
                    <button 
                        onClick={handleConfirmAndSave}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                        確認済みにする
                    </button>
                )}
            </div>
        </header>

        <div className="grid grid-cols-2 gap-6 flex-grow min-h-0 p-6">
          {/* Left Column: PDF Viewer */}
          <div className="bg-white p-4 rounded-lg shadow flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-2 border-b pb-2 flex-shrink-0">
                <h3 className="text-lg font-semibold">読み取ったドキュメント</h3>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage <= 1 || numPages === 0}
                        className="px-3 py-1 text-sm rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                        &lt; 前へ
                    </button>
                    <span className="text-sm font-medium text-gray-700 w-24 text-center">
                        {numPages > 0 ? `ページ ${currentPage} / ${numPages}` : '-'}
                    </span>
                    <button 
                        onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
                        disabled={currentPage >= numPages || numPages === 0}
                        className="px-3 py-1 text-sm rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                        次へ &gt;
                    </button>
                </div>
            </div>
            <div className="flex-grow min-h-0 relative">
              <PdfViewer 
                file={result.file} 
                activeHighlight={activeHighlight}
                currentPage={currentPage}
                onLoadSuccess={setNumPages}
              />
            </div>
          </div>

          {/* Right Column: Data */}
          <div className="overflow-y-auto">
            {(result.status === 'success' || result.status === 'confirmed') && result.data && (
              <InvoiceDataDisplay
                data={result.data}
                fileName={result.file.name}
                currentPage={currentPage}
                onUpdateData={handleUpdate}
                onFieldFocus={handleFieldFocus}
                onFieldBlur={handleFieldBlur}
                disabled={isDisabled}
                fieldConfig={fieldConfig}
              />
            )}
            {result.status === 'error' && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow" role="alert">
                <strong className="font-bold">エラー: </strong>
                <span className="block sm:inline">{result.error}</span>
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors z-50"
          aria-label="閉じる"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
      {isHistoryModalOpen && (
        <HistoryLogModal
          data={result.data}
          onClose={() => setIsHistoryModalOpen(false)}
        />
      )}
    </div>
  );
};