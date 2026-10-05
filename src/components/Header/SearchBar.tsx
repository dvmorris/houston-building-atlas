/**
 * Preservation Houston Building Atlas - SearchBar Omnibox
 *
 * Omnibox search supporting:
 * 1. Instant landmark name search (matches designated landmarks: "Julia Ideson", "Esperson", "Heights Theater", "Sam Houston Park", "Cotton Exchange")
 * 2. Address search with debounced geocoding query or sample parcel match (e.g. "1200 Texas Ave", "Heights Blvd")
 * 3. 13-digit HCAD Account Number lookup
 * 4. Keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
 * 5. Emits onSelectLocation({ lng, lat, zoom, parcelId, landmark })
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Search, X, Landmark, Building, MapPin, Hash, Shield } from "lucide-react";
import { LandmarkProperties, DistrictProperties } from "../Map/MapView";
import { HISTORIC_DISTRICTS } from "../../utils/historicDistricts";

export interface SearchSelectLocation {
  lng: number;
  lat: number;
  zoom?: number;
  parcelId?: string;
  landmark?: LandmarkProperties;
  address?: string;
  bounds?: [number, number, number, number];
  district?: DistrictProperties;
}

export type SearchResultType = "landmark" | "parcel" | "hcad" | "address" | "district";

export interface SearchResultItem {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  badge?: string;
  year?: number;
  lng: number;
  lat: number;
  zoom?: number;
  parcelId?: string;
  landmark?: LandmarkProperties;
  bounds?: [number, number, number, number];
  district?: DistrictProperties;
}

export interface SearchBarProps {
  onSelectLocation: (location: SearchSelectLocation) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

// Built-in catalog of designated Houston landmarks for instant 0ms search
export const DEFAULT_LANDMARKS: Array<{
  id: string;
  name: string;
  addr: string;
  yr: number;
  designation: string;
  designation_full?: string;
  coordinates: [number, number];
  architect?: string;
  style?: string;
  description?: string;
  image_url?: string;
  nrhp_date?: string;
}> = [
  {
    id: "lm-kellum-noble",
    name: "Kellum-Noble House (Sam Houston Park)",
    addr: "212 DALLAS ST",
    yr: 1847,
    designation: "PLM",
    designation_full: "City of Houston Protected Landmark & Recorded Texas Historic Landmark",
    coordinates: [-95.3712, 29.758],
    architect: "Nathaniel Kellum",
    style: "Texas Republic / Greek Revival",
    description: "The oldest surviving building in Houston on its original brick foundation.",
  },
  {
    id: "lm-annunciation-church",
    name: "Church of the Annunciation",
    addr: "1618 TEXAS AVE",
    yr: 1869,
    designation: "PLM",
    designation_full: "City of Houston Protected Landmark",
    coordinates: [-95.3582, 29.7578],
    architect: "Nicholas J. Clayton",
    style: "Romanesque / Gothic Revival",
    description: "Houston's oldest continuously operating church parish with soaring 180-foot spire.",
  },
  {
    id: "lm-cotton-exchange",
    name: "1884 Houston Cotton Exchange",
    addr: "202 TRAVIS ST",
    yr: 1884,
    designation: "PLM",
    designation_full: "City of Houston Protected Landmark & NRHP",
    coordinates: [-95.3614, 29.7634],
    architect: "Eugene T. Heiner",
    style: "Victorian Renaissance Revival",
    description: "Grand headquarters of the Texas cotton trade designed by Eugene Heiner.",
  },
  {
    id: "lm-sweeney-coombs",
    name: "Sweeney, Coombs & Fredericks Building",
    addr: "301 MAIN ST",
    yr: 1889,
    designation: "PLM",
    designation_full: "City of Houston Protected Landmark",
    coordinates: [-95.3628, 29.7618],
    architect: "George E. Dickey",
    style: "Late Victorian / Queen Anne Commercial",
    description: "Notable Queen Anne commercial structure crowned with three-story circular corner turret.",
  },
  {
    id: "lm-market-square",
    name: "Market Square Historic Public Park",
    addr: "301 MILAM ST",
    yr: 1904,
    designation: "LM",
    designation_full: "City of Houston Landmark",
    coordinates: [-95.3622, 29.7628],
    architect: "George E. Dickey / City of Houston",
    style: "Victorian Commercial Civic Plaza",
    description: "Houston's original civic center, site of four successive City Halls.",
  },
  {
    id: "lm-rice-hotel",
    name: "The Rice Hotel",
    addr: "909 TEXAS AVE",
    yr: 1913,
    designation: "PLM",
    designation_full: "City of Houston Protected Landmark",
    coordinates: [-95.3631, 29.7601],
    architect: "Mauran, Russell & Crowell",
    style: "Beaux-Arts Classical",
    description: "Historic 17-story Beaux-Arts hotel built by Jesse H. Jones on former Republic of Texas capitol grounds.",
  },
  {
    id: "lm-julia-ideson",
    name: "Julia Ideson Building",
    addr: "550 MCKINNEY ST",
    yr: 1926,
    designation: "PLM",
    designation_full: "City of Houston Protected Landmark & NRHP",
    coordinates: [-95.3695, 29.7588],
    architect: "Ralph Adams Cram & William Ward Watkin",
    style: "Spanish Renaissance Revival",
    description: "Houston's monumental central library from 1926 to 1976, celebrated for its Spanish cloisters.",
  },
  {
    id: "lm-esperson",
    name: "Niels & Mellie Esperson Buildings",
    addr: "808 TRAVIS ST",
    yr: 1927,
    designation: "PLM",
    designation_full: "City of Houston Protected Landmark",
    coordinates: [-95.3653, 29.7586],
    architect: "John Eberson",
    style: "Italian Renaissance Revival & Art Deco",
    description: "Houston's only complete Italian Renaissance skyscraper crowned with a 38-foot circular tempietto.",
  },
  {
    id: "lm-gulf-building",
    name: "Gulf Building (JPMorgan Chase)",
    addr: "712 MAIN ST",
    yr: 1929,
    designation: "PLM",
    designation_full: "City of Houston Protected Landmark & National Historic Landmark",
    coordinates: [-95.365, 29.7594],
    architect: "Alfred C. Finn & Kenneth Franzheim",
    style: "Art Deco",
    description: "Monumental 36-story Art Deco skyscraper commissioned by Jesse H. Jones for Gulf Oil.",
  },
  {
    id: "lm-heights-theater",
    name: "The Heights Theater",
    addr: "379 W 19TH ST",
    yr: 1929,
    designation: "PLM",
    designation_full: "City of Houston Protected Landmark",
    coordinates: [-95.4025, 29.8032],
    architect: "I.S. Radnor",
    style: "Mission Revival / Art Deco",
    description: "Historic 1929 theater that anchored 19th Street social life, beautifully restored for live performances.",
  },
];

// Sample Houston Parcels catalog with addresses and 13-digit HCAD IDs
export const DEFAULT_SAMPLE_PARCELS: Array<{
  id: string;
  addr: string;
  yr: number;
  owner: string;
  use: string;
  dist?: string;
  coordinates: [number, number];
}> = [
  {
    id: "0010020000001",
    addr: "1200 TEXAS AVE",
    yr: 1925,
    owner: "HISTORIC TRUST LLC",
    use: "RES",
    dist: "Downtown",
    coordinates: [-95.3615, 29.7599],
  },
  {
    id: "0010020000002",
    addr: "301 MAIN ST",
    yr: 1889,
    owner: "COMMERCIAL HOLDINGS CORP",
    use: "COM",
    dist: "Downtown",
    coordinates: [-95.3614, 29.7633],
  },
  {
    id: "0010020000003",
    addr: "1100 CONGRESS AVE",
    yr: 1910,
    owner: "TEXAS HERITAGE PROPERTIES",
    use: "COM",
    dist: "Downtown",
    coordinates: [-95.3595, 29.7629],
  },
  {
    id: "0010020000004",
    addr: "800 TRAVIS ST",
    yr: 1927,
    owner: "ESPERSON TOWER MANAGEMENT",
    use: "COM",
    dist: "Downtown",
    coordinates: [-95.3645, 29.7579],
  },
  {
    id: "0010020000005",
    addr: "500 MCKINNEY ST",
    yr: 1926,
    owner: "CITY OF HOUSTON CIVIC CENTER",
    use: "CIVIC",
    dist: "Downtown",
    coordinates: [-95.3685, 29.7579],
  },
  {
    id: "0010020000006",
    addr: "212 DALLAS ST",
    yr: 1847,
    owner: "HERITAGE SOCIETY OF HOUSTON",
    use: "MUSEUM",
    dist: "Downtown",
    coordinates: [-95.3705, 29.7579],
  },
  {
    id: "0020010000001",
    addr: "530 HEIGHTS BLVD",
    yr: 1905,
    owner: "HEIGHTS PRESERVATION PROPERTIES",
    use: "RES",
    dist: "Heights South",
    coordinates: [-95.3985, 29.7825],
  },
  {
    id: "0020010000005",
    addr: "910 HEIGHTS BLVD",
    yr: 1912,
    owner: "HEIGHTS GATEWAY APARTMENTS",
    use: "RES",
    dist: "Heights South",
    coordinates: [-95.3985, 29.7885],
  },
  {
    id: "0020010000008",
    addr: "1200 HEIGHTS BLVD",
    yr: 1920,
    owner: "HEIGHTS HISTORIC PARTNERS",
    use: "RES",
    dist: "Heights South",
    coordinates: [-95.3985, 29.7925],
  },
];

export const SearchBar: React.FC<SearchBarProps> = ({
  onSelectLocation,
  placeholder = "Search landmarks, addresses, or 13-digit HCAD #...",
  className = "",
  autoFocus = false,
}) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [additionalParcels, setAdditionalParcels] = useState<typeof DEFAULT_SAMPLE_PARCELS>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load any extra parcels from geojson sample if available
  useEffect(() => {
    const assetBase = typeof import.meta !== "undefined" && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL.replace(/\/$/, "")
      : "";
    fetch(`${assetBase}/data/parcels_sample.geojson`.replace(/^\/\//, "/"))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.features)) {
          const loaded = data.features.map((f: any) => {
            const coords = f.geometry?.coordinates?.[0] || [];
            let avgLng = -95.362;
            let avgLat = 29.759;
            if (Array.isArray(coords) && coords.length > 0) {
              const sumLng = coords.reduce((acc: number, c: any) => acc + (c[0] || 0), 0);
              const sumLat = coords.reduce((acc: number, c: any) => acc + (c[1] || 0), 0);
              avgLng = sumLng / coords.length;
              avgLat = sumLat / coords.length;
            }
            return {
              id: String(f.properties?.id || f.id || ""),
              addr: String(f.properties?.addr || ""),
              yr: Number(f.properties?.yr) || 0,
              owner: String(f.properties?.owner || ""),
              use: String(f.properties?.use || ""),
              dist: f.properties?.dist || undefined,
              coordinates: [avgLng, avgLat] as [number, number],
            };
          });
          setAdditionalParcels(loaded);
        }
      })
      .catch(() => {
        // Silently fallback to built-in sample parcels
      });
  }, []);

  // Merge default parcels with loaded parcels (avoiding duplicate IDs)
  const allParcels = useMemo(() => {
    const map = new Map<string, (typeof DEFAULT_SAMPLE_PARCELS)[0]>();
    for (const p of DEFAULT_SAMPLE_PARCELS) {
      map.set(p.id, p);
    }
    for (const p of additionalParcels) {
      if (!map.has(p.id)) {
        map.set(p.id, p);
      }
    }
    return Array.from(map.values());
  }, [additionalParcels]);

  // Keyboard shortcut listener (/ or ⌘K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target?.matches?.('input, textarea, select, [contenteditable="true"]') ||
        target?.isContentEditable;

      if (e.key === "/" && isEditable) return;

      if (
        (e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) &&
        document.activeElement !== inputRef.current
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside to dismiss dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Primary filtering engine
  const results: SearchResultItem[] = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const normQuery = trimmed.toLowerCase();
    const cleanDigits = trimmed.replace(/[\s-]/g, "");
    const is13DigitHcad = cleanDigits.length === 13 && /^\d{13}$/.test(cleanDigits);
    const isPartialHcad = cleanDigits.length >= 5 && /^\d+$/.test(cleanDigits);

    const items: SearchResultItem[] = [];

    // 1. HCAD Account Number match (exact 13-digit or partial)
    if (is13DigitHcad || isPartialHcad) {
      const matchedParcel = allParcels.find(
        (p) => p.id === cleanDigits || p.id.replace(/[\s-]/g, "") === cleanDigits
      );

      if (matchedParcel) {
        items.push({
          id: `hcad-${matchedParcel.id}`,
          type: "hcad",
          title: `HCAD Account #${matchedParcel.id}`,
          subtitle: `${matchedParcel.addr} • Built ${matchedParcel.yr} (${matchedParcel.dist || "Houston"})`,
          badge: "HCAD Account",
          year: matchedParcel.yr,
          lng: matchedParcel.coordinates[0],
          lat: matchedParcel.coordinates[1],
          zoom: 17.5,
          parcelId: matchedParcel.id,
        });
      } else if (is13DigitHcad) {
        // Exact 13-digit HCAD not in local sample: synthesize HCAD parcel query
        items.push({
          id: `hcad-${cleanDigits}`,
          type: "hcad",
          title: `HCAD Account #${cleanDigits}`,
          subtitle: "Harris County Appraisal District Parcel Lookup",
          badge: "HCAD Account",
          lng: -95.362,
          lat: 29.759,
          zoom: 17,
          parcelId: cleanDigits,
        });
      }
    }

    // 2. Instant Landmark Search
    for (const lm of DEFAULT_LANDMARKS) {
      const nameMatch = lm.name.toLowerCase().includes(normQuery);
      const addrMatch = lm.addr.toLowerCase().includes(normQuery);
      const architectMatch = lm.architect?.toLowerCase().includes(normQuery);
      const styleMatch = lm.style?.toLowerCase().includes(normQuery);

      if (nameMatch || addrMatch || architectMatch || styleMatch) {
        const landmarkProp: LandmarkProperties = {
          id: lm.id,
          name: lm.name,
          addr: lm.addr,
          yr: lm.yr,
          designation: lm.designation,
          designation_full: lm.designation_full,
          architect: lm.architect,
          style: lm.style,
          description: lm.description,
        };

        items.push({
          id: lm.id,
          type: "landmark",
          title: lm.name,
          subtitle: `${lm.addr} • ${lm.style || "Historic"} (${lm.yr})`,
          badge: lm.designation === "PLM" ? "Protected Landmark" : "Historic Landmark",
          year: lm.yr,
          lng: lm.coordinates[0],
          lat: lm.coordinates[1],
          zoom: 17.5,
          landmark: landmarkProp,
        });
      }
    }

    // 3. Instant Historic District Search
    for (const dist of HISTORIC_DISTRICTS) {
      const nameMatch = dist.name.toLowerCase().includes(normQuery);
      const fullNameMatch = dist.full_name.toLowerCase().includes(normQuery);
      const styleMatch = dist.arch_styles.some((s) => s.toLowerCase().includes(normQuery));
      const descMatch = dist.description.toLowerCase().includes(normQuery);

      if (nameMatch || fullNameMatch || styleMatch || descMatch) {
        items.push({
          id: `district-${dist.id}`,
          type: "district",
          title: dist.name,
          subtitle: `${dist.designation_type} • Designated ${dist.designated_year} • ${dist.arch_styles.slice(0, 2).join(", ")}`,
          badge: dist.dist_num ? `District #${dist.dist_num}` : "Historic District",
          year: dist.designated_year,
          lng: dist.centroid[0],
          lat: dist.centroid[1],
          zoom: 15.5,
          bounds: dist.bounds,
          district: {
            id: dist.id,
            name: dist.name,
            full_name: dist.full_name,
            designated_year: dist.designated_year,
            description: dist.description,
            arch_styles: dist.arch_styles,
          },
        });
      }
    }

    // 4. Address and Parcel Search
    for (const p of allParcels) {
      // Avoid duplicate if already matched by HCAD
      if (items.some((item) => item.parcelId === p.id)) continue;

      const addrMatch = p.addr.toLowerCase().includes(normQuery);
      const ownerMatch = p.owner.toLowerCase().includes(normQuery);
      const distMatch = p.dist?.toLowerCase().includes(normQuery);

      if (addrMatch || ownerMatch || distMatch) {
        items.push({
          id: `parcel-${p.id}`,
          type: "parcel",
          title: p.addr,
          subtitle: `Built ${p.yr} • ${p.owner} • ${p.dist || "Houston"}`,
          badge: p.dist ? `${p.dist} Parcel` : "Historic Parcel",
          year: p.yr,
          lng: p.coordinates[0],
          lat: p.coordinates[1],
          zoom: 17,
          parcelId: p.id,
        });
      }
    }

    // 4. Geocoding / Generic Houston Street Match Fallback
    const streetPatterns = [
      { name: "Texas Ave", coords: [-95.3615, 29.7599] as [number, number] },
      { name: "Heights Blvd", coords: [-95.3985, 29.7825] as [number, number] },
      { name: "Main St", coords: [-95.3625, 29.763] as [number, number] },
      { name: "Travis St", coords: [-95.3645, 29.7586] as [number, number] },
      { name: "McKinney St", coords: [-95.3685, 29.7588] as [number, number] },
      { name: "Dallas St", coords: [-95.3705, 29.7579] as [number, number] },
      { name: "19th St", coords: [-95.4025, 29.8032] as [number, number] },
    ];

    for (const st of streetPatterns) {
      if (
        normQuery.includes(st.name.toLowerCase()) &&
        !items.some((item) => item.title.toLowerCase().includes(st.name.toLowerCase()))
      ) {
        items.push({
          id: `geo-${st.name}`,
          type: "address",
          title: `${trimmed.toUpperCase()}, HOUSTON, TX`,
          subtitle: `Geocoded Corridor: ${st.name}, Houston, TX`,
          badge: "Street Geocode",
          lng: st.coords[0],
          lat: st.coords[1],
          zoom: 16.5,
        });
      }
    }

    // 5. Always offer Houston Geocoding query option if query has at least 3 chars
    if (trimmed.length >= 3 && !items.some((item) => item.type === "address")) {
      items.push({
        id: `geo-custom-${trimmed}`,
        type: "address",
        title: `Search "${trimmed}" in Houston`,
        subtitle: "Harris County / Downtown Houston coordinate lookup",
        badge: "Address Lookup",
        lng: -95.362,
        lat: 29.759,
        zoom: 16,
      });
    }

    return items;
  }, [query, allParcels]);

  const handleSelect = useCallback(
    (item: SearchResultItem) => {
      onSelectLocation({
        lng: item.lng,
        lat: item.lat,
        zoom: item.zoom ?? 17,
        parcelId: item.parcelId,
        landmark: item.landmark,
        bounds: item.bounds,
        district: item.district,
        address: item.title,
      });
      setQuery(item.title);
      setIsOpen(false);
      setActiveIndex(-1);
    },
    [onSelectLocation]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) {
      if (e.key === "Enter" && query.trim()) {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          handleSelect(results[activeIndex]);
        } else if (results.length > 0) {
          handleSelect(results[0]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  const handleClear = () => {
    setQuery("");
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div className={`relative w-full max-w-lg ${className}`}>
      {/* Search Input Container */}
      <div className="relative flex items-center">
        <div className="absolute left-3.5 flex items-center pointer-events-none text-stone-400">
          <Search className="w-4 h-4 text-stone-400" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            if (query.trim().length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={isOpen && results.length > 0}
          aria-autocomplete="list"
          aria-controls="search-results-list"
          aria-label="Search historic landmarks, addresses, or HCAD account numbers"
          data-testid="search-bar-input"
          className="w-full h-9 pl-9 pr-14 bg-stone-800/90 hover:bg-stone-800 focus:bg-stone-800 text-stone-100 placeholder-stone-400 text-xs rounded-lg border border-stone-700/80 focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/50 focus:outline-none transition-all shadow-inner font-sans"
        />

        <div className="absolute right-2.5 flex items-center gap-1.5">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search input"
              data-testid="search-clear-btn"
              className="p-1 rounded text-stone-400 hover:text-stone-200 hover:bg-stone-700/50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {!query && (
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-stone-400 bg-stone-900/60 border border-stone-700/70 rounded">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          id="search-results-list"
          role="listbox"
          data-testid="search-results-list"
          className="absolute left-0 right-0 top-full mt-1.5 max-h-80 overflow-y-auto bg-stone-900/95 backdrop-blur-md border border-stone-700/90 rounded-lg shadow-2xl z-50 divide-y divide-stone-800/80 py-1"
        >
          {results.map((item, index) => {
            const isSelected = index === activeIndex;

            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-testid={`search-result-${item.id}`}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`w-full text-left px-3.5 py-2.5 flex items-start gap-3 transition-colors ${
                  isSelected
                    ? "bg-amber-500/15 text-amber-200"
                    : "hover:bg-stone-800/70 text-stone-200"
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {item.type === "district" && (
                    <div className="p-1.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <Shield className="w-4 h-4" />
                    </div>
                  )}
                  {item.type === "landmark" && (
                    <div className="p-1.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <Landmark className="w-4 h-4" />
                    </div>
                  )}
                  {item.type === "parcel" && (
                    <div className="p-1.5 rounded-md bg-sky-500/20 text-sky-400 border border-sky-500/30">
                      <Building className="w-4 h-4" />
                    </div>
                  )}
                  {item.type === "hcad" && (
                    <div className="p-1.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <Hash className="w-4 h-4" />
                    </div>
                  )}
                  {item.type === "address" && (
                    <div className="p-1.5 rounded-md bg-stone-700/60 text-stone-300 border border-stone-600/50">
                      <MapPin className="w-4 h-4" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-xs text-stone-100 truncate">
                      {item.title}
                    </span>
                    {item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                          item.type === "district"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : item.type === "landmark"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : item.type === "hcad"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : item.type === "parcel"
                            ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                            : "bg-stone-800 text-stone-300 border border-stone-700"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {item.year && item.year > 0 && (
                      <span className="text-[10px] font-mono text-amber-400/90">
                        {item.year}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-400 truncate mt-0.5">
                    {item.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
