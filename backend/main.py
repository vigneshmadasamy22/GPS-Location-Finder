from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="GPS Location Finder API", version="1.3.0")

# Allow the local Next.js development server to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LocationPayload(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


@app.get("/")
def root():
    return {"message": "GPS Location Finder API is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/location")
def receive_location(location: LocationPayload):
    return {
        "message": "Location received successfully!",
        "latitude": location.latitude,
        "longitude": location.longitude,
    }
