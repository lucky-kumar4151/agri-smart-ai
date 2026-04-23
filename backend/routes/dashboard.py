from fastapi import APIRouter, Depends, HTTPException, Response
from datetime import datetime, timedelta
from database import get_database
from middleware.auth import get_current_user, require_admin
import csv
import io

router = APIRouter()


# ─── Farmer Dashboard Stats ───────────────────────────────────────────
@router.get("/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    db = get_database()
    if db is None:
        return {"total_chats": 0, "total_predictions": 0, "crop_predictions": 0,
                "disease_detections": 0, "weather_checks": 0, "market_searches": 0, "recent_activity": 0}
    user_id = current_user["user_id"]
    total_chats = await db.chat_history.count_documents({"user_id": user_id})
    total_predictions = await db.predictions.count_documents({"user_id": user_id})
    crop_predictions = await db.predictions.count_documents({"user_id": user_id, "prediction_type": "crop"})
    disease_detections = await db.predictions.count_documents({"user_id": user_id, "prediction_type": "disease"})
    weather_checks = await db.search_history.count_documents({"user_id": user_id, "type": "weather"})
    market_searches = await db.search_history.count_documents({"user_id": user_id, "type": "market"})
    week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
    recent_activity = await db.search_history.count_documents({"user_id": user_id, "timestamp": {"$gte": week_ago}})
    return {"total_chats": total_chats, "total_predictions": total_predictions,
            "crop_predictions": crop_predictions, "disease_detections": disease_detections,
            "weather_checks": weather_checks, "market_searches": market_searches, "recent_activity": recent_activity}


@router.get("/activity")
async def get_activity_timeline(days: int = 30, current_user: dict = Depends(get_current_user)):
    db = get_database()
    if db is None:
        return {"activities": [], "daily_counts": {}}
    user_id = current_user["user_id"]
    cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
    cursor = db.search_history.find({"user_id": user_id, "timestamp": {"$gte": cutoff}}).sort("timestamp", -1).limit(100)
    activities = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        activities.append(doc)
    daily_counts = {}
    for activity in activities:
        date = activity["timestamp"][:10]
        if date not in daily_counts:
            daily_counts[date] = {"chat": 0, "crop_prediction": 0, "disease_detection": 0, "weather": 0, "market": 0}
        t = activity.get("type", "chat")
        if t in daily_counts[date]:
            daily_counts[date][t] += 1
    return {"activities": activities, "daily_counts": daily_counts}


@router.get("/search-history")
async def get_search_history(type: str = None, limit: int = 50, current_user: dict = Depends(get_current_user)):
    db = get_database()
    if db is None:
        return {"history": []}
    query = {"user_id": current_user["user_id"]}
    if type:
        query["type"] = type
    cursor = db.search_history.find(query).sort("timestamp", -1).limit(limit)
    history = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        history.append(doc)
    return {"history": history}


@router.delete("/search-history/{item_id}")
async def delete_history_item(item_id: str, current_user: dict = Depends(get_current_user)):
    from bson import ObjectId
    db = get_database()
    if db is None:
        return {"success": False}
    result = await db.search_history.delete_one({
        "_id": ObjectId(item_id),
        "user_id": current_user["user_id"]
    })
    return {"success": result.deleted_count > 0}


@router.delete("/search-history")
async def clear_all_history(current_user: dict = Depends(get_current_user)):
    db = get_database()
    if db is None:
        return {"success": False}
    await db.search_history.delete_many({"user_id": current_user["user_id"]})
    return {"success": True}



@router.get("/analytics")
async def get_analytics(current_user: dict = Depends(get_current_user)):
    db = get_database()
    if db is None:
        return {"crop_predictions": [], "disease_detections": [], "chat_categories": []}
    user_id = current_user["user_id"]
    crop_cursor = db.predictions.find({"user_id": user_id, "prediction_type": "crop"}).sort("created_at", -1).limit(20)
    crop_data = []
    async for doc in crop_cursor:
        crop_data.append(doc.get("result", {}))
    disease_cursor = db.predictions.find({"user_id": user_id, "prediction_type": "disease"}).sort("created_at", -1).limit(20)
    disease_data = []
    async for doc in disease_cursor:
        disease_data.append(doc.get("result", {}))
    pipeline = [{"$match": {"user_id": user_id}}, {"$group": {"_id": "$category", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    chat_categories = []
    async for doc in db.chat_history.aggregate(pipeline):
        chat_categories.append({"category": doc["_id"], "count": doc["count"]})
    return {"crop_predictions": crop_data, "disease_detections": disease_data, "chat_categories": chat_categories}


# ─── Admin Endpoints ────────────────────────────────────────────────────
@router.get("/admin/stats")
async def get_admin_stats(current_user: dict = Depends(require_admin)):
    db = get_database()
    if db is None:
        return {"total_users": 0, "total_farmers": 0, "total_chats": 0, "total_predictions": 0,
                "today_queries": 0, "total_disease_detections": 0, "new_this_month": 0, "chatbot_queries_month": 0}
    total_users = await db.users.count_documents({})
    total_farmers = await db.users.count_documents({"role": "farmer"})
    total_chats = await db.chat_history.count_documents({})
    total_predictions = await db.predictions.count_documents({})
    total_disease_detections = await db.predictions.count_documents({"prediction_type": "disease"})
    today = datetime.utcnow().replace(hour=0, minute=0, second=0).isoformat()
    today_queries = await db.search_history.count_documents({"timestamp": {"$gte": today}})
    month_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
    new_this_month = await db.users.count_documents({"created_at": {"$gte": month_ago}})
    chatbot_queries_month = await db.chat_history.count_documents({"created_at": {"$gte": month_ago}})
    crop_predictions_today = await db.predictions.count_documents({
        "prediction_type": "crop", "created_at": {"$gte": today}
    })
    return {
        "total_users": total_users, "total_farmers": total_farmers,
        "total_chats": total_chats, "total_predictions": total_predictions,
        "today_queries": today_queries, "total_disease_detections": total_disease_detections,
        "new_this_month": new_this_month, "chatbot_queries_month": chatbot_queries_month,
        "crop_predictions_today": crop_predictions_today
    }


@router.get("/admin/users")
async def get_admin_users(state: str = None, crop: str = None, current_user: dict = Depends(require_admin)):
    db = get_database()
    if db is None:
        return {"users": []}
    query = {}
    if state:
        query["location.state"] = {"$regex": state, "$options": "i"}
    if crop:
        query["farm_details.crops"] = {"$regex": crop, "$options": "i"}
    cursor = db.users.find(query, {"password": 0}).sort("created_at", -1).limit(200)
    users = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        users.append(doc)
    return {"users": users}


@router.get("/admin/users/export-csv")
async def export_farmers_csv(current_user: dict = Depends(require_admin)):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    cursor = db.users.find({}, {"password": 0}).sort("created_at", -1)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Farmer ID", "Name", "Email", "Phone", "State", "City", "Crops", "Joined"])
    async for doc in cursor:
        loc = doc.get("location", {})
        farm = doc.get("farm_details", {})
        crops = ", ".join(farm.get("crops", [])) if isinstance(farm.get("crops"), list) else str(farm.get("crops", ""))
        writer.writerow([
            str(doc.get("_id", ""))[:8].upper(),
            doc.get("name", ""),
            doc.get("email", ""),
            doc.get("phone", ""),
            loc.get("state", ""),
            loc.get("city", ""),
            crops,
            doc.get("created_at", "")[:10] if doc.get("created_at") else ""
        ])
    content = output.getvalue()
    return Response(content=content, media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=farmers.csv"})


@router.get("/admin/chatbot-stats")
async def get_chatbot_stats(current_user: dict = Depends(require_admin)):
    db = get_database()
    if db is None:
        return {"daily_queries": [], "top_questions": [], "language_distribution": []}
    # Daily queries for last 7 days
    daily = []
    for i in range(6, -1, -1):
        day = datetime.utcnow() - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        day_end = day.replace(hour=23, minute=59, second=59, microsecond=0).isoformat()
        count = await db.chat_history.count_documents({"created_at": {"$gte": day_start, "$lte": day_end}})
        daily.append({"date": day.strftime("%b %d"), "count": count})
    # Disease detections per day
    disease_daily = []
    for i in range(6, -1, -1):
        day = datetime.utcnow() - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        day_end = day.replace(hour=23, minute=59, second=59, microsecond=0).isoformat()
        count = await db.predictions.count_documents({
            "prediction_type": "disease",
            "created_at": {"$gte": day_start, "$lte": day_end}
        })
        disease_daily.append({"date": day.strftime("%b %d"), "count": count})
    # Language distribution
    lang_pipeline = [
        {"$group": {"_id": "$language", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    languages = []
    async for doc in db.chat_history.aggregate(lang_pipeline):
        languages.append({"language": doc["_id"] or "en", "count": doc["count"]})
    return {"daily_queries": daily, "disease_daily": disease_daily, "language_distribution": languages}


@router.get("/admin/recent-activity")
async def get_admin_recent_activity(current_user: dict = Depends(require_admin)):
    db = get_database()
    if db is None:
        return {"activities": []}
    activities = []
    async for doc in db.users.find({}, {"name": 1, "email": 1, "created_at": 1, "role": 1}).sort("created_at", -1).limit(3):
        activities.append({
            "icon": "👤",
            "text": f"New {doc.get('role', 'farmer')} registered: {doc.get('name', 'Unknown')}",
            "time": doc.get("created_at", "")
        })
    async for doc in db.predictions.find({}, {"prediction_type": 1, "created_at": 1}).sort("created_at", -1).limit(3):
        ptype = doc.get("prediction_type", "prediction")
        activities.append({
            "icon": "🔬" if ptype == "disease" else "🌾",
            "text": f"{'Disease detection' if ptype == 'disease' else 'Crop prediction'} performed",
            "time": doc.get("created_at", "")
        })
    activities.sort(key=lambda x: x.get("time", ""), reverse=True)
    return {"activities": activities[:8]}


# ─── Chatbot Logs (for admin monitoring) ───
@router.get("/admin/chatbot-logs")
async def get_chatbot_logs(limit: int = 100, current_user: dict = Depends(require_admin)):
    db = get_database()
    if db is None:
        return {"logs": []}
    cursor = db.chat_history.find({}).sort("created_at", -1).limit(limit)
    logs = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        logs.append(doc)
    return {"logs": logs}


# ─── Delete User ───
@router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_admin)):
    from bson import ObjectId
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    try:
        result = await db.users.delete_one({"_id": ObjectId(user_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        # Also clean up user data
        await db.chat_history.delete_many({"user_id": user_id})
        await db.predictions.delete_many({"user_id": user_id})
        await db.search_history.delete_many({"user_id": user_id})
        return {"message": "User and associated data deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── Toggle User Role ───
@router.put("/admin/users/{user_id}/role")
async def toggle_user_role(user_id: str, current_user: dict = Depends(require_admin)):
    from bson import ObjectId
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        new_role = "admin" if user.get("role") == "farmer" else "farmer"
        await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"role": new_role}})
        return {"message": f"Role changed to {new_role}", "new_role": new_role}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── Delete Feedback ───
@router.delete("/admin/feedback/{feedback_id}")
async def delete_feedback(feedback_id: str, current_user: dict = Depends(require_admin)):
    from bson import ObjectId
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    try:
        result = await db.feedback.delete_one({"_id": ObjectId(feedback_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Feedback not found")
        return {"message": "Feedback deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── System Settings ───
@router.get("/admin/settings")
async def get_system_settings(current_user: dict = Depends(require_admin)):
    db = get_database()
    if db is None:
        return {"settings": {}}
    doc = await db.system_settings.find_one({"_id": "global"}) or {}
    doc.pop("_id", None)
    return {"settings": doc}


@router.put("/admin/settings")
async def update_system_settings(settings_data: dict, current_user: dict = Depends(require_admin)):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    settings_data["updated_at"] = datetime.utcnow().isoformat()
    settings_data["updated_by"] = current_user["user_id"]
    await db.system_settings.update_one(
        {"_id": "global"}, {"$set": settings_data}, upsert=True
    )
    return {"message": "Settings updated successfully"}

