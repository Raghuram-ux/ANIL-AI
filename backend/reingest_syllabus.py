import os
import requests
from database import SessionLocal
import models
from rag.ingestion import process_and_store_document
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

def reingest_syllabus():
    db = SessionLocal()
    
    # 4 semester syllabus.pdf info from previous check
    file_id = "6bc02814-b6a2-4dfd-b8d4-6a37e9dc19d9_4_semester_syllabus.pdf"
    filename = "4 semester syllabus.pdf"
    
    doc = db.query(models.Document).filter(models.Document.file_id == file_id).first()
    if not doc:
        print("Document record not found in DB.")
        db.close()
        return

    print(f"Repairing document: {doc.filename}")

    # Setup Supabase
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
    supabase: Client = create_client(url, key)
    
    print(f"Downloading {file_id} from Supabase...")
    try:
        res = supabase.storage.from_('documents').create_signed_url(file_id, 600)
        signed_url = (
            res.get('signedURL') or 
            res.get('signedUrl') or 
            res.get('signed_url') or 
            (res.get('data') or {}).get('signedUrl')
        )
        
        if not signed_url:
            print(f"Failed to get download URL: {res}")
            return

        response = requests.get(signed_url)
        response.raise_for_status()
        file_content = response.content
        print(f"Download complete ({len(file_content)} bytes).")

        # Ingest for RAG
        print(f"Processing embeddings for {filename}...")
        process_and_store_document(db, doc.id, file_content, filename)
        print("SUCCESS: 4 semester syllabus.pdf repaired and chunks created!")

    except Exception as e:
        print(f"Error during repair: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reingest_syllabus()
