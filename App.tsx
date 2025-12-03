import React, { useState, useEffect, useRef } from 'react';
import { LabelForm } from './components/LabelForm';
import { LabelPreview } from './components/LabelPreview';
import { LogPanel } from './components/LogPanel';
import { LabelData, LabelSize, LogEntry, SerialDevice, PrinterType } from './types';
import { generateTSPL } from './utils/tspl';
import html2canvas from 'html2canvas';

// Helper to generate unique ID
const uuid = () => Math.random().toString(36).substring(2, 9);

function App() {
  // --- State ---
  const [labelData, setLabelData] = useState<LabelData>({
    productName: 'INDUSTRIAL SOLVENT X',
    batchNumber: 'BATCH-001',
    weight: '0.00',
    unit: 'kg',
    productionDate: new Date().toISOString().split('T')[0],
    description: 'High grade industrial solvent for machinery.',
    barcode: '123456789',
    qrData: 'https://example.com/product/123',
    persianText: 'حلال صنعتی',
  });
  
  const [labelSize, setLabelSize] = useState<LabelSize>(LabelSize.SIZE_80_100);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [scaleDevice, setScaleDevice] = useState<SerialDevice>({ port: null, status: 'disconnected', baudRate: 19200 });
  const [printerDevice, setPrinterDevice] = useState<SerialDevice>({ port: null, status: 'disconnected', baudRate: 9600 });
  const [printerType, setPrinterType] = useState<PrinterType>(PrinterType.SYSTEM);
  const [scaleReader, setScaleReader] = useState<ReadableStreamDefaultReader<string> | null>(null);

  // --- Logging Helper ---
  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev.slice(-49), { // Keep last 50 logs
      id: uuid(),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    }]);
  };

  // --- Startup Auto-Discovery ---
  useEffect(() => {
    const checkPorts = async () => {
      if (navigator.serial) {
        try {
          const ports = await navigator.serial.getPorts();
          if (ports.length > 0) {
             addLog(`System: Found ${ports.length} authorized serial port(s).`, 'info');
             // Optionally we could try to auto-connect to the first one as scale if it matches criteria
             // But safer to let user click connect to choose purpose
          }
        } catch (e) {
          console.error("Serial access error", e);
        }
      } else {
        addLog("Web Serial API not supported in this environment.", 'warning');
      }
    };
    checkPorts();
  }, []);

  // --- Scale Logic ---
  const connectScale = async () => {
    if (!navigator.serial) {
      addLog("Web Serial API not supported.", 'error');
      return;
    }
    try {
      addLog("Requesting Scale Port...", 'info');
      // Filter for common scales? usually raw CDC
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: scaleDevice.baudRate });
      
      setScaleDevice(prev => ({ ...prev, port, status: 'connected' }));
      addLog("Scale Connected!", 'success');
      
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = port.readable!.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      setScaleReader(reader);

      readScaleData(reader);
    } catch (err: any) {
      addLog(`Scale Connection Failed: ${err.message}`, 'error');
    }
  };

  const readScaleData = async (reader: ReadableStreamDefaultReader<string>) => {
    try {
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          // Simple parsing logic: assume scale sends line by line or frames
          // Looking for simple number patterns like " 12.50 kg"
          // This regex is generic for example purposes
          const lines = buffer.split(/[\r\n]+/);
          if (lines.length > 1) {
             const completeLine = lines[0];
             buffer = lines.slice(1).join('\n');
             
             // Try to extract weight
             const match = completeLine.match(/([0-9]+\.[0-9]+)/);
             if (match) {
               setLabelData(prev => ({ ...prev, weight: match[1] }));
               addLog(`Weight Received: ${match[1]}`, 'data');
             }
          }
        }
      }
    } catch (err) {
      console.error(err);
      addLog("Scale Read Error", 'error');
    }
  };

  const disconnectScale = async () => {
    if (scaleReader) {
      await scaleReader.cancel();
      setScaleReader(null);
    }
    if (scaleDevice.port) {
      await scaleDevice.port.close();
      setScaleDevice(prev => ({ ...prev, port: null, status: 'disconnected' }));
      addLog("Scale Disconnected", 'info');
    }
  };

  // --- Printer Logic (Web Serial for TSPL) ---
  const connectPrinter = async () => {
     if (!navigator.serial) return;
     try {
       addLog("Requesting Printer Port...", 'info');
       const port = await navigator.serial.requestPort();
       await port.open({ baudRate: 9600 }); // Standard TSPL baud
       setPrinterDevice({ port, status: 'connected', baudRate: 9600 });
       addLog("TSPL Printer Connected", 'success');
     } catch (err: any) {
       addLog(`Printer Connection Failed: ${err.message}`, 'error');
     }
  };

  const validateForm = (): boolean => {
    if (!labelData.productName.trim()) {
      addLog("Validation Error: Product Name is required.", 'error');
      return false;
    }
    if (parseFloat(labelData.weight) <= 0 && labelData.weight !== '') {
       addLog("Validation Error: Weight must be greater than 0.", 'warning');
       // Not returning false here to allow manual override, just warning
    }
    return true;
  };

  const printLabel = async () => {
    if (!validateForm()) return;

    if (printerType === PrinterType.SYSTEM) {
      // Browser Print
      addLog("Initiating System Print...", 'info');
      window.print();
      addLog("Sent to System Spooler", 'success');
    } else {
      // Serial TSPL Print
      if (!printerDevice.port || printerDevice.status !== 'connected') {
        addLog("Serial Printer not connected!", 'error');
        return;
      }
      
      try {
        const tspl = generateTSPL(labelData, labelSize);
        const encoder = new TextEncoder();
        const writer = printerDevice.port.writable!.getWriter();
        await writer.write(encoder.encode(tspl));
        writer.releaseLock();
        addLog("TSPL Command Sent", 'success');
      } catch (err: any) {
        addLog(`Print Failed: ${err.message}`, 'error');
      }
    }
  };

  // --- Export Logic ---
  const exportAsImage = async () => {
    if (!validateForm()) return;
    
    const element = document.getElementById('printable-label');
    if (!element) return;
    try {
      addLog("Capturing preview...", 'info');
      const canvas = await html2canvas(element, { scale: 3 }); // High Res
      const link = document.createElement('a');
      link.download = `Label_${labelData.productName.replace(/\s+/g, '_')}_${labelData.batchNumber}.png`;
      link.href = canvas.toDataURL();
      link.click();
      addLog("Label exported as PNG", 'success');
    } catch (e) {
      addLog("Export failed", 'error');
    }
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-slate-900 text-slate-100">
      {/* Top Bar / Header */}
      <header className="h-14 bg-slate-950 border-b border-slate-700 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center font-bold text-slate-900">LP</div>
           <h1 className="font-bold text-lg tracking-tight">INDUSTRIAL <span className="text-amber-500">LABEL</span> MASTER</h1>
        </div>
        
        {/* Hardware Status Indicators */}
        <div className="flex items-center gap-4">
           {/* Scale Status */}
           <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded border border-slate-800">
             <div className={`w-2 h-2 rounded-full ${scaleDevice.status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
             <span className="text-xs font-mono text-slate-400">SCALE: {scaleDevice.status === 'connected' ? 'ONLINE' : 'OFFLINE'}</span>
             {scaleDevice.status === 'disconnected' ? (
                <button onClick={connectScale} className="text-xs bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded border border-slate-600">CONN</button>
             ) : (
                <button onClick={disconnectScale} className="text-xs text-red-400 hover:text-red-300 ml-1">DISC</button>
             )}
           </div>

           {/* Printer Status */}
           <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded border border-slate-800">
             <div className={`w-2 h-2 rounded-full ${printerDevice.status === 'connected' ? 'bg-green-500' : 'bg-slate-600'}`} />
             <select 
               value={printerType} 
               onChange={(e) => setPrinterType(e.target.value as PrinterType)}
               className="bg-transparent text-xs font-mono text-slate-400 outline-none border-none cursor-pointer"
             >
               <option value={PrinterType.SYSTEM}>SYS / USB</option>
               <option value={PrinterType.SERIAL_TSPL}>SERIAL TSPL</option>
             </select>
             
             {printerType === PrinterType.SERIAL_TSPL && (
                printerDevice.status === 'disconnected' ? (
                  <button onClick={connectPrinter} className="text-xs bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded border border-slate-600">CONN</button>
                ) : printerDevice.status === 'connected' ? (
                  <span className="text-xs text-green-500">READY</span>
                ) : null
             )}
           </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
        
        {/* Left Side: Preview (55%) approx - col-span-7 */}
        <section className="col-span-12 md:col-span-7 bg-slate-900 p-6 flex flex-col gap-4 border-r border-slate-800 overflow-y-auto">
          <div className="flex-1 min-h-[500px] flex items-center justify-center bg-slate-800/50 rounded-lg">
             <LabelPreview data={labelData} size={labelSize} />
          </div>
          
          {/* Action Bar */}
          <div className="flex gap-4 justify-center bg-slate-800 p-4 rounded-lg border border-slate-700">
             <button 
               onClick={printLabel}
               className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-8 rounded shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
               disabled={!labelData.productName}
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
               </svg>
               PRINT LABEL
             </button>

             <button 
               onClick={exportAsImage}
               className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-3 px-6 rounded shadow flex items-center gap-2 transition-all"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
               </svg>
               EXPORT PNG
             </button>
          </div>
        </section>

        {/* Right Side: Form & Logs (45%) - col-span-5 */}
        <section className="col-span-12 md:col-span-5 bg-slate-900 flex flex-col h-full overflow-hidden border-l border-slate-800">
          <div className="flex-1 p-4 overflow-hidden">
             <LabelForm 
               data={labelData} 
               onChange={setLabelData} 
               onSizeChange={setLabelSize}
               currentSize={labelSize}
               onLog={addLog}
             />
          </div>
          <div className="h-48 p-4 pt-0 shrink-0">
             <LogPanel logs={logs} onClear={() => setLogs([])} />
          </div>
        </section>

      </main>
      
      {/* Invisible Printable Area for System Print */}
      <div id="printable-area" className="hidden print:flex">
         <LabelPreview data={labelData} size={labelSize} />
      </div>
    </div>
  );
}

export default App;