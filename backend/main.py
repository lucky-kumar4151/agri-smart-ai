from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from config import get_settings
from database import connect_to_mongo, close_mongo_connection
from routes.auth import router as auth_router
from routes.chat import router as chat_router
from routes.predict import router as predict_router
from routes.weather_market import router as weather_market_router
from routes.dashboard import router as dashboard_router
from routes.feedback import router as feedback_router
from routes.community import router as community_router
from routes.expert_guidelines import router as expert_guidelines_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    # Seed admin user if not exists
    await seed_admin()
    yield
    await close_mongo_connection()


async def seed_admin():
    """Create admin@gmail.com with password 123456 if no admin exists."""
    from database import get_database
    from middleware.auth import hash_password
    from datetime import datetime

    db = get_database()
    if db is None:
        return

    existing_admin = await db.users.find_one({"email": "admin@gmail.com"})
    if existing_admin:
        return  # Admin already exists

    admin_doc = {
        "name": "Admin",
        "email": "admin@gmail.com",
        "password": hash_password("123456"),
        "phone": "",
        "role": "admin",
        "language": "en",
        "location": {"state": "", "district": "", "city": ""},
        "farm_details": {"farm_size": "", "farm_size_unit": "acres", "crops": [], "soil_type": "", "irrigation_type": ""},
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    await db.users.insert_one(admin_doc)
    print("[SEED] ✅ Admin user created: admin@gmail.com / 123456")


app = FastAPI(
    title="AgriSmart API",
    description="AI-Based Decision Support and Chatbot System for Farmers",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Routes
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(chat_router, prefix="/api/chat", tags=["Chatbot"])
app.include_router(predict_router, prefix="/api/predict", tags=["Predictions"])
app.include_router(weather_market_router, prefix="/api", tags=["Weather and Market"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(feedback_router, prefix="/api", tags=["Feedback"])
app.include_router(community_router, prefix="/api/community", tags=["Community"])
app.include_router(expert_guidelines_router, prefix="/api/expert-guidelines", tags=["Expert Guidelines"])


@app.get("/")
async def root():
    return {
        "name": "AgriSmart API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/api/health"
    }


@app.get("/api/health")
async def health_check():
    from database import get_database
    db = get_database()
    return {
        "status": "healthy",
        "database": "connected" if db is not None else "disconnected",
        "environment": settings.APP_ENV
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
