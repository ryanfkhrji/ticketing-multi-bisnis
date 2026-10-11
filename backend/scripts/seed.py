from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.business import Business
from app.models.user import User

# Password akun demo (bukan secret asli), dicantumkan di README.
DEMO_PASSWORD = "Demo12345"

# (nama bisnis, slug, [(nama, email, role), ...])
DEMO_DATA: list[tuple[str, str, list[tuple[str, str, str]]]] = [
    (
        "Toko Elektronik Demo",
        "toko-elektronik-demo",
        [
            ("Anton Admin", "admin@toko-demo.com", "admin"),
            ("Siska Agent", "agent@toko-demo.com", "agent"),
            ("Citra Customer", "customer1@toko-demo.com", "customer"),
            ("Dimas Customer", "customer2@toko-demo.com", "customer"),
        ],
    ),
    (
        "Warung Kopi Demo",
        "warung-kopi-demo",
        [
            ("Eka Admin", "admin@kopi-demo.com", "admin"),
            ("Fajar Agent", "agent@kopi-demo.com", "agent"),
            ("Gita Customer", "customer1@kopi-demo.com", "customer"),
            ("Hadi Customer", "customer2@kopi-demo.com", "customer"),
        ],
    ),
]


def seed() -> None:
    with SessionLocal() as db:
        for business_name, slug, users in DEMO_DATA:
            business = db.scalar(select(Business).where(Business.slug == slug))
            if business is None:
                business = Business(name=business_name, slug=slug)
                db.add(business)
                db.flush()

            for name, email, role in users:
                if db.scalar(select(User.id).where(User.email == email)):
                    continue
                db.add(
                    User(
                        business_id=business.id,
                        name=name,
                        email=email,
                        password_hash=hash_password(DEMO_PASSWORD),
                        role=role,
                    )
                )
        db.commit()

    print(f"Seed selesai. Password semua akun demo: {DEMO_PASSWORD}")
    for business_name, _, users in DEMO_DATA:
        print(f"\n{business_name}")
        for _, email, role in users:
            print(f"  {role:<9} {email}")


if __name__ == "__main__":
    seed()