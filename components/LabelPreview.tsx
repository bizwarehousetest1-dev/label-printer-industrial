
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
  // CSS mm width logic. Tailwind arbitrary values work well here.
  const containerClass = isWide ? 'w-[100mm] h-[100mm]' : 'w-[80mm] h-[100mm]';
  
  // Update Barcode (Code 128)
  useEffect(() => {
    if (barcodeRef.current && data.barcode) {
      try {
        JsBarcode(barcodeRef.current, data.barcode, {
          format: "CODE128",
          lineColor: "#000",
          width: 2,
          height: 40,
          displayValue: true,
          fontSize: 14,
          margin: 5,
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
        width: 110,
        margin: 0,
        errorCorrectionLevel: 'M',
      }, (error) => {
        if (error) console.warn("QR generation failed", error);
      });
    }
  }, [data.qrData]);

  return (
    <div className="flex flex-col items-center justify-center h-full">
      
      {/* Label Container - Matches provided image layout */}
      <div 
        id="printable-label"
        className={`${containerClass} bg-white text-black border-2 border-black relative overflow-hidden flex flex-col box-border font-farsi`}
        style={{ direction: 'rtl' }}
      >
        
        {/* TOP SECTION: QR | Barcode | Logo */}
        <div className="flex border-b-2 border-black h-[35mm]">
           {/* Left (LTR view) - Actually Right in RTL: Logo & Text */}
           <div className="flex-1 p-2 flex flex-col items-center justify-center text-center">
              {/* Post Logo Placeholder - using generic shape */}
              <div className="w-10 h-10 border-2 border-black rounded-full flex items-center justify-center mb-1">
                 <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16.5l-3-3v-5l3-3v11zm-5-13.5l-4 4 4 4V3zM3 6.5l3 3v5l-3 3v-11zm5 13.5l4-4-4-4v8zM12 2l-6 6 6 6 6-6-6-6z"/></svg>
              </div>
              <span className="font-bold text-xs">شرکت ملی پست</span>
              <span className="font-bold text-[10px] mt-1">برچسب کد رهگیری</span>
           </div>

           {/* Center: Barcode */}
           <div className="flex-[2] flex flex-col items-center justify-center border-l-2 border-r-2 border-black px-1">
              <svg ref={barcodeRef} className="w-full h-full max-h-[25mm]"></svg>
           </div>

           {/* Right (LTR view) - Actually Left in RTL: QR */}
           <div className="flex-1 flex flex-col items-center justify-center p-2 text-center">
              <canvas ref={qrRef} className="w-[20mm] h-[20mm] mb-1" />
              <span className="text-[9px] font-bold">Tracking.post.ir</span>
           </div>
        </div>

        {/* SENDER SECTION (Ferestande) */}
        <div className="border-b border-black p-2 text-right">
           <div className="text-xs font-bold mb-1">
              <span className="ml-1">فرستنده:</span>
              <span className="font-normal">{data.senderName}</span>
           </div>
           <div className="text-[10px] leading-tight">
              <span className="font-bold ml-1">آدرس:</span>
              <span>{data.senderAddress}</span>
           </div>
        </div>

        {/* RECEIVER SECTION (Girande) */}
        <div className="border-b-2 border-black p-2 bg-gray-50 flex-1 text-right">
           <div className="text-sm font-bold mb-1">
              <span className="ml-1">گیرنده:</span>
              <span className="font-normal">{data.receiverCity} - {data.receiverName}</span>
           </div>
           <div className="text-xs leading-snug font-bold">
              {data.receiverAddress}
           </div>
           <div className="mt-2 text-[10px]">
              کد پستی: <span className="font-mono text-sm mx-1">{data.receiverPostCode}</span>
           </div>
        </div>

        {/* BOTTOM GRID */}
        <div className="grid grid-cols-4 h-[25mm] text-xs">
           
           {/* Sidebar: Order ID / Custom Note */}
           <div className="col-span-1 bg-black text-white flex flex-col items-center justify-center text-center p-1">
              <div className="font-bold mb-1 text-[10px]">انبار مکانیزه</div>
              <div className="font-bold text-[11px] mb-2">{data.customNote.split(' ')[0]}</div>
              <div className="text-[9px] font-mono rotate-0 whitespace-nowrap">{data.orderId}</div>
              <div className="mt-auto text-[9px] font-mono">{data.time}</div>
              <div className="text-[9px] font-mono">{data.date}</div>
           </div>

           {/* Info Cells */}
           <div className="col-span-3 grid grid-rows-3">
              {/* Row 1: Receiver Details */}
              <div className="border-b border-l border-black flex items-center px-2">
                 <span className="font-bold ml-2 w-16">گیرنده:</span>
                 <span className="truncate">{data.receiverName}</span>
                 {/* Postal Icon placeholder */}
                 <span className="mr-auto text-xl">✉</span>
                 <span className="mr-1 font-mono text-sm">{data.receiverPostCode}</span>
              </div>
              
              {/* Row 2: Phone */}
              <div className="border-b border-l border-black flex items-center px-2">
                 <span className="font-bold ml-2 w-16">تلفن:</span>
                 <span className="font-mono text-sm">{data.receiverPhone}</span>
                 <span className="mr-auto text-lg">📱</span>
              </div>

              {/* Row 3: Weight & Price */}
              <div className="border-l border-black flex items-center px-2 bg-gray-100">
                 <span className="mr-auto text-lg font-bold flex items-center gap-1">
                    <span>⚖</span>
                    <span className="font-mono">{data.weight}</span> 
                    <span className="text-[10px]">گرم</span>
                 </span>
                 <div className="flex items-center gap-1 border-r border-gray-400 pr-2 h-full">
                    <span className="text-[10px] font-bold">هزینه:</span>
                    <span className="font-bold text-[10px]">{data.price}</span>
                 </div>
              </div>
           </div>
        </div>

      </div>
      
      <div className="mt-2 text-slate-500 text-xs font-mono">
         {isWide ? '100mm x 100mm' : '80mm x 100mm'}
      </div>
    </div>
  );
};
