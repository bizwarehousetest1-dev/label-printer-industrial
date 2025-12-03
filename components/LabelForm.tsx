import React, { useState } from 'react';
import { LabelData, LabelSize } from '../types';
import { generateProductDescription, translateToPersian } from '../utils/gemini';

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
  const [loadingAi, setLoadingAi] = useState<string | null>(null);

  const handleChange = (field: keyof LabelData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const handleAiTranslate = async () => {
    if (!data.productName && !data.description) {
      onLog("Enter product name or description first.", 'warning');
      return;
    }
    setLoadingAi('translate');
    try {
      const textToTranslate = data.description || data.productName;
      const translated = await translateToPersian(textToTranslate);
      handleChange('persianText', translated);
      onLog("Translated successfully via Gemini.", 'success');
    } catch (e) {
      onLog("Translation failed. Check API Key.", 'error');
    } finally {
      setLoadingAi(null);
    }
  };

  const handleAiGenerate = async () => {
    if (!data.productName) {
      onLog("Enter product name first.", 'warning');
      return;
    }
    setLoadingAi('generate');
    try {
      const desc = await generateProductDescription(data.productName);
      handleChange('description', desc);
      onLog("Description generated via Gemini.", 'success');
    } catch (e) {
      onLog("Generation failed. Check API Key.", 'error');
    } finally {
      setLoadingAi(null);
    }
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-xl h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-amber-500 uppercase tracking-widest">Label Configuration</h2>
        
        {/* Size Selector */}
        <div className="flex bg-slate-900 rounded p-1 border border-slate-700">
          <button
            onClick={() => onSizeChange(LabelSize.SIZE_80_100)}
            className={`px-3 py-1 text-xs font-bold rounded ${currentSize === LabelSize.SIZE_80_100 ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            80x100
          </button>
          <button
            onClick={() => onSizeChange(LabelSize.SIZE_100_100)}
            className={`px-3 py-1 text-xs font-bold rounded ${currentSize === LabelSize.SIZE_100_100 ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            100x100
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Product & Batch */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">PRODUCT NAME *</label>
            <input
              type="text"
              value={data.productName}
              onChange={(e) => handleChange('productName', e.target.value)}
              className={`w-full bg-slate-900 border rounded px-3 py-2 text-white focus:border-amber-500 outline-none ${!data.productName ? 'border-red-900' : 'border-slate-600'}`}
              placeholder="Required"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">BATCH NO</label>
            <input
              type="text"
              value={data.batchNumber}
              onChange={(e) => handleChange('batchNumber', e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:border-amber-500 outline-none"
            />
          </div>
        </div>

        {/* Date & Quantity */}
        <div className="grid grid-cols-2 gap-4">
          <div>
             <label className="block text-xs font-mono text-slate-400 mb-1">PROD. DATE</label>
             <input
              type="date"
              value={data.productionDate}
              onChange={(e) => handleChange('productionDate', e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:border-amber-500 outline-none"
             />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">WEIGHT *</label>
              <input
                type="text"
                value={data.weight}
                onChange={(e) => handleChange('weight', e.target.value)}
                className={`w-full bg-slate-900 border rounded px-3 py-2 text-amber-400 font-bold focus:border-amber-500 outline-none ${parseFloat(data.weight) <= 0 ? 'border-red-900' : 'border-slate-600'}`}
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">UNIT</label>
              <select
                value={data.unit}
                onChange={(e) => handleChange('unit', e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:border-amber-500 outline-none appearance-none"
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="lb">lb</option>
              </select>
            </div>
          </div>
        </div>

        {/* Description & AI */}
        <div>
           <div className="flex justify-between items-end mb-1">
             <label className="block text-xs font-mono text-slate-400">DESCRIPTION</label>
             <button
                onClick={handleAiGenerate}
                disabled={!!loadingAi}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 disabled:opacity-50"
             >
               {loadingAi === 'generate' ? 'Thinking...' : '✨ AI Auto-Write'}
             </button>
           </div>
           <textarea
             rows={2}
             value={data.description}
             onChange={(e) => handleChange('description', e.target.value)}
             className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:border-amber-500 outline-none text-sm"
           />
        </div>

        {/* Persian Text & AI */}
        <div>
           <div className="flex justify-between items-end mb-1">
             <label className="block text-xs font-mono text-slate-400">PERSIAN TEXT (RTL)</label>
             <button
                onClick={handleAiTranslate}
                disabled={!!loadingAi}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 disabled:opacity-50"
             >
                {loadingAi === 'translate' ? 'Translating...' : '🌐 AI Translate'}
             </button>
           </div>
           <input
             type="text"
             dir="rtl"
             value={data.persianText}
             onChange={(e) => handleChange('persianText', e.target.value)}
             className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white font-farsi focus:border-amber-500 outline-none"
             placeholder="متن فارسی"
           />
        </div>

        {/* Codes */}
        <div className="grid grid-cols-2 gap-4">
           <div>
             <label className="block text-xs font-mono text-slate-400 mb-1">BARCODE (128)</label>
             <input
               type="text"
               value={data.barcode}
               onChange={(e) => handleChange('barcode', e.target.value)}
               className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:border-amber-500 outline-none font-mono text-sm"
             />
           </div>
           <div>
             <label className="block text-xs font-mono text-slate-400 mb-1">QR CONTENT</label>
             <input
               type="text"
               value={data.qrData}
               onChange={(e) => handleChange('qrData', e.target.value)}
               className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:border-amber-500 outline-none font-mono text-sm"
             />
           </div>
        </div>

      </div>
    </div>
  );
};