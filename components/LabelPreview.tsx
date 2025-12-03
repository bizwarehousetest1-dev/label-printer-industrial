
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
  // CSS mm width logic.
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
        margin: 1,
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
        className={`${containerClass} bg-white text-black border-[3px] border-black relative overflow-hidden flex flex-col box-border font-farsi`}
        style={{ direction: 'rtl' }}
      >
        
        {/* TOP SECTION: Header | Barcode | QR */}
        <div className="flex border-b-[3px] border-black h-[32mm] w-full">
           
           {/* Right Side (Logo & Title) */}
           <div className="w-1/4 flex flex-col items-center justify-center text-center p-1 border-l-2 border-black">
              <div className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center mb-1">
                 {/* Stylized Post Logo (Bird shape approximation) */}
                 <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2 12l10-10 10 10-2 2-8-8-8 8-2-2z" />
                 </svg>
              </div>
              <span className="font-extrabold text-[10px] leading-tight">شرکت ملی پست</span>
           </div>

           {/* Center (Barcode & Title) */}
           <div className="w-2/4 flex flex-col items-center justify-start pt-1 border-l-2 border-black">
              <span className="font-extrabold text-[12px] mb-1">برچسب کد رهگیری و اعتبارسنجی 3PDL</span>
              <div className="w-full flex justify-center px-1">
                <svg ref={barcodeRef} className="w-full max-h-[20mm]"></svg>
              </div>
           </div>

           {/* Left Side (QR) */}
           <div className="w-1/4 flex flex-col items-center justify-center p-1">
              <canvas ref={qrRef} className="w-[18mm] h-[18mm]" />
              <span className="text-[8px] font-bold mt-1">Tracking.post.ir</span>
           </div>
        </div>

        {/* SENDER SECTION */}
        <div className="border-b-2 border-black p-2 text-right bg-white">
           <div className="flex items-start">
             <span className="font-extrabold text-xs ml-1 whitespace-nowrap">فرستنده:</span>
             <span className="font-bold text-xs">{data.senderName}</span>
           </div>
           <div className="flex items-start mt-1 leading-tight">
             <span className="font-extrabold text-[10px] ml-1">آدرس:</span>
             <span className="text-[10px] font-medium">{data.senderAddress}</span>
           </div>
        </div>

        {/* RECEIVER SECTION */}
        <div className="border-b-[3px] border-black p-2 bg-gray-50 flex-1 text-right">
           <div className="flex items-center mb-1">
             <span className="font-extrabold text-sm ml-1">گیرنده:</span>
             <span className="font-bold text-sm">{data.receiverCity} - {data.receiverName}</span>
           </div>
           <div className="text-xs font-bold leading-snug pr-1">
              {data.receiverAddress}
           </div>
        </div>

        {/* BOTTOM GRID */}
        <div className="grid grid-cols-10 h-[28mm] text-xs">
           
           {/* Sidebar: Order ID (Actually on the Left in LTR / End in RTL) - col-span-3 */}
           <div className="col-span-3 bg-black text-white flex flex-col items-center justify-between text-center py-2 px-1">
              <div>
                <div className="font-extrabold text-[11px] mb-1">انبار مکانیزه</div>
                <div className="font-bold text-[10px] text-amber-400">{data.customNote.split(' ')[1] || 'Bizmlm.ir'}</div>
              </div>
              
              <div className="flex flex-col items-center w-full">
                 <div className="font-mono text-[9px] font-bold">شناسه سفارش</div>
                 <div className="font-mono text-[11px] font-bold bg-white text-black px-1 rounded my-1 w-full">{data.orderId}</div>
              </div>

              <div className="flex flex-col w-full text-[9px] font-mono leading-tight">
                  <span>{data.date}</span>
                  <span>{data.time}</span>
              </div>
           </div>

           {/* Info Cells - col-span-7 */}
           <div className="col-span-7 grid grid-rows-3 text-black">
              
              {/* Row 1: Post Code */}
              <div className="border-b border-black flex items-center justify-between px-2 bg-white">
                 <div className="flex items-center">
                    <span className="font-extrabold mr-1">کد پستی:</span>
                 </div>
                 <span className="font-mono text-sm font-bold tracking-wider">{data.receiverPostCode}</span>
                 <span className="text-lg">✉</span>
              </div>
              
              {/* Row 2: Phone */}
              <div className="border-b border-black flex items-center justify-between px-2 bg-white">
                 <div className="flex items-center">
                    <span className="font-extrabold mr-1">تلفن:</span>
                 </div>
                 <span className="font-mono text-sm font-bold">{data.receiverPhone}</span>
                 <span className="text-lg">📱</span>
              </div>

              {/* Row 3: Weight & Price */}
              <div className="flex h-full">
                 {/* Weight */}
                 <div className="flex-1 border-l-2 border-black flex items-center justify-between px-2 bg-gray-100">
                     <div className="flex items-center gap-1 font-bold">
                        <span className="text-lg">⚖</span>
                        <span className="font-mono text-sm">{data.weight}</span> 
                        <span className="text-[10px]">گرم</span>
                     </div>
                 </div>
                 {/* Price */}
                 <div className="flex-[1.5] flex items-center justify-center px-1 text-center bg-white text-[10px] font-bold leading-tight">
                    <span>{data.price}</span>
                    <div className="border-2 border-black rounded-full w-5 h-5 flex items-center justify-center ml-1 text-xs">$</div>
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
