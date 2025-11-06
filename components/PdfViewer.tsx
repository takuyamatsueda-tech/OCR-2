
import React, { useEffect, useState, useRef, WheelEvent, useMemo } from 'react';
import { getDocument, GlobalWorkerOptions } from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
import { LoadingSpinner } from './LoadingSpinner';
import { BoundingBox } from '../types';

GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

interface PdfViewerProps {
  file: File | null;
  activeHighlight: { bounds: BoundingBox[]; color: string } | null;
  onLoadSuccess: (numPages: number) => void;
  currentPage: number;
}

interface PageData {
  imageUrl: string;
  textContent: any;
  viewport: any;
}

const ZoomInIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>;
const ZoomOutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>;
const RotateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9a2 2 0 012-2h6zM15 7A2.001 2.001 0 0013 5H9a2 2 0 00-2 2v6a2 2 0 002 2h4a2 2 0 002-2V9a2 2 0 00-2-2h-1" transform="rotate(90 12 12)" /></svg>;
const ResetZoomIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5m-5-5l7 7m11-7v5h-5m5-5l-7 7M4 20v-5h5m-5 5l7-7m11 7v-5h-5m5 5l-7-7" /></svg>;

const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const TextLayerStyles = () => (
    <style>{`
      .textLayer {
        /* textLayer自体はマウスイベントを透過させ、下の画像が操作できるようにする */
        pointer-events: none;
      }
      .textLayer > span {
        position: absolute;
        white-space: pre;
        cursor: pointer;
        user-select: none;
  
        /* 通常時はテキストと背景を透明にする */
        color: transparent;
        background-color: transparent;
        transition: background-color 0.1s ease-in-out, color 0.1s ease-in-out;
        
        /* span単位でマウスイベントを受け取れるようにする */
        pointer-events: auto;
      }
  
      .textLayer > span:hover {
        /* ホバー時にスタイルを適用 */
        color: white;
        background-color: rgba(0, 0, 0, 0.5);
        border-radius: 2px;
        padding: 0 2px;
      }
    `}</style>
  );

