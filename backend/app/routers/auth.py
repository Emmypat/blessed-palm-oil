from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.user import User
from app.utils.auth import verify_password, hash_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


class ChangePasswordRequest(BaseModel):
    new_password: str


@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_access_token(user.username)
    return {
        "access_token": token,
        "token_type": "bearer",
        "username": user.username,
        "must_change_password": user.must_change_password,
    }


@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if len(data.new_password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    if data.new_password == "Password123":
        raise HTTPException(400, "Please choose a different password")
    current_user.hashed_password = hash_password(data.new_password)
    current_user.must_change_password = False
    db.commit()
    return {"ok": True}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {"username": current_user.username, "must_change_password": current_user.must_change_password}
