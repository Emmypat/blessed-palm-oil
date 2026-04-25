import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.db import get_db
from app.models.product import Product
from app.models.inventory_change import InventoryChange
from app.models.user import User
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut, StockAdjust
from app.utils.auth import get_current_user

router = APIRouter(prefix="/inventory", tags=["inventory"])


# --- Pending changes routes (must come before /{product_id}) ---

@router.get("/changes/pending")
def get_pending_changes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    changes = (
        db.query(InventoryChange)
        .options(joinedload(InventoryChange.product))
        .filter(InventoryChange.status == "pending")
        .order_by(InventoryChange.created_at.desc())
        .all()
    )
    return [_change_out(c) for c in changes]


@router.post("/changes/{change_id}/approve")
def approve_change(
    change_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    change = db.query(InventoryChange).options(joinedload(InventoryChange.product)).filter(InventoryChange.id == change_id).first()
    if not change or change.status != "pending":
        raise HTTPException(404, "Pending change not found")
    if change.requested_by == current_user.username:
        raise HTTPException(400, "You cannot approve your own request")

    payload = json.loads(change.payload)
    product = db.get(Product, change.product_id)

    if change.change_type == "adjust_stock":
        reason = payload.get("reason")
        qty = int(payload.get("quantity", 0))
        if reason == "restock":
            product.stock_qty += qty
        elif reason == "damaged":
            product.stock_qty = max(0, product.stock_qty - qty)
        else:  # correction
            product.stock_qty = qty

    change.status = "approved"
    change.reviewed_by = current_user.username
    change.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True, "product": ProductOut.model_validate(product)}


@router.post("/changes/{change_id}/reject")
def reject_change(
    change_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    change = db.get(InventoryChange, change_id)
    if not change or change.status != "pending":
        raise HTTPException(404, "Pending change not found")
    if change.requested_by == current_user.username:
        raise HTTPException(400, "You cannot reject your own request")

    change.status = "rejected"
    change.reviewed_by = current_user.username
    change.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True}


# --- Product CRUD ---

@router.get("", response_model=list[ProductOut])
def get_all(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Product).order_by(Product.name).all()


@router.get("/{product_id}", response_model=ProductOut)
def get_one(product_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    return product


@router.post("", response_model=ProductOut, status_code=201)
def create(data: ProductCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    product = Product(**data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/{product_id}", response_model=ProductOut)
def update(product_id: int, data: ProductUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    for key, value in data.model_dump().items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=204)
def delete(product_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    db.delete(product)
    db.commit()


@router.post("/{product_id}/adjust")
def request_adjust_stock(
    product_id: int,
    data: StockAdjust,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Product not found")

    change = InventoryChange(
        product_id=product_id,
        change_type="adjust_stock",
        payload=json.dumps({"quantity": data.quantity, "reason": data.reason}),
        requested_by=current_user.username,
    )
    db.add(change)
    db.commit()
    db.refresh(change)
    return {"change_id": change.id, "message": "Adjustment submitted — awaiting approval from another user"}


def _change_out(c: InventoryChange) -> dict:
    payload = json.loads(c.payload)
    return {
        "id": c.id,
        "product_id": c.product_id,
        "product_name": c.product.name if c.product else "Unknown",
        "change_type": c.change_type,
        "quantity": payload.get("quantity"),
        "reason": payload.get("reason"),
        "requested_by": c.requested_by,
        "status": c.status,
        "reviewed_by": c.reviewed_by,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }
