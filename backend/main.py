from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, StreamingResponse
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

# Ensure uploads directory exists
if not os.path.exists("uploads"):
    os.makedirs("uploads")

# Create database extension first
with database.engine.connect() as conn:
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    conn.commit()

# Robust Database Migrations
def run_migrations():
    from sqlalchemy import inspect
    inspector = inspect(database.engine)
    columns = [c['name'] for c in inspector.get_columns('documents')]
    
    with database.engine.connect() as conn:
        if 'audience' not in columns:
            print("Migration: Adding 'audience' column to documents table...")
            try:
                conn.execute(text("ALTER TABLE documents ADD COLUMN audience VARCHAR DEFAULT 'all';"))
                conn.commit()
            except Exception as e:
                print(f"Migration error (audience): {e}")
        
        if 'file_id' in columns:
            # Ensure audience exists too
            if 'allow_display' not in columns:
                print("Migration: Adding 'allow_display' column to documents table...")
                try:
                    conn.execute(text("ALTER TABLE documents ADD COLUMN allow_display BOOLEAN DEFAULT TRUE;"))
                    conn.execute(text("UPDATE documents SET allow_display = TRUE WHERE allow_display IS NULL;"))
                    conn.commit()
                except Exception as e:
                    print(f"Migration error (allow_display): {e}")

run_migrations()

# Create database tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="College Chatbot API")

@app.on_event("startup")
def on_startup():
    from database import SessionLocal
    db = SessionLocal()
    try:
        # Check if admin exists
        admin_username = 'Raghuram.L.N'
        existing = db.query(models.User).filter(models.User.username == admin_username).first()
        if not existing:
            print(f"Startup: Creating admin user {admin_username}")
            from routers import auth as auth_router
            hashed_pw = auth_router.get_password_hash('jaikiller@1234')
            new_admin = models.User(
                username=admin_username,
                hashed_password=hashed_pw,
                role='admin'
            )
            db.add(new_admin)
            db.commit()
    except Exception as e:
        print(f"Startup error: {e}")
    finally:
        db.close()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/api/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(documents.router, prefix="/api/admin/documents", tags=["Documents"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])

# ── Public file-serve endpoint ──────────────────────────────────────────────
# This is intentionally unauthenticated so that PDF/image links opened in a
# new browser tab (which cannot send Authorization headers) work correctly.
# Security is provided by Supabase's time-limited signed URLs (1 hour).

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
    """Public proxy: serves uploaded files via Supabase signed URL or local disk."""
    # Unquote the file_id in case it was URL-encoded (e.g. for parentheses or spaces)
    file_id = urllib.parse.unquote(file_id)
    print(f"DEBUG: public file serve request for file_id: {file_id}")
    if _supabase_client:
        try:
            print(f"DEBUG: attempting Supabase signed URL generation for {file_id}")
            signed = _supabase_client.storage.from_("documents").create_signed_url(file_id, 3600)
            # Handle different versions of the supabase-py SDK
            signed_url = (
                signed.get("signedURL")
                or signed.get("signed_url")
                or (signed.get("data") or {}).get("signedUrl")
            )
            if signed_url:
                print(f"DEBUG: successfully generated signed URL, proxying content...")
                # Stream the file from Supabase instead of redirecting.
                # This prevents CORS issues and ensures headers (like Content-Type) are correct.
                resp = http_requests.get(signed_url, stream=True, timeout=30)
                resp.raise_for_status()
                
                # Force correct content type based on extension to avoid "text/plain" issues
                if file_id.lower().endswith(".pdf"):
                    content_type = "application/pdf"
                elif file_id.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                    import mimetypes
                    content_type, _ = mimetypes.guess_type(file_id)
                    content_type = content_type or "image/png"
                else:
                    content_type = resp.headers.get("Content-Type", "application/octet-stream")
                
                print(f"DEBUG: streaming file with forced/detected content-type: {content_type}")
                return StreamingResponse(resp.iter_content(chunk_size=8192), media_type=content_type)
            else:
                print(f"DEBUG: signed URL generation returned no URL: {signed}")
        except Exception as e:
            print(f"CRITICAL: Proxy streaming failed for {file_id}: {e}")

    # Local disk fallback
    local_path = os.path.join("uploads", file_id)
    if os.path.exists(local_path):
        import mimetypes
        content_type, _ = mimetypes.guess_type(local_path)
        content_type = content_type or "application/octet-stream"
        def file_iter():
            with open(local_path, "rb") as f:
                yield from iter(lambda: f.read(8192), b"")
        return StreamingResponse(file_iter(), media_type=content_type)

    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="File not found")

@app.get("/")
def health_check():
    return {"status": "healthy"}
