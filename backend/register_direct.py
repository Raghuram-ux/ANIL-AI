import sys
sys.path.insert(0, '.')

from database import SessionLocal, engine
import models
import auth as auth_module
import traceback

try:
    # Create tables
    from sqlalchemy import text
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    models.Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    # Check if already exists
    existing = db.query(models.User).filter(models.User.username == 'Raghuram.L.N').first()
    if existing:
        print("User already exists!")
        db.close()
        sys.exit(0)

    hashed_password = auth_module.get_password_hash('jaikiller@1234')
    new_user = models.User(
        username='Raghuram.L.N',
        hashed_password=hashed_password,
        role='admin'
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    print(f"SUCCESS! User created: {new_user.username}, role: {new_user.role}, id: {new_user.id}")
    db.close()

except Exception as e:
    print(f"FAILED: {e}")
    traceback.print_exc()
