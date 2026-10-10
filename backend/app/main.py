from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.routers import auth, users
from app.core.exceptions import register_exception_handlers
from app.db.session import get_db

app = FastAPI(title="Ticketing Multi Bisnis", version="0.1.0")

register_exception_handlers(app)
app.include_router(auth.router)
app.include_router(users.router)


@app.get("/test")
def test(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}