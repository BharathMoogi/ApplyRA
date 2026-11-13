"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, X } from "lucide-react";

export interface LocationStructuredDetails {
  name?: string;
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  coordinates?: [number, number]; // [lng, lat]
}

export interface LocationSuggestion {
  id: string;
  primary: string; // e.g. "Bengaluru"
  secondary: string; // e.g. "Karnataka, India"
  fullValue: string; // e.g. "Bengaluru, Karnataka, India"
  details: LocationStructuredDetails;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string, details?: LocationStructuredDetails) => void;
  placeholder?: string;
  className?: string;
}

// POI keys to filter out from city search
const EXCLUDED_OSM_KEYS = new Set([
  "amenity", // universities, colleges, schools, hospitals, prisons, cafes
  "historic", // forts, castles, ruins, monuments
  "building", // individual buildings
  "shop", // retail stores
  "tourism", // hotels, museums, attractions
  "leisure", // sports centres, parks, playgrounds
  "highway", // roads, bus stops
  "railway", // stations, platforms
  "office", // corporate offices
  "craft", // workshops
  "landuse", // industrial zones
  "aeroway", // hangars
]);

const EXCLUDED_TYPES = new Set(["house", "street"]);

/**
 * Validates whether an OSM feature represents an actual city, town, administrative region, or place
 * rather than an individual point of interest (POI) like a university, fort, or hospital.
 */
function isCityOrPlace(feature: any): boolean {
  const props = feature?.properties || {};

  // Exclude explicitly banned keys and types
  if (props.osm_key && EXCLUDED_OSM_KEYS.has(props.osm_key.toLowerCase())) {
    return false;
  }
  if (props.type && EXCLUDED_TYPES.has(props.type.toLowerCase())) {
    return false;
  }

  // Recognized place types
  if (props.osm_key === "place") {
    return true;
  }
  if (["city", "district", "state", "country", "county", "locality"].includes(props.type?.toLowerCase())) {
    return true;
  }
  if (
    props.osm_key === "boundary" &&
    (props.osm_value === "administrative" || props.osm_value === "political")
  ) {
    return true;
  }

  return false;
}

/**
 * Calculates a relevance score prioritizing city-level places and exact/prefix name matches
 */
function getFeatureRank(feature: any, query: string): number {
  const p = feature?.properties || {};
  const name = (p.name || "").toLowerCase();
  const q = query.toLowerCase();
  let score = 0;

  // Exact or prefix name matching
  if (name === q) {
    score += 100;
  } else if (name.startsWith(q)) {
    score += 50;
  } else if (p.county && p.county.toLowerCase().includes(q)) {
    score += 40;
  }

  // Hierarchy prioritization: cities and towns first
  if (p.osm_value === "city" || p.type === "city") {
    score += 30;
  } else if (p.osm_value === "town" || p.osm_value === "municipality") {
    score += 20;
  } else if (p.osm_value === "country" || p.type === "country") {
    score += 15;
  } else if (p.osm_value === "state" || p.type === "state" || p.type === "district") {
    score += 10;
  }

  return score;
}

