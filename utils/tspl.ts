
import { LabelData, LabelSize } from '../types';

export const generateTSPL = (data: LabelData, size: LabelSize): string => {
  const width = size === LabelSize.SIZE_100_100 ? 100 : 80;
  const height = 100;

  // Basic TSPL setup
  let commands = `SIZE ${width} mm,${height} mm\n`;
  commands += `GAP 3 mm,0 mm\n`;
  commands += `DIRECTION 1\n`;
  commands += `CLS\n`;

  // Header
  commands += `TEXT 30,30,"3",0,1,1,"POST LABEL"\n`;
  commands += `TEXT 400,30,"2",0,1,1,"${data.date}"\n`;

  // Barcode (Code 128)
  commands += `BARCODE 30,80,"128",80,1,0,2,2,"${data.trackingNumber}"\n`;

  // Sender (Latin chars only usually supported by basic TSPL unless uploaded fonts)
  // We will assume transliterated or primitive support, or user prints via System Print for Persian
  commands += `BOX 20,200,780,350,2\n`;
  commands += `TEXT 30,220,"2",0,1,1,"Sender: ${data.senderName}"\n`;
  // Simple check for Persian chars, if present, warn user implicitly by printing reversed?
  // Ideally, use System Print (PDF) for Persian. 
  
  // Receiver
  commands += `BOX 20,360,780,600,2\n`;
  commands += `TEXT 30,380,"3",0,1,1,"Receiver: ${data.receiverName}"\n`;
  commands += `TEXT 30,430,"2",0,1,1,"Phone: ${data.receiverPhone}"\n`;
  commands += `TEXT 30,470,"2",0,1,1,"Post Code: ${data.receiverPostCode}"\n`;

  // Weight
  commands += `TEXT 30,650,"4",0,1,1,"WEIGHT: ${data.weight} g"\n`;

  // Footer / Order ID
  commands += `TEXT 30,750,"2",0,1,1,"Order ID: ${data.orderId}"\n`;

  // QR Code
  // Standard TSPL2: QRCODE x,y,ECC,cell_width,mode,rotation,model,mask,"content"
  commands += `QRCODE 550,650,L,5,A,0,M2,S7,"${data.qrData}"\n`;

  commands += `PRINT 1\n`;

  return commands;
};
