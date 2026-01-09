import { ProcessingResult } from '@/services/api';
import { parseDMSCoordinates } from '@/components/LocationMap';

interface GPSPoint {
  name: string;
  lat: number;
  lng: number;
  description?: string;
  date?: string;
}

// Extract GPS coordinates from a result
export function extractGPSFromResult(result: ProcessingResult): GPSPoint | null {
  let lat: number | null = null;
  let lng: number | null = null;

  // Try EXIF GPS first
  if (result.gps_lat && result.gps_lon) {
    lat = result.gps_lat;
    lng = result.gps_lon;
  } 
  // Try OCR DMS coordinates
  else if (result.ocr_text) {
    const coords = parseDMSCoordinates(result.ocr_text);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
    }
  }

  if (lat === null || lng === null) return null;

  const name = result.service 
    ? `${result.service}${result.portico ? ` - ${result.portico}` : ''}`
    : result.filename;

  const description = [
    result.disciplina && `Disciplina: ${result.disciplina}`,
    result.rodovia && `Rodovia: ${result.rodovia}`,
    result.km_inicio && `KM: ${result.km_inicio}`,
    result.data_detectada && `Data: ${result.data_detectada}`,
  ].filter(Boolean).join('\n');

  return {
    name,
    lat,
    lng,
    description,
    date: result.data_detectada,
  };
}

// Generate KML content
export function generateKML(points: GPSPoint[], documentName: string = 'Fotos GPS'): string {
  const placemarks = points.map((point, idx) => `
    <Placemark>
      <name>${escapeXML(point.name)}</name>
      <description><![CDATA[${point.description || ''}]]></description>
      <Point>
        <coordinates>${point.lng},${point.lat},0</coordinates>
      </Point>
      <Style>
        <IconStyle>
          <Icon>
            <href>http://maps.google.com/mapfiles/kml/paddle/${idx + 1}.png</href>
          </Icon>
        </IconStyle>
      </Style>
    </Placemark>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXML(documentName)}</name>
    <description>Exportado do ObraPhoto AI em ${new Date().toLocaleDateString('pt-BR')}</description>
    <Style id="photoStyle">
      <IconStyle>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/camera.png</href>
        </Icon>
      </IconStyle>
    </Style>
${placemarks}
  </Document>
</kml>`;
}

// Generate GPX content
export function generateGPX(points: GPSPoint[], trackName: string = 'Fotos GPS'): string {
  const waypoints = points.map(point => `
  <wpt lat="${point.lat}" lon="${point.lng}">
    <name>${escapeXML(point.name)}</name>
    <desc>${escapeXML(point.description || '')}</desc>
    <time>${point.date ? formatDateForGPX(point.date) : new Date().toISOString()}</time>
    <sym>Camera</sym>
  </wpt>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ObraPhoto AI"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXML(trackName)}</name>
    <desc>Exportado do ObraPhoto AI</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
${waypoints}
</gpx>`;
}

// Helper to escape XML special characters
function escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Helper to format date for GPX (ISO format)
function formatDateForGPX(dateStr: string): string {
  // Try to parse DD/MM/YYYY format
  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    return new Date(`${match[3]}-${match[2]}-${match[1]}T12:00:00Z`).toISOString();
  }
  return new Date().toISOString();
}

// Download file helper
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export results to KML
export function exportToKML(results: ProcessingResult[], filename?: string): number {
  const points = results
    .map(extractGPSFromResult)
    .filter((p): p is GPSPoint => p !== null);

  if (points.length === 0) return 0;

  const kmlContent = generateKML(points, filename || 'Fotos GPS');
  downloadFile(kmlContent, `${filename || 'fotos_gps'}.kml`, 'application/vnd.google-earth.kml+xml');
  
  return points.length;
}

// Export results to GPX
export function exportToGPX(results: ProcessingResult[], filename?: string): number {
  const points = results
    .map(extractGPSFromResult)
    .filter((p): p is GPSPoint => p !== null);

  if (points.length === 0) return 0;

  const gpxContent = generateGPX(points, filename || 'Fotos GPS');
  downloadFile(gpxContent, `${filename || 'fotos_gps'}.gpx`, 'application/gpx+xml');
  
  return points.length;
}
