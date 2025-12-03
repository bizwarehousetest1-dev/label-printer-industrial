
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
    receiverPhone: '09100277226',
    
    weight: '205', // Grams
    price: 'طبق توافق پرداخت شده',
    paymentMethod: 'Prepaid',
    date: '1404-04-22',
    time: '13:30:05',
    
    barcode: '04515000010732',
    qrData: 'https://tracking.post.ir/?id=04515000010732',
    customNote: 'انبار مکانیزه Bizmlm.ir'
  });
  
  const [labelSize, setLabelSize] = useState<LabelSize>(LabelSize.SIZE_100_100);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [scaleDevice, setScaleDevice] = useState<SerialDevice>({ port: null, status: 'disconnected', baudRate: 9600 });
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
      // Scale baud rates vary: 9600 is common, but some are 19200 or 2400.
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
          
          // Process line by line
          const lines = buffer.split(/[\r\n]+/);
          
          // If we have more than one part, we have at least one full line
          if (lines.length > 1) {
             // Keep the last part in buffer (it might be incomplete)
             buffer = lines.pop() || "";
             
             // Process all complete lines
             for (const line of lines) {
               if (!line.trim()) continue;
               
               // Regex to find weight:
               // Looks for: optional non-digit chars, then float number, then optional unit
               // Example matches: "ST,GS,+  1.200kg", "1.20", "Weight: 1200"
               const weightMatch = line.match(/([0-9]+\.?[0-9]*)/);
               
               if (weightMatch && weightMatch[1]) {
                 const rawWeight = parseFloat(weightMatch[1]);
                 // Filter out noise/zeros if needed, or update immediately
                 if (!isNaN(rawWeight)) {
                   setLabelData(prev => ({ ...prev, weight: rawWeight.toString() }));
                   // Only log every few seconds/changes to avoid spam, or log debug:
                   // addLog(`Weight: ${rawWeight}`, 'data'); 
                 }
               }
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
    if (!labelData.trackingNumber.trim()) {
      addLog("Validation Error: Tracking Number is required.", 'error');
      return false;
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
      link.download = `Label_${labelData.trackingNumber}.png`;
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
           <h1 className="font-bold text-lg tracking-tight">IRAN POST <span className="text-amber-500">LABELER</span></h1>
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
               disabled={!labelData.trackingNumber}
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
