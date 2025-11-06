
import React, { useState, useMemo } from 'react';
import { ProcessResult } from '../types';

interface ProcessHistoryTableProps {
  results: ProcessResult[];
  onConfirmClick: (id: string) => void;
  onExportAllCsv: () => void;
}

const getStatusBadge = (status: ProcessResult['status']) => {
  switch (status) {
    case 'pending':
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">保留中</span>;
    case 'processing':
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">処理中</span>;
    case 'success':
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">読み取り確認待ち</span>;
    case 'confirmed':
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">完了</span>;
    case 'error':
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">エラー</span>;
    default:
      return null;
  }
};

export const ProcessHistoryTable: React.FC<ProcessHistoryTableProps> = ({ results, onConfirmClick, onExportAllCsv }) => {
    const [showOnlyPending, setShowOnlyPending] = useState(false);

    const filteredResults = useMemo(() => {
        if (showOnlyPending) {
            return results.filter(r => r.status === 'success');
        }
        return results;
    }, [results, showOnlyPending]);
    
    const handleDownload = (file: File) => {
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">実行履歴</h2>
        <div className="flex items-center gap-4">
            <div className="flex items-center">
                <label htmlFor="show-pending-toggle" className="mr-2 text-sm font-medium text-gray-700">確認待ちのみ表示</label>
                <button
                    role="switch"
                    aria-checked={showOnlyPending}
                    id="show-pending-toggle"
                    onClick={() => setShowOnlyPending(!showOnlyPending)}
                    className={`${showOnlyPending ? 'bg-blue-600' : 'bg-gray-200'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}
                >
                    <span className={`${showOnlyPending ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
                </button>
            </div>
            <button
              onClick={onExportAllCsv}
              disabled={results.filter(r => r.status === 'confirmed').length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              aria-label="すべての結果をCSV形式でエクスポート"
            >
              <span>すべてCSVエクスポート</span>
            </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">実行日時</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">実行者</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ファイル</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">出力ファイル</th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredResults.length > 0 ? filteredResults.map((result) => (
              <tr key={result.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.processedAt || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">takuya_matsueda@densan-s...</td>
                <td 
                    className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:underline cursor-pointer truncate max-w-xs"
                    onClick={() => handleDownload(result.file)}
                    title={`Download ${result.file.name}`}
                >
                    {result.file.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{getStatusBadge(result.status)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {(result.status === 'success' || result.status === 'confirmed') && (
                    <button onClick={() => onConfirmClick(result.id)} className="text-white bg-blue-600 hover:bg-blue-700 rounded-md px-4 py-1">
                      確認
                    </button>
                  )}
                </td>
              </tr>
            )) : (
                <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                        実行履歴はありません。
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
        {results.length > 0 && (
             <div className="pt-4 text-sm text-gray-500">
                {results.length}件
            </div>
        )}
    </div>
  );
};
