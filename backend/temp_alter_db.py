from database import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE documents ADD COLUMN audience VARCHAR DEFAULT 'all';"))
        conn.commit()
    print("Column added successfully.")
except Exception as e:
    print(f"Error: {e}")
