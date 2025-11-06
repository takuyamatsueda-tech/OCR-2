import React, { useState, useCallback } from 'react';

interface FileUploadProps {
  onFileUpload: (files: File[]) => void;
  disabled: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onFileUpload(Array.from(event.target.files));
      event.target.value = ''; // Reset input to allow re-uploading the same file
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // FIX: Explicitly type `file` as `File` to resolve TypeScript error.
      const files = Array.from(e.dataTransfer.files).filter((file: File) => file.type === "application/pdf");
      if(files.length !== e.dataTransfer.files.length) {
        alert("PDFファイルのみアップロードできます。");
      }
      if (files.length > 0) {
        onFileUpload(files);
      }
    }
  }, [onFileUpload, disabled]);

  const dropzoneClasses = `flex flex-col items-center justify-center w-full h-full min-h-[160px] border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300
    ${disabled ? 'bg-gray-200 cursor-not-allowed' : 'bg-gray-50'}
    ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-100'}`;

  return (
    <div 
      className="h-full"
    >
      <label htmlFor="file-upload" className={dropzoneClasses}>
        <div 
            className="flex flex-col items-center justify-center pt-5 pb-6"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <UploadIcon />
            <p className="mb-2 text-sm text-gray-500">
            ファイルをドラッグ＆ドロップまたはクリックしてファイルを選択
            </p>
            <p className="text-xs text-gray-500">一度に最大500枚まで選択できます</p>
        </div>
        <input 
            type="file" 
            id="file-upload" 
            className="hidden" 
            onChange={handleFileChange}
            accept="application/pdf"
            disabled={disabled}
            multiple
        />
      </label>
    </div>
  );
};

const UploadIcon = () => (
    <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
    </svg>
);