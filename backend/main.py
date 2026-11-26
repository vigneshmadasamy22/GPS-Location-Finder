
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc
from sqlalchemy.exc import SQLAlchemyError

from database import get_db
from models import RouteHistory
from schemas import RouteCreate, RouteResponse

app = FastAPI(title="GPS Location Finder API", version="1.4.0")

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


# Existing endpoints

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


# New route history endpoints

@app.post("/routes", response_model=RouteResponse)
def save_route(route: RouteCreate, db: Session = Depends(get_db)):
    try:
        new_route = RouteHistory(**route.model_dump())

        db.add(new_route)
        db.commit()
        db.refresh(new_route)

        return new_route

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail="Unable to save route to the database."
        )


@app.get("/routes", response_model=list[RouteResponse])
def get_routes(db: Session = Depends(get_db)):
    try:
        routes = (
            db.query(RouteHistory)
            .order_by(
                desc(RouteHistory.searched_at),
                desc(RouteHistory.id)
            )
            .limit(5)
            .all()
        )

        return routes

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Unable to retrieve route history."
        )


@app.delete("/routes")
def clear_routes(db: Session = Depends(get_db)):
    try:
        deleted_count = db.query(RouteHistory).delete()
        db.commit()

        return {
            "message": "Route history cleared successfully!",
            "deleted_count": deleted_count
        }

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail="Unable to clear route history."
        )
