/**
 * Preservation Houston Building Atlas - Header Navigation & Omnibox
 *
 * Responsive application header featuring:
 * 1. Preservation Houston branding & Atlas logo mark
 * 2. SearchBar omnibox (instant landmarks, addresses, HCAD accounts)
 * 3. "Compare Historic Map" button toggle (connected to HistoricSwipe)
 * 4. "Locate Me" GPS walking tour button with pulsing status
 * 5. Navigation links & interactive dialogs:
 *    - "About the Atlas"
 *    - "Historic Districts Guide"
 *    - "Send Feedback"
 * 6. Responsive mobile drawer navigation
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Compass,
  Layers,
  Navigation,
  Info,
  BookOpen,
  MessageSquare,
  X,
  Menu,
  CheckCircle,
  Building2,
  Shield,
  Search,
  MapPin,
} from "lucide-react";
import { SearchBar, SearchSelectLocation } from "./SearchBar";
import { DistrictProperties } from "../Map/MapView";
import { HISTORIC_DISTRICTS } from "../../utils/historicDistricts";

export interface HeaderProps {
  onSelectLocation: (location: SearchSelectLocation) => void;
  showHistoricSwipe?: boolean;
  onToggleHistoricSwipe?: () => void;
  isLocating?: boolean;
  onLocateMe?: () => void;
  selectedDistrict?: DistrictProperties | null;
  yearMin?: number;
  yearMax?: number;
  onYearMinChange?: (year: number) => void;
  onYearMaxChange?: (year: number) => void;
  preloadProgress?: { completed: number; total: number } | null;
  className?: string;
  onOpenAbout?: () => void;
  onOpenDistrictsGuide?: () => void;
  onOpenFeedback?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSelectLocation,
  showHistoricSwipe = false,
  onToggleHistoricSwipe,
  isLocating = false,
  onLocateMe,
  selectedDistrict,
  yearMin,
  yearMax,
  onYearMinChange,
  onYearMaxChange,
  preloadProgress,
  className = "",
  onOpenAbout,
  onOpenDistrictsGuide,
  onOpenFeedback,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [districtsModalOpen, setDistrictsModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  // Feedback form state
  const [feedbackType, setFeedbackType] = useState("Historical Correction");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Historic districts guide state
  const [districtSearch, setDistrictSearch] = useState("");
  const [districtCategory, setDistrictCategory] = useState<"all" | "city" | "heritage" | "nrhp">("all");

  const filteredDistricts = useMemo(() => {
    return HISTORIC_DISTRICTS.filter((d) => {
      if (districtCategory === "city" && d.designation_type !== "City Historic District") return false;
      if (districtCategory === "heritage" && d.designation_type !== "City Heritage District") return false;
      if (districtCategory === "nrhp" && d.designation_type !== "National Register Historic District") return false;

      if (!districtSearch.trim()) return true;
      const q = districtSearch.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        d.full_name.toLowerCase().includes(q) ||
        d.arch_styles.some((s) => s.toLowerCase().includes(q)) ||
        d.description.toLowerCase().includes(q)
      );
    });
  }, [districtSearch, districtCategory]);

  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close open modals or mobile drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (aboutModalOpen) setAboutModalOpen(false);
        if (districtsModalOpen) setDistrictsModalOpen(false);
        if (feedbackModalOpen) setFeedbackModalOpen(false);
        if (mobileMenuOpen) setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [aboutModalOpen, districtsModalOpen, feedbackModalOpen, mobileMenuOpen]);

  // Clean up feedback submission timer on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  const handleOpenAbout = () => {
    if (onOpenAbout) {
      onOpenAbout();
    } else {
      setAboutModalOpen(true);
    }
    setMobileMenuOpen(false);
  };

  const handleOpenDistricts = () => {
    if (onOpenDistrictsGuide) {
      onOpenDistrictsGuide();
    } else {
      setDistrictsModalOpen(true);
    }
    setMobileMenuOpen(false);
  };

  const handleOpenFeedback = () => {
    if (onOpenFeedback) {
      onOpenFeedback();
    } else {
      setFeedbackSubmitted(false);
      setFeedbackModalOpen(true);
    }
    setMobileMenuOpen(false);
  };

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMsg.trim()) return;
    setFeedbackSubmitted(true);
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = setTimeout(() => {
      setFeedbackModalOpen(false);
      setFeedbackSubmitted(false);
      setFeedbackMsg("");
      setFeedbackEmail("");
      feedbackTimerRef.current = null;
    }, 1800);
  };

  return (
    <>
      <header
        className={`flex h-14 items-center justify-between border-b border-stone-800 px-3 sm:px-4 bg-stone-900/95 backdrop-blur-md z-30 flex-shrink-0 gap-2 sm:gap-4 select-none ${className}`}
      >
        {/* Left: Branding and Logo Mark */}
        <div className="flex items-center gap-2.5 min-w-0 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-stone-950 shadow-md shadow-amber-950/30 ring-1 ring-amber-400/40">
            <Compass className="w-5 h-5 text-stone-950 transform rotate-12" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-tight text-stone-100 whitespace-nowrap">
                Preservation Houston
              </span>
              <span className="hidden md:inline-block text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Atlas V2
              </span>
            </div>
            {selectedDistrict ? (
              <span
                data-testid="selected-district-badge"
                className="text-[11px] text-amber-400 font-medium truncate max-w-[200px]"
              >
                District: {selectedDistrict.name}
              </span>
            ) : (
              <span className="text-[10px] text-stone-400 hidden sm:inline-block">
                Architectural Heritage & Historic Growth (1836–2026)
              </span>
            )}
          </div>
        </div>

        {/* Center: Omnibox Smart Search */}
        <div className="flex-1 max-w-md mx-auto min-w-0">
          <SearchBar onSelectLocation={onSelectLocation} />
        </div>

        {/* Right: Actions, Historic Swipe Toggle, GPS Walking Tour, & Nav Links */}
        <div className="flex items-center gap-2 text-xs text-stone-300 flex-shrink-0">
          {/* Offline Cache & Preload Status Pill */}
          {preloadProgress && (
            <div
              role="status"
              aria-label="Atlas offline caching status"
              data-testid="atlas-preload-status"
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-stone-300 bg-stone-800/90 border border-stone-700/60 rounded-full"
              title={
                preloadProgress.completed < preloadProgress.total
                  ? `Pre-caching Houston parcels for instant 60fps playback (${preloadProgress.completed}/${preloadProgress.total} tiles)`
                  : "Core Houston parcels cached in browser storage for instant 60fps playback"
              }
            >
              {preloadProgress.completed < preloadProgress.total ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-amber-200">
                    Buffering:{" "}
                    {Math.round(
                      (preloadProgress.completed / preloadProgress.total) * 100
                    )}
                    %
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-300">Offline Cached</span>
                </>
              )}
            </div>
          )}

          {/* Compare Historic Map Swipe Toggle */}
          <button
            type="button"
            onClick={onToggleHistoricSwipe}
            aria-label={
              showHistoricSwipe
                ? "Exit historic map swipe"
                : "Compare historic map"
            }
            aria-pressed={showHistoricSwipe}
            data-testid="historic-swipe-toggle-btn"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all ${
              showHistoricSwipe
                ? "bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.25)]"
                : "bg-stone-800 hover:bg-stone-700/80 text-stone-200 border-stone-700"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span className="hidden sm:inline">
              {showHistoricSwipe ? "Exit Swipe" : "Compare 1915 Map"}
            </span>
          </button>

          {/* GPS Walking Tour "Locate Me" Button */}
          <button
            type="button"
            onClick={onLocateMe}
            aria-label="Locate my position on walking tour"
            aria-pressed={isLocating}
            data-testid="locate-me-btn"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all ${
              isLocating
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/60 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                : "bg-stone-800 hover:bg-stone-700/80 text-stone-200 border-stone-700 hover:text-emerald-300 hover:border-emerald-500/40"
            }`}
          >
            <Navigation
              className={`w-3.5 h-3.5 text-emerald-400 flex-shrink-0 ${
                isLocating ? "animate-spin" : ""
              }`}
            />
            <span className="hidden sm:inline">
              {isLocating ? "Locating..." : "Locate Me"}
            </span>
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1 ml-1 border-l border-stone-800 pl-2">
            <button
              type="button"
              onClick={handleOpenAbout}
              data-testid="nav-about-btn"
              className="px-2 py-1 text-xs text-stone-400 hover:text-stone-100 rounded hover:bg-stone-800 transition-colors"
            >
              About the Atlas
            </button>
            <button
              type="button"
              onClick={handleOpenDistricts}
              data-testid="nav-districts-btn"
              className="px-2 py-1 text-xs text-stone-400 hover:text-stone-100 rounded hover:bg-stone-800 transition-colors"
            >
              Historic Districts Guide
            </button>
            <button
              type="button"
              onClick={handleOpenFeedback}
              data-testid="nav-feedback-btn"
              className="px-2 py-1 text-xs text-stone-400 hover:text-stone-100 rounded hover:bg-stone-800 transition-colors"
            >
              Send Feedback
            </button>
          </nav>

          {/* Optional Direct Year Filter Inputs for Backward Compatibility */}
          {yearMin !== undefined && onYearMinChange && (
            <label className="hidden xl:flex items-center gap-1 font-mono text-[11px] ml-1">
              <span className="text-stone-400">From:</span>
              <input
                type="number"
                min={1836}
                max={yearMax}
                value={yearMin}
                onChange={(e) => onYearMinChange(Number(e.target.value))}
                aria-label="Filter from year"
                className="w-14 rounded border border-stone-700 bg-stone-800 px-1 py-0.5 text-stone-100 text-center"
              />
            </label>
          )}
          {yearMax !== undefined && onYearMaxChange && (
            <label className="hidden xl:flex items-center gap-1 font-mono text-[11px]">
              <span className="text-stone-400">To:</span>
              <input
                type="number"
                min={yearMin}
                max={2026}
                value={yearMax}
                onChange={(e) => onYearMaxChange(Number(e.target.value))}
                aria-label="Filter to year"
                className="w-14 rounded border border-stone-700 bg-stone-800 px-1 py-0.5 text-stone-100 text-center"
              />
            </label>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open navigation menu"}
            data-testid="mobile-menu-toggle-btn"
            className="lg:hidden p-1.5 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-stone-100 border border-stone-700"
          >
            {mobileMenuOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Menu className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation Menu */}
      {mobileMenuOpen && (
        <div
          data-testid="mobile-nav-drawer"
          className="lg:hidden bg-stone-900 border-b border-stone-800 px-4 py-3 z-20 space-y-2 shadow-2xl"
        >
          <div className="flex flex-col space-y-1 text-xs">
            <button
              type="button"
              onClick={handleOpenAbout}
              className="flex items-center gap-2 px-3 py-2 text-stone-200 hover:bg-stone-800 rounded-md text-left transition-colors"
            >
              <Info className="w-4 h-4 text-amber-400" />
              <span>About the Atlas</span>
            </button>
            <button
              type="button"
              onClick={handleOpenDistricts}
              className="flex items-center gap-2 px-3 py-2 text-stone-200 hover:bg-stone-800 rounded-md text-left transition-colors"
            >
              <BookOpen className="w-4 h-4 text-sky-400" />
              <span>Historic Districts Guide</span>
            </button>
            <button
              type="button"
              onClick={handleOpenFeedback}
              className="flex items-center gap-2 px-3 py-2 text-stone-200 hover:bg-stone-800 rounded-md text-left transition-colors"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>Send Feedback</span>
            </button>
          </div>
        </div>
      )}

      {/* About the Atlas Modal */}
      {aboutModalOpen && (
        <div
          data-testid="about-atlas-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="about-atlas-title"
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setAboutModalOpen(false)}
        >
          <div
            className="bg-stone-900 border border-stone-700 rounded-xl max-w-lg w-full p-6 text-stone-200 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Compass className="w-6 h-6 text-amber-400" />
                <h2
                  id="about-atlas-title"
                  className="text-lg font-bold text-stone-100"
                >
                  About Preservation Houston Atlas
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setAboutModalOpen(false)}
                aria-label="Close about dialog"
                className="p-1 rounded text-stone-400 hover:text-stone-100 hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-stone-300 space-y-3 leading-relaxed">
              <p>
                The <strong>Preservation Houston Building Atlas</strong> is an
                interactive architectural archive visualizing Houston’s built
                environment from the founding of the Republic of Texas in 1836
                through 2026.
              </p>
              <div className="p-3 bg-stone-800/80 rounded-lg border border-stone-700/60 space-y-1.5">
                <h4 className="font-semibold text-amber-300">
                  Authoritative Data Sources:
                </h4>
                <ul className="list-disc list-inside space-y-1 text-stone-400">
                  <li>Harris County Appraisal District (HCAD) Parcel Data</li>
                  <li>
                    City of Houston Protected Landmarks & Historic Districts
                  </li>
                  <li>National Register of Historic Places (NRHP) Catalog</li>
                  <li>
                    1915 USGS Houston Quadrangle & 1924 Sanborn Fire Insurance Maps
                  </li>
                </ul>
              </div>
              <p>
                Preservation Houston is a non-profit organization founded in 1978
                dedicated to preserving historic architecture, neighborhoods,
                and cultural heritage across greater Houston.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setAboutModalOpen(false)}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-semibold rounded-md text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historic Districts Guide Modal */}
      {districtsModalOpen && (
        <div
          data-testid="districts-guide-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="districts-guide-title"
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setDistrictsModalOpen(false)}
        >
          <div
            className="bg-stone-900 border border-stone-700 rounded-xl max-w-4xl w-full p-6 text-stone-200 shadow-2xl space-y-4 max-h-[88vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-3 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-6 h-6 text-sky-400" />
                <div>
                  <h2
                    id="districts-guide-title"
                    className="text-lg font-bold text-stone-100 flex items-center gap-2"
                  >
                    Houston Historic Districts Guide
                    <span className="text-xs font-normal text-stone-400">
                      ({HISTORIC_DISTRICTS.length} Designated Districts)
                    </span>
                  </h2>
                  <p className="text-xs text-stone-400">
                    City of Houston Planning &amp; Development Department &bull; Chapter 33 Code of Ordinances
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDistrictsModalOpen(false)}
                aria-label="Close historic districts guide"
                className="p-1 rounded text-stone-400 hover:text-stone-100 hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search and Category Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 flex-shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={districtSearch}
                  onChange={(e) => setDistrictSearch(e.target.value)}
                  placeholder="Search districts by name, architectural style, or history..."
                  aria-label="Filter historic districts"
                  className="w-full h-8.5 pl-9 pr-8 bg-stone-800/80 border border-stone-700/80 rounded-lg text-xs text-stone-100 placeholder-stone-400 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/40"
                />
                {districtSearch && (
                  <button
                    type="button"
                    onClick={() => setDistrictSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
                <button
                  type="button"
                  onClick={() => setDistrictCategory("all")}
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                    districtCategory === "all"
                      ? "bg-amber-500 text-stone-950"
                      : "bg-stone-800 text-stone-300 hover:bg-stone-700/70"
                  }`}
                >
                  All ({HISTORIC_DISTRICTS.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDistrictCategory("city")}
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                    districtCategory === "city"
                      ? "bg-amber-500 text-stone-950"
                      : "bg-stone-800 text-stone-300 hover:bg-stone-700/70"
                  }`}
                >
                  City Districts (23)
                </button>
                <button
                  type="button"
                  onClick={() => setDistrictCategory("heritage")}
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                    districtCategory === "heritage"
                      ? "bg-amber-500 text-stone-950"
                      : "bg-stone-800 text-stone-300 hover:bg-stone-700/70"
                  }`}
                >
                  Heritage (1)
                </button>
                <button
                  type="button"
                  onClick={() => setDistrictCategory("nrhp")}
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                    districtCategory === "nrhp"
                      ? "bg-amber-500 text-stone-950"
                      : "bg-stone-800 text-stone-300 hover:bg-stone-700/70"
                  }`}
                >
                  National Register (3)
                </button>
              </div>
            </div>

            {/* Scrollable District Cards Grid */}
            <div className="text-xs text-stone-300 overflow-y-auto pr-1 leading-relaxed flex-1 space-y-3">
              {filteredDistricts.length === 0 ? (
                <div className="text-center py-12 text-stone-400">
                  <Shield className="w-8 h-8 text-stone-600 mx-auto mb-2" />
                  <p>No historic districts matching "{districtSearch}"</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredDistricts.map((d) => (
                    <div
                      key={d.id}
                      className="p-3.5 bg-stone-800/80 rounded-lg border border-stone-700/70 flex flex-col justify-between hover:border-amber-500/50 transition-colors"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-amber-300 text-sm flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            <span>{d.name}</span>
                          </h4>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {d.dist_num > 0 && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                #{d.dist_num}
                              </span>
                            )}
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-700/60 text-stone-300 border border-stone-600/40">
                              {d.designated_year}
                            </span>
                          </div>
                        </div>

                        <div className="text-[11px] text-stone-400 mt-0.5 font-sans">
                          {d.designation_type} &bull; Designated {d.designated_year}
                        </div>

                        {/* Architectural Styles */}
                        {d.arch_styles && d.arch_styles.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {d.arch_styles.map((style) => (
                              <span
                                key={style}
                                className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-900/60 text-stone-300 border border-stone-700/60"
                              >
                                {style}
                              </span>
                            ))}
                          </div>
                        )}

                        <p className="text-[11px] text-stone-300 mt-2 leading-relaxed">
                          {d.description}
                        </p>
                      </div>

                      {/* Card Footer: View on Map Button */}
                      <div className="mt-3 pt-2.5 border-t border-stone-700/50 flex items-center justify-between">
                        <span className="text-[10px] text-stone-400">
                          {d.bounds ? "Boundary Georeferenced" : ""}
                        </span>
                        <button
                          type="button"
                          data-testid={`view-district-${d.id}`}
                          onClick={() => {
                            onSelectLocation({
                              lng: d.centroid[0],
                              lat: d.centroid[1],
                              bounds: d.bounds,
                              district: {
                                id: d.id,
                                name: d.name,
                                full_name: d.full_name,
                                designated_year: d.designated_year,
                                description: d.description,
                                arch_styles: d.arch_styles,
                              },
                              zoom: 15.5,
                            });
                            setDistrictsModalOpen(false);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-medium transition-colors cursor-pointer"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          View on Map
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-between items-center flex-shrink-0 border-t border-stone-800">
              <span className="text-[11px] text-stone-400">
                Click "View on Map" on any district to center and frame its boundary.
              </span>
              <button
                type="button"
                onClick={() => setDistrictsModalOpen(false)}
                className="px-4 py-1.5 bg-stone-700 hover:bg-stone-600 text-stone-200 font-semibold rounded-md text-xs transition-colors"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Feedback Modal */}
      {feedbackModalOpen && (
        <div
          data-testid="feedback-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setFeedbackModalOpen(false)}
        >
          <div
            className="bg-stone-900 border border-stone-700 rounded-xl max-w-md w-full p-6 text-stone-200 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-6 h-6 text-emerald-400" />
                <h2
                  id="feedback-title"
                  className="text-lg font-bold text-stone-100"
                >
                  Send Atlas Feedback
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackModalOpen(false)}
                aria-label="Close feedback dialog"
                className="p-1 rounded text-stone-400 hover:text-stone-100 hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedbackSubmitted ? (
              <div
                data-testid="feedback-success-message"
                className="py-8 flex flex-col items-center justify-center text-center space-y-2"
              >
                <CheckCircle className="w-12 h-12 text-emerald-400 animate-bounce" />
                <h4 className="text-sm font-bold text-stone-100">
                  Thank You for Your Contribution!
                </h4>
                <p className="text-xs text-stone-400 max-w-xs">
                  Your feedback and preservation notes have been sent to our
                  archival team.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitFeedback} className="space-y-3 text-xs">
                <div>
                  <label className="block text-stone-300 font-medium mb-1">
                    Feedback Category
                  </label>
                  <select
                    value={feedbackType}
                    onChange={(e) => setFeedbackType(e.target.value)}
                    className="w-full h-8 px-2 bg-stone-800 border border-stone-700 rounded text-stone-200 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="Historical Correction">
                      Historical Correction or Year Built
                    </option>
                    <option value="Photo Submission">
                      Historic Photo or Archive Link
                    </option>
                    <option value="Feature Suggestion">
                      Feature Suggestion
                    </option>
                    <option value="Bug Report">Technical Issue / Bug</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-300 font-medium mb-1">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={feedbackEmail}
                    onChange={(e) => setFeedbackEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full h-8 px-2.5 bg-stone-800 border border-stone-700 rounded text-stone-200 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-medium mb-1">
                    Your Message / Building Details
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={feedbackMsg}
                    onChange={(e) => setFeedbackMsg(e.target.value)}
                    placeholder="Provide address, correct construction year, architectural style, or notes..."
                    className="w-full p-2.5 bg-stone-800 border border-stone-700 rounded text-stone-200 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setFeedbackModalOpen(false)}
                    className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    data-testid="submit-feedback-btn"
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded text-xs transition-colors shadow"
                  >
                    Submit Feedback
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
