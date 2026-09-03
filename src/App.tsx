import { useState } from "react";
import MapView, {
  ParcelProperties,
  LandmarkProperties,
  DistrictProperties,
} from "./components/Map/MapView";

export default function App() {
  const [yearMin, setYearMin] = useState(1836);
  const [yearMax, setYearMax] = useState(2026);
  const [selectedParcel, setSelectedParcel] =
    useState<ParcelProperties | null>(null);
  const [selectedLandmark, setSelectedLandmark] =
    useState<LandmarkProperties | null>(null);
  const [selectedDistrict, setSelectedDistrict] =
    useState<DistrictProperties | null>(null);

  return (
    <div className="flex h-screen w-screen flex-col bg-stone-900 text-stone-100">
      <header className="flex h-14 items-center justify-between border-b border-stone-800 px-4">
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
              max={yearMax}
              value={yearMin}
              onChange={(e) => setYearMin(Number(e.target.value))}
              className="w-16 rounded border border-stone-700 bg-stone-800 px-1.5 py-0.5 text-stone-100"
            />
          </label>
          <label className="flex items-center gap-1 font-mono">
            <span>To:</span>
            <input
              type="number"
              min={yearMin}
              max={2026}
              value={yearMax}
              onChange={(e) => setYearMax(Number(e.target.value))}
              className="w-16 rounded border border-stone-700 bg-stone-800 px-1.5 py-0.5 text-stone-100"
            />
          </label>
        </div>
      </header>
      <main className="relative flex-1">
        <MapView
          yearMin={yearMin}
          yearMax={yearMax}
          selectedParcelId={selectedParcel?.id}
          selectedLandmarkId={selectedLandmark?.id}
          onSelectParcel={setSelectedParcel}
          onSelectLandmark={setSelectedLandmark}
          onSelectDistrict={setSelectedDistrict}
        />
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
    </div>
  );
}
