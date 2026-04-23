from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    FARMER = "farmer"
    ADMIN = "admin"
    USER = "user"

class Location(BaseModel):
    state: str = ""
    district: str = ""
    city: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class FarmDetails(BaseModel):
    farm_size: str = ""
    farm_size_unit: str = "acres"
    crops: List[str] = []
    soil_type: str = ""
    irrigation_type: str = ""

class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: str = Field(default="")
    role: UserRole = UserRole.FARMER
    language: str = "en"
    location: Location = Location()
    farm_details: FarmDetails = FarmDetails()

    model_config = {"extra": "ignore"}

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    role: str
    language: str
    location: dict
    farm_details: dict
    created_at: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    language: Optional[str] = None
    location: Optional[Location] = None
    farm_details: Optional[FarmDetails] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
