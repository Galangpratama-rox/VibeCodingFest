import { useEffect, useState, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { UrgencyLevel, FaskesLocation } from '../types';
import { Loader2, MapPin, Navigation } from 'lucide-react';

const MAPS_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || "";
const hasValidKey = Boolean(MAPS_KEY) && MAPS_KEY !== 'YOUR_API_KEY';

function Hospitals({ urgency, onSelect, onHospitalsFound, refreshTrigger, radius, onSearchStatus }: { 
  urgency: UrgencyLevel, 
  onSelect: (f: FaskesLocation) => void,
  onHospitalsFound?: (h: FaskesLocation[]) => void,
  refreshTrigger?: number,
  radius?: number,
  onSearchStatus?: (loading: boolean) => void
}) {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const [hospitals, setHospitals] = useState<FaskesLocation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // We signal loading as long as we don't have the map/placesLib yet if we're intending to fetch
    if (!placesLib || !map) {
      if (onSearchStatus) onSearchStatus(true);
      return;
    }

    const fetchHospitals = async () => {
      setLoading(true);
      if (onSearchStatus) onSearchStatus(true);
      const center = map.getCenter();
      if (!center) {
        setLoading(false);
        if (onSearchStatus) onSearchStatus(false);
        return;
      }

      try {
        let places: google.maps.places.Place[] = [];

        if (radius) {
          // Use searchNearby when exploring
          const request: google.maps.places.SearchNearbyRequest = {
           fields: ['id', 'displayName', 'location', 'formattedAddress', 'regularOpeningHours', 'rating', 'photos'],
           locationRestriction: {
             center: center,
             radius: radius,
           },
           includedPrimaryTypes: ['hospital', 'medical_clinic'],
           maxResultCount: 20,
          };
          const response = await placesLib.Place.searchNearby(request);
          places = response.places || [];
        } else {
          // Fallback to searchByText
          const queryStr = urgency === 'Darurat' || urgency === 'Tinggi' 
            ? 'Rumah Sakit IGD 24 Jam' 
            : 'Puskesmas Klinik';

          const response = await placesLib.Place.searchByText({
            textQuery: queryStr,
            fields: ['id', 'displayName', 'location', 'formattedAddress', 'regularOpeningHours', 'rating', 'photos'],
            locationBias: center,
            maxResultCount: 15,
          });
          places = response.places || [];
        }

        const formatted = places.map(p => ({
          id: p.id,
          name: p.displayName || 'Fasilitas Kesehatan',
          location: { lat: p.location?.lat() || 0, lng: p.location?.lng() || 0 },
          address: p.formattedAddress || 'Alamat tidak tersedia',
          isOpen24h: p.regularOpeningHours?.periods?.some(per => per.open.day === 0 && per.open.hour === 0) || false,
          rating: p.rating || 0,
          photoUrl: p.photos?.[0]?.getURI({ maxWidth: 400, maxHeight: 300 }) || `https://picsum.photos/seed/${p.id}/400/300`
        }));

        setHospitals(formatted);
        if (onHospitalsFound) onHospitalsFound(formatted);
      } catch (err) {
        console.error("Error fetching hospitals:", err);
        setHospitals([]);
        if (onHospitalsFound) onHospitalsFound([]);
      } finally {
        setLoading(false);
        if (onSearchStatus) onSearchStatus(false);
      }
    };

    fetchHospitals();
  }, [placesLib, map, urgency, onHospitalsFound, refreshTrigger, radius]);

  return (
    <>
      {hospitals.map(h => (
        <AdvancedMarker 
          key={h.id} 
          position={h.location} 
          onClick={() => onSelect(h)}
        >
          <Pin 
            background={urgency === 'Darurat' || urgency === 'Tinggi' ? '#ef4444' : '#10b981'} 
            glyphColor="#fff" 
          />
        </AdvancedMarker>
      ))}
    </>
  );
}

export default function FaskesMap({ 
  urgency, 
  onHospitalsFound, 
  refreshTrigger,
  explicitUserLocation,
  radius,
  onSearchStatus
}: { 
  urgency: UrgencyLevel, 
  onHospitalsFound?: (h: FaskesLocation[]) => void, 
  refreshTrigger?: number,
  explicitUserLocation?: { lat: number, lng: number } | null,
  radius?: number,
  onSearchStatus?: (loading: boolean) => void
}) {
  const [internalLocation, setInternalLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [selectedFaskes, setSelectedFaskes] = useState<FaskesLocation | null>(null);

  const userLocation = explicitUserLocation !== undefined ? explicitUserLocation : internalLocation;

  useEffect(() => {
    if (explicitUserLocation !== undefined) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setInternalLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        console.warn("Geolocation failed, waiting for user location input or permission", err);
        // Do not set a default here - let the component handle null location
      }
    );
  }, [explicitUserLocation]);

  if (!hasValidKey) {
    return (
      <Card className="m-4">
        <CardHeader>
          <CardTitle className="text-red-600">Google Maps API Key Diperlukan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">
            MedisCek memerlukan Google Maps API untuk memetakan fasilitas kesehatan.
          </p>
          <div className="bg-slate-100 p-4 rounded-md text-xs space-y-2">
            <p>1. Dapatkan kunci API di Google Cloud Console.</p>
            <p>2. Tambahkan secret <code>GOOGLE_MAPS_PLATFORM_KEY</code> di Settings.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative w-full h-[400px] rounded-xl overflow-hidden shadow-lg border border-slate-200">
      <APIProvider apiKey={MAPS_KEY}>
        <Map
          defaultCenter={userLocation || { lat: -7.7956, lng: 110.3695 }} // Default to Yogyakarta (user context) if null, or handled by view
          defaultZoom={userLocation ? 13 : 11}
          mapId="MEDICEPAT_MAP_ID"
          className="w-full h-full"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        >
          {userLocation && (
            <AdvancedMarker position={userLocation}>
              <div className="relative">
                <div className="absolute w-6 h-6 bg-blue-500 rounded-full border-4 border-white shadow-lg z-20" />
                <div className="absolute w-6 h-6 bg-blue-500 rounded-full marker-pulse z-10" />
              </div>
            </AdvancedMarker>
          )}
          <Hospitals 
            urgency={urgency} 
            onSelect={setSelectedFaskes} 
            onHospitalsFound={onHospitalsFound} 
            refreshTrigger={refreshTrigger} 
            radius={radius} 
            onSearchStatus={onSearchStatus}
          />
        </Map>
      </APIProvider>

      {selectedFaskes && (
        <div className="absolute bottom-4 left-4 right-4 bg-white p-4 rounded-lg shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-bold text-slate-900">{selectedFaskes.name}</h4>
              <p className="text-xs text-slate-500 mt-1 flex items-center">
                <MapPin className="w-3 h-3 mr-1" /> {selectedFaskes.address}
              </p>
            </div>
            <button 
              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedFaskes.location.lat},${selectedFaskes.location.lng}`)}
              className="bg-teal-600 text-white p-2 rounded-full hover:bg-teal-700 transition-colors"
            >
              <Navigation className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
