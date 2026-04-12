from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, StreamingResponse
import database
import models
from routers import auth, documents, chat, settings
import os
import requests as http_requests

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/api/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(settings.router)

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
    if _supabase_client:
        try:
            signed = _supabase_client.storage.from_("documents").create_signed_url(file_id, 3600)
            # Handle different versions of the supabase-py SDK
            signed_url = (
                signed.get("signedURL")
                or signed.get("signed_url")
                or (signed.get("data") or {}).get("signedUrl")
            )
            if signed_url:
                # Stream the file from Supabase instead of redirecting.
                # This prevents CORS issues and ensures headers (like Content-Type) are correct.
                resp = http_requests.get(signed_url, stream=True, timeout=30)
                resp.raise_for_status()
                content_type = resp.headers.get("Content-Type", "application/pdf")
                # Force attachment/inline header if necessary, but StreamingResponse with media_type is usually enough
                return StreamingResponse(resp.iter_content(chunk_size=8192), media_type=content_type)
        except Exception as e:
            print(f"Proxy streaming failed: {e}")

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
