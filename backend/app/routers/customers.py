from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerOut

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=list[CustomerOut])
def get_all(db: Session = Depends(get_db)):
    return db.query(Customer).order_by(Customer.name).all()


@router.get("/{customer_id}", response_model=CustomerOut)
def get_one(customer_id: int, db: Session = Depends(get_db)):
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(404, "Customer not found")
    return customer


@router.post("", response_model=CustomerOut, status_code=201)
def create(data: CustomerCreate, db: Session = Depends(get_db)):
    customer = Customer(**data.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.put("/{customer_id}", response_model=CustomerOut)
def update(customer_id: int, data: CustomerUpdate, db: Session = Depends(get_db)):
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(404, "Customer not found")
    for key, value in data.model_dump().items():
        setattr(customer, key, value)
    db.commit()
    db.refresh(customer)
    return customer
