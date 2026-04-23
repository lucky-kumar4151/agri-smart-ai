from fastapi import APIRouter, Depends, UploadFile, File, Form
from datetime import datetime
from database import get_database
from models.chat import ChatRequest, ChatResponse
from middleware.auth import get_current_user
from services.chat_service import generate_chat_response, generate_chat_response_with_image
import mimetypes

router = APIRouter()

# ─── Allowed image MIME types for plant disease analysis ─────────────────────
ALLOWED_IMAGE_TYPES = {
    "image/jpeg", "image/jpg", "image/png",
    "image/gif", "image/webp", "image/bmp"
}


@router.post("/query", response_model=ChatResponse)
async def chat_query(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """Text-only chat query — calls Gemini for agricultural advice."""
    response = await generate_chat_response(
        message=request.message,
        language=request.language,
        context=request.context,
        user_id=current_user["user_id"]
    )

    db = get_database()
    if db is not None:
        try:
            await db.chat_history.insert_one({
                "user_id": current_user["user_id"],
                "message": request.message,
                "response": response["response"],
                "category": response["category"],
                "language": request.language,
                "created_at": datetime.utcnow().isoformat()
            })
            await db.search_history.insert_one({
                "user_id": current_user["user_id"],
                "query": request.message,
                "type": "chat",
                "result": {"response": response["response"][:200]},
                "timestamp": datetime.utcnow().isoformat()
            })
        except Exception:
            pass

    return ChatResponse(**response)


@router.post("/query-with-image", response_model=ChatResponse)
async def chat_query_with_image(
    message: str = Form(default=""),
    language: str = Form(default="en"),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Multimodal chat — accepts an image file + optional text message.
    Ideal for plant disease detection, leaf analysis, etc.
    Powered by Gemini Vision (gemini-1.5-flash).
    """
    # Determine MIME type
    content_type = file.content_type or ""
    if not content_type:
        guessed, _ = mimetypes.guess_type(file.filename or "")
        content_type = guessed or "image/jpeg"

    image_bytes = await file.read()

    if content_type in ALLOWED_IMAGE_TYPES:
        response = await generate_chat_response_with_image(
            message=message,
            image_bytes=image_bytes,
            image_mime_type=content_type,
            language=language,
            user_id=current_user["user_id"]
        )
    else:
        # Non-image file: fall back to text query describing the file
        fallback_msg = (
            message if message.strip()
            else f"I uploaded a file named '{file.filename}'. Can you help me with farming advice?"
        )
        response = await generate_chat_response(
            message=fallback_msg,
            language=language,
            user_id=current_user["user_id"]
        )

    db = get_database()
    if db is not None:
        try:
            await db.chat_history.insert_one({
                "user_id": current_user["user_id"],
                "message": f"[Image Upload] {message or 'Plant image analysis'}",
                "response": response["response"],
                "category": response["category"],
                "language": language,
                "created_at": datetime.utcnow().isoformat()
            })
        except Exception:
            pass

    return ChatResponse(**response)


@router.get("/history")
async def get_chat_history(
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Retrieve past chat history for the current user."""
    db = get_database()
    if db is None:
        return {"history": []}

    cursor = db.chat_history.find(
        {"user_id": current_user["user_id"]}
    ).sort("created_at", -1).limit(limit)

    history = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        history.append(doc)

    return {"history": history}


@router.delete("/history")
async def clear_chat_history(current_user: dict = Depends(get_current_user)):
    """Clear all chat history for the current user."""
    db = get_database()
    if db is None:
        return {"message": "Chat history cleared"}
    await db.chat_history.delete_many({"user_id": current_user["user_id"]})
    return {"message": "Chat history cleared"}
