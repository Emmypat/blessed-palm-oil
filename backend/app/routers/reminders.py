from datetime import datetime, timezone, date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.receivable import Receivable
from app.utils.auth import get_current_user
from app.utils.email import send_reminder_email
from app.models.user import User

router = APIRouter(prefix="/reminders", tags=["reminders"])


def _receivable_out(r: Receivable) -> dict:
    balance = float(r.amount_owed) - float(r.amount_paid)
    today = date.today()
    days_overdue = (today - r.due_date).days if r.due_date and r.due_date < today else 0
    days_until_due = (r.due_date - today).days if r.due_date and r.due_date >= today else None
    return {
        "id": r.id,
        "sale_id": r.sale_id,
        "customer_id": r.customer_id,
        "customer_name": r.customer_name,
        "customer_email": r.customer_email,
        "amount_owed": float(r.amount_owed),
        "amount_paid": float(r.amount_paid),
        "balance": balance,
        "due_date": r.due_date.isoformat() if r.due_date else None,
        "days_overdue": days_overdue,
        "days_until_due": days_until_due,
        "reminder_sent_at": r.reminder_sent_at.isoformat() if r.reminder_sent_at else None,
        "urgency": "overdue" if days_overdue > 0 else ("due_soon" if days_until_due is not None and days_until_due <= 7 else "upcoming"),
    }


@router.get("/due")
def get_due_reminders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    window = today + timedelta(days=7)
    receivables = (
        db.query(Receivable)
        .filter(
            Receivable.paid == False,
            Receivable.due_date <= window,
        )
        .order_by(Receivable.due_date.asc())
        .all()
    )
    return [_receivable_out(r) for r in receivables]


@router.get("/all")
def get_all_reminders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    receivables = (
        db.query(Receivable)
        .filter(Receivable.paid == False)
        .order_by(Receivable.due_date.asc())
        .all()
    )
    return [_receivable_out(r) for r in receivables]


@router.post("/{receivable_id}/send")
def send_reminder(
    receivable_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    r = db.get(Receivable, receivable_id)
    if not r:
        raise HTTPException(404, "Receivable not found")
    if r.paid:
        raise HTTPException(400, "This debt is already paid")
    if not r.customer_email:
        raise HTTPException(400, "No email address on file for this customer")

    balance = float(r.amount_owed) - float(r.amount_paid)
    sent = send_reminder_email(
        to_email=r.customer_email,
        customer_name=r.customer_name or "Customer",
        balance=balance,
        due_date=r.due_date,
        sale_id=r.sale_id,
    )
    if sent:
        r.reminder_sent_at = datetime.now(timezone.utc)
        db.commit()
        return {"ok": True, "message": f"Reminder sent to {r.customer_email}"}
    raise HTTPException(500, "Failed to send reminder email")
