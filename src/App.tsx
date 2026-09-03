import { useState, useEffect } from "react";
import MapView, {
  ParcelProperties,
  LandmarkProperties,
  DistrictProperties,
} from "./components/Map/MapView";
import { TimelineBar } from "./components/Timeline/TimelineBar";
import { useTimelinePlayer } from "./hooks/useTimelinePlayer";

export default function App() {
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

  const [sampleParcels, setSampleParcels] = useState<Array<{ yr: number }>>([]);

  // Load sample parcels to calculate live visible structure count
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
      {/* Top Application Header */}
      <header className="flex h-14 items-center justify-between border-b border-stone-800 px-4 bg-stone-900/90 z-10 flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold tracking-wide">
            Preservation Houston Building Atlas
          </h1>
          {selectedDistrict && (
            <p className="text-xs text-amber-500">
              District: {selectedDistrict.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-300">
          <label className="flex items-center gap-1 font-mono">
            <span>From:</span>
            <input
              type="number"
              min={1836}
              max={timeline.yearMax}
              value={timeline.yearMin}
              onChange={(e) => timeline.setYearMin(Number(e.target.value))}
              aria-label="Filter from year"
              className="w-16 rounded border border-stone-700 bg-stone-800 px-1.5 py-0.5 text-stone-100"
            />
          </label>
          <label className="flex items-center gap-1 font-mono">
            <span>To:</span>
            <input
              type="number"
              min={timeline.yearMin}
              max={2026}
              value={timeline.yearMax}
              onChange={(e) => timeline.setYearMax(Number(e.target.value))}
              aria-label="Filter to year"
              className="w-16 rounded border border-stone-700 bg-stone-800 px-1.5 py-0.5 text-stone-100"
            />
          </label>
        </div>
      </header>

      {/* Main Map View Area */}
      <main className="relative flex-1 min-h-0">
        <MapView
          yearMin={timeline.yearMin}
          yearMax={timeline.yearMax}
          selectedParcelId={selectedParcel?.id}
          selectedLandmarkId={selectedLandmark?.id}
          onSelectParcel={setSelectedParcel}
          onSelectLandmark={setSelectedLandmark}
          onSelectDistrict={setSelectedDistrict}
        />

        {/* Selected Parcel or Landmark Overlay Card */}
        {(selectedParcel || selectedLandmark) && (
          <div className="absolute bottom-6 left-6 z-10 max-w-sm rounded-lg border border-stone-700 bg-stone-900/90 p-3 shadow-xl backdrop-blur">
            {selectedParcel && (
              <div>
                <div className="text-xs font-semibold text-stone-400">
                  Selected Parcel
                </div>
                <div className="text-sm font-bold text-stone-100">
                  {selectedParcel.addr}
                </div>
                <div className="text-xs text-stone-300">
                  Built: {selectedParcel.yr || "Unknown"}
                </div>
              </div>
            )}
            {selectedLandmark && (
              <div
                className={
                  selectedParcel ? "mt-2 border-t border-stone-800 pt-2" : ""
                }
              >
                <div className="text-xs font-semibold text-amber-400">
                  {selectedLandmark.designation === "PLM"
                    ? "Protected Landmark"
                    : "Landmark"}
                </div>
                <div className="text-sm font-bold text-stone-100">
                  {selectedLandmark.name}
                </div>
                <div className="text-xs text-stone-300">
                  {selectedLandmark.addr} ({selectedLandmark.yr})
                </div>
              </div>
            )}
          </div>
        )}
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
