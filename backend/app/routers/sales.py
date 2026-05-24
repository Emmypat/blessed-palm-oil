from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.db import get_db
from app.models.sale import Sale, SaleItem
from app.models.product import Product
from app.models.customer import Customer
from app.models.receivable import Receivable
from app.models.receipt import Receipt
from app.models.payment import Payment
from app.models.user import User
from app.schemas.sale import SaleCreate, SaleOut, SaleItemOut
from app.utils.pdf import generate_receipt_pdf
from app.utils.email import send_receipt_email
from app.utils.auth import get_current_user

router = APIRouter(prefix="/sales", tags=["sales"])


def _load_sale(sale_id: int, db: Session) -> Sale:
    sale = (
        db.query(Sale)
        .options(
            joinedload(Sale.items).joinedload(SaleItem.product),
            joinedload(Sale.receivable),
        )
        .filter(Sale.id == sale_id)
        .first()
    )
    if not sale:
        raise HTTPException(404, "Sale not found")
    return sale


def _sale_to_out(sale: Sale) -> dict:
    items = [SaleItemOut.from_orm_with_name(item) for item in sale.items]
    return SaleOut(
        id=sale.id,
        customer_id=sale.customer_id,
        customer_name=sale.customer_name,
        customer_email=sale.customer_email,
        payment_method=sale.payment_method,
        payment_reference=sale.payment_reference,
        total=float(sale.total),
        is_credit=sale.is_credit,
        due_date=sale.receivable.due_date if sale.receivable else None,
        verified=sale.verified,
        declined=getattr(sale, 'declined', False),
        created_by=getattr(sale, 'created_by', None),
        verified_by=getattr(sale, 'verified_by', None),
        void_requested=getattr(sale, 'void_requested', False),
        void_requested_by=getattr(sale, 'void_requested_by', None),
        is_voided=getattr(sale, 'is_voided', False),
        void_approved_by=getattr(sale, 'void_approved_by', None),
        created_at=sale.created_at,
        items=items,
    )


