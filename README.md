# GPS Location Finder — Destination Search & ETA

## Features
- Live GPS tracking with Start/Stop controls
- Leaflet interactive map using OpenStreetMap tiles
- Destination search using OpenStreetMap Nominatim
- Driving and walking route geometry using OpenStreetMap-based OSRM-compatible routing services
- Road distance, estimated drive duration and estimated arrival time
- Current-location marker, destination marker and route line
- Loading/error handling and responsive layout

## Run frontend (Windows PowerShell)
```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```
Open http://localhost:3000.

## Optional FastAPI backend
Open another terminal:
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```
Open http://127.0.0.1:8000.

## Use the app
1. Click Start Tracking and allow browser location permission.
2. Search for a destination and select the correct result.
3. The app draws a driving route and displays road distance, estimated drive time and estimated arrival time.
4. Click Stop Tracking to stop live location updates.

## Services and limitations
- Geocoding: OpenStreetMap Nominatim.
- Driving routes: OSRM public demo routing server.
- Map tiles: OpenStreetMap.
- ETA is a route-service estimate; it does not include live traffic.
- Public OSM services have fair-use policies and may rate-limit requests. This demo is intended for learning/prototyping, not high-volume production.
- Browser location permission is required; localhost is supported for development.
- GPS is read directly in the frontend. FastAPI remains included as the backend project foundation.


## Recent Route History
- The dashboard stores the five most recently calculated routes in browser `localStorage`.
- Each entry shows destination, distance, estimated travel time, travel mode, and search time.
- Use **Clear History** to remove saved entries from this browser.
- History is stored locally in the current browser/device; it is not synced between devices.

## Git and GitHub practice
1. Install Git from https://git-scm.com/downloads.
2. Configure your identity in a terminal:
   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "your-email@example.com"
   ```
3. Create an empty repository on GitHub. Do not add a README or license if you already have these files locally.
4. Open a terminal in this project root (the folder containing this README):
   ```bash
   git init
   git branch -M main
   git status
   git add .
   git commit -m "Add recent route history feature"
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
   git push -u origin main
   ```
5. Replace the remote URL with your own GitHub repository URL. Sign in when Git requests authentication.
6. Refresh the GitHub repository page and confirm that your project folders and files are visible.

### Git basics
- **Git:** version control software that tracks changes to project files.
- **GitHub:** an online platform for hosting Git repositories and collaborating.
- **Repository:** the project folder and its tracked history.
- **Commit:** a saved snapshot of staged changes.
- **Push:** uploads local commits to the remote GitHub repository.

Do not commit secrets, API keys, passwords, `.env` files, or dependency/build folders.
