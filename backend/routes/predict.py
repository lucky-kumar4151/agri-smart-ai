from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from datetime import datetime
from database import get_database
from models.prediction import CropPredictionRequest, CropPredictionResponse
from middleware.auth import get_current_user
from services.crop_service import predict_crop, analyze_soil
from services.disease_service import detect_disease
import os
import uuid

router = APIRouter()

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "ml", "disease_model", "disease_model_yolo.pt")


@router.post("/crop", response_model=CropPredictionResponse)
async def predict_crop_route(request: CropPredictionRequest, current_user: dict = Depends(get_current_user)):
    result = predict_crop(request)
    soil_analysis = analyze_soil(request)

    response = CropPredictionResponse(
        recommended_crops=result["crops"],
        soil_analysis=soil_analysis,
        farming_tips=result.get("tips", []),
        model_used=result.get("model_used", ""),
    )

    db = get_database()
    if db is not None:
        try:
            await db.predictions.insert_one({
                "user_id": current_user["user_id"],
                "prediction_type": "crop",
                "input_data": request.model_dump(),
                "result": response.model_dump(),
                "created_at": datetime.utcnow().isoformat()
            })
            await db.search_history.insert_one({
                "user_id": current_user["user_id"],
                "query": f"Crop recommendation: N={request.nitrogen}, P={request.phosphorus}, K={request.potassium}",
                "type": "crop_prediction",
                "result": {"crops": [c["name"] for c in result["crops"][:3]]},
                "timestamp": datetime.utcnow().isoformat()
            })
        except Exception:
            pass

    return response


@router.post("/disease")
async def detect_disease_route(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    try:
        allowed_types = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Only image files (JPEG, PNG, WebP) are allowed")

        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        # Save to uploads directory
        upload_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        filename = f"{uuid.uuid4()}_{file.filename}"
        filepath = os.path.join(upload_dir, filename)
        
        try:
            with open(filepath, "wb") as f:
                f.write(contents)
        except Exception as e:
            print(f"[ERROR] Failed to save uploaded file: {e}")
            # Continue anyway as we have the contents in memory

        # Perform detection
        result = await detect_disease(contents)
        
        if not result or "disease_name" not in result:
            raise Exception("Detection service returned invalid result")

        # Save to database
        db = get_database()
        if db is not None:
            try:
                await db.predictions.insert_one({
                    "user_id": current_user["user_id"],
                    "prediction_type": "disease",
                    "image_path": filename,
                    "input_data": {"filename": file.filename, "content_type": file.content_type},
                    "result": result,
                    "created_at": datetime.utcnow().isoformat()
                })
                await db.search_history.insert_one({
                    "user_id": current_user["user_id"],
                    "query": f"Disease detection: {file.filename}",
                    "type": "disease_detection",
                    "result": {"disease": result.get("disease_name", "Unknown")},
                    "timestamp": datetime.utcnow().isoformat()
                })
            except Exception as e:
                print(f"[ERROR] Failed to log prediction to DB: {e}")

        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Disease detection route failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@router.get("/model-status")
async def get_model_status():
    """Check whether the YOLOv8 disease model is trained and available"""
    model_exists = os.path.exists(os.path.abspath(MODEL_PATH))
    return {
        "disease_model": {
            "status": "loaded" if model_exists else "not_trained",
            "model_file": "disease_model_yolo.pt",
            "path": str(os.path.abspath(MODEL_PATH)),
            "exists": model_exists,
            "message": (
                "YOLOv8 model is loaded and ready for accurate inference."
                if model_exists else
                "Model not trained yet. Using advanced image analysis fallback. "
                "Run ml/disease_model/train_disease_model.py to train."
            )
        }
    }


async def get_prediction_history(
    prediction_type: str = None,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    if db is None:
        return {"predictions": []}

    query = {"user_id": current_user["user_id"]}
    if prediction_type:
        query["prediction_type"] = prediction_type

    cursor = db.predictions.find(query).sort("created_at", -1).limit(limit)
    predictions = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        predictions.append(doc)

    return {"predictions": predictions}
