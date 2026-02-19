"use client";

import { useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface AddressAutocompleteProps {
  value: string;
  onChange: (
    address: string,
    lat: number | null,
    lng: number | null,
    city?: string,
    region?: string,
    country?: string
  ) => void;
  placeholder?: string;
  error?: string;
  id?: string;
  /** When true, on blur geocode the current value and update map (call onChange) if one result is found */
  geocodeOnBlur?: boolean;
  /** Optional: pass city and country to improve geocode when blur */
  geocodeContext?: { city?: string; country?: string };
}

// Nominatim API endpoint (free OpenStreetMap geocoding service)
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

// Debounce function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null;
  return ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Enter address",
  error,
  id = "address",
  geocodeOnBlur = false,
  geocodeContext,
}: AddressAutocompleteProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [suggestions, setSuggestions] = useState<
    Array<{
      display_name: string;
      lat: string;
      lon: string;
      address?: {
        city?: string;
        town?: string;
        village?: string;
        state?: string;
        country?: string;
      };
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Fetch suggestions from Nominatim
  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
        {
          headers: {
            "User-Agent": "EventPlannerApp/1.0", // Required by Nominatim
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch suggestions");
      }

      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error("Error fetching address suggestions:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search
  const debouncedSearch = useRef(
    debounce((query: string) => {
      fetchSuggestions(query);
    }, 300)
  ).current;

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue, null, null);
    setSelectedIndex(-1);

    if (newValue.length >= 3) {
      debouncedSearch(newValue);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion: (typeof suggestions)[0]) => {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    const address = suggestion.display_name;
    const city = suggestion.address?.city || suggestion.address?.town || suggestion.address?.village || "";
    const region = suggestion.address?.state || "";
    const country = suggestion.address?.country || "";

    onChange(address, lat, lng, city, region, country);
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow click events
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);

    if (geocodeOnBlur && value && value.trim().length >= 3) {
      const query = [value.trim(), geocodeContext?.city, geocodeContext?.country].filter(Boolean).join(", ");
      fetch(`${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`, {
        headers: { "User-Agent": "EventPlannerApp/1.0" },
      })
        .then((res) => (res.ok ? res.json() : []))
        .then(
          (
            data: Array<{
              display_name: string;
              lat: string;
              lon: string;
              address?: { city?: string; town?: string; village?: string; state?: string; country?: string };
            }>
          ) => {
            if (data && data.length === 1) {
              const s = data[0];
              const lat = parseFloat(s.lat);
              const lng = parseFloat(s.lon);
              const city = s.address?.city || s.address?.town || s.address?.village || "";
              const region = s.address?.state || "";
              const country = s.address?.country || "";
              onChange(s.display_name, lat, lng, city, region, country);
            }
          }
        )
        .catch(() => {});
    }
  };

  return (
    <div className="space-y-2 h-[150px] max-h-full relative">
      <div className="relative h-full">
        <Textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          aria-invalid={!!error}
          className="h-full pr-10 resize-none"
        />
        {isLoading && (
          <div className="absolute right-3 top-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-input rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.lat}-${suggestion.lon}-${index}`}
              type="button"
              className={`w-full text-left px-4 py-2 hover:bg-accent focus:bg-accent focus:outline-none ${
                index === selectedIndex ? "bg-accent" : ""
              }`}
              onClick={() => handleSelectSuggestion(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="text-sm font-medium">{suggestion.display_name}</div>
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
