
"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const LocationMap = dynamic(() => import("./location-map"), {
  ssr: false,
  loading: () => <div className="map-loading">Loading interactive map...</div>
});

type Position = {
  latitude: number;
  longitude: number;
  accuracy: number;
  updatedAt: string;
};

type LocationApiResponse = {
  message: string;
  latitude: number;
  longitude: number;
};

type Place = {
  id: string;
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
};

type TravelMode = "driving" | "walking";

type RouteInfo = {
  distanceKm: number;
  durationMinutes: number;
  coordinates: [number, number][];
  mode: TravelMode;
};

type RouteHistoryItem = {
  id: string;
  destination: string;
  displayName: string;
  distanceKm: number;
  etaMinutes: number;
  mode: TravelMode;
  searchedAt: string;
};

type BackendRoute = {
  id: number;
  destination_name: string;
  latitude: number;
  longitude: number;
  distance: number;
  eta: number;
  travel_mode: TravelMode;
  searched_at: string;
};

function locationError(e: GeolocationPositionError) {
  if (e.code === 1)
    return "Location permission denied. Allow location access in browser settings.";

  if (e.code === 2)
    return "Your location is unavailable. Check device location settings or GPS signal.";

  if (e.code === 3)
    return "Location request timed out. Please try again outdoors.";

  return "Unable to retrieve your location. Please try again.";
}

