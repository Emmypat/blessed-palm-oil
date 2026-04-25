from datetime import datetime, timezone, date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db import get_db
from app.models.product import Product
from app.models.sale import Sale
from app.models.receivable import Receivable
from app.models.customer import Customer
from app.utils.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today = date.today()
    week_ahead = today + timedelta(days=7)

    # Core stats
    total_products = db.query(func.count(Product.id)).scalar() or 0
    low_stock_count = db.query(func.count(Product.id)).filter(
        Product.stock_qty <= Product.reorder_level
    ).scalar() or 0

    today_sales = db.query(func.count(Sale.id)).filter(Sale.created_at >= today_start).scalar() or 0
    today_revenue = db.query(func.sum(Sale.total)).filter(
        Sale.created_at >= today_start, Sale.is_credit == False, Sale.declined == False,
    ).scalar() or 0

    total_receivables = db.query(func.sum(
        Receivable.amount_owed - Receivable.amount_paid
    )).filter(Receivable.paid == False).scalar() or 0

    overdue_count = db.query(func.count(Receivable.id)).filter(
        Receivable.paid == False,
        Receivable.due_date < today,
    ).scalar() or 0

    # Payment alerts: overdue + due within 7 days
    payment_alerts = (
        db.query(Receivable)
        .filter(Receivable.paid == False, Receivable.due_date <= week_ahead)
        .order_by(Receivable.due_date.asc())
        .limit(10)
        .all()
    )

    # At-risk customers: last purchase > 30 days ago with no open receivable
    at_risk_customers = (
        db.query(Customer)
        .filter(
            Customer.last_purchase_date != None,
            Customer.last_purchase_date < datetime.now(timezone.utc) - timedelta(days=30),
        )
        .order_by(Customer.last_purchase_date.asc())
        .limit(5)
        .all()
    )

    recent_sales = (
        db.query(Sale)
        .order_by(Sale.created_at.desc())
        .limit(5)
        .all()
    )

    low_stock_products = (
        db.query(Product)
        .filter(Product.stock_qty <= Product.reorder_level)
        .order_by(Product.stock_qty.asc())
        .limit(5)
        .all()
    )

    return {
        "total_products": total_products,
        "low_stock_count": low_stock_count,
        "today_sales": today_sales,
        "today_revenue": float(today_revenue),
        "total_receivables": float(total_receivables),
        "overdue_count": overdue_count,
        "payment_alerts": [
            {
                "id": r.id,
                "customer_name": r.customer_name,
                "customer_email": r.customer_email,
                "balance": float(r.amount_owed) - float(r.amount_paid),
                "due_date": r.due_date.isoformat() if r.due_date else None,
                "days_overdue": (today - r.due_date).days if r.due_date and r.due_date < today else 0,
                "days_until_due": (r.due_date - today).days if r.due_date and r.due_date >= today else None,
                "urgency": "overdue" if (r.due_date and r.due_date < today) else "due_soon",
                "reminder_sent_at": r.reminder_sent_at.isoformat() if r.reminder_sent_at else None,
            }
            for r in payment_alerts
        ],
        "at_risk_customers": [
            {
                "id": c.id,
                "name": c.name,
                "phone": c.phone,
                "last_purchase_date": c.last_purchase_date.isoformat() if c.last_purchase_date else None,
                "days_since_purchase": (datetime.now(timezone.utc) - c.last_purchase_date.replace(tzinfo=timezone.utc)).days if c.last_purchase_date else None,
            }
            for c in at_risk_customers
        ],
        "recent_sales": [
            {
                "id": s.id,
                "customer_name": s.customer_name or "Walk-in",
                "total": float(s.total),
                "payment_method": s.payment_method,
                "created_at": s.created_at.isoformat(),
            }
            for s in recent_sales
        ],
        "low_stock_products": [
            {
                "id": p.id,
                "name": p.name,
                "stock_qty": p.stock_qty,
                "reorder_level": p.reorder_level,
                "unit": p.unit,
            }
            for p in low_stock_products
        ],
    }