export function LocationAutocomplete({
  value,
  onChange,
  placeholder = "City, state, or country",
  className = "",
}: LocationAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const latestRequestIdRef = useRef<number>(0);
  const cacheRef = useRef<Map<string, LocationSuggestion[]>>(new Map());

  // Keep local input in sync with external value prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Format Photon feature into clean display structure
  const formatSuggestion = useCallback(
    (feature: any, index: number): LocationSuggestion => {
      const props = feature.properties || {};
      const coords = feature.geometry?.coordinates as [number, number] | undefined;

      const name = props.name || props.city || "";
      const secondaryParts: string[] = [];

      if (props.state && props.state.toLowerCase() !== name.toLowerCase()) {
        secondaryParts.push(props.state);
      }
      if (props.country) {
        secondaryParts.push(props.country);
      }

      const secondary = secondaryParts.join(", ");
      const fullParts = [name, ...secondaryParts].filter(Boolean);
      // Deduplicate consecutive tokens while preserving order
      const uniqueParts = fullParts.filter(
        (item, idx) => fullParts.findIndex((p) => p.toLowerCase() === item.toLowerCase()) === idx
      );
      const fullValue = uniqueParts.join(", ");

      const id = `${props.osm_id || index}-${name}-${props.country || ""}`;

      return {
        id,
        primary: name,
        secondary,
        fullValue,
        details: {
          name,
          city: props.city || (props.type === "city" || props.osm_value === "city" ? name : undefined),
          state: props.state,
          country: props.country,
          countryCode: props.countrycode,
          coordinates: coords,
        },
      };
    },
    []
  );

  // Debounced fetch with city-layer prioritization and graceful fallback
  useEffect(() => {
    const trimmed = inputValue.trim();

    // Require at least 2 characters
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      setHasSearched(false);
      return;
    }

    // Check memory cache
    const cacheKey = trimmed.toLowerCase();
    if (cacheRef.current.has(cacheKey)) {
      setSuggestions(cacheRef.current.get(cacheKey) || []);
      setIsLoading(false);
      setHasSearched(true);
      return;
    }

    // Cancel in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const currentRequestId = ++latestRequestIdRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);

    const debounceTimer = setTimeout(async () => {
      try {
        let features: any[] = [];

        // 1. Primary search: target city-level locations using Photon's layer=city filter
        const cityUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=10&lang=en&layer=city`;
        const cityRes = await fetch(cityUrl, { signal: controller.signal });

        if (cityRes.ok) {
          const cityData = await cityRes.json();
          const rawCityFeatures = Array.isArray(cityData.features) ? cityData.features : [];
          features = rawCityFeatures.filter(isCityOrPlace);
        }

        // 2. Fallback search: if city-only returns fewer than 5 results, query without layer filter
        // while strictly excluding POIs (universities, forts, hospitals, shops, etc.)
        if (features.length < 5 && !controller.signal.aborted) {
          try {
            const allUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=10&lang=en`;
            const allRes = await fetch(allUrl, { signal: controller.signal });
            if (allRes.ok) {
              const allData = await allRes.json();
              const rawAll = Array.isArray(allData.features) ? allData.features : [];
              const filteredFallback = rawAll.filter(isCityOrPlace);

              // Merge without duplicates
              const seenOsmIds = new Set(features.map((f) => f.properties?.osm_id).filter(Boolean));
              for (const f of filteredFallback) {
                const id = f.properties?.osm_id;
                if (!id || !seenOsmIds.has(id)) {
                  features.push(f);
                  if (id) seenOsmIds.add(id);
                }
              }
            }
          } catch (fallbackErr: any) {
            // Ignore fallback error if city query already yielded results
            if (features.length === 0 && fallbackErr.name !== "AbortError") {
              console.warn("[LocationAutocomplete] Fallback error:", fallbackErr);
            }
          }
        }

        // Verify request freshness
        if (currentRequestId !== latestRequestIdRef.current) {
          return;
        }

        // 3. Rank results: Prioritize city places and exact/prefix matches
        features.sort((a, b) => getFeatureRank(b, trimmed) - getFeatureRank(a, trimmed));

        const parsed: LocationSuggestion[] = features
          .slice(0, 7)
          .map((f: any, idx: number) => formatSuggestion(f, idx));

        // Deduplicate suggestions by fullValue
        const seenValues = new Set<string>();
        const deduped = parsed.filter((item) => {
          const key = item.fullValue.toLowerCase();
          if (seenValues.has(key)) return false;
          seenValues.add(key);
          return true;
        });

        // Cache result
        cacheRef.current.set(cacheKey, deduped);

        setSuggestions(deduped);
        setHasSearched(true);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.warn("[LocationAutocomplete] Fetch error:", err?.message || err);
          setSuggestions([]);
          setHasSearched(true);
        }
      } finally {
        if (currentRequestId === latestRequestIdRef.current) {
          setIsLoading(false);
        }
      }
    }, 300); // 300ms debounce

    return () => {
      clearTimeout(debounceTimer);
    };
  }, [inputValue, formatSuggestion]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);
    setIsOpen(true);
  };

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    setInputValue(suggestion.fullValue);
    onChange(suggestion.fullValue, suggestion.details);
    setIsOpen(false);
  };

  const handleClear = () => {
    setInputValue("");
    onChange("");
    setSuggestions([]);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "Enter" && suggestions.length > 0 && isOpen) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[0]);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Input
          type="text"
          className="h-8 text-xs pr-7 pl-2"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0 || inputValue.trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
          {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          {!isLoading && inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="pointer-events-auto text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
              title="Clear location"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Autocomplete Suggestions Dropdown */}
      {isOpen && inputValue.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-md border bg-popover text-popover-foreground shadow-lg overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="max-h-56 overflow-y-auto divide-y divide-border/40">
            {isLoading && suggestions.length === 0 && (
              <div className="px-3 py-2.5 text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>Searching cities worldwide...</span>
              </div>
            )}

            {!isLoading && suggestions.length === 0 && hasSearched && (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                No matching cities found. Press enter to search &ldquo;{inputValue}&rdquo;.
              </div>
            )}

            {suggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-muted/80 focus:bg-muted/80 focus:outline-none transition-colors flex items-start gap-2"
              >
                <MapPin className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground truncate">{item.primary}</div>
                  {item.secondary && (
                    <div className="text-[10px] text-muted-foreground truncate">
                      {item.secondary}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* OpenStreetMap Attribution Footer */}
          <div className="px-2.5 py-1 text-[9px] text-muted-foreground/75 bg-muted/40 border-t flex items-center justify-between select-none">
            <span>Location search</span>
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline text-muted-foreground hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              &copy; OpenStreetMap contributors
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