export const PdfViewer: React.FC<PdfViewerProps> = ({ file, activeHighlight, onLoadSuccess, currentPage }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagesData, setPagesData] = useState<PageData[]>([]);
  const [zoom, setZoom] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialRender = useRef(true);

  const RENDER_SCALE = 2.0;

  useEffect(() => {
    const renderPdf = async () => {
      if (!file) {
        setPagesData([]);
        return;
      }

      setLoading(true);
      setError(null);
      setPagesData([]);
      isInitialRender.current = true;
      
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await getDocument({ data: arrayBuffer }).promise;
        onLoadSuccess(pdf.numPages);

        const data: PageData[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: RENDER_SCALE, rotation: page.rotate });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          if (context) {
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            const imageUrl = canvas.toDataURL('image/jpeg');
            const textContent = await page.getTextContent();
            data.push({ imageUrl, textContent, viewport });
          }
        }
        setPagesData(data);
      } catch (e) {
        console.error('Failed to render PDF', e);
        setError(e instanceof Error ? e.message : 'PDFの読み込みに失敗しました。');
      } finally {
        setLoading(false);
      }
    };
    renderPdf();
  }, [file]);
  
  const currentImage = useMemo(() => pagesData[currentPage - 1], [pagesData, currentPage]);

  useEffect(() => {
    if (currentImage) {
        setPanPosition({ x: 0, y: 0 });
        setRotation(0);
        if (isInitialRender.current && containerRef.current) {
            const imageWidth = currentImage.viewport.width;
            const containerWidth = containerRef.current.clientWidth;
            if (imageWidth > 0 && containerWidth > 0) {
              const initialZoom = (containerWidth / imageWidth) * 0.98;
              setZoom(initialZoom);
            }
            isInitialRender.current = false;
        } else if (!isInitialRender.current) {
            const imageWidth = currentImage.viewport.width;
            const containerWidth = containerRef.current?.clientWidth || imageWidth;
            setZoom((containerWidth / imageWidth) * 0.98);
        }
    }
  }, [currentImage, currentPage]);


  const handleZoom = (newZoom: number) => {
    setZoom(Math.max(0.1, Math.min(newZoom, 5)));
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const newZoom = zoom - event.deltaY * 0.002;
    handleZoom(newZoom);
  };
  
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setIsPanning(true);
    setPanStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    e.preventDefault();
    setPanPosition({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  };
  
  const handleMouseUpOrLeave = () => {
    setIsPanning(false);
  };
  
  const handleResetZoom = () => {
    if (currentImage && containerRef.current) {
        const imageWidth = currentImage.viewport.width;
        const containerWidth = containerRef.current.clientWidth;
        setZoom((containerWidth / imageWidth) * 0.98);
        setPanPosition({ x: 0, y: 0 });
    }
  }

  const handleTextClick = async (text: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Viewerのパン操作が発火するのを防ぐ
    try {
        await navigator.clipboard.writeText(text);
    } catch (err) {
        console.error('テキストのコピーに失敗しました:', err);
    }
  };

  if (error) return <div className="flex items-center justify-center h-full text-red-500 p-4 bg-red-50 rounded-lg"><p>エラー: {error}</p></div>;
  if (!file) return <div className="flex items-center justify-center h-full text-gray-500"><p>プレビューするファイルがありません。</p></div>;

  const cursorClass = isPanning ? 'cursor-grabbing' : (zoom > 1 ? 'cursor-grab' : 'cursor-default');

  return (
    <div className="h-full w-full flex flex-col bg-gray-100 relative">
        <TextLayerStyles />
        <div 
          ref={containerRef}
          className={`flex-grow overflow-hidden ${cursorClass}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
        >
            {loading ? (
                <div className="flex flex-col items-center justify-center h-full">
                    <LoadingSpinner />
                    <p className="mt-2 text-sm text-gray-500">PDFを読み込み中...</p>
                </div>
            ) : (
                <div 
                  className="relative"
                  style={{
                    transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {currentImage && (
                      <div 
                        className="relative shadow-lg"
                        style={{
                            width: currentImage.viewport.width,
                            height: currentImage.viewport.height,
                            transform: `rotate(${rotation}deg)`,
                            transition: 'transform 0.2s ease-in-out',
                        }}
                      >
                          <img 
                              src={currentImage.imageUrl} 
                              alt={`Page ${currentPage}`}
                              className="max-w-none"
                              draggable="false"
                          />
                          <div
                            className="absolute top-0 left-0 textLayer"
                            style={{
                              transform: `matrix(${currentImage.viewport.transform.join(',')})`,
                              transformOrigin: '0 0',
                              lineHeight: 1,
                            }}
                          >
                            {currentImage.textContent.items.map((item: any, idx: number) => {
                                const tx = item.transform; // [scaleX, skewY, skewX, scaleY, x, y]
                                const unscaledFontSize = Math.hypot(tx[0], tx[1]);
                                if (unscaledFontSize < 0.5) { // Hide tiny text elements to avoid clutter.
                                  return null;
                                }
                                
                                const fontSize = unscaledFontSize * 1.5;

                                const style: React.CSSProperties = {
                                    left: `${tx[4]}px`,
                                    top: `${tx[5]}px`,
                                    fontSize: `${fontSize}px`,
                                    fontFamily: currentImage.textContent.styles[item.fontName]?.fontFamily,
                                    transform: `matrix(${tx[0] / unscaledFontSize}, ${-tx[1] / unscaledFontSize}, ${tx[2] / unscaledFontSize}, ${-tx[3] / unscaledFontSize}, 0, 0)`,
                                    transformOrigin: '0% 0%',
                                };
                                return <span style={style} key={idx} onClick={(e) => handleTextClick(item.str, e)}>{item.str}</span>;
                            })}
                          </div>
                          {activeHighlight?.bounds.map((bound, boundIndex) => (
                              <div
                                  key={boundIndex}
                                  className="absolute border-2 pointer-events-none"
                                  style={{
                                      left: `${bound.x}px`,
                                      top: `${bound.y}px`,
                                      width: `${bound.width}px`,
                                      height: `${bound.height}px`,
                                      borderColor: activeHighlight.color,
                                      backgroundColor: hexToRgba(activeHighlight.color, 0.4)
                                  }}
                              />
                          ))}
                      </div>
                  )}
                </div>
            )}
        </div>
        <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1 p-1 bg-white/80 backdrop-blur-sm rounded-lg shadow-md">
            <button onClick={() => handleZoom(zoom - 0.15)} className="p-2 rounded-md hover:bg-gray-200 transition-colors" aria-label="縮小"><ZoomOutIcon/></button>
            <button onClick={handleResetZoom} className="p-2 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium" aria-label="倍率をリセット">
              倍率をリセット
            </button>
            <button onClick={() => handleZoom(zoom + 0.15)} className="p-2 rounded-md hover:bg-gray-200 transition-colors" aria-label="拡大"><ZoomInIcon/></button>
            <button onClick={() => setRotation(prev => (prev + 90) % 360)} className="p-2 rounded-md hover:bg-gray-200 transition-colors" aria-label="回転"><RotateIcon/></button>
        </div>
    </div>
  );
};
