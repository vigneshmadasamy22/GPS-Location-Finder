
from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func

from database import Base


class RouteHistory(Base):
    __tablename__ = "route_history"

    id = Column(Integer, primary_key=True, index=True)
    destination_name = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    distance = Column(Float, nullable=False)
    eta = Column(Float, nullable=False)
    travel_mode = Column(String(50), nullable=False)
    searched_at = Column(DateTime(timezone=True), server_default=func.now())
