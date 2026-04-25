from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import NullPool, StaticPool
from app.config import settings

_is_sqlite = "sqlite" in settings.database_url

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
    **( {"poolclass": StaticPool} if _is_sqlite else {
        "pool_size": 1,
        "max_overflow": 0,
        "pool_pre_ping": True,
    }),
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
