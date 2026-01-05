import { useCallback } from 'react';

export interface ExifData {
  dateTime?: string;           // Data/hora da foto
  dateTimeOriginal?: string;   // Data/hora original
  gpsLatitude?: number;        // Latitude GPS
  gpsLongitude?: number;       // Longitude GPS
  gpsAltitude?: number;        // Altitude GPS
  make?: string;               // Fabricante da câmera
  model?: string;              // Modelo da câmera/dispositivo
  software?: string;           // Software usado
  imageWidth?: number;         // Largura da imagem
  imageHeight?: number;        // Altura da imagem
  orientation?: number;        // Orientação
}

// Convert GPS coordinates from EXIF format to decimal degrees
function convertGPSToDecimal(gpsData: number[], ref: string): number | undefined {
  if (!gpsData || gpsData.length < 3) return undefined;
  
  const degrees = gpsData[0];
  const minutes = gpsData[1];
  const seconds = gpsData[2];
  
  let decimal = degrees + (minutes / 60) + (seconds / 3600);
  
  // South and West are negative
  if (ref === 'S' || ref === 'W') {
    decimal = -decimal;
  }
  
  return decimal;
}

// Parse EXIF date string to DD/MM/YYYY format
function parseExifDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  
  // EXIF format: "YYYY:MM:DD HH:MM:SS"
  const match = dateStr.match(/(\d{4}):(\d{2}):(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
  
  return null;
}

// Extract EXIF data from a file
export async function extractExifData(file: File): Promise<ExifData> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (!arrayBuffer) {
        resolve({});
        return;
      }
      
      try {
        const dataView = new DataView(arrayBuffer);
        const exifData = parseExifFromBuffer(dataView);
        resolve(exifData);
      } catch (error) {
        console.warn('Failed to extract EXIF:', error);
        resolve({});
      }
    };
    
    reader.onerror = () => {
      resolve({});
    };
    
    // Read first 128KB (EXIF is usually in the beginning)
    reader.readAsArrayBuffer(file.slice(0, 131072));
  });
}

// Parse EXIF from ArrayBuffer
function parseExifFromBuffer(dataView: DataView): ExifData {
  const exifData: ExifData = {};
  
  // Check for JPEG magic number
  if (dataView.getUint8(0) !== 0xFF || dataView.getUint8(1) !== 0xD8) {
    return exifData; // Not a JPEG
  }
  
  let offset = 2;
  const length = dataView.byteLength;
  
  while (offset < length) {
    if (dataView.getUint8(offset) !== 0xFF) {
      offset++;
      continue;
    }
    
    const marker = dataView.getUint8(offset + 1);
    
    // APP1 marker (contains EXIF)
    if (marker === 0xE1) {
      const exifLength = dataView.getUint16(offset + 2);
      const exifStart = offset + 4;
      
      // Check for "Exif" header
      if (
        dataView.getUint8(exifStart) === 0x45 &&
        dataView.getUint8(exifStart + 1) === 0x78 &&
        dataView.getUint8(exifStart + 2) === 0x69 &&
        dataView.getUint8(exifStart + 3) === 0x66
      ) {
        parseExifData(dataView, exifStart + 6, exifData);
      }
      break;
    }
    
    // Skip to next marker
    if (marker >= 0xE0 && marker <= 0xEF) {
      const segmentLength = dataView.getUint16(offset + 2);
      offset += 2 + segmentLength;
    } else if (marker === 0xD8 || marker === 0xD9) {
      offset += 2;
    } else {
      break;
    }
  }
  
  return exifData;
}

// Parse EXIF IFD data
function parseExifData(dataView: DataView, tiffStart: number, exifData: ExifData): void {
  const length = dataView.byteLength;
  
  if (tiffStart + 8 > length) return;
  
  // Determine byte order
  const byteOrder = dataView.getUint16(tiffStart);
  const littleEndian = byteOrder === 0x4949;
  
  // Get IFD0 offset
  const ifd0Offset = dataView.getUint32(tiffStart + 4, littleEndian);
  
  // Parse IFD0
  parseIFD(dataView, tiffStart, tiffStart + ifd0Offset, littleEndian, exifData, 'IFD0');
}

