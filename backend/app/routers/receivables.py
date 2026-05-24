from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session, joinedload
from app.db import get_db
from app.models.receivable import Receivable
from app.models.customer import Customer
from app.models.payment import Payment
from app.models.pending_payment import PendingPayment
from app.schemas.receivable import ReceivableOut, RecordPayment
from app.utils.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/receivables", tags=["receivables"])


class PendingPaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    receivable_id: int
    amount: float
    method: str
    reference: str | None
    requested_by: str
    customer_name: str | None
    created_at: datetime


def _enrich_receivable(r: Receivable) -> dict:
    phone = r.customer.phone if r.customer else None
    return {
        "id": r.id,
        "customer_id": r.customer_id,
        "sale_id": r.sale_id,
        "customer_name": r.customer_name,
        "customer_email": r.customer_email,
        "customer_phone": phone,
        "amount_owed": float(r.amount_owed),
        "amount_paid": float(r.amount_paid),
        "due_date": r.due_date,
        "paid": r.paid,
        "paid_date": r.paid_date,
        "created_at": r.created_at,
    }


@router.get("", response_model=list[ReceivableOut])
def get_all(
    customer_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Receivable).options(joinedload(Receivable.customer))
    if customer_id is not None:
        q = q.filter(Receivable.customer_id == customer_id)
    return [_enrich_receivable(r) for r in q.order_by(Receivable.created_at.desc()).all()]


@router.get("/pending-payments", response_model=list[PendingPaymentOut])
def get_pending_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(PendingPayment).order_by(PendingPayment.created_at.desc()).all()


@router.get("/{receivable_id}", response_model=ReceivableOut)
def get_one(receivable_id: int, db: Session = Depends(get_db)):
    rec = db.query(Receivable).options(joinedload(Receivable.customer)).filter(Receivable.id == receivable_id).first()
    if not rec:
        raise HTTPException(404, "Receivable not found")
    return _enrich_receivable(rec)


@router.post("/{receivable_id}/request-payment", response_model=PendingPaymentOut, status_code=201)
def request_payment(
    receivable_id: int,
    data: RecordPayment,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rec = db.get(Receivable, receivable_id)
    if not rec:
        raise HTTPException(404, "Receivable not found")
    if rec.paid:
        raise HTTPException(400, "This receivable is already fully paid")

    remaining = float(rec.amount_owed) - float(rec.amount_paid)
    if data.amount <= 0 or data.amount > remaining:
        raise HTTPException(400, f"Amount must be between ₦0.01 and ₦{remaining:,.2f}")

    existing = db.query(PendingPayment).filter(
        PendingPayment.receivable_id == receivable_id
    ).first()
    if existing:
        raise HTTPException(400, "A payment is already pending approval for this receivable")

    pending = PendingPayment(
        receivable_id=receivable_id,
        amount=data.amount,
        method=data.method,
        reference=data.reference,
        requested_by=current_user.username,
        customer_name=rec.customer_name,
    )
    db.add(pending)
    db.commit()
    db.refresh(pending)
    return pending


@router.post("/pending-payments/{payment_id}/approve", response_model=ReceivableOut)
def approve_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pending = db.get(PendingPayment, payment_id)
    if not pending:
        raise HTTPException(404, "Pending payment not found")
    if pending.requested_by == current_user.username:
        raise HTTPException(400, "You cannot approve your own payment request — a different user must confirm")

    rec = db.get(Receivable, pending.receivable_id)
    if not rec or rec.paid:
        db.delete(pending)
        db.commit()
        raise HTTPException(400, "Receivable is no longer active")

    remaining = float(rec.amount_owed) - float(rec.amount_paid)
    if float(pending.amount) > remaining:
        db.delete(pending)
        db.commit()
        raise HTTPException(400, "Payment amount exceeds current balance — request cancelled")

    rec.amount_paid = float(rec.amount_paid) + float(pending.amount)

    if float(rec.amount_paid) >= float(rec.amount_owed):
        rec.paid = True
        rec.paid_date = datetime.now(timezone.utc)
        if rec.customer_id:
            customer = db.get(Customer, rec.customer_id)
            if customer:
                customer.balance_owed = max(0, float(customer.balance_owed) - float(rec.amount_owed))

    payment = Payment(
        sale_id=rec.sale_id,
        amount=float(pending.amount),
        method=pending.method,
        reference=pending.reference,
    )
    db.add(payment)
    db.delete(pending)
    db.commit()
    db.refresh(rec)
    return rec


@router.post("/pending-payments/{payment_id}/reject")
def reject_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pending = db.get(PendingPayment, payment_id)
    if not pending:
        raise HTTPException(404, "Pending payment not found")
    db.delete(pending)
    db.commit()
    return {"ok": True}
