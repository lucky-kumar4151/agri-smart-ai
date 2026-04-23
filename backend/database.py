from motor.motor_asyncio import AsyncIOMotorClient
from config import get_settings
import certifi

settings = get_settings()

client = None
db = None


async def connect_to_mongo():
    global client, db
    try:
        # Build connection options
        connection_kwargs = {
            "serverSelectionTimeoutMS": 10000,
            "connectTimeoutMS": 10000,
            "socketTimeoutMS": 20000,
            "retryWrites": True,
            "retryReads": True,
        }

        # Use certifi for TLS if connecting to Atlas (mongodb+srv)
        if "mongodb+srv" in settings.MONGODB_URL or "mongodb.net" in settings.MONGODB_URL:
            connection_kwargs["tlsCAFile"] = certifi.where()

        client = AsyncIOMotorClient(settings.MONGODB_URL, **connection_kwargs)
        db = client[settings.MONGODB_DB_NAME]

        # Test connection
        await client.admin.command('ping')

        # Create indexes for performance
        await db.users.create_index("email", unique=True)
        await db.chat_history.create_index("user_id")
        await db.chat_history.create_index("created_at")
        await db.predictions.create_index("user_id")
        await db.predictions.create_index("created_at")
        await db.search_history.create_index("user_id")
        await db.search_history.create_index("timestamp")
        await db.weather_logs.create_index("user_id")
        await db.feedback.create_index("user_id")

        print(f"[OK] Connected to MongoDB: {settings.MONGODB_DB_NAME}")
    except Exception as e:
        print(f"[WARNING] MongoDB not available: {e}")
        print("    App will run with limited functionality (no data persistence)")
        print("    Install MongoDB or configure Atlas and restart to enable full features")
        db = None


async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("[INFO] MongoDB connection closed")


def get_database():
    return db
