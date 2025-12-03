import { LabelData, LabelSize } from '../types';

export const generateTSPL = (data: LabelData, size: LabelSize): string => {
  const width = size === LabelSize.SIZE_100_100 ? 100 : 80;
  const height = 100;

  // Basic TSPL setup
  // DIRECTION 1 = Print from top to bottom
  let commands = `SIZE ${width} mm,${height} mm\n`;
  commands += `GAP 3 mm,0 mm\n`;
  commands += `DIRECTION 1\n`;
  commands += `CLS\n`;

  // Product Name (Bold, Large)
  // Font "ROMAN.TTF" is standard on many TSPL printers, otherwise fallback to "0" (internal font)
  commands += `TEXT 30,30,"ROMAN.TTF",0,12,12,"${data.productName}"\n`;

  // Batch
  commands += `TEXT 30,120,"2",0,1,1,"Batch: ${data.batchNumber}"\n`;
  
  // Date
  commands += `TEXT 30,160,"2",0,1,1,"Date: ${data.productionDate}"\n`;

  // Weight (Large)
  commands += `TEXT 30,220,"3",0,2,2,"NET: ${data.weight} ${data.unit}"\n`;

  // Description
  // Simple word wrap simulation could go here, but keeping it simple for TSPL
  const cleanDesc = data.description.replace(/"/g, '\\"').substring(0, 40);
  commands += `TEXT 30,300,"2",0,1,1,"${cleanDesc}"\n`;

  // Persian Text Support
  // Attempt to print RTL text. Many basic thermal printers don't support RTL or complex shaping.
  // Reversing the string helps on some firmwares that print chars LTR.
  if (data.persianText) {
      // Primitive reverse for basic display
      const reversed = data.persianText.split('').reverse().join('');
      // Using internal font "2" or "3" usually supports some unicode map if configured
      commands += `TEXT 30,340,"2",0,1,1,"${reversed}"\n`;
  }

  // Barcode (Code 128)
  // X, Y, "Type", Height, HumanReadable, Rotation, Narrow, Wide, Content
  commands += `BARCODE 30,400,"128",80,1,0,2,2,"${data.barcode}"\n`;

  // QR Code
  // X, Y, ECC, CellWidth, Mode, Rotation, Model, Mask, Content
  // Note: QRCODE command syntax varies by printer firmware version. 
  // Standard TSPL2: QRCODE x,y,ECC,cell_width,mode,rotation,model,mask,"content"
  // Adjusted position based on label width
  const qrX = width === 100 ? 550 : 450;
  commands += `QRCODE ${qrX},400,L,6,A,0,M2,S7,"${data.qrData}"\n`;

  // Footer Box
  commands += `BOX 20,20,${width * 8 - 20},${height * 8 - 20},4\n`;

  commands += `PRINT 1\n`;

  return commands;
};