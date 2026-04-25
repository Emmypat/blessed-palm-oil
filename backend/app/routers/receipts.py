from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload
from app.db import get_db
from app.models.receipt import Receipt
from app.models.sale import Sale, SaleItem
from app.schemas.receipt import ReceiptOut
from app.utils.pdf import generate_receipt_pdf
from app.utils.email import send_receipt_email

router = APIRouter(prefix="/receipts", tags=["receipts"])


def _enrich(receipt: Receipt) -> dict:
    sale = receipt.sale
    return {
        "id": receipt.id,
        "sale_id": receipt.sale_id,
        "customer_name": sale.customer_name if sale else None,
        "customer_email": sale.customer_email if sale else None,
        "total": float(sale.total) if sale else None,
        "pdf_url": receipt.pdf_url,
        "emailed_to": receipt.emailed_to,
        "sent_at": receipt.sent_at,
        "created_at": receipt.created_at,
    }


@router.get("", response_model=list[ReceiptOut])
def get_all(db: Session = Depends(get_db)):
    receipts = (
        db.query(Receipt)
        .options(joinedload(Receipt.sale))
        .order_by(Receipt.created_at.desc())
        .all()
    )
    return [_enrich(r) for r in receipts]


@router.get("/{receipt_id}", response_model=ReceiptOut)
def get_one(receipt_id: int, db: Session = Depends(get_db)):
    receipt = db.query(Receipt).options(joinedload(Receipt.sale)).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(404, "Receipt not found")
    return _enrich(receipt)


@router.post("/{receipt_id}/resend", response_model=ReceiptOut)
def resend(receipt_id: int, db: Session = Depends(get_db)):
    receipt = (
        db.query(Receipt)
        .options(joinedload(Receipt.sale).joinedload(Sale.items).joinedload(SaleItem.product))
        .filter(Receipt.id == receipt_id)
        .first()
    )
    if not receipt:
        raise HTTPException(404, "Receipt not found")

    sale = receipt.sale
    if not sale or not sale.customer_email:
        raise HTTPException(400, "No customer email on record for this receipt")

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
            {
                "name": item.product.name if item.product else "Unknown",
                "qty": item.qty,
                "unit_price": float(item.unit_price),
                "subtotal": float(item.subtotal),
            }
            for item in sale.items
        ],
    }

    pdf_bytes = generate_receipt_pdf(sale_dict)
    success = send_receipt_email(sale.customer_email, sale.customer_name or "Customer", sale.id, pdf_bytes)

    if success:
        receipt.emailed_to = sale.customer_email
        receipt.sent_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(receipt)

    return _enrich(receipt)


@router.get("/{receipt_id}/download")
def download(receipt_id: int, db: Session = Depends(get_db)):
    receipt = (
        db.query(Receipt)
        .options(joinedload(Receipt.sale).joinedload(Sale.items).joinedload(SaleItem.product))
        .filter(Receipt.id == receipt_id)
        .first()
    )
    if not receipt:
        raise HTTPException(404, "Receipt not found")

    sale = receipt.sale
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
            {
                "name": item.product.name if item.product else "Unknown",
                "qty": item.qty,
                "unit_price": float(item.unit_price),
                "subtotal": float(item.subtotal),
            }
            for item in sale.items
        ],
    }

    pdf_bytes = generate_receipt_pdf(sale_dict)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=receipt-{sale.id:05d}.pdf"},
    )
