import { useState, useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import MapView, {
  ParcelProperties,
  LandmarkProperties,
  DistrictProperties,
} from "./components/Map/MapView";
import { Header } from "./components/Header/Header";
import { SearchSelectLocation } from "./components/Header/SearchBar";
import { TimelineBar } from "./components/Timeline/TimelineBar";
import { PropertyDrawer } from "./components/Drawer/PropertyDrawer";
import { HistoricSwipe } from "./components/Map/HistoricSwipe";
import { useTimelinePlayer } from "./hooks/useTimelinePlayer";
import { useGeolocator } from "./hooks/useGeolocator";

export default function App() {
  const mapRef = useRef<maplibregl.Map | null>(null);

  const timeline = useTimelinePlayer({
    minBound: 1836,
    maxBound: 2026,
    initialYearMin: 1836,
    initialYearMax: 2026,
  });

  const [selectedParcel, setSelectedParcel] =
    useState<ParcelProperties | null>(null);
  const [selectedLandmark, setSelectedLandmark] =
    useState<LandmarkProperties | null>(null);
  const [selectedDistrict, setSelectedDistrict] =
    useState<DistrictProperties | null>(null);

  const [showHistoricSwipe, setShowHistoricSwipe] = useState(false);
  const [swipePosition, setSwipePosition] = useState(50);
  const [historicLayerId, setHistoricLayerId] = useState("usgs-1915");

  const [sampleParcels, setSampleParcels] = useState<Array<{ yr: number }>>([]);
  const [fullSampleParcels, setFullSampleParcels] = useState<ParcelProperties[]>(
    []
  );

  // Initialize GPS locator hook
  const geolocator = useGeolocator({
    onLocationFound: (coords) => {
      if (mapRef.current && typeof mapRef.current.flyTo === "function") {
        mapRef.current.flyTo({
          center: [coords.longitude, coords.latitude],
          zoom: 17,
          essential: true,
        });
      }
    },
  });

  const handleSelectParcel = (parcel: ParcelProperties | null) => {
    setSelectedParcel(parcel);
    if (parcel) {
      setSelectedLandmark(null);
    }
  };

  const handleSelectLandmark = (landmark: LandmarkProperties | null) => {
    setSelectedLandmark(landmark);
    if (landmark) {
      setSelectedParcel(null);
    }
  };

  // Handle location selection from SearchBar or GPS walking tour
  const handleSelectLocation = (location: SearchSelectLocation) => {
    if (mapRef.current && typeof mapRef.current.flyTo === "function") {
      mapRef.current.flyTo({
        center: [location.lng, location.lat],
        zoom: location.zoom ?? 17,
        essential: true,
      });
    }

    if (location.parcelId) {
      const found = fullSampleParcels.find((p) => p.id === location.parcelId);
      if (found) {
        setSelectedParcel(found);
      } else {
        setSelectedParcel({
          id: location.parcelId,
          addr: location.address || `HCAD #${location.parcelId}`,
          yr: 1920,
          owner: "Harris County Property Owner",
          use: "RES",
          dist: null,
          contrib: 1,
        });
      }
      setSelectedLandmark(null);
    } else if (location.landmark) {
      setSelectedLandmark(location.landmark);
      setSelectedParcel(null);
    }
  };

  // Load sample parcels to calculate live visible structure count and property lookup
  useEffect(() => {
    fetch("/data/parcels_sample.geojson")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.features) {
          setSampleParcels(
            data.features.map((f: any) => ({
              yr: Number(f.properties?.yr) || 0,
            }))
          );
          setFullSampleParcels(
            data.features.map((f: any) => ({
              id: String(f.properties?.id || f.id || ""),
              yr: Number(f.properties?.yr) || 0,
              addr: String(f.properties?.addr || ""),
              owner: String(f.properties?.owner || "Unknown Owner"),
              use: String(f.properties?.use || "RES"),
              dist: f.properties?.dist || null,
              contrib: f.properties?.contrib ?? 1,
              st: f.properties?.st,
            }))
          );
        }
      })
      .catch(() => {
        // Fallback gracefully in environments without fetch
      });
  }, []);

  const visibleStructureCount =
    sampleParcels.length > 0
      ? sampleParcels.filter(
          (p) => p.yr >= timeline.yearMin && p.yr <= timeline.yearMax
        ).length
      : undefined;

  return (
    <div className="flex h-screen w-screen flex-col bg-stone-900 text-stone-100 overflow-hidden">
      {/* Top Application Header with Omnibox Search and GPS Locator */}
      <Header
        onSelectLocation={handleSelectLocation}
        showHistoricSwipe={showHistoricSwipe}
        onToggleHistoricSwipe={() => setShowHistoricSwipe((prev) => !prev)}
        isLocating={geolocator.isLocating}
        onLocateMe={() => geolocator.locateUser()}
        selectedDistrict={selectedDistrict}
        yearMin={timeline.yearMin}
        yearMax={timeline.yearMax}
        onYearMinChange={timeline.setYearMin}
        onYearMaxChange={timeline.setYearMax}
      />

      {/* Main Map View Area */}
      <main className="relative flex-1 min-h-0">
        <MapView
          yearMin={timeline.yearMin}
          yearMax={timeline.yearMax}
          selectedParcelId={selectedParcel?.id}
          selectedLandmarkId={selectedLandmark?.id}
          onSelectParcel={handleSelectParcel}
          onSelectLandmark={handleSelectLandmark}
          onSelectDistrict={setSelectedDistrict}
          onMapLoaded={(map) => {
            mapRef.current = map;
          }}
          showHistoricSwipe={showHistoricSwipe}
          swipePosition={swipePosition}
          historicLayerId={historicLayerId}
        />

        {/* Draggable Split-Screen Historic Map Swipe Divider */}
        {showHistoricSwipe && (
          <HistoricSwipe
            position={swipePosition}
            onPositionChange={setSwipePosition}
            onToggle={setShowHistoricSwipe}
            layerId={historicLayerId}
            onLayerChange={setHistoricLayerId}
          />
        )}

        {/* Responsive Property Inspection Drawer & Historic Badges */}
        <PropertyDrawer
          parcel={selectedParcel}
          landmark={selectedLandmark}
          district={selectedDistrict}
          isOpen={Boolean(selectedParcel || selectedLandmark)}
          onClose={() => {
            setSelectedParcel(null);
            setSelectedLandmark(null);
          }}
          onExportDossier={(property) => {
            console.info("Export Building Dossier requested for:", property);
          }}
        />
      </main>

      {/* Bottom Timeline Scrubber & Timelapse Player */}
      <TimelineBar
        yearMin={timeline.yearMin}
        yearMax={timeline.yearMax}
        onYearChange={timeline.setYearRange}
        isPlaying={timeline.isPlaying}
        onTogglePlay={timeline.togglePlay}
        speed={timeline.speed}
        onSpeedChange={timeline.setSpeed}
        loop={timeline.loop}
        onToggleLoop={timeline.toggleLoop}
        totalVisibleCount={visibleStructureCount}
        className="flex-shrink-0"
      />
    </div>
  );
}
