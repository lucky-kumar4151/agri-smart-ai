from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext  # kept for any existing hash compatibility
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import get_settings

settings = get_settings()

# Use bcrypt directly instead of passlib CryptContext.
# passlib 1.7.4 does NOT pre-truncate passwords before calling bcrypt,
# causing "password cannot be longer than 72 bytes" on long passwords.
# bcrypt.hashpw/checkpw accept raw bytes so we can safely slice to 72 first.
import bcrypt as _bcrypt
security = HTTPBearer()

def hash_password(password: str) -> str:
    """Hash a password, safely handling bcrypt's 72-byte limit."""
    password_bytes = password.encode('utf-8')[:72]
    hashed = _bcrypt.hashpw(password_bytes, _bcrypt.gensalt(rounds=12))
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash, safely handling bcrypt's 72-byte limit."""
    try:
        password_bytes = plain_password.encode('utf-8')[:72]
        return _bcrypt.checkpw(password_bytes, hashed_password.encode('utf-8'))
    except Exception:
        return False

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    return {"user_id": user_id, "email": payload.get("email"), "role": payload.get("role")}

async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user
