
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

  // Dimension Logic
  const is100x80 = size === LabelSize.SIZE_100_80;
  const is100x100 = size === LabelSize.SIZE_100_100;
  
  let containerClass = 'w-[80mm] h-[100mm]';
  if (is100x100) containerClass = 'w-[100mm] h-[100mm]';
  if (is100x80) containerClass = 'w-[100mm] h-[80mm]';
  
  // Update Barcode (Code 128)
  useEffect(() => {
    if (barcodeRef.current && data.barcode) {
      try {
        JsBarcode(barcodeRef.current, data.barcode, {
          format: "CODE128",
          lineColor: "#000",
          width: 1.8, // Slightly wider for better readability
          height: 40, // Taller to fill center
          displayValue: true,
          fontSize: 14, // Bigger font
          fontOptions: "bold",
          margin: 0,
          textMargin: 2
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
        width: 55, // Smaller generation size
        margin: 0,
        errorCorrectionLevel: 'M',
      }, (error) => {
        if (error) console.warn("QR generation failed", error);
      });
    }
  }, [data.qrData]);

  return (
    <div className="flex flex-col items-center justify-center h-full select-none">
      
      {/* Label Container */}
      <div 
        id="printable-label"
        className={`${containerClass} bg-white text-black border-[1px] border-black relative overflow-hidden flex flex-row-reverse box-border font-farsi`}
        style={{ direction: 'rtl', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
      >
        
        {/* COLUMN A (Sidebar) - 1/4 Width */}
        <div className="w-[26%] h-full flex flex-col border-l-2 border-black items-center py-2 shrink-0 justify-between bg-white">
           
           <div className="flex flex-col items-center w-full">
               {/* QR Code (Moved Here) */}
               <canvas ref={qrRef} className="w-[14mm] h-[14mm] mb-0.5" />
               <div className="text-[8px] font-bold leading-none text-center">رهگیری در سایت</div>
               <div className="text-[6px] font-mono leading-none text-center mt-0.5 mb-2">tracking.post.ir</div>

               {/* Black Box */}
               <div className="bg-black text-white w-[90%] text-center py-1.5 mb-2">
                  <div className="font-bold text-[10px]">انبار مکانیزه</div>
               </div>
               
               {/* BIZ Link */}
               <div className="text-[11px] font-bold font-mono">bizmlm.ir</div>
           </div>

           <div className="w-full px-2 flex flex-col justify-end text-center pb-1">
              <div className="text-[10px] font-bold mb-0.5 text-center w-full">شناسه سفارش:</div>
              <div className="border border-black p-1 font-mono text-[11px] font-bold break-all mb-1 text-center bg-slate-50">
                 {data.orderId}
              </div>
              <div className="text-[9px] font-mono leading-tight text-slate-800 flex flex-col items-center gap-0.5 mt-1">
                 <span>{data.date}</span>
                 <span>{data.time}</span>
              </div>
           </div>
        </div>

        {/* COLUMN B (Main) - 3/4 Width */}
        <div className="w-[74%] h-full flex flex-col">
           
           {/* SECTION 1: Header (Row 1) */}
           {/* DOM Order: Logo (Right), Barcode (Left/Center) in RTL */}
           <div className="flex h-[24mm] border-b-2 border-black shrink-0 items-center justify-between">
              
              {/* 1. Logos (Rightmost) */}
              <div className="w-[18mm] h-full flex flex-col items-center justify-center p-1 border-l-2 border-black">
                 <div className="flex flex-col items-center">
                     <svg className="w-8 h-8 text-black" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2 12l10-10 10 10-2 2-8-8-8 8-2-2z" />
                     </svg>
                     <span className="text-[7px] font-bold mt-1 text-center leading-tight">شرکت ملی پست</span>
                 </div>
              </div>

              {/* 2. Barcode (Expanded to fill left space) */}
              <div className="flex-1 h-full flex flex-col items-center justify-center p-1 overflow-hidden">
                 <div className="flex items-center justify-center w-full h-full transform scale-95 origin-center">
                    <svg ref={barcodeRef} className="max-w-full max-h-full"></svg>
                 </div>
              </div>

           </div>

           {/* SECTION 2: Sender */}
           <div className="h-[13mm] border-b-2 border-black p-1.5 px-3 flex flex-col justify-center shrink-0 bg-slate-50/50">
               <div className="text-[11px] truncate">
                  <span className="font-bold">فرستنده: </span>
                  <span>{data.senderName}</span>
               </div>
               <div className="text-[10px] mt-1 leading-tight line-clamp-2">
                  <span className="font-bold">آدرس: </span>
                  <span>{data.senderAddress}</span>
               </div>
           </div>

           {/* SECTION 3: Receiver */}
           <div className="flex-1 p-1.5 px-3 border-b-2 border-black flex flex-col justify-center">
               <div className="text-[12px] mb-1">
                  <span className="font-bold">گیرنده: </span>
                  <span className="font-bold">{data.receiverCity}</span>
               </div>
               <div className="text-[11px] leading-snug">
                  {data.receiverAddress}
               </div>
           </div>

           {/* SECTION 4: Grid Details */}
           <div className="h-[24mm] grid grid-cols-2 text-[11px] shrink-0">
               
               {/* Col A */}
               <div className="border-l-2 border-black p-1 px-2 flex flex-col justify-between">
                  <div className="flex justify-between items-center border-b border-black pb-0.5 h-1/3">
                     <span className="font-bold">{data.receiverName}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-black py-0.5 h-1/3">
                     <span>تلفن:</span>
                     <span className="font-mono font-bold">{data.receiverPhone}</span>
                  </div>
                  <div className="flex justify-between items-center pt-0.5 font-bold h-1/3">
                     <span>وزن:</span>
                     <div className="flex items-baseline gap-1">
                        <span className="font-mono text-lg">{data.weight}</span>
                        <span className="text-[9px]">گرم</span>
                     </div>
                  </div>
               </div>

               {/* Col B */}
               <div className="p-1 px-2 flex flex-col justify-between">
                   <div className="flex justify-between items-center border-b border-black pb-0.5 h-1/3">
                     <span className="font-mono font-bold tracking-wider">{data.receiverPostCode}</span>
                     <span className="text-[9px]">کدپستی</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-black py-0.5 h-1/3">
                     <span>موبایل:</span>
                     <span className="font-mono font-bold">{data.receiverMobile}</span>
                  </div>
                  <div className="text-[9px] text-center pt-1 font-bold h-1/3 flex items-center justify-center">
                     طبق توافق پرداخت شده
                  </div>
               </div>

           </div>
        </div>

      </div>
      
      <div className="mt-3 text-slate-500 text-xs font-mono">
         {containerClass.match(/w-\[(.*?)\]/)?.[1]} x {containerClass.match(/h-\[(.*?)\]/)?.[1]}
      </div>
    </div>
  );
};
