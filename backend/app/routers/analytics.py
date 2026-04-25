from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db import get_db
from app.models.customer import Customer
from app.models.sale import Sale
from app.utils.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _customer_stats(customer_id: int, db: Session) -> dict:
    sales = (
        db.query(Sale)
        .filter(Sale.customer_id == customer_id, Sale.declined == False)
        .order_by(Sale.created_at.asc())
        .all()
    )
    if not sales:
        return None

    purchase_count = len(sales)
    total_spend = sum(float(s.total) for s in sales)
    avg_order_value = total_spend / purchase_count
    last_purchase = sales[-1].created_at
    days_since = (datetime.now(timezone.utc) - last_purchase.replace(tzinfo=timezone.utc)).days

    # Average days between purchases
    avg_cycle_days = None
    predicted_next = None
    if purchase_count >= 2:
        gaps = [
            (sales[i].created_at - sales[i - 1].created_at).days
            for i in range(1, len(sales))
        ]
        avg_cycle_days = sum(gaps) / len(gaps)
        predicted_next = last_purchase + timedelta(days=avg_cycle_days)

    # Status
    if avg_cycle_days:
        if days_since <= avg_cycle_days:
            status = "active"
        elif days_since <= avg_cycle_days * 1.5:
            status = "at_risk"
        else:
            status = "lapsed"
    else:
        status = "active" if days_since <= 30 else "at_risk"

    return {
        "purchase_count": purchase_count,
        "total_spend": total_spend,
        "avg_order_value": avg_order_value,
        "last_purchase_date": last_purchase.isoformat(),
        "days_since_last_purchase": days_since,
        "avg_cycle_days": round(avg_cycle_days) if avg_cycle_days else None,
        "predicted_next_purchase": predicted_next.isoformat() if predicted_next else None,
        "status": status,
    }


@router.get("/customers/{customer_id}")
def customer_analytics(
    customer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(404, "Customer not found")
    stats = _customer_stats(customer_id, db)
    return {
        "customer_id": customer_id,
        "customer_name": customer.name,
        **(stats or {"purchase_count": 0, "total_spend": 0, "status": "new"}),
    }


@router.get("/at-risk")
def at_risk_customers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    customers = db.query(Customer).all()
    results = []
    for c in customers:
        stats = _customer_stats(c.id, db)
        if stats and stats["status"] in ("at_risk", "lapsed"):
            results.append({
                "customer_id": c.id,
                "customer_name": c.name,
                "phone": c.phone,
                "email": c.email,
                **stats,
            })
    results.sort(key=lambda x: x["days_since_last_purchase"], reverse=True)
    return results