// Parse an IFD (Image File Directory)
function parseIFD(
  dataView: DataView, 
  tiffStart: number, 
  ifdOffset: number, 
  littleEndian: boolean,
  exifData: ExifData,
  ifdName: string
): void {
  const length = dataView.byteLength;
  
  if (ifdOffset + 2 > length) return;
  
  const numEntries = dataView.getUint16(ifdOffset, littleEndian);
  
  for (let i = 0; i < numEntries; i++) {
    const entryOffset = ifdOffset + 2 + (i * 12);
    if (entryOffset + 12 > length) break;
    
    const tag = dataView.getUint16(entryOffset, littleEndian);
    const type = dataView.getUint16(entryOffset + 2, littleEndian);
    const count = dataView.getUint32(entryOffset + 4, littleEndian);
    const valueOffset = entryOffset + 8;
    
    // Common EXIF tags
    switch (tag) {
      case 0x010F: // Make
        exifData.make = readString(dataView, tiffStart, valueOffset, count, littleEndian, length);
        break;
      case 0x0110: // Model
        exifData.model = readString(dataView, tiffStart, valueOffset, count, littleEndian, length);
        break;
      case 0x0131: // Software
        exifData.software = readString(dataView, tiffStart, valueOffset, count, littleEndian, length);
        break;
      case 0x0132: // DateTime
        exifData.dateTime = parseExifDate(readString(dataView, tiffStart, valueOffset, count, littleEndian, length)) || undefined;
        break;
      case 0x9003: // DateTimeOriginal
        exifData.dateTimeOriginal = parseExifDate(readString(dataView, tiffStart, valueOffset, count, littleEndian, length)) || undefined;
        break;
      case 0x8769: // ExifIFD pointer
        const exifIfdOffset = dataView.getUint32(valueOffset, littleEndian);
        parseIFD(dataView, tiffStart, tiffStart + exifIfdOffset, littleEndian, exifData, 'ExifIFD');
        break;
      case 0x8825: // GPS IFD pointer
        const gpsIfdOffset = dataView.getUint32(valueOffset, littleEndian);
        parseGPSIFD(dataView, tiffStart, tiffStart + gpsIfdOffset, littleEndian, exifData, length);
        break;
    }
  }
}

// Parse GPS IFD
function parseGPSIFD(
  dataView: DataView,
  tiffStart: number,
  ifdOffset: number,
  littleEndian: boolean,
  exifData: ExifData,
  length: number
): void {
  if (ifdOffset + 2 > length) return;
  
  const numEntries = dataView.getUint16(ifdOffset, littleEndian);
  
  let latRef = 'N';
  let lonRef = 'E';
  let latData: number[] | undefined;
  let lonData: number[] | undefined;
  
  for (let i = 0; i < numEntries; i++) {
    const entryOffset = ifdOffset + 2 + (i * 12);
    if (entryOffset + 12 > length) break;
    
    const tag = dataView.getUint16(entryOffset, littleEndian);
    const count = dataView.getUint32(entryOffset + 4, littleEndian);
    const valueOffset = entryOffset + 8;
    
    switch (tag) {
      case 0x0001: // GPSLatitudeRef
        latRef = String.fromCharCode(dataView.getUint8(valueOffset));
        break;
      case 0x0002: // GPSLatitude
        latData = readRationals(dataView, tiffStart, valueOffset, 3, littleEndian, length);
        break;
      case 0x0003: // GPSLongitudeRef
        lonRef = String.fromCharCode(dataView.getUint8(valueOffset));
        break;
      case 0x0004: // GPSLongitude
        lonData = readRationals(dataView, tiffStart, valueOffset, 3, littleEndian, length);
        break;
      case 0x0006: // GPSAltitude
        const altData = readRationals(dataView, tiffStart, valueOffset, 1, littleEndian, length);
        if (altData && altData.length > 0) {
          exifData.gpsAltitude = altData[0];
        }
        break;
    }
  }
  
  if (latData) {
    exifData.gpsLatitude = convertGPSToDecimal(latData, latRef);
  }
  if (lonData) {
    exifData.gpsLongitude = convertGPSToDecimal(lonData, lonRef);
  }
}

// Read string from EXIF data
function readString(
  dataView: DataView,
  tiffStart: number,
  valueOffset: number,
  count: number,
  littleEndian: boolean,
  length: number
): string {
  let str = '';
  let offset: number;
  
  if (count > 4) {
    offset = tiffStart + dataView.getUint32(valueOffset, littleEndian);
  } else {
    offset = valueOffset;
  }
  
  for (let i = 0; i < count - 1 && offset + i < length; i++) {
    const char = dataView.getUint8(offset + i);
    if (char === 0) break;
    str += String.fromCharCode(char);
  }
  
  return str;
}

// Read rational numbers (used for GPS coordinates)
function readRationals(
  dataView: DataView,
  tiffStart: number,
  valueOffset: number,
  count: number,
  littleEndian: boolean,
  length: number
): number[] | undefined {
  const offset = tiffStart + dataView.getUint32(valueOffset, littleEndian);
  
  if (offset + count * 8 > length) return undefined;
  
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    const numerator = dataView.getUint32(offset + i * 8, littleEndian);
    const denominator = dataView.getUint32(offset + i * 8 + 4, littleEndian);
    values.push(denominator > 0 ? numerator / denominator : 0);
  }
  
  return values;
}

// Hook for extracting EXIF data
export function useExifExtractor() {
  const extractExif = useCallback(async (file: File): Promise<ExifData> => {
    return extractExifData(file);
  }, []);
  
  const extractExifBatch = useCallback(async (files: File[]): Promise<Map<string, ExifData>> => {
    const results = new Map<string, ExifData>();
    
    // Process in parallel, but limit concurrency
    const CONCURRENCY = 5;
    for (let i = 0; i < files.length; i += CONCURRENCY) {
      const batch = files.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map(async (file) => ({
          name: file.name,
          exif: await extractExifData(file)
        }))
      );
      
      batchResults.forEach(({ name, exif }) => {
        results.set(name, exif);
      });
    }
    
    return results;
  }, []);
  
  return {
    extractExif,
    extractExifBatch
  };
}
