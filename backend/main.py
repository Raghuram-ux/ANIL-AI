from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, StreamingResponse, FileResponse
from dotenv import load_dotenv

# Force load environment variables before any other imports
load_dotenv()

import database
import models
from routers import auth, documents, chat, settings
import os
import requests as http_requests
import urllib.parse
from sqlalchemy import text
from sqlalchemy.orm import Session

# Ensure uploads directory exists
if not os.path.exists("uploads"):
    os.makedirs("uploads")

app = FastAPI(title="College Chatbot API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def run_migrations():
    from sqlalchemy import inspect
    inspector = inspect(database.engine)
    columns = [c['name'] for c in inspector.get_columns('documents')]
    
    with database.engine.connect() as conn:
        # Check if audience exists
        if 'audience' not in columns:
            print("Migration: Adding audience column to documents")
            conn.execute(text("ALTER TABLE documents ADD COLUMN audience VARCHAR DEFAULT 'all';"))
            conn.commit()
        
        # Check if file_id exists
        if 'file_id' in columns:
            # Ensure allow_display exists
            if 'allow_display' not in columns:
                print("Migration: Adding allow_display column to documents")
                conn.execute(text("ALTER TABLE documents ADD COLUMN allow_display BOOLEAN DEFAULT TRUE;"))
                conn.commit()
            
            # Update any existing records
            conn.execute(text("UPDATE documents SET allow_display = TRUE WHERE allow_display IS NULL;"))
            conn.commit()

@app.on_event("startup")
def on_startup():
    models.Base.metadata.create_all(bind=database.engine)
    run_migrations()

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(documents.router, prefix="/admin/documents", tags=["Documents"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(settings.router, prefix="/settings", tags=["Settings"])

# Static files for uploads fallback
app.mount("/api/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
def read_root():
    return {"message": "College Chatbot API is running"}

def seed_admin_if_missing(db: Session):
    # Check if admin exists
    admin_username = 'Raghuram.L.N'
    existing = db.query(models.User).filter(models.User.username == admin_username).first()
    if not existing:
        print(f"Sync: Creating admin user {admin_username}")
        # Import auth here to avoid circular dependencies
        from routers import auth as auth_router
        hashed_pw = auth_router.get_password_hash('jaikiller@1234')
        new_admin = models.User(
            username=admin_username,
            hashed_password=hashed_pw,
            role='admin'
        )
        db.add(new_admin)
        db.commit()
        return True
    return False

@app.get("/fix-database-sync")
def fix_database_sync(db: Session = Depends(database.get_db)):
    """Internal utility to resolve broken records and recover admin user."""
    res = {"status": "success", "updates": {}}
    
    # 1. Recover Admin if missing
    try:
        admin_created = seed_admin_if_missing(db)
        res["updates"]["admin"] = "Created" if admin_created else "Verified (Already exists)"
    except Exception as e:
        res["updates"]["admin_error"] = str(e)
    
    # 2. Sync Files if Supabase is configured
    if _supabase_client:
        try:
            files = _supabase_client.storage.from_("documents").list()
            file_list = [f['name'] for f in files]
            docs = db.query(models.Document).all()
            updated_count = 0
            
            for doc in docs:
                # If file_id is missing, or it's not present in the actual storage bucket
                if not doc.file_id or doc.file_id == "None" or doc.file_id not in file_list:
                    # Try to find the best match by filename
                    match = next((name for name in file_list if doc.filename in name), None)
                    if match:
                        doc.file_id = match
                        updated_count += 1
            
            db.commit()
            res["updates"]["files_synced"] = updated_count
        except Exception as e:
            res["updates"]["files_error"] = str(e)
    else:
        res["updates"]["files_status"] = "Skipped (Supabase not configured)"
        
    return res

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
_sb_key = SUPABASE_SERVICE_KEY or SUPABASE_KEY
_supabase_client = None
if SUPABASE_URL and _sb_key:
    try:
        from supabase import create_client
        _supabase_client = create_client(SUPABASE_URL, _sb_key)
    except Exception as e:
        print(f"main.py: Supabase init failed: {e}")

@app.get("/api/file/{file_id:path}")
def serve_file_public(file_id: str):
    """Public proxy: serves uploaded files with smart fallback/auto-heal."""
    file_id = urllib.parse.unquote(file_id)
    print(f"DEBUG: Smart Resolve request for: {file_id}")
    
    if not _supabase_client:
        # Local fallback
        local_path = os.path.join("uploads", file_id)
        if os.path.exists(local_path):
            return FileResponse(local_path)
        raise HTTPException(status_code=404, detail="Storage not configured and local file missing")

    try:
        # 1. Primary Attempt: Direct lookup using provided ID
        signed = _supabase_client.storage.from_("documents").create_signed_url(file_id, 3600)
        signed_url = (signed.get("signedURL") or signed.get("signed_url") or (signed.get("data") or {}).get("signedUrl"))
        
        # 2. Secondary Attempt: Filename Fallback (if direct lookup failed)
        if not signed_url:
            print(f"DEBUG: Initial lookup failed, searching bucket for filename match...")
            files = _supabase_client.storage.from_("documents").list()
            # Extract filename part
            target_name = file_id.split('_', 1)[-1] if '_' in file_id else file_id
            match = next((f for f in files if target_name in f['name']), None)
            
            if match:
                print(f"DEBUG: Found fallback match: {match['name']}")
                signed = _supabase_client.storage.from_("documents").create_signed_url(match['name'], 3600)
                signed_url = (signed.get("signedURL") or signed.get("signed_url") or (signed.get("data") or {}).get("signedUrl"))

        if signed_url:
            resp = http_requests.get(signed_url, stream=True, timeout=30)
            resp.raise_for_status()
            content_type = "application/pdf" if file_id.lower().endswith(".pdf") else resp.headers.get("Content-Type")
            return StreamingResponse(resp.iter_content(chunk_size=8192), media_type=content_type)
            
    except Exception as e:
        print(f"CRITICAL: Smart Resolve failed: {e}")

    raise HTTPException(status_code=404, detail="File could not be resolved in storage")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
