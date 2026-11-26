
from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict


class RouteCreate(BaseModel):
    destination_name: str = Field(..., min_length=1, max_length=255)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    distance: float = Field(..., ge=0)
    eta: float = Field(..., ge=0)
    travel_mode: str = Field(..., min_length=1, max_length=50)


class RouteResponse(RouteCreate):
    id: int
    searched_at: datetime

    model_config = ConfigDict(from_attributes=True)
