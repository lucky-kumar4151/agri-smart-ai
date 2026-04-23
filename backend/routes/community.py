from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from database import get_database
from middleware.auth import get_current_user
from pydantic import BaseModel
from typing import Optional, List
from bson import ObjectId

router = APIRouter()


class PostCreate(BaseModel):
    question: str
    tags: List[str] = []


class ReplyCreate(BaseModel):
    content: str


@router.get("/posts")
async def get_posts(limit: int = 30, current_user: dict = Depends(get_current_user)):
    db = get_database()
    if db is None:
        return {"posts": []}

    cursor = db.community_posts.find().sort("created_at", -1).limit(limit)
    posts = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        posts.append(doc)

    return {"posts": posts}


@router.post("/posts")
async def create_post(post: PostCreate, current_user: dict = Depends(get_current_user)):
    if not post.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    doc = {
        "author": current_user.get("name", "Anonymous"),
        "user_id": current_user["user_id"],
        "role": current_user.get("role", "farmer"),
        "question": post.question.strip(),
        "tags": post.tags,
        "replies": [],
        "reply_count": 0,
        "created_at": datetime.utcnow().isoformat(),
    }

    result = await db.community_posts.insert_one(doc)
    doc["_id"] = str(result.inserted_id)

    return doc


@router.post("/posts/{post_id}/reply")
async def reply_to_post(post_id: str, reply: ReplyCreate, current_user: dict = Depends(get_current_user)):
    if not reply.content.strip():
        raise HTTPException(status_code=400, detail="Reply cannot be empty")

    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    reply_doc = {
        "author": current_user.get("name", "Anonymous"),
        "user_id": current_user["user_id"],
        "role": current_user.get("role", "farmer"),
        "content": reply.content.strip(),
        "created_at": datetime.utcnow().isoformat(),
    }

    result = await db.community_posts.update_one(
        {"_id": ObjectId(post_id)},
        {
            "$push": {"replies": reply_doc},
            "$inc": {"reply_count": 1}
        }
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")

    return {"message": "Reply added", "reply": reply_doc}


@router.delete("/posts/{post_id}")
async def delete_post(post_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    result = await db.community_posts.delete_one({
        "_id": ObjectId(post_id),
        "user_id": current_user["user_id"]
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found or not authorized")

    return {"message": "Post deleted"}
