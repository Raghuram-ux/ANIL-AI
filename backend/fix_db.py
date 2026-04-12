
import database
from sqlalchemy import text

def fix_db():
    engine = database.engine
    with engine.connect() as conn:
        print("Checking/Fixing columns in documents table...")
        try:
            # Check if file_id exists
            res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'file_id'"))
            if not res.fetchone():
                print("Adding file_id column...")
                conn.execute(text("ALTER TABLE documents ADD COLUMN file_id VARCHAR;"))
                conn.commit()
                print("Added file_id column.")
            else:
                print("file_id column already exists.")
                
            # Check if allow_display exists
            res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'allow_display'"))
            if not res.fetchone():
                print("Adding allow_display column...")
                conn.execute(text("ALTER TABLE documents ADD COLUMN allow_display BOOLEAN DEFAULT TRUE;"))
                conn.commit()
                print("Added allow_display column.")
            else:
                print("allow_display column already exists.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    fix_db()
