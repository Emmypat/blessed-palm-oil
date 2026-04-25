from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.receivable import Receivable
from app.models.customer import Customer
from app.models.payment import Payment
from app.schemas.receivable import ReceivableOut, RecordPayment

router = APIRouter(prefix="/receivables", tags=["receivables"])


@router.get("", response_model=list[ReceivableOut])
def get_all(db: Session = Depends(get_db)):
    return db.query(Receivable).order_by(Receivable.created_at.desc()).all()


@router.get("/{receivable_id}", response_model=ReceivableOut)
def get_one(receivable_id: int, db: Session = Depends(get_db)):
    rec = db.get(Receivable, receivable_id)
    if not rec:
        raise HTTPException(404, "Receivable not found")
    return rec


@router.post("/{receivable_id}/pay", response_model=ReceivableOut)
def record_payment(receivable_id: int, data: RecordPayment, db: Session = Depends(get_db)):
    rec = db.get(Receivable, receivable_id)
    if not rec:
        raise HTTPException(404, "Receivable not found")
    if rec.paid:
        raise HTTPException(400, "This receivable is already fully paid")

    remaining = float(rec.amount_owed) - float(rec.amount_paid)
    if data.amount > remaining:
        raise HTTPException(400, f"Payment amount exceeds balance of ₦{remaining:,.2f}")

    rec.amount_paid = float(rec.amount_paid) + data.amount

    if float(rec.amount_paid) >= float(rec.amount_owed):
        rec.paid = True
        rec.paid_date = datetime.now(timezone.utc)
        # Clear customer balance
        if rec.customer_id:
            customer = db.get(Customer, rec.customer_id)
            if customer:
                customer.balance_owed = max(0, float(customer.balance_owed) - float(rec.amount_owed))

    payment = Payment(
        sale_id=rec.sale_id,
        amount=data.amount,
        method=data.method,
        reference=data.reference,
    )
    db.add(payment)
    db.commit()
    db.refresh(rec)
    return rec
