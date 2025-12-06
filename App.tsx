
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
    trackingNumber: '04515000010732',
    orderId: '200-40236801',
    
    senderName: 'شرکت بازاریابان ایرانیان زمین (BIZ)',
    senderCity: 'تهران',
    senderAddress: 'تهران، کد پستی: 1577646813 ، تلفن پشتیبانی: 43072-021',
    
    receiverName: 'پیمان معینی',
    receiverCity: 'استان زنجان - شهر خرمدره',
    receiverAddress: 'شهرک گلدشت، خیابان پروین اعتصامی، انتهای خیابان مروارید، نبش کوچه نگین 3، پلاک 1، واحد 1',
    receiverPostCode: '4571310004',
    receiverPhone: '02435520000',
    receiverMobile: '09100277226',
    
    weight: '205', // Grams
    price: 'طبق توافق پرداخت شده',
    paymentMethod: 'Prepaid',
    date: '1404-04-22',
    time: '13:30:05',
    
    barcode: '04515000010732',
    qrData: 'https://tracking.post.ir/?id=04515000010732',
    customNote: 'انبار مکانیزه Bizmlm.ir'
  });
  
  const [labelSize, setLabelSize] = useState<LabelSize>(LabelSize.SIZE_100_80);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [scaleDevice, setScaleDevice] = useState<SerialDevice>({ port: null, status: 'disconnected', baudRate: 9600 });
  const [printerDevice, setPrinterDevice] = useState<SerialDevice>({ port: null, status: 'disconnected', baudRate: 9600 });
  const [printerType, setPrinterType] = useState<PrinterType>(PrinterType.SYSTEM);
  const [scaleReader, setScaleReader] = useState<ReadableStreamDefaultReader<string> | null>(null);

  // Store the promise that resolves when the pipeTo finishes
  const scaleReadableStreamClosedRef = useRef<Promise<void> | null>(null);

  // --- Logging Helper ---
  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev.slice(-49), { 
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
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: scaleDevice.baudRate });
      
      setScaleDevice(prev => ({ ...prev, port, status: 'connected' }));
      addLog("Scale Connected!", 'success');
      
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = port.readable!.pipeTo(textDecoder.writable);
      scaleReadableStreamClosedRef.current = readableStreamClosed;

      const reader = textDecoder.readable.getReader();
      setScaleReader(reader);

      readScaleData(reader);
    } catch (err: any) {
      addLog(`Scale Connection Failed: ${err.message}`, 'error');
    }
  };

  const readScaleData = async (reader: ReadableStreamDefaultReader<string>) => {
    let buffer = "";
    let flushTimeout: any = null;

    const processLine = (line: string) => {
      const cleanLine = line.trim();
      if (!cleanLine) return;
      
      addLog(`Line: "${cleanLine}"`, 'info');

      // Robust regex for numbers
      const candidates = cleanLine.match(/[-+]?\d*\.?\d+/g); 

      if (candidates && candidates.length > 0) {
        // Iterate BACKWARDS to find the most recent valid weight
        for (let i = candidates.length - 1; i >= 0; i--) {
          const candidate = candidates[i];
          const val = parseFloat(candidate);
          
          if (!isNaN(val) && val > 0) {
             setLabelData(prev => {
                if (prev.weight !== val.toString()) {
                    addLog(`Auto-fill Weight: ${val}`, 'success');
                    return { ...prev, weight: val.toString() };
                }
                return prev;
             });
             break; 
          }
        }
      }
    };

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          if (flushTimeout) clearTimeout(flushTimeout);

          const safeRaw = value.replace(/\r/g, '\\r').replace(/\n/g, '\\n');
          addLog(`Raw: "${safeRaw}"`, 'data');

          buffer += value;
          
          if (buffer.length > 1000) {
             buffer = buffer.slice(-1000);
          }
          
          const parts = buffer.split(/\r\n|\n|\r/);
          const incompletePart = parts.pop() || "";
          
          for (const part of parts) {
            processLine(part);
          }

          buffer = incompletePart;

          // Time-based flush
          flushTimeout = setTimeout(() => {
             if (buffer.trim().length > 0) {
                addLog(`Buffer Flush: "${buffer}"`, 'warning');
                processLine(buffer);
                buffer = "";
             }
          }, 150);
        }
      }
    } catch (err) {
      console.error(err);
      addLog("Scale Read Error", 'error');
    } finally {
      if (flushTimeout) clearTimeout(flushTimeout);
      reader.releaseLock();
    }
  };

  const disconnectScale = async () => {
    if (scaleReader) {
      try {
        await scaleReader.cancel();
      } catch (e) {
        console.warn("Error canceling reader", e);
      }
      setScaleReader(null);
    }
    
    if (scaleReadableStreamClosedRef.current) {
      try {
        await scaleReadableStreamClosedRef.current;
      } catch (e) {}
      scaleReadableStreamClosedRef.current = null;
    }

    if (scaleDevice.port) {
      try {
        await scaleDevice.port.close();
        addLog("Scale Disconnected", 'info');
      } catch (e: any) {
        addLog(`Error closing port: ${e.message}`, 'error');
      }
      setScaleDevice(prev => ({ ...prev, port: null, status: 'disconnected' }));
    }
  };

  // --- Printer Logic ---
  const connectPrinter = async () => {
     if (!navigator.serial) return;
     try {
       addLog("Requesting Printer Port...", 'info');
       const port = await navigator.serial.requestPort();
       await port.open({ baudRate: 9600 });
       setPrinterDevice({ port, status: 'connected', baudRate: 9600 });
       addLog("TSPL Printer Connected", 'success');
     } catch (err: any) {
       addLog(`Printer Connection Failed: ${err.message}`, 'error');
     }
  };

  const validateForm = (): boolean => {
    if (!labelData.trackingNumber.trim()) {
      addLog("Validation Error: Tracking Number is required.", 'error');
      return false;
    }
    return true;
  };

  const printLabel = async () => {
    if (!validateForm()) return;

    if (printerType === PrinterType.SYSTEM) {
      addLog("Initiating System Print...", 'info');
      window.print();
      addLog("Sent to System Spooler", 'success');
    } else {
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

  const exportAsImage = async () => {
    if (!validateForm()) return;
    const element = document.getElementById('printable-label');
    if (!element) return;
    try {
      addLog("Capturing preview...", 'info');
      const canvas = await html2canvas(element, { scale: 3 });
      const link = document.createElement('a');
      link.download = `Label_${labelData.trackingNumber}.png`;
      link.href = canvas.toDataURL();
      link.click();
      addLog("Label exported as PNG", 'success');
    } catch (e) {
      addLog("Export failed", 'error');
    }
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-slate-950 text-slate-100 font-sans">
      
      {/* 
        HEADER
        - Uses drag region for Electron titlebar feel 
        - Gradient background
        - Flexbox layout for responsiveness
      */}
      <header 
        className="h-16 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 shadow-md z-10"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        
        {/* Left: Brand */}
        <div className="flex items-center gap-3 w-1/4 select-none">
           <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow flex items-center justify-center font-black text-slate-900 text-lg">A</div>
           <h1 className="font-bold text-xl tracking-tight text-slate-100">
             ARSH <span className="text-[#ff6f6a]">EXPRESS</span>
           </h1>
        </div>
        
        {/* Center: Hardware Widgets */}
        <div 
          className="flex-1 flex items-center justify-center gap-6"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
           {/* Scale Widget */}
           <div className="flex items-center gap-3 bg-slate-800/50 px-4 py-1.5 rounded-full border border-slate-700/50 backdrop-blur-sm transition-colors hover:bg-slate-800">
             <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${scaleDevice.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span className="text-xs font-bold text-slate-400 tracking-wide">SCALE</span>
             </div>
             
             <div className="h-4 w-[1px] bg-slate-700"></div>

             <select 
               className="bg-transparent text-xs text-slate-300 font-mono outline-none cursor-pointer hover:text-white"
               value={scaleDevice.baudRate}
               onChange={(e) => setScaleDevice(prev => ({ ...prev, baudRate: parseInt(e.target.value) }))}
               disabled={scaleDevice.status === 'connected'}
             >
                {[1200, 2400, 4800, 9600, 19200, 38400, 115200].map(r => (
                  <option key={r} value={r} className="bg-slate-800">{r}</option>
                ))}
             </select>

             <button 
                onClick={scaleDevice.status === 'connected' ? disconnectScale : connectScale}
                className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${
                  scaleDevice.status === 'connected' 
                    ? 'border-rose-500/30 text-rose-400 hover:bg-rose-950' 
                    : 'border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
             >
               {scaleDevice.status === 'connected' ? 'DISC' : 'CONN'}
             </button>
           </div>

           {/* Printer Widget */}
           <div className="flex items-center gap-3 bg-slate-800/50 px-4 py-1.5 rounded-full border border-slate-700/50 backdrop-blur-sm transition-colors hover:bg-slate-800">
             <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${printerDevice.status === 'connected' ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                <span className="text-xs font-bold text-slate-400 tracking-wide">PRINTER</span>
             </div>
             
             <div className="h-4 w-[1px] bg-slate-700"></div>

             <select 
               value={printerType} 
               onChange={(e) => setPrinterType(e.target.value as PrinterType)}
               className="bg-transparent text-xs text-slate-300 font-mono outline-none cursor-pointer hover:text-white"
             >
               <option value={PrinterType.SYSTEM} className="bg-slate-800">SYSTEM / USB</option>
               <option value={PrinterType.SERIAL_TSPL} className="bg-slate-800">SERIAL TSPL</option>
             </select>
             
             {printerType === PrinterType.SERIAL_TSPL && (
                 <button 
                  onClick={connectPrinter}
                  disabled={printerDevice.status === 'connected'}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${
                    printerDevice.status === 'connected'
                      ? 'border-emerald-500/30 text-emerald-400 cursor-default'
                      : 'border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                 >
                   {printerDevice.status === 'connected' ? 'READY' : 'CONN'}
                 </button>
             )}
           </div>
        </div>

        {/* Right: Spacer for balance */}
        <div className="w-1/4"></div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 grid grid-cols-12 gap-0 overflow-hidden relative">
        
        {/* Left Side: Preview (55%) */}
        <section className="col-span-12 md:col-span-7 bg-slate-950 relative flex flex-col border-r border-slate-800/50">
          
          {/* Background Grid Pattern */}
          <div className="absolute inset-0 opacity-5 pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-auto z-0">
             <div className="bg-white p-4 shadow-2xl shadow-black/50 rounded-sm">
                <LabelPreview data={labelData} size={labelSize} />
             </div>
          </div>
          
          {/* Action Bar */}
          <div className="p-6 flex justify-center gap-4 bg-slate-900/80 backdrop-blur border-t border-slate-800 z-10">
             <button 
               onClick={printLabel}
               disabled={!labelData.trackingNumber}
               className="group relative bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 pl-6 pr-8 rounded-lg shadow-lg flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 overflow-hidden"
             >
               <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
               </svg>
               <span className="tracking-wide">PRINT LABEL</span>
             </button>

             <button 
               onClick={exportAsImage}
               className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 px-6 rounded-lg border border-slate-700 shadow flex items-center gap-2 transition-all"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
               </svg>
               SAVE IMAGE
             </button>
          </div>
        </section>

        {/* Right Side: Form & Logs (45%) */}
        <section className="col-span-12 md:col-span-5 bg-slate-900 flex flex-col h-full overflow-hidden border-l border-slate-800 shadow-2xl z-10">
          <div className="flex-1 overflow-hidden relative">
             <LabelForm 
               data={labelData} 
               onChange={setLabelData} 
               onSizeChange={setLabelSize}
               currentSize={labelSize}
               onLog={addLog}
             />
          </div>
          <div className="h-40 shrink-0 border-t border-slate-800">
             <LogPanel logs={logs} onClear={() => setLogs([])} />
          </div>
        </section>

      </main>
      
      {/* Invisible Printable Area */}
      <div id="printable-area" className="hidden print:flex">
         <LabelPreview data={labelData} size={labelSize} />
      </div>
    </div>
  );
}

export default App;
