import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { LabelData, LabelSize } from '../types';

interface LabelPreviewProps {
  data: LabelData;
  size: LabelSize;
}

export const LabelPreview: React.FC<LabelPreviewProps> = ({ data, size }) => {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  const isWide = size === LabelSize.SIZE_100_100;
  // Approximating screen pixels for mm (3.78 px per mm approx, scaled down for view)
  const widthClass = isWide ? 'w-[100mm]' : 'w-[80mm]';
  
  // Update Barcode
  useEffect(() => {
    if (barcodeRef.current && data.barcode) {
      try {
        JsBarcode(barcodeRef.current, data.barcode, {
          format: "CODE128",
          lineColor: "#000",
          width: 2,
          height: 50,
          displayValue: true,
          fontSize: 12,
          margin: 0,
        });
      } catch (e) {
        console.warn("Barcode generation failed", e);
      }
    }
  }, [data.barcode]);

  // Update QR Code
  useEffect(() => {
    if (qrRef.current && data.qrData) {
      QRCode.toCanvas(qrRef.current, data.qrData, {
        width: 100,
        margin: 0,
        errorCorrectionLevel: 'M',
      }, (error) => {
        if (error) console.warn("QR generation failed", error);
      });
    }
  }, [data.qrData]);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-800 p-6 rounded-lg border-2 border-dashed border-slate-600">
      <div className="mb-4 text-slate-400 text-sm font-mono">
        PREVIEW ({isWide ? '100mm x 100mm' : '80mm x 100mm'})
      </div>
      
      {/* Label Container - White paper look */}
      <div 
        id="printable-label"
        className={`${widthClass} h-[100mm] bg-white text-black p-4 shadow-2xl relative overflow-hidden flex flex-col`}
        style={{ 
          // Scale transform for fitting in UI if needed, usually CSS zoom or transform
          // For now relying on the container constraints
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4 border-b-2 border-black pb-2">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-tight leading-none">{data.productName || 'PRODUCT NAME'}</h1>
            <div className="text-sm font-mono mt-1">BATCH: {data.batchNumber}</div>
          </div>
          <div className="text-right">
             <div className="text-xs font-mono">DATE</div>
             <div className="font-bold">{data.productionDate}</div>
          </div>
        </div>

        {/* Middle Section */}
        <div className="flex-1 grid grid-cols-2 gap-4">
          <div className="flex flex-col justify-center">
             <div className="text-4xl font-black font-mono tracking-tighter">
               {data.weight} <span className="text-lg font-normal text-gray-600">{data.unit}</span>
             </div>
             <div className="text-xs uppercase text-gray-500 mt-1">Net Weight</div>
             
             {/* Persian Text Support (RTL) */}
             {data.persianText && (
               <div className="mt-4 font-farsi text-right text-lg border-r-4 border-black pr-2 bg-gray-100 py-1" dir="rtl">
                 {data.persianText}
               </div>
             )}
          </div>
          
          <div className="flex flex-col items-center justify-center border-l-2 border-gray-200 pl-2">
             <canvas ref={qrRef} className="w-24 h-24 mb-2" />
             <div className="text-[10px] text-center break-all leading-tight text-gray-500 w-full px-2">
               {data.qrData}
             </div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-4 text-sm font-medium leading-snug bg-gray-50 p-2 rounded">
          {data.description || 'Product description area...'}
        </div>

        {/* Footer Barcode */}
        <div className="mt-auto flex justify-center w-full pt-2 border-t-2 border-black">
          <svg ref={barcodeRef} className="w-full max-w-full h-12"></svg>
        </div>
      </div>
    </div>
  );
};