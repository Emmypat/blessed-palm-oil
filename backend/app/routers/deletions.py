from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from app.db import get_db
from app.models.pending_deletion import PendingDeletion
from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter(prefix="/deletions", tags=["deletions"])


class DeletionRequest(BaseModel):
    entity_type: str  # sale, product, customer
    entity_id: int
    entity_label: str


@router.post("/request")
def request_deletion(
    data: DeletionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(PendingDeletion).filter(
        PendingDeletion.entity_type == data.entity_type,
        PendingDeletion.entity_id == data.entity_id,
        PendingDeletion.status == "pending",
    ).first()
    if existing:
        raise HTTPException(400, "A deletion request already exists for this entry")

    deletion = PendingDeletion(
        entity_type=data.entity_type,
        entity_id=data.entity_id,
        entity_label=data.entity_label,
        requested_by=current_user.username,
    )
    db.add(deletion)
    db.commit()
    db.refresh(deletion)
    return {"deletion_id": deletion.id, "message": "Deletion request submitted — awaiting approval from another user"}


@router.get("/pending")
def get_pending(
    entity_type: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(PendingDeletion).filter(PendingDeletion.status == "pending")
    if entity_type:
        q = q.filter(PendingDeletion.entity_type == entity_type)
    return [_out(d) for d in q.order_by(PendingDeletion.created_at.desc()).all()]


@router.post("/{deletion_id}/approve")
def approve_deletion(
    deletion_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deletion = db.get(PendingDeletion, deletion_id)
    if not deletion or deletion.status != "pending":
        raise HTTPException(404, "Pending deletion not found")
    if deletion.requested_by == current_user.username:
        raise HTTPException(400, "You cannot approve your own deletion request")

    _execute_deletion(deletion.entity_type, deletion.entity_id, db)

    deletion.status = "approved"
    deletion.reviewed_by = current_user.username
    deletion.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True}


@router.post("/{deletion_id}/reject")
def reject_deletion(
    deletion_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deletion = db.get(PendingDeletion, deletion_id)
    if not deletion or deletion.status != "pending":
        raise HTTPException(404, "Pending deletion not found")
    if deletion.requested_by == current_user.username:
        raise HTTPException(400, "You cannot reject your own deletion request")

    deletion.status = "rejected"
    deletion.reviewed_by = current_user.username
    deletion.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True}


def _execute_deletion(entity_type: str, entity_id: int, db: Session):
    if entity_type == "sale":
        from app.models.sale import Sale, SaleItem
        from app.models.product import Product
        from app.models.customer import Customer
        from app.models.receivable import Receivable

        sale = db.query(Sale).options(joinedload(Sale.items)).filter(Sale.id == entity_id).first()
        if not sale:
            return  # already gone

        if not sale.declined:
            for item in sale.items:
                product = db.get(Product, item.product_id)
                if product:
                    product.stock_qty += item.qty

            if sale.is_credit:
                receivable = db.query(Receivable).filter(Receivable.sale_id == sale.id).first()
                if receivable:
                    if sale.customer_id:
                        customer = db.get(Customer, sale.customer_id)
                        if customer:
                            customer.balance_owed = max(0, float(customer.balance_owed) - float(sale.total))
                    db.delete(receivable)

        db.delete(sale)

    elif entity_type == "product":
        from app.models.product import Product
        product = db.get(Product, entity_id)
        if product:
            db.delete(product)

    elif entity_type == "customer":
        from app.models.customer import Customer
        customer = db.get(Customer, entity_id)
        if customer:
            db.delete(customer)


def _out(d: PendingDeletion) -> dict:
    return {
        "id": d.id,
        "entity_type": d.entity_type,
        "entity_id": d.entity_id,
        "entity_label": d.entity_label,
        "requested_by": d.requested_by,
        "status": d.status,
        "reviewed_by": d.reviewed_by,
        "created_at": d.created_at.isoformat() if d.created_at else None,
    }