export default function Home() {
  const [position, setPosition] = useState<Position | null>(null);
  const [tracking, setTracking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [apiResponse, setApiResponse] =
    useState<LocationApiResponse | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const [travelMode, setTravelMode] = useState<TravelMode>("driving");

  const [routeHistory, setRouteHistory] = useState<RouteHistoryItem[]>([]);
  const [historyReady, setHistoryReady] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [destination, setDestination] = useState<Place | null>(null);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");

  const watchId = useRef<number | null>(null);
  const lastOrigin = useRef<[number, number] | null>(null);
  const destinationRef = useRef<Place | null>(null);
  const backendSubmitted = useRef(false);

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

  destinationRef.current = destination;

  // Load route history from PostgreSQL through FastAPI.
  useEffect(() => {
    async function loadRouteHistory() {
      setHistoryLoading(true);
      setHistoryError("");

      try {
        const response = await fetch(`${apiBaseUrl}/routes`);

        if (!response.ok) {
          throw new Error("Unable to load route history from the database.");
        }

        const data: BackendRoute[] = await response.json();

        const formattedHistory: RouteHistoryItem[] = data.map((item) => ({
          id: String(item.id),
          destination: item.destination_name,
          displayName: item.destination_name,
          distanceKm: item.distance,
          etaMinutes: item.eta,
          mode: item.travel_mode,
          searchedAt: item.searched_at
        }));

        setRouteHistory(formattedHistory);
      } catch (err) {
        setHistoryError(
          err instanceof Error
            ? err.message
            : "Could not load route history."
        );
      } finally {
        setHistoryLoading(false);
        setHistoryReady(true);
      }
    }

    loadRouteHistory();
  }, [apiBaseUrl]);

  // Search for a destination using OpenStreetMap Nominatim.
  async function searchDestination(e?: React.FormEvent) {
    e?.preventDefault();

    const q = query.trim();

    if (!q) {
      setSearchError("Enter a place or area name.");
      return;
    }

    setSearching(true);
    setSearchError("");
    setPlaces([]);
    setDestination(null);
    setRoute(null);
    setRouteError("");

    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`
      );

      if (!r.ok) {
        throw new Error("Destination search is temporarily unavailable.");
      }

      const data = await r.json();

      const found: Place[] = data.map((x: any, i: number) => ({
        id: String(x.place_id ?? i),
        name: x.name || x.display_name.split(",")[0],
        displayName: x.display_name,
        latitude: Number(x.lat),
        longitude: Number(x.lon)
      }));

      if (!found.length) {
        setSearchError("No matching places found. Try another search.");
      } else {
        setPlaces(found);
      }
    } catch (err) {
      setSearchError(
        err instanceof Error
          ? err.message
          : "Could not search for this destination."
      );
    } finally {
      setSearching(false);
    }
  }

  // Calculate route and save it to PostgreSQL.
  async function calculateRoute(
    place: Place,
    origin: Position | null = position,
    mode: TravelMode = travelMode
  ) {
    if (!origin) {
      setRouteError(
        "Start location tracking first, then select a destination."
      );
      setDestination(place);
      return;
    }

    setDestination(place);
    setPlaces([]);
    setRoute(null);
    setRouteLoading(true);
    setRouteError("");
    setHistoryError("");

    try {
      // Select the OpenStreetMap routing service.
      const server =
        mode === "driving" ? "routed-car" : "routed-foot";

      const url =
        `https://routing.openstreetmap.de/${server}/route/v1/driving/` +
        `${origin.longitude},${origin.latitude};${place.longitude},${place.latitude}` +
        `?overview=full&geometries=geojson&steps=false`;

      const r = await fetch(url);

      if (!r.ok) {
        throw new Error(
          "The selected travel mode routing service is unavailable. Please try again later."
        );
      }

      const data = await r.json();

      if (data.code !== "Ok" || !data.routes?.length) {
        throw new Error(
          `No ${mode} route is available for this destination. Try the other travel mode.`
        );
      }

      const best = data.routes[0];

      const distanceKm = best.distance / 1000;
      const durationMinutes = best.duration / 60;

      // Update the map and route summary.
      setRoute({
        mode,
        distanceKm,
        durationMinutes,
        coordinates: best.geometry.coordinates.map(
          (p: [number, number]) => [p[1], p[0]]
        )
      });

      lastOrigin.current = [origin.latitude, origin.longitude];

      // Save the route to PostgreSQL through FastAPI.
      try {
        const response = await fetch(`${apiBaseUrl}/routes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            destination_name: place.name,
            latitude: place.latitude,
            longitude: place.longitude,
            distance: distanceKm,
            eta: durationMinutes,
            travel_mode: mode
          })
        });

        const savedData = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            savedData?.detail || "Unable to save route to the database."
          );
        }

        const savedRoute: BackendRoute = savedData;

        const newHistoryItem: RouteHistoryItem = {
          id: String(savedRoute.id),
          destination: savedRoute.destination_name,
          displayName: place.displayName,
          distanceKm: savedRoute.distance,
          etaMinutes: savedRoute.eta,
          mode: savedRoute.travel_mode,
          searchedAt: savedRoute.searched_at
        };

        setRouteHistory((previous) =>
          [newHistoryItem, ...previous].slice(0, 5)
        );
      } catch (err) {
        setHistoryError(
          err instanceof Error
            ? err.message
            : "Route calculated, but database saving failed."
        );
      }
    } catch (err) {
      setRouteError(
        err instanceof Error
          ? err.message
          : "Unable to calculate route for this travel mode."
      );
    } finally {
      setRouteLoading(false);
    }
  }

  // Clear route history from PostgreSQL.
  async function clearRouteHistory() {
    setHistoryError("");

    try {
      const response = await fetch(`${apiBaseUrl}/routes`, {
        method: "DELETE"
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail || "Unable to clear route history."
        );
      }

      setRouteHistory([]);
    } catch (err) {
      setHistoryError(
        err instanceof Error
          ? err.message
          : "Could not clear route history."
      );
    }
  }

  // Send GPS coordinates to FastAPI.
  async function sendLocationToBackend(
    latitude: number,
    longitude: number
  ) {
    setApiLoading(true);
    setApiError("");
    setApiResponse(null);

    try {
      const response = await fetch(`${apiBaseUrl}/location`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ latitude, longitude })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail || `Backend request failed (${response.status}).`
        );
      }

      setApiResponse(data as LocationApiResponse);
    } catch (err) {
      setApiError(
        err instanceof Error
          ? `Could not reach the backend: ${err.message}`
          : "Could not send location to the backend. Check that FastAPI is running."
      );
    } finally {
      setApiLoading(false);
    }
  }

  // Handle GPS position updates.
  function receivePosition(p: GeolocationPosition) {
    const next = {
      latitude: p.coords.latitude,
      longitude: p.coords.longitude,
      accuracy: p.coords.accuracy,
      updatedAt: new Date(p.timestamp).toLocaleTimeString()
    };

    setPosition(next);
    setLoading(false);
    setError("");

    if (!backendSubmitted.current) {
      backendSubmitted.current = true;
      void sendLocationToBackend(next.latitude, next.longitude);
    }

    const selected = destinationRef.current;

    if (selected && lastOrigin.current) {
      const moved = Math.hypot(
        (next.latitude - lastOrigin.current[0]) * 111000,
        (next.longitude - lastOrigin.current[1]) * 85000
      );

      if (moved > 40) {
        void calculateRoute(selected, next, travelMode);
      }
    }
  }

  function stopTracking() {
    if (watchId.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchId.current);
    }

    watchId.current = null;
    setTracking(false);
  }

  function startTracking() {
    setError("");
    setApiError("");
    setApiResponse(null);
    backendSubmitted.current = false;
    setLoading(true);

    if (!("geolocation" in navigator)) {
      setError("Your browser does not support location services.");
      setLoading(false);
      return;
    }

    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
    }

    watchId.current = navigator.geolocation.watchPosition(
      receivePosition,
      (e) => {
        setError(locationError(e));
        setLoading(false);
        stopTracking();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 30000
      }
    );

    setTracking(true);
  }

  // Stop GPS tracking when the component is unmounted.
  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  const eta = route
    ? new Date(
        Date.now() + route.durationMinutes * 60000
      ).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })
    : "—";

  return (
    <main className="page-shell">
      <div className="dashboard">

        <header className="top-header">
          <div className="brand-icon">⌖</div>

          <div>
            <p className="eyebrow">LIVE GPS DASHBOARD</p>
            <h1>GPS Location Finder</h1>
            <p className="subtitle">
              Track your location and compare travel options.
            </p>
          </div>
        </header>

        <section className="control-card">
          <div className="section-heading">
            <div>
              <h2>Location tracking</h2>
              <p>Allow browser location access to get started.</p>
            </div>

            <span className={`status-pill ${tracking ? "is-live" : ""}`}>
              <span className="status-dot" />
              {tracking ? "LIVE" : "NOT TRACKING"}
            </span>
          </div>

          <div className="button-row">
            <button
              className="primary-button"
              onClick={startTracking}
              disabled={tracking || loading}
            >
              {loading ? "◌ Getting location..." : "▶ Start Tracking"}
            </button>

            <button
              className="secondary-button"
              onClick={stopTracking}
              disabled={!tracking}
            >
              ■ Stop Tracking
            </button>
          </div>

          {loading && (
            <div className="notice loading-notice">
              Detecting your location. Please allow permission and wait...
            </div>
          )}

          {error && (
            <div className="notice error-notice" role="alert">
              {error}
            </div>
          )}

          {apiLoading && (
            <div className="notice loading-notice">
              Sending coordinates to FastAPI...
            </div>
          )}

          {apiError && (
            <div className="notice error-notice" role="alert">
              {apiError}
            </div>
          )}

          {apiResponse && (
            <div className="notice success-notice" role="status">
              <strong>{apiResponse.message}</strong>
              <br />
              Latitude: {apiResponse.latitude.toFixed(7)} · Longitude:{" "}
              {apiResponse.longitude.toFixed(7)}
            </div>
          )}
        </section>

        <section className="destination-card">
          <div className="destination-heading">
            <div>
              <h2>Plan your destination</h2>
              <p>
                Search for a place, then choose how you want to travel.
              </p>
            </div>

            <span className="driving-badge">ROUTE PLANNER</span>
          </div>

          <form className="search-row" onSubmit={searchDestination}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search destination (e.g. Coimbatore Railway Station)"
              aria-label="Search destination"
            />

            <button
              className="search-button"
              type="submit"
              disabled={searching}
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </form>

          {searchError && (
            <p className="inline-error">{searchError}</p>
          )}

          {places.length > 0 && (
            <div className="place-results">
              {places.map((p) => (
                <button
                  className="place-result"
                  key={p.id}
                  onClick={() => calculateRoute(p)}
                >
                  <span className="place-result-icon">⌖</span>

                  <span>
                    <strong>{p.name}</strong>
                    <small>{p.displayName}</small>
                  </span>

                  <b>›</b>
                </button>
              ))}
            </div>
          )}

          {destination && (
            <div className="travel-mode-row">
              <span className="mode-label">TRAVEL MODE</span>

              <div className="mode-options">
                <button
                  type="button"
                  className={`mode-button ${
                    travelMode === "driving" ? "active" : ""
                  }`}
                  onClick={() => {
                    setTravelMode("driving");
                    void calculateRoute(destination, position, "driving");
                  }}
                >
                  🚗 Driving
                </button>

                <button
                  type="button"
                  className={`mode-button ${
                    travelMode === "walking" ? "active" : ""
                  }`}
                  onClick={() => {
                    setTravelMode("walking");
                    void calculateRoute(destination, position, "walking");
                  }}
                >
                  🚶 Walking
                </button>
              </div>
            </div>
          )}

          {routeLoading && (
            <div className="notice loading-notice">
              Calculating {travelMode} route and estimated travel time...
            </div>
          )}

          {routeError && (
            <p className="inline-error">{routeError}</p>
          )}

          {destination && (
            <div className="selected-destination">
              <span className="destination-pin">●</span>

              <div>
                <small>SELECTED DESTINATION</small>
                <strong>{destination.displayName}</strong>
              </div>

              <button
                className="clear-destination"
                onClick={() => {
                  setDestination(null);
                  setRoute(null);
                  setRouteError("");
                }}
              >
                Clear
              </button>
            </div>
          )}

          {route && (
            <div className="route-summary">
              <div>
                <small>
                  {route.mode === "driving"
                    ? "DRIVING DISTANCE"
                    : "WALKING DISTANCE"}
                </small>
                <strong>{route.distanceKm.toFixed(1)} km</strong>
              </div>

              <div>
                <small>
                  ESTIMATED {route.mode === "driving" ? "DRIVE" : "WALK"}
                </small>
                <strong>
                  {Math.max(1, Math.round(route.durationMinutes))} min
                </strong>
              </div>

              <div>
                <small>ESTIMATED ARRIVAL</small>
                <strong>{eta}</strong>
              </div>
            </div>
          )}

          <p className="routing-note">
            Travel times are estimates from OpenStreetMap-based routing
            and do not include live traffic. Some destinations may not
            have a route for both modes.
          </p>
        </section>

        <section className="history-card">
          <div className="history-heading">
            <div>
              <h2>Recent route history</h2>
              <p>
                Your 5 most recent successfully calculated routes are
                saved in the PostgreSQL database.
              </p>
            </div>

            <button
              className="clear-history-button"
              type="button"
              onClick={clearRouteHistory}
              disabled={routeHistory.length === 0 || !historyReady}
            >
              Clear History
            </button>
          </div>

          {historyLoading && (
            <div className="notice loading-notice">
              Loading route history from database...
            </div>
          )}

          {historyError && (
            <div className="notice error-notice" role="alert">
              {historyError}
            </div>
          )}

          {routeHistory.length > 0 ? (
            <div className="history-list">
              {routeHistory.map((item) => (
                <article className="history-item" key={item.id}>
                  <div className="history-place">
                    <span className="history-pin">⌖</span>

                    <div>
                      <strong>{item.destination}</strong>
                      <small>{item.displayName}</small>
                    </div>
                  </div>

                  <div className="history-stats">
                    <span>
                      <small>DISTANCE</small>
                      <strong>{item.distanceKm.toFixed(1)} km</strong>
                    </span>

                    <span>
                      <small>ETA</small>
                      <strong>
                        {Math.max(1, Math.round(item.etaMinutes))} min
                      </strong>
                    </span>

                    <span>
                      <small>MODE</small>
                      <strong>
                        {item.mode === "driving"
                          ? "🚗 Driving"
                          : "🚶 Walking"}
                      </strong>
                    </span>
                  </div>

                  <time>
                    {new Date(item.searchedAt).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short"
                    })}
                  </time>
                </article>
              ))}
            </div>
          ) : (
            !historyLoading && (
              <div className="history-empty">
                No recent routes yet. Search for a destination and
                calculate a route to see it here.
              </div>
            )
          )}
        </section>

        <section className="content-grid">
          <div className="map-card">
            <div className="card-title-row">
              <div>
                <h2>Interactive map</h2>
                <p>OpenStreetMap · Live location and route</p>
              </div>

              <span className="map-tag">LEAFLET</span>
            </div>

            <LocationMap
              latitude={position?.latitude ?? null}
              longitude={position?.longitude ?? null}
              accuracy={position?.accuracy ?? null}
              destinationLatitude={destination?.latitude ?? null}
              destinationLongitude={destination?.longitude ?? null}
              routeCoordinates={route?.coordinates ?? []}
            />

            <p className="map-footnote">
              Your marker updates while tracking. Select a destination
              and travel mode to display its route.
            </p>
          </div>

          <aside className="details-card">
            <h2>Location details</h2>

            {position ? (
              <>
                <div className="coordinate-block">
                  <span>LATITUDE</span>
                  <strong>{position.latitude.toFixed(7)}°</strong>
                </div>

                <div className="coordinate-block">
                  <span>LONGITUDE</span>
                  <strong>{position.longitude.toFixed(7)}°</strong>
                </div>

                <div className="detail-line">
                  <span>Accuracy</span>
                  <strong>±{Math.round(position.accuracy)} metres</strong>
                </div>

                <div className="detail-line">
                  <span>Last updated</span>
                  <strong>{position.updatedAt}</strong>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-pin">⌖</div>
                <strong>No location yet</strong>
                <p>
                  Press Start Tracking to display your coordinates and
                  map marker.
                </p>
              </div>
            )}

            <div className="privacy-note">
              Your browser asks permission before sharing your location.
              Tracking stops when you press Stop Tracking or close this page.
            </div>
          </aside>
        </section>

        <footer>
          GPS Location Finder · Next.js + Leaflet + OpenStreetMap ·
          Driving and walking routes via OpenStreetMap routing
        </footer>

      </div>
    </main>
  );
}
