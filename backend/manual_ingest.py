import os
import requests
from database import SessionLocal
import models
from rag.ingestion import process_and_store_document
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

def ingest_from_supabase(file_id, filename=None):
    if not filename:
        filename = file_id.split('_', 1)[1] if '_' in file_id else file_id
    
    db = SessionLocal()
    
    # 1. Check if already exists
    existing = db.query(models.Document).filter(models.Document.file_id == file_id).first()
    if existing:
        print(f"Document with file_id {file_id} already exists in DB.")
        db.close()
        return

    # 2. Setup Supabase to download
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
    supabase: Client = create_client(url, key)
    
    print(f"Downloading {file_id} from Supabase...")
    try:
        # Generate a signed URL to download
        res = supabase.storage.from_('documents').create_signed_url(file_id, 600)
        signed_url = res.get('signedURL') or res.get('signed_url') or res.get('data', {}).get('signedUrl')
        
        if not signed_url:
            print(f"Failed to get download URL: {res}")
            return

        response = requests.get(signed_url)
        response.raise_for_status()
        file_content = response.content
        print(f"Download complete ({len(file_content)} bytes).")

        # 3. Create DB record
        admin = db.query(models.User).filter(models.User.role == 'admin').first()
        new_doc = models.Document(
            filename=filename,
            file_id=file_id,
            uploaded_by=admin.id if admin else None,
            audience='all',
            allow_display=True
        )
        db.add(new_doc)
        db.commit()
        db.refresh(new_doc)
        print(f"DB record created with ID: {new_doc.id}")

        # 4. Ingest for RAG
        print(f"Starting ingestion (embeddings)...")
        process_and_store_document(db, new_doc.id, file_content, filename)
        print("Ingestion complete! Chatbot can now answer questions about this document.")

    except Exception as e:
        print(f"Error during ingestion: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    target_file = "1e5e6aaa-0be4-49ee-98d2-976c1604c5e9_ECE_REG_2023_(1).pdf"
    ingest_from_supabase(target_file, "ECE Regulation 2023.pdf")
