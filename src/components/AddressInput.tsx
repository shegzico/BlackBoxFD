'use client';

import { useEffect, useRef, useState } from 'react';

interface AddressInputProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  onAreaDetected?: (area: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

interface PlaceComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

declare global {
  interface Window {
    google?: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            opts?: Record<string, unknown>
          ) => {
            addListener: (event: string, cb: () => void) => void;
            getPlace: () => {
              formatted_address?: string;
              name?: string;
              address_components?: PlaceComponent[];
            };
            setOptions: (opts: Record<string, unknown>) => void;
          };
        };
      };
    };
    initGooglePlaces?: () => void;
    googlePlacesLoaded?: boolean;
  }
}

let loadPromise: Promise<void> | null = null;

function loadGooglePlaces(): Promise<void> {
  if (window.googlePlacesLoaded) return Promise.resolve();
  if (loadPromise) return loadPromise;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    // No API key — skip Google Places, just use plain input
    return Promise.reject('No Google Places API key');
  }

  loadPromise = new Promise<void>((resolve) => {
    window.initGooglePlaces = () => {
      window.googlePlacesLoaded = true;
      resolve();
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGooglePlaces`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });

  return loadPromise;
}

export default function AddressInput({
  id,
  name,
  value,
  onChange,
  onAreaDetected,
  placeholder = 'Enter address...',
  required,
  disabled,
  className,
}: AddressInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autocompleteRef = useRef<any>(null);
  const onAreaDetectedRef = useRef(onAreaDetected);
  onAreaDetectedRef.current = onAreaDetected;
  const [placesAvailable, setPlacesAvailable] = useState(false);

  useEffect(() => {
    loadGooglePlaces()
      .then(() => {
        setPlacesAvailable(true);
        if (inputRef.current && window.google && !autocompleteRef.current) {
          const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
            componentRestrictions: { country: 'ng' },
            fields: ['formatted_address', 'name', 'address_components'],
            types: ['geocode', 'establishment'],
          });

          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            const address = place.formatted_address || place.name || '';
            onChange(address);

            // Try to extract the area/sublocality for auto-fill
            if (onAreaDetectedRef.current && place.address_components) {
              const components = place.address_components;
              // Prefer sublocality_level_1, then sublocality, then locality
              const sub =
                components.find((c) => c.types.includes('sublocality_level_1')) ||
                components.find((c) => c.types.includes('sublocality')) ||
                components.find((c) => c.types.includes('locality'));
              if (sub) onAreaDetectedRef.current(sub.long_name);
            }
          });

          autocompleteRef.current = autocomplete;
        }
      })
      .catch(() => {
        // No API key or load failed — plain input works fine
      });
  }, []);

  const defaultCls = `
    w-full rounded-lg bg-[#18191c] border border-[rgba(255,255,255,0.08)] text-[#f0f0f0]
    px-3 py-3 text-sm placeholder:text-[#a1a4a5]
    focus:outline-none focus:border-[#212629]
    transition-colors disabled:opacity-50
  `;

  return (
    <input
      ref={inputRef}
      id={id}
      name={name}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      className={className || defaultCls}
      autoComplete="off"
    />
  );
}
