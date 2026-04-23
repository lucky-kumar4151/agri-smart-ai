"""
Feedback Service - User feedback collection
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from database import get_database
from middleware.auth import get_current_user

router = APIRouter()


class FeedbackCreate(BaseModel):
    type: str = Field(..., description="general, bug, suggestion, praise")
    content: str = Field(..., min_length=5, max_length=2000)
    rating: Optional[int] = Field(None, ge=1, le=5)
    page: Optional[str] = None


@router.post("/feedback")
async def submit_feedback(
    feedback: FeedbackCreate,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()

    now_utc = datetime.now(timezone.utc)

    record = {
        "user_id": current_user["user_id"],
        "user_name": current_user.get("name", "Unknown"),
        "user_email": current_user.get("email", ""),
        "type": feedback.type,
        "content": feedback.content,
        "rating": feedback.rating,
        "page": feedback.page,
        # ISO 8601 with timezone — e.g. "2026-03-17T16:28:37+00:00"
        "timestamp": now_utc.isoformat(),
        # Also store as datetime object for proper MongoDB sorting
        "created_at": now_utc,
    }

    if db is not None:
        try:
            result = await db.feedback.insert_one(record)
            record["_id"] = str(result.inserted_id)
        except Exception:
            pass

    return {
        "message": "Feedback submitted successfully. Thank you!",
        "submitted_at": now_utc.isoformat(),
    }


@router.get("/feedback")
async def get_feedback(
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    if db is None:
        return {"feedback": []}

    # Admin sees all, regular users see their own
    query = {} if current_user.get("role") == "admin" else {"user_id": current_user["user_id"]}

    # Sort by created_at (datetime) for accuracy, fallback to timestamp string
    try:
        cursor = db.feedback.find(query).sort("created_at", -1).limit(limit)
    except Exception:
        cursor = db.feedback.find(query).sort("timestamp", -1).limit(limit)

    items = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        # Convert datetime objects to ISO strings for JSON serialization
        if "created_at" in doc and hasattr(doc["created_at"], "isoformat"):
            doc["created_at"] = doc["created_at"].isoformat()
        items.append(doc)

    return {"feedback": items}


