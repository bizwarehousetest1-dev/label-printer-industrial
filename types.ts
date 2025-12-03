export interface LabelData {
  productName: string;
  batchNumber: string;
  weight: string;
  unit: string;
  productionDate: string;
  description: string;
  barcode: string;
  qrData: string;
  persianText: string;
}

export interface SerialDevice {
  port: any;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  baudRate: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'data';
}

export enum PrinterType {
  SYSTEM = 'SYSTEM', // Uses Browser Print
  SERIAL_TSPL = 'SERIAL_TSPL', // Uses Web Serial
}

export enum LabelSize {
  SIZE_80_100 = '80x100',
  SIZE_100_100 = '100x100',
}

// Global declaration for Web Serial API
declare global {
  interface Navigator {
    serial: {
      requestPort: (options?: { filters?: any[] }) => Promise<any>;
      getPorts: () => Promise<any[]>;
    };
  }
}