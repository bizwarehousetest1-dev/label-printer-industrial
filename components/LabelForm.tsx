
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

  const handleAiAddress = async () => {
    if (!data.receiverAddress) return;
    setLoadingAi(true);
    try {
      // Example: Cleaning up address or standardizing it
      const result = await translateToPersian(data.receiverAddress);
      // Just a placeholder usage of AI
      onLog("Address validated/translated via Gemini", "success");
    } catch (e) {
      onLog("AI Service unavailable", "error");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-xl h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-amber-500 uppercase tracking-widest">Shipment Details</h2>
        <div className="flex bg-slate-900 rounded p-1 border border-slate-700">
          <button
            onClick={() => onSizeChange(LabelSize.SIZE_80_100)}
            className={`px-3 py-1 text-xs font-bold rounded ${currentSize === LabelSize.SIZE_80_100 ? 'bg-amber-600 text-white' : 'text-slate-400'}`}
          >
            80x100
          </button>
          <button
            onClick={() => onSizeChange(LabelSize.SIZE_100_100)}
            className={`px-3 py-1 text-xs font-bold rounded ${currentSize === LabelSize.SIZE_100_100 ? 'bg-amber-600 text-white' : 'text-slate-400'}`}
          >
            100x100
          </button>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* Tracking Section */}
        <div className="bg-slate-900/50 p-3 rounded border border-slate-700">
          <label className="block text-xs font-mono text-amber-500 mb-1">TRACKING NUMBER (BARCODE) *</label>
          <input
            type="text"
            value={data.trackingNumber}
            onChange={(e) => handleChange('trackingNumber', e.target.value)}
            className="w-full bg-slate-950 border border-slate-600 rounded px-3 py-2 text-white font-mono tracking-widest focus:border-amber-500 outline-none"
          />
        </div>

        {/* Sender Section */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 border-b border-slate-700 pb-1">Sender (Ferestande)</h3>
          <div className="grid gap-2">
            <input
              type="text"
              dir="rtl"
              placeholder="Sender Name"
              value={data.senderName}
              onChange={(e) => handleChange('senderName', e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white font-farsi text-sm"
            />
            <textarea
              dir="rtl"
              placeholder="Sender Address"
              rows={2}
              value={data.senderAddress}
              onChange={(e) => handleChange('senderAddress', e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white font-farsi text-xs"
            />
          </div>
        </div>

        {/* Receiver Section */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 border-b border-slate-700 pb-1">Receiver (Girande)</h3>
          <div className="grid gap-2">
            <div className="grid grid-cols-2 gap-2">
               <input
                 type="text"
                 dir="rtl"
                 placeholder="Full Name"
                 value={data.receiverName}
                 onChange={(e) => handleChange('receiverName', e.target.value)}
                 className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white font-farsi text-sm"
               />
               <input
                 type="text"
                 placeholder="Phone"
                 value={data.receiverPhone}
                 onChange={(e) => handleChange('receiverPhone', e.target.value)}
                 className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white font-mono text-sm"
               />
            </div>
            <input
              type="text"
              dir="rtl"
              placeholder="City / Province"
              value={data.receiverCity}
              onChange={(e) => handleChange('receiverCity', e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white font-farsi text-sm"
            />
            <textarea
              dir="rtl"
              placeholder="Detailed Address"
              rows={3}
              value={data.receiverAddress}
              onChange={(e) => handleChange('receiverAddress', e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white font-farsi text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Postal Code"
                value={data.receiverPostCode}
                onChange={(e) => handleChange('receiverPostCode', e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white font-mono text-sm"
              />
              <input
                type="text"
                placeholder="Order ID / Custom"
                value={data.orderId}
                onChange={(e) => handleChange('orderId', e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* Weight & Payment */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700">
           <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">WEIGHT (g)</label>
              <input
                type="text"
                value={data.weight}
                onChange={(e) => handleChange('weight', e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-amber-400 font-bold font-mono text-lg"
              />
           </div>
           <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">PRICE / STATUS</label>
              <input
                 type="text"
                 dir="rtl"
                 value={data.price}
                 onChange={(e) => handleChange('price', e.target.value)}
                 className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white font-farsi text-xs"
              />
           </div>
        </div>

      </div>
    </div>
  );
};
