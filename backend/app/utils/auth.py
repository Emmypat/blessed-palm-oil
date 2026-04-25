from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db import get_db
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(username: str) -> str:
    payload = {
        "sub": username,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm="HS256")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    from app.models.user import User
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=["HS256"])
        username: str = payload.get("sub")
        if not username:
            raise ValueError("no sub")
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Not authenticated", headers={"WWW-Authenticate": "Bearer"})
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
