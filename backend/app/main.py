from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

from sqlalchemy import text, inspect
from app.db import engine, Base, SessionLocal

from app.models import sale, product, customer, receivable, receipt, payment
from app.models.user import User
from app.models.inventory_change import InventoryChange
from app.models.pending_deletion import PendingDeletion
from app.models.pending_payment import PendingPayment

from app.routers import inventory, customers, sales, receivables, receipts, dashboard
from app.routers import auth as auth_router
from app.routers import analytics, reminders, deletions as deletions_router

Base.metadata.create_all(bind=engine)

_existing = {col["name"] for col in inspect(engine).get_columns("sales")}
_migrations = [
    ("declined",   "BOOLEAN DEFAULT FALSE"),
    ("created_by", "VARCHAR(100)"),
    ("verified_by","VARCHAR(100)"),
]
with engine.begin() as _conn:
    for _col, _col_def in _migrations:
        if _col not in _existing:
            _conn.execute(text(f"ALTER TABLE sales ADD COLUMN {_col} {_col_def}"))

_cust_cols = {col["name"] for col in inspect(engine).get_columns("customers")}
with engine.begin() as _conn:
    if "last_purchase_date" not in _cust_cols:
        _conn.execute(text("ALTER TABLE customers ADD COLUMN last_purchase_date TIMESTAMP"))

_recv_cols = {col["name"] for col in inspect(engine).get_columns("receivables")}
with engine.begin() as _conn:
    if "reminder_sent_at" not in _recv_cols:
        _conn.execute(text("ALTER TABLE receivables ADD COLUMN reminder_sent_at TIMESTAMP"))


def _seed_users():
    from app.utils.auth import hash_password
    db = SessionLocal()
    try:
        for username in ["Admin", "Blessed", "Emmanuel"]:
            user = db.query(User).filter(User.username == username).first()
            if not user:
                print(f"Creating user: {username}")
                db.add(User(
                    username=username,
                    hashed_password=hash_password("Password123"),
                    must_change_password=True,
                ))
        db.commit()
        print("Seed users complete")
    except Exception as e:
        print(f"Seed users error: {e}")
        db.rollback()
    finally:
        db.close()

_seed_users()

app = FastAPI(
    title="Blessed Palm Oil API",
    description="Inventory, sales, receivables, customer analytics and payment reminders",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(inventory.router)
app.include_router(customers.router)
app.include_router(sales.router)
app.include_router(receivables.router)
app.include_router(receipts.router)
app.include_router(dashboard.router)
app.include_router(analytics.router)
app.include_router(reminders.router)
app.include_router(deletions_router.router)


@app.get("/health")
def health():
    return {"status": "ok"}


_mangum = Mangum(app, lifespan="off")

def handler(event, context):
    if event.get("source") == "warmer":
        return {"warmed": True}
    records = event.get("Records", [])
    if records and records[0].get("EventSource") == "aws:sns":
        import json
        _handle_receipt(json.loads(records[0]["Sns"]["Message"]))
        return {"handled": True}
    return _mangum(event, context)


def _handle_receipt(data: dict):
    from datetime import datetime, timezone
    from app.models.receipt import Receipt
    from app.utils.pdf import generate_receipt_pdf
    from app.utils.email import send_receipt_email
    db = SessionLocal()
    try:
        sale_id = data["sale_id"]
        sale_dict = data["sale_dict"]
        customer_email = data.get("customer_email")
        customer_name = data.get("customer_name")
        pdf_bytes = generate_receipt_pdf(sale_dict)
        emailed_to = None
        sent_at = None
        if customer_email:
            success = send_receipt_email(customer_email, customer_name or "Customer", sale_id, pdf_bytes)
            if success:
                emailed_to = customer_email
                sent_at = datetime.now(timezone.utc)
        receipt = Receipt(sale_id=sale_id, emailed_to=emailed_to, sent_at=sent_at)
        db.add(receipt)
        db.commit()
    except Exception as e:
        print(f"Receipt handler error: {e}")
    finally:
        db.close()
