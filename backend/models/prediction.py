from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class CropPredictionRequest(BaseModel):
    nitrogen: float = Field(..., ge=0, le=200, description="Nitrogen content in soil")
    phosphorus: float = Field(..., ge=0, le=200, description="Phosphorus content in soil")
    potassium: float = Field(..., ge=0, le=200, description="Potassium content in soil")
    temperature: float = Field(..., ge=-10, le=60, description="Temperature in Celsius")
    humidity: float = Field(..., ge=0, le=100, description="Humidity percentage")
    ph: float = Field(..., ge=0, le=14, description="Soil pH value")
    rainfall: float = Field(..., ge=0, le=500, description="Rainfall in mm")

class CropPredictionResponse(BaseModel):
    recommended_crops: List[dict]  # [{name, confidence, season, description}]
    soil_analysis: dict
    farming_tips: List[str]
    model_used: Optional[str] = ""

class DiseaseDetectionResponse(BaseModel):
    disease_name: str
    confidence: float
    description: str
    treatment: List[str]
    pesticide: List[str]
    prevention: List[str]
    crop_type: str

class PredictionRecord(BaseModel):
    user_id: str
    prediction_type: str  # "crop" or "disease"
    input_data: dict
    result: dict
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
