import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationMapProps {
  latitude: number;
  longitude: number;
  locationName?: string;
  onClose?: () => void;
}

// Component to update map view when coordinates change
function MapUpdater({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView([latitude, longitude], 15);
  }, [latitude, longitude, map]);
  
  return null;
}

export const LocationMap: React.FC<LocationMapProps> = ({
  latitude,
  longitude,
  locationName,
  onClose,
}) => {
  return (
    <div className="relative w-full h-[400px] rounded-lg overflow-hidden border border-border">
      {onClose && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-2 right-2 z-[1000] bg-background/90"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        className="w-full h-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]}>
          <Popup>
            <div className="text-sm">
              <div className="flex items-center gap-1 font-semibold">
                <MapPin className="h-3 w-3" />
                {locationName || 'Localização'}
              </div>
              <div className="text-muted-foreground text-xs mt-1">
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </div>
            </div>
          </Popup>
        </Marker>
        <MapUpdater latitude={latitude} longitude={longitude} />
      </MapContainer>
    </div>
  );
};

// Utility function to parse DMS coordinates from OCR text
export function parseDMSCoordinates(text: string): { lat: number; lng: number } | null {
  // Pattern for coordinates like "23°32'46"S 47°28'59"W"
  const dmsPattern = /(\d{1,3})°(\d{1,2})'(\d{1,2})"?\s*([NSns])\s*(\d{1,3})°(\d{1,2})'(\d{1,2})"?\s*([EWOewo])/;
  
  const match = text.match(dmsPattern);
  if (!match) return null;

  const latDeg = parseInt(match[1]);
  const latMin = parseInt(match[2]);
  const latSec = parseInt(match[3]);
  const latDir = match[4].toUpperCase();
  
  const lngDeg = parseInt(match[5]);
  const lngMin = parseInt(match[6]);
  const lngSec = parseInt(match[7]);
  const lngDir = match[8].toUpperCase();

  let lat = latDeg + latMin / 60 + latSec / 3600;
  let lng = lngDeg + lngMin / 60 + lngSec / 3600;

  if (latDir === 'S') lat = -lat;
  if (lngDir === 'W' || lngDir === 'O') lng = -lng;

  return { lat, lng };
}

export default LocationMap;
