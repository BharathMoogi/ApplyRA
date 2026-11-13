"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, X } from "lucide-react";

export interface LocationSuggestion {
  id: string;
  primary: string;
  secondary: string;
  fullValue: string;
  countryCode?: string;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
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

  // Format Photon properties into clean location segments
  const formatSuggestion = useCallback(
    (feature: any, index: number): LocationSuggestion => {
      const props = feature.properties || {};
      const name = props.name || props.city || "";
      const parts: string[] = [];

      if (props.state && props.state.toLowerCase() !== name.toLowerCase()) {
        parts.push(props.state);
      }
      if (props.country) {
        parts.push(props.country);
      }

      const secondary = parts.join(", ");
      const fullParts = [name, ...parts].filter(Boolean);
      // Deduplicate consecutive or repeating tokens while preserving order
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
        countryCode: props.countrycode,
      };
    },
    []
  );

  // Debounced fetch from Photon API
  useEffect(() => {
    const trimmed = inputValue.trim();

    // Less than 2 characters: reset suggestions and do not query
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      setHasSearched(false);
      return;
    }

    // Check in-memory cache first to avoid redundant requests
    const cacheKey = trimmed.toLowerCase();
    if (cacheRef.current.has(cacheKey)) {
      setSuggestions(cacheRef.current.get(cacheKey) || []);
      setIsLoading(false);
      setHasSearched(true);
      return;
    }

    // Cancel any previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const currentRequestId = ++latestRequestIdRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);

    const debounceTimer = setTimeout(async () => {
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=7&lang=en`;
        const res = await fetch(url, { signal: controller.signal });

        if (!res.ok) {
          throw new Error(`Photon API returned ${res.status}`);
        }

        const data = await res.json();

        // Check if a newer request has been triggered since this one began
        if (currentRequestId !== latestRequestIdRef.current) {
          return;
        }

        const features = Array.isArray(data.features) ? data.features : [];
        const parsed: LocationSuggestion[] = features.map((f: any, idx: number) =>
          formatSuggestion(f, idx)
        );

        // Deduplicate suggestions by fullValue
        const seenValues = new Set<string>();
        const deduped = parsed.filter((item) => {
          const key = item.fullValue.toLowerCase();
          if (seenValues.has(key)) return false;
          seenValues.add(key);
          return true;
        });

        // Store in cache
        cacheRef.current.set(cacheKey, deduped);

        setSuggestions(deduped);
        setHasSearched(true);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.warn("[LocationAutocomplete] Fetch error:", err?.message || err);
          // Gracefully fallback to empty suggestions without blocking user
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
    onChange(suggestion.fullValue);
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
      // Pick first suggestion on Enter if dropdown is open
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
                <span>Searching worldwide locations...</span>
              </div>
            )}

            {!isLoading && suggestions.length === 0 && hasSearched && (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                No locations found. Press enter to search &ldquo;{inputValue}&rdquo;.
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
                  <div className="font-medium text-foreground truncate">{item.primary}</div>
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
