import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, X, ExternalLink, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProcessingResult } from '@/services/api';
import { parseDMSCoordinates } from '@/components/LocationMap';
import { cn } from '@/lib/utils';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom numbered icon
const createNumberedIcon = (number: number, color: string = '#3b82f6') => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        color: white;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 12px;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">${number}</div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

interface PhotoPoint {
  lat: number;
  lng: number;
  result: ProcessingResult;
  index: number;
}

interface AllPhotosMapProps {
  results: ProcessingResult[];
  fileUrls?: Map<string, string>;
  onClose: () => void;
  onViewPhoto?: (result: ProcessingResult, imageUrl?: string) => void;
}

// Component to fit map bounds to all markers
function MapBoundsUpdater({ points }: { points: PhotoPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15);
    } else {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [points, map]);

  return null;
}

export const AllPhotosMap: React.FC<AllPhotosMapProps> = ({
  results,
  fileUrls,
  onClose,
  onViewPhoto,
}) => {
  // Extract all GPS points
  const points = useMemo<PhotoPoint[]>(() => {
    const extracted: PhotoPoint[] = [];
    
    results.forEach((result, index) => {
      let lat: number | null = null;
      let lng: number | null = null;

      // Try EXIF GPS
      if (result.gps_lat && result.gps_lon) {
        lat = result.gps_lat;
        lng = result.gps_lon;
      } 
      // Try OCR DMS
      else if (result.ocr_text) {
        const coords = parseDMSCoordinates(result.ocr_text);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        }
      }

      if (lat !== null && lng !== null) {
        extracted.push({ lat, lng, result, index: index + 1 });
      }
    });

    // Sort by date for chronological order
    extracted.sort((a, b) => {
      const dateA = a.result.data_detectada || a.result.exif_date || '';
      const dateB = b.result.data_detectada || b.result.exif_date || '';
      return dateA.localeCompare(dateB);
    });

    // Reassign index after sorting
    extracted.forEach((point, idx) => {
      point.index = idx + 1;
    });

    return extracted;
  }, [results]);

  // Generate polyline coordinates
  const polylinePositions = useMemo(() => {
    return points.map(p => [p.lat, p.lng] as [number, number]);
  }, [points]);

  // Default center (São Paulo)
  const defaultCenter: [number, number] = points.length > 0 
    ? [points[0].lat, points[0].lng]
    : [-23.5505, -46.6333];

  if (points.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
        <div className="text-center p-8">
          <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Nenhuma localização GPS encontrada</h2>
          <p className="text-muted-foreground mb-4">
            As fotos processadas não possuem coordenadas GPS.
          </p>
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Mapa de Fotos</h2>
            <p className="text-sm text-muted-foreground">
              {points.length} {points.length === 1 ? 'localização' : 'localizações'} com GPS
            </p>
          </div>
        </div>
        <Button variant="ghost" onClick={onClose}>
          <X className="w-4 h-4 mr-2" />
          Fechar
        </Button>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={defaultCenter}
          zoom={10}
          className="w-full h-full"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {points.map((point) => {
            const imageUrl = fileUrls?.get(point.result.filename);
            const caption = point.result.service 
              ? `${point.result.service}${point.result.portico ? ` - ${point.result.portico}` : ''}`
              : point.result.filename;
            
            return (
              <Marker 
                key={point.result.filename}
                position={[point.lat, point.lng]}
                icon={createNumberedIcon(point.index)}
              >
                <Popup minWidth={200} maxWidth={300}>
                  <div className="text-sm">
                    {/* Photo preview */}
                    {imageUrl && (
                      <div className="w-full h-32 mb-2 rounded overflow-hidden bg-gray-100">
                        <img 
                          src={imageUrl} 
                          alt={caption}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    {/* Info */}
                    <div className="font-semibold text-gray-800 mb-1 flex items-center gap-1">
                      <Camera className="w-3 h-3" />
                      Foto {point.index}: {caption}
                    </div>
                    
                    {point.result.disciplina && (
                      <div className="text-xs text-gray-600">
                        Disciplina: {point.result.disciplina}
                      </div>
                    )}
                    
                    {point.result.rodovia && (
                      <div className="text-xs text-gray-600">
                        {point.result.rodovia} {point.result.km_inicio && `KM ${point.result.km_inicio}`}
                      </div>
                    )}
                    
                    {point.result.data_detectada && (
                      <div className="text-xs text-gray-600">
                        Data: {point.result.data_detectada}
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 mt-1 font-mono">
                      {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2 mt-2">
                      {onViewPhoto && (
                        <button
                          onClick={() => onViewPhoto(point.result, imageUrl)}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <Camera className="w-3 h-3" />
                          Ver foto
                        </button>
                      )}
                      <a
                        href={`https://www.google.com/maps?q=${point.lat},${point.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Google Maps
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
          
          {/* Polyline connecting points in chronological order */}
          {polylinePositions.length > 1 && (
            <Polyline 
              positions={polylinePositions}
              pathOptions={{
                color: '#3b82f6',
                weight: 3,
                opacity: 0.7,
                dashArray: '10, 5',
              }}
            />
          )}
          
          <MapBoundsUpdater points={points} />
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[1000] bg-card/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-border max-h-48 overflow-y-auto">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">Legenda</h4>
          <div className="space-y-1">
            {points.slice(0, 10).map((point) => (
              <div key={point.result.filename} className="flex items-center gap-2 text-xs">
                <span 
                  className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold"
                >
                  {point.index}
                </span>
                <span className="text-foreground truncate max-w-32">
                  {point.result.service || point.result.filename.substring(0, 20)}
                </span>
              </div>
            ))}
            {points.length > 10 && (
              <div className="text-xs text-muted-foreground">
                ... e mais {points.length - 10} localizações
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllPhotosMap;
