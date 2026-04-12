from database import SessionLocal
import models

def check():
    db = SessionLocal()
    docs = db.query(models.Document).all()
    print(f"{'ID':<40} | {'Filename':<30} | {'FileID':<30} | {'Display'}")
    print("-" * 110)
    for d in docs:
        print(f"{str(d.id):<40} | {str(d.filename):<30} | {str(d.file_id):<30} | {d.allow_display}")
    db.close()

if __name__ == '__main__':
    check()