@router.get("", response_model=list[SaleOut])
def get_all(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sales = (
        db.query(Sale)
        .options(
            joinedload(Sale.items).joinedload(SaleItem.product),
            joinedload(Sale.receivable),
        )
        .order_by(Sale.created_at.desc())
        .all()
    )
    return [_sale_to_out(s) for s in sales]


@router.get("/{sale_id}", response_model=SaleOut)
def get_one(sale_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _sale_to_out(_load_sale(sale_id, db))


def _publish_receipt_to_sns(sale_id: int, sale_dict: dict, customer_email: str | None, customer_name: str | None):
    import boto3, json, os
    from datetime import datetime
    from botocore.config import Config
    if isinstance(sale_dict.get("created_at"), datetime):
        sale_dict = {**sale_dict, "created_at": sale_dict["created_at"].isoformat()}
    topic_arn = os.environ.get("SNS_RECEIPT_TOPIC_ARN")
    if not topic_arn:
        print("SNS_RECEIPT_TOPIC_ARN not set, skipping receipt")
        return
    try:
        client = boto3.client(
            "sns",
            region_name=os.environ.get("APP_REGION", "eu-west-1"),
            config=Config(connect_timeout=5, read_timeout=5, retries={"max_attempts": 1}),
        )
        client.publish(
            TopicArn=topic_arn,
            Message=json.dumps({
                "sale_id": sale_id,
                "sale_dict": sale_dict,
                "customer_email": customer_email,
                "customer_name": customer_name,
            }),
        )
        print(f"Receipt SNS publish triggered for sale {sale_id}")
    except Exception as e:
        print(f"SNS publish error (non-fatal): {e}")


@router.post("", response_model=SaleOut, status_code=201)
def create_sale(data: SaleCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Validate stock
    for item in data.items:
        product = db.get(Product, item.product_id)
        if not product:
            raise HTTPException(400, f"Product {item.product_id} not found")
        if product.stock_qty < item.qty:
            raise HTTPException(400, f"Insufficient stock for {product.name}. Available: {product.stock_qty}")

    # Create sale
    sale = Sale(
        customer_id=data.customer_id,
        customer_name=data.customer_name,
        customer_email=data.customer_email,
        payment_method=data.payment_method,
        payment_reference=data.payment_reference,
        total=data.total,
        is_credit=data.is_credit,
        created_by=current_user.username,
    )
    db.add(sale)
    db.flush()

    # Sale items + deduct stock
    for item_data in data.items:
        item = SaleItem(
            sale_id=sale.id,
            product_id=item_data.product_id,
            qty=item_data.qty,
            unit_price=item_data.unit_price,
            subtotal=item_data.subtotal,
        )
        db.add(item)
        product = db.get(Product, item_data.product_id)
        product.stock_qty -= item_data.qty

    # Payment record
    if not data.is_credit:
        payment = Payment(
            sale_id=sale.id,
            amount=data.total,
            method=data.payment_method,
            reference=data.payment_reference,
        )
        db.add(payment)

    # Receivable for credit sale
    if data.is_credit:
        receivable = Receivable(
            sale_id=sale.id,
            customer_id=data.customer_id,
            customer_name=data.customer_name,
            customer_email=data.customer_email,
            amount_owed=data.total,
            amount_paid=0,
            due_date=data.due_date or (datetime.now(timezone.utc) + timedelta(days=30)).date(),
        )
        db.add(receivable)
        if data.customer_id:
            customer = db.get(Customer, data.customer_id)
            if customer:
                customer.balance_owed = float(customer.balance_owed) + data.total

    db.commit()

    # Upsert customer — create if new name entered, update existing record
    now = datetime.now(timezone.utc)
    if data.customer_id:
        cust = db.get(Customer, data.customer_id)
        if cust:
            cust.last_purchase_date = now
            if data.customer_phone and not cust.phone:
                cust.phone = data.customer_phone
            if data.customer_email and not cust.email:
                cust.email = data.customer_email
            db.commit()
    elif data.customer_name and data.customer_name.strip():
        cust = db.query(Customer).filter(
            Customer.name.ilike(data.customer_name.strip())
        ).first()
        if cust:
            cust.last_purchase_date = now
            if data.customer_phone and not cust.phone:
                cust.phone = data.customer_phone
            if data.customer_email and not cust.email:
                cust.email = data.customer_email
        else:
            cust = Customer(
                name=data.customer_name.strip(),
                phone=data.customer_phone or None,
                email=data.customer_email or None,
                last_purchase_date=now,
            )
            db.add(cust)
            db.flush()
            sale.customer_id = cust.id
        db.commit()

    sale_loaded = _load_sale(sale.id, db)
    sale_dict = {
        "id": sale.id,
        "customer_name": sale.customer_name,
        "customer_email": sale.customer_email,
        "payment_method": sale.payment_method,
        "payment_reference": sale.payment_reference,
        "total": float(sale.total),
        "is_credit": sale.is_credit,
        "created_at": sale.created_at,
        "items": [
            {"name": item.product.name if item.product else "Unknown",
             "qty": item.qty, "unit_price": float(item.unit_price), "subtotal": float(item.subtotal)}
            for item in sale_loaded.items
        ],
    }

    _publish_receipt_to_sns(sale.id, sale_dict, sale.customer_email, sale.customer_name)

    return _sale_to_out(sale_loaded)


@router.post("/{sale_id}/verify", response_model=SaleOut)
def verify_sale(sale_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sale = _load_sale(sale_id, db)
    if sale.declined:
        raise HTTPException(400, "Cannot verify a declined sale")
    if sale.created_by and sale.created_by == current_user.username:
        raise HTTPException(400, "A sale must be verified by a different user than the one who recorded it")
    sale.verified = True
    sale.verified_by = current_user.username
    db.commit()
    return _sale_to_out(_load_sale(sale_id, db))


@router.post("/{sale_id}/void-request")
def request_void_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(404, "Sale not found")
    if sale.void_requested:
        raise HTTPException(400, "Void already pending approval")
    sale.void_requested = True
    sale.void_requested_by = current_user.username
    db.commit()
    return {"ok": True, "message": "Void request submitted — awaiting second-user approval"}


@router.post("/{sale_id}/void-approve")
def approve_void_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(404, "Sale not found")
    if not sale.void_requested:
        raise HTTPException(400, "No void request pending")
    if sale.void_requested_by == current_user.username:
        raise HTTPException(403, "You cannot approve your own void request")
    sale.is_voided = True
    sale.void_approved_by = current_user.username
    sale.void_requested = False
    db.commit()
    return {"ok": True, "message": "Sale voided successfully"}


@router.post("/{sale_id}/decline", response_model=SaleOut)
def decline_sale(sale_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sale = _load_sale(sale_id, db)
    if sale.verified:
        raise HTTPException(400, "Cannot decline an already verified sale")
    if sale.declined:
        raise HTTPException(400, "Sale is already declined")

    sale.declined = True

    # Restore inventory stock
    for item in sale.items:
        product = db.get(Product, item.product_id)
        if product:
            product.stock_qty += item.qty

    # Cancel receivable if credit sale
    if sale.is_credit and sale.receivable:
        if sale.customer_id:
            customer = db.get(Customer, sale.customer_id)
            if customer:
                customer.balance_owed = max(0, float(customer.balance_owed) - float(sale.total))
        db.delete(sale.receivable)

    db.commit()
    return _sale_to_out(_load_sale(sale_id, db))
