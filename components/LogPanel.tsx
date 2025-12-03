import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface LogPanelProps {
  logs: LogEntry[];
  onClear: () => void;
}

export const LogPanel: React.FC<LogPanelProps> = ({ logs, onClear }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-700 rounded-lg overflow-hidden shadow-inner">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">System Logs</h3>
        <button 
          onClick={onClear} 
          className="text-xs text-slate-500 hover:text-red-400 transition-colors"
        >
          CLEAR
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1">
        {logs.length === 0 && (
          <div className="text-slate-600 italic text-center mt-10">System ready. Waiting for events...</div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex gap-2 break-all">
            <span className="text-slate-500 whitespace-nowrap">[{log.timestamp}]</span>
            <span className={`
              ${log.type === 'error' ? 'text-red-500 font-bold' : ''}
              ${log.type === 'warning' ? 'text-amber-400' : ''}
              ${log.type === 'success' ? 'text-green-400' : ''}
              ${log.type === 'data' ? 'text-cyan-400' : ''}
              ${log.type === 'info' ? 'text-slate-300' : ''}
            `}>
              {log.type === 'data' ? '>>> ' : ''}{log.message}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};