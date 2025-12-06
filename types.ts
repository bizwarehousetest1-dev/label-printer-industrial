
export interface LabelData {
  // Shipping Specifics
  trackingNumber: string; // 20-24 digits
  orderId: string; // Internal Order ID
  
  // Sender (Ferestande)
  senderName: string;
  senderCity: string;
  senderAddress: string; // Includes postal code usually
  
  // Receiver (Girande)
  receiverName: string;
  receiverCity: string;
  receiverAddress: string;
  receiverPostCode: string;
  receiverPhone: string;
  receiverMobile: string; // New field
  
  // Package Info
  weight: string;
  price: string;
  paymentMethod: string; // e.g., "Tavafogh Shode" (Agreed)
  date: string;
  time: string;
  
  // Meta
  barcode: string; // Usually same as tracking
  qrData: string;
  customNote: string;
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
  SIZE_80_100 = '80x100', // Standard thermal
  SIZE_100_100 = '100x100', // Wide thermal
  SIZE_100_80 = '100x80', // Wide short thermal (New Standard)
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
