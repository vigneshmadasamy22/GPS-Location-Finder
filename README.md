# GPS Location Finder

A web application that tracks your current location, helps you search for destinations, and displays routes with distance and estimated travel time.

## Features
- Live GPS tracking with Start and Stop controls.
- Interactive map using Leaflet and OpenStreetMap.
- Search destinations.
- Driving and walking routes.
- Displays road distance, estimated travel time, and arrival time.
- Current location and destination markers.
- Recent route history.
- Loading and error handling.
- Next.js sends current GPS coordinates to FastAPI using `POST /location` and displays the API response.
- Responsive user interface.

## Technologies Used
- **Frontend:** Next.js
- **Backend:** Python FastAPI
- **Map:** Leaflet and OpenStreetMap
- **Geocoding:** Nominatim
- **Routing:** OSRM

## How to Run

### Frontend

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open: http://localhost:3000

### Backend

Start the FastAPI backend in a separate terminal:

```powershell
cd backend
python -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend URL: http://127.0.0.1:8000  
Health check: http://127.0.0.1:8000/health  
Location endpoint: `POST http://127.0.0.1:8000/location`

The endpoint accepts JSON such as:

```json
{
  "latitude": 11.0168,
  "longitude": 76.9558
}
```

It validates coordinate ranges and returns a success message with the received latitude and longitude. The frontend sends the first GPS fix after tracking starts. If the backend is unavailable, an error appears in the frontend.

### Frontend

Open another terminal:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend URL: http://127.0.0.1:8000

## How to Use
1. Start the application.
2. Click **Start Tracking** and allow location permission.
3. Search for your destination.
4. Select a destination to view the route.
5. Check the distance and estimated travel time.
6. Click **Stop Tracking** to stop GPS updates.

## Recent Route History
- Stores the last five searched routes.
- Displays destination, distance, travel time, and travel mode.
- Use Clear History to delete saved routes.
- History is stored in the browser.

## Notes
- Internet connection is required for map and routing services.
- Browser location permission is required.
- ETA does not include live traffic.
- Public OpenStreetMap services may have usage limits.
- FastAPI is included as the backend foundation.

## Git and GitHub
This project is hosted on GitHub.

Repository: https://github.com/vigneshmadasamy22/GPS-Location-Finder
