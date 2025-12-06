
import React, { useState } from 'react';
import { LabelData, LabelSize } from '../types';
import { translateToPersian } from '../utils/gemini';

interface LabelFormProps {
  data: LabelData;
  onChange: (data: LabelData) => void;
  onSizeChange: (size: LabelSize) => void;
  currentSize: LabelSize;
  onLog: (msg: string, type: 'info' | 'error' | 'success' | 'warning') => void;
}

export const LabelForm: React.FC<LabelFormProps> = ({ 
  data, onChange, onSizeChange, currentSize, onLog 
}) => {
  const [loadingAi, setLoadingAi] = useState<boolean>(false);

  const handleChange = (field: keyof LabelData, value: string) => {
    const updates: Partial<LabelData> = { [field]: value };
    // Auto-update barcode/QR when tracking number changes
    if (field === 'trackingNumber') {
      updates.barcode = value;
      updates.qrData = `https://tracking.post.ir/?id=${value}`;
    }
    onChange({ ...data, ...updates });
  };

  const getSizeLabel = (size: LabelSize) => {
    switch(size) {
      case LabelSize.SIZE_100_80: return '100 x 80 mm';
      case LabelSize.SIZE_100_100: return '100 x 100 mm';
      case LabelSize.SIZE_80_100: return '80 x 100 mm';
    }
  }

  return (
    <div className="bg-slate-900 h-full overflow-y-auto custom-scrollbar p-6 space-y-6">
      
      {/* Top Controls */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
           <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
           </svg>
           SHIPMENT DATA
        </h2>
        
        {/* Size Toggle */}
        <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
          {[LabelSize.SIZE_100_80, LabelSize.SIZE_100_100, LabelSize.SIZE_80_100].map((size) => (
            <button
              key={size}
              onClick={() => onSizeChange(size)}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                currentSize === size 
                  ? 'bg-slate-800 text-amber-500 shadow-sm border border-slate-700' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {getSizeLabel(size)}
            </button>
          ))}
        </div>
      </div>

      {/* TRACKING CARD */}
      <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
        <label className="block text-[10px] font-bold text-amber-500 mb-2 tracking-widest uppercase">Tracking Number / Barcode</label>
        <input
            type="text"
            value={data.trackingNumber}
            onChange={(e) => handleChange('trackingNumber', e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white font-mono text-lg tracking-wider focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all placeholder-slate-700"
            placeholder="Scan or enter tracking..."
        />
      </div>

      {/* SENDER CARD */}
      <div className="bg-slate-800/20 p-5 rounded-xl border border-slate-800">
        <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
           </svg>
           Sender (Ferestande)
        </h3>
        <div className="space-y-3">
            <input
              type="text"
              dir="rtl"
              placeholder="Sender Name"
              value={data.senderName}
              onChange={(e) => handleChange('senderName', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white font-farsi text-sm focus:border-slate-500 outline-none"
            />
            <textarea
              dir="rtl"
              placeholder="Sender Address"
              rows={2}
              value={data.senderAddress}
              onChange={(e) => handleChange('senderAddress', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white font-farsi text-xs focus:border-slate-500 outline-none resize-none"
            />
        </div>
      </div>

      {/* RECEIVER CARD */}
      <div className="bg-slate-800/20 p-5 rounded-xl border border-slate-800">
        <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
           </svg>
           Receiver (Girande)
        </h3>
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
               <input
                 type="text"
                 dir="rtl"
                 placeholder="Full Name"
                 value={data.receiverName}
                 onChange={(e) => handleChange('receiverName', e.target.value)}
                 className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white font-farsi text-sm focus:border-slate-500 outline-none"
               />
               <input
                 type="text"
                 dir="rtl"
                 placeholder="City"
                 value={data.receiverCity}
                 onChange={(e) => handleChange('receiverCity', e.target.value)}
                 className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white font-farsi text-sm focus:border-slate-500 outline-none"
               />
            </div>
            <textarea
              dir="rtl"
              placeholder="Address details..."
              rows={3}
              value={data.receiverAddress}
              onChange={(e) => handleChange('receiverAddress', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white font-farsi text-xs focus:border-slate-500 outline-none resize-none"
            />
            
            <div className="grid grid-cols-2 gap-3">
               <div className="relative">
                  <label className="absolute -top-1.5 right-2 bg-slate-900 px-1 text-[9px] text-slate-500">Post Code</label>
                  <input
                    type="text"
                    value={data.receiverPostCode}
                    onChange={(e) => handleChange('receiverPostCode', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white font-mono text-sm focus:border-slate-500 outline-none"
                  />
               </div>
               <div className="relative">
                  <label className="absolute -top-1.5 right-2 bg-slate-900 px-1 text-[9px] text-slate-500">Order ID</label>
                  <input
                    type="text"
                    value={data.orderId}
                    onChange={(e) => handleChange('orderId', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white font-mono text-sm focus:border-slate-500 outline-none"
                  />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Phone"
                value={data.receiverPhone}
                onChange={(e) => handleChange('receiverPhone', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white font-mono text-sm focus:border-slate-500 outline-none"
              />
              <input
                type="text"
                placeholder="Mobile"
                value={data.receiverMobile}
                onChange={(e) => handleChange('receiverMobile', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white font-mono text-sm focus:border-slate-500 outline-none"
              />
            </div>
        </div>
      </div>

      {/* METRICS CARD */}
      <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50 grid grid-cols-2 gap-6">
           <div className="relative group">
              <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-bold uppercase">
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
                Weight (g)
              </div>
              <input
                type="text"
                value={data.weight}
                onChange={(e) => handleChange('weight', e.target.value)}
                className="w-full bg-slate-950 border border-slate-600 rounded-lg px-3 py-2 text-emerald-400 font-bold font-mono text-xl focus:border-emerald-500 focus:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all outline-none"
              />
           </div>
           <div>
              <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-bold uppercase">
                Status
              </div>
              <input
                 type="text"
                 dir="rtl"
                 value={data.price}
                 onChange={(e) => handleChange('price', e.target.value)}
                 className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-farsi text-sm focus:border-slate-500 outline-none"
              />
           </div>
      </div>

    </div>
  );
};
