/**
 * Preservation Houston Building Atlas - useGeolocator Hook
 *
 * Interfaces with browser navigator.geolocation (getCurrentPosition, watchPosition),
 * providing location coordinates, tracking status, and graceful error handling for
 * GPS-guided historic walking tours around downtown and historic districts.
 */

import { useState, useRef, useCallback, useEffect } from "react";

export interface GeolocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export interface UseGeolocatorOptions {
  /**
   * Whether to request high accuracy GPS if available (default: true)
   */
  enableHighAccuracy?: boolean;
  /**
   * Maximum wait time in milliseconds for position (default: 10000ms)
   */
  timeout?: number;
  /**
   * Maximum acceptable cache age in milliseconds (default: 5000ms)
   */
  maximumAge?: number;
  /**
   * Whether to continuously watch location updates (default: false)
   */
  watch?: boolean;
  /**
   * Callback fired when coordinates are successfully acquired
   */
  onLocationFound?: (coords: GeolocationCoords) => void;
  /**
   * Callback fired when geolocation error occurs
   */
  onError?: (error: string) => void;
}

export interface UseGeolocatorReturn {
  coords: GeolocationCoords | null;
  isLocating: boolean;
  error: string | null;
  locateUser: (optionsOverride?: PositionOptions) => void;
  stopLocating: () => void;
}

export function useGeolocator(
  options: UseGeolocatorOptions = {}
): UseGeolocatorReturn {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 5000,
    watch = false,
    onLocationFound,
    onError,
  } = options;

  const [coords, setCoords] = useState<GeolocationCoords | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const onLocationFoundRef = useRef(onLocationFound);
  onLocationFoundRef.current = onLocationFound;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const stopLocating = useCallback(() => {
    if (
      watchIdRef.current !== null &&
      typeof navigator !== "undefined" &&
      navigator.geolocation
    ) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsLocating(false);
  }, []);

  const locateUser = useCallback(
    (optionsOverride?: PositionOptions) => {
      // Clear any prior watch
      if (
        watchIdRef.current !== null &&
        typeof navigator !== "undefined" &&
        navigator.geolocation
      ) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      if (typeof navigator === "undefined" || !navigator.geolocation) {
        const errorMsg = "Geolocation is not supported by your browser.";
        setError(errorMsg);
        setIsLocating(false);
        onErrorRef.current?.(errorMsg);
        return;
      }

      setIsLocating(true);
      setError(null);

      const posOptions: PositionOptions = {
        enableHighAccuracy,
        timeout,
        maximumAge,
        ...optionsOverride,
      };

      const handleSuccess = (position: GeolocationPosition) => {
        const nextCoords: GeolocationCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
        };
        setCoords(nextCoords);
        setIsLocating(false);
        setError(null);
        onLocationFoundRef.current?.(nextCoords);
      };

      const handleError = (geoError: GeolocationPositionError) => {
        let msg = "Unable to retrieve your location.";
        if (geoError.code === 1) {
          // PERMISSION_DENIED
          msg =
            "Location permission denied. Please allow location access in your browser settings.";
        } else if (geoError.code === 2) {
          // POSITION_UNAVAILABLE
          msg = "Location information is unavailable.";
        } else if (geoError.code === 3) {
          // TIMEOUT
          msg = "Location request timed out. Please try again.";
        } else if (geoError.message) {
          msg = geoError.message;
        }

        setError(msg);
        setIsLocating(false);
        onErrorRef.current?.(msg);
      };

      if (watch) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          handleSuccess,
          handleError,
          posOptions
        );
      } else {
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          handleError,
          posOptions
        );
      }
    },
    [enableHighAccuracy, timeout, maximumAge, watch]
  );

  useEffect(() => {
    return () => {
      if (
        watchIdRef.current !== null &&
        typeof navigator !== "undefined" &&
        navigator.geolocation
      ) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  return {
    coords,
    isLocating,
    error,
    locateUser,
    stopLocating,
  };
}

export default useGeolocator;
