from database import SessionLocal
import models

def list_documents():
    db = SessionLocal()
    docs = db.query(models.Document).all()
    for doc in docs:
        print(f"ID: {doc.id}, Filename: {doc.filename}, FileID: {doc.file_id}, Audience: {doc.audience}")
    db.close()

if __name__ == "__main__":
    list_documents()
