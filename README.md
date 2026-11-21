# GPS Location Finder

A web application that tracks your current location, helps you search for destinations, and displays routes with distance and estimated travel time.

## Features
- Live GPS tracking with Start and Stop controls.
- Interactive map using Leaflet and OpenStreetMap.
- Search destinations.
- Driving and walking routes.
- Displays road distance, estimated travel time, and arrival time.
- Current location and destination markers.
- Recent route history (last five routes, stored in browser localStorage).
- Next.js sends the first GPS fix to FastAPI using `POST /location`.
- Displays the backend response and a clear error if the backend cannot be reached.
- Responsive user interface.

## Technologies
- Frontend: Next.js, React, TypeScript
- Backend: Python, FastAPI, Pydantic
- Map: Leaflet and OpenStreetMap
- Geocoding: Nominatim
- Routing: OpenStreetMap routing service

## How to Run

Run the frontend and backend in two separate PowerShell terminals.

### 1. Backend (FastAPI)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend: http://127.0.0.1:8000  
Health check: http://127.0.0.1:8000/health  
API documentation: http://127.0.0.1:8000/docs

### 2. Frontend (Next.js)

In a second terminal, from the repository root:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open http://localhost:3000.

The frontend uses `http://127.0.0.1:8000` as the default API base URL. To use a different backend address, create `frontend/.env.local` with:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Restart the Next.js development server after changing this value.

## Location API

The frontend sends the first GPS position received after **Start Tracking** to:

`POST http://127.0.0.1:8000/location`

Request JSON:

```json
{
  "latitude": 11.0168,
  "longitude": 76.9558
}
```

The backend validates latitude (-90 to 90) and longitude (-180 to 180), then responds with:

```json
{
  "message": "Location received successfully!",
  "latitude": 11.0168,
  "longitude": 76.9558
}
```

If FastAPI is unavailable or the request fails, the frontend displays an error message. The backend allows requests from the local Next.js development origins on port 3000.

## How to Use
1. Start the backend and frontend.
2. Open http://localhost:3000.
3. Click **Start Tracking** and allow browser location permission.
4. The first GPS coordinates are sent to FastAPI and its response appears in the location tracking panel.
5. Search for a destination and select a travel mode to view a route.
6. Use **Stop Tracking** to stop GPS updates.

## Recent Route History
- Stores the five most recent successfully calculated routes.
- Displays destination, distance, ETA, and travel mode.
- Use **Clear History** to remove saved history.
- History is stored locally in the browser.

## Notes
- An internet connection is required for map tiles, geocoding, and routing.
- Browser location permission is required; localhost is treated as a secure context by modern browsers.
- ETA does not include live traffic.
- Public OpenStreetMap services may have usage limits.
- The FastAPI backend must be running for the coordinate submission feature.

## GitHub
https://github.com/vigneshmadasamy22/GPS-Location-Finder
