# Koneksi database

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# get_db() adalah dependency FastAPI: setiap request dibukakan satu sesi database, lalu ditutup setelah selesai.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()