from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Form
from fastapi.responses import StreamingResponse
import requests as http_requests
from sqlalchemy.orm import Session
import os
import uuid
import models, schemas, auth
from database import get_db
from rag.ingestion import process_and_store_document

# Supabase Storage Configuration
# NOTE: Use SUPABASE_SERVICE_KEY (service_role key) for backend operations.
# The anon key is blocked by Row Level Security (RLS) policies.
# The service_role key bypasses RLS, which is correct for trusted server code.
from supabase import create_client, Client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # preferred: bypasses RLS
SUPABASE_KEY = os.getenv("SUPABASE_KEY")  # fallback: anon key (may be blocked by RLS)
supabase_client: Client = None

_supabase_auth_key = SUPABASE_SERVICE_KEY or SUPABASE_KEY

if SUPABASE_URL and _supabase_auth_key:
    try:
        supabase_client = create_client(SUPABASE_URL, _supabase_auth_key)
        key_type = "service_role" if SUPABASE_SERVICE_KEY else "anon (RLS may block uploads!)"
        print(f"Supabase initialized with {key_type} key")
    except Exception as e:
        print(f"Supabase Storage initialization failed: {e}")

router = APIRouter(
    prefix="/admin/documents",
    tags=["Documents"]
)

UPLOAD_DIR = "uploads"

@router.post("", response_model=schemas.DocumentResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    audience: str = Form("all"),
    allow_display: bool = Form(True),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_admin_user)
):
    valid_text_exts = (".pdf", ".txt", ".md")
    valid_image_exts = (".png", ".jpg", ".jpeg", ".webp")
    filename = file.filename.lower()
    
    if not (filename.endswith(valid_text_exts) or filename.endswith(valid_image_exts)):
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type. Supported types: {', '.join(valid_text_exts + valid_image_exts)}"
        )
    
    # Save the file (Try Supabase for permanent storage, fallback to local)
    safe_filename = file.filename.replace(" ", "_")
    file_id = f"{uuid.uuid4()}_{safe_filename}"
    file_content = await file.read()
    
    if supabase_client:
        # Supabase is configured — upload there and fail loudly if it errors
        try:
            content_type = file.content_type
            if filename.endswith(".pdf"):
                content_type = "application/pdf"
            elif filename.endswith((".jpg", ".jpeg")):
                content_type = "image/jpeg"
            elif filename.endswith(".png"):
                content_type = "image/png"
            elif filename.endswith(".webp"):
                content_type = "image/webp"
            elif filename.endswith(".txt"):
                content_type = "text/plain"
            elif filename.endswith(".md"):
                content_type = "text/markdown"
            
            if not content_type:
                content_type = "application/octet-stream"

            supabase_client.storage.from_('documents').upload(
                file_id, 
                file_content,
                file_options={"cacheControl": "3600", "upsert": "false", "contentType": content_type}
            )
            print(f"Supabase upload success: {file_id}")
        except Exception as e:
            print(f"Supabase upload failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Cloud storage upload failed: {str(e)}")
    else:
        print(f"No Supabase configured — saving locally: {file_id}")

    # Always save a local copy for local processing / RAG ingestion
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(UPLOAD_DIR, file_id)
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
        abs_path = os.path.abspath(file_path)
        print(f"DEBUG: File saved at {abs_path}")
    except Exception as e:
        print(f"CRITICAL: Local file write failed: {str(e)}")
        if not supabase_client:
            raise HTTPException(status_code=500, detail=f"Could not save file locally: {str(e)}")
    
    db_document = models.Document(
        filename=file.filename,
        uploaded_by=current_user.id,
        audience=audience,
        file_id=file_id,
        allow_display=allow_display
    )
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    
    # Process text files for AI knowledge (Skip images for text extraction)
    if any(filename.endswith(ext) for ext in valid_text_exts):
        background_tasks.add_task(process_and_store_document, db, db_document.id, file_content, file.filename)
    
    return db_document

@router.get("", response_model=list[schemas.DocumentResponse])
def list_documents(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_admin_user)
):
    documents = db.query(models.Document).all()
    # Populate file_url for each document using backend proxy
    for doc in documents:
        if doc.file_id:
            # Always use backend proxy — works for both Supabase and local storage
            doc.file_url = f"/api/file/{doc.file_id}"
    return documents

@router.delete("/{document_id}")
def delete_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_admin_user)
):
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Try to delete associated file from storage
    if document.file_id:
        # Delete from Supabase if configured
        if supabase_client:
            try:
                res = supabase_client.storage.from_("documents").remove([document.file_id])
                print(f"Deleted Supabase file: {document.file_id}, response: {res}")
            except Exception as e:
                print(f"Failed to delete Supabase file {document.file_id}: {e}")
                
        # Try to delete associated local fallback file just in case
        local_path = os.path.join(UPLOAD_DIR, document.file_id)
        if os.path.exists(local_path):
            try:
                os.remove(local_path)
                print(f"Deleted local file: {local_path}")
            except Exception as e:
                print(f"Failed to delete local file: {e}")

    db.delete(document)
    db.commit()
    return {"message": "Document and associated file deleted successfully from database and storage"}

@router.post("/text", response_model=schemas.DocumentResponse)
async def upload_text(
    data: schemas.TextKnowledgeCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_admin_user)
):
    db_document = models.Document(
        filename=data.title,
        uploaded_by=current_user.id,
        audience=data.audience,
        allow_display=data.allow_display
    )
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    
    # Use the central ingestion logic (encoding text to bytes)
    background_tasks.add_task(
        process_and_store_document, 
        db, 
        db_document.id, 
        data.content.encode("utf-8"), 
        data.title
    )
    
    return db_document

@router.get("/debug/supabase")
def debug_supabase():
    return {
        "supabase_configured": supabase_client is not None,
        "url_present": SUPABASE_URL is not None,
        "service_key_present": SUPABASE_SERVICE_KEY is not None,
        "anon_key_present": SUPABASE_KEY is not None,
        "using_service_key": SUPABASE_SERVICE_KEY is not None,
        "upload_dir_exists": os.path.exists(UPLOAD_DIR),
        "upload_dir_writable": os.access(UPLOAD_DIR, os.W_OK) if os.path.exists(UPLOAD_DIR) else False,
    }


@router.get("/file/{file_id:path}")
def serve_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Proxy endpoint: generates a Supabase signed URL (or serves locally) and streams
    the file back to the browser. Works with private/RLS-protected buckets."""

    # Verify the document exists and the user is allowed to see it
    doc = db.query(models.Document).filter(models.Document.file_id == file_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="File not found")
    if not doc.allow_display:
        raise HTTPException(status_code=403, detail="File display is disabled for this document")
    # Audience check
    if current_user.role == "student" and doc.audience == "faculty":
        raise HTTPException(status_code=403, detail="Access restricted")
    if current_user.role == "faculty" and doc.audience == "student":
        raise HTTPException(status_code=403, detail="Access restricted")

    if supabase_client:
        try:
            # Generate a 1-hour signed URL using the service key (bypasses RLS)
            signed = supabase_client.storage.from_("documents").create_signed_url(file_id, 3600)
            signed_url = signed.get("signedURL") or signed.get("signed_url") or signed.get("data", {}).get("signedUrl")
            if not signed_url:
                raise HTTPException(status_code=500, detail=f"Could not generate signed URL: {signed}")
            # Stream the file through our backend so CORS/auth is transparent
            resp = http_requests.get(signed_url, stream=True, timeout=30)
            resp.raise_for_status()
            content_type = resp.headers.get("Content-Type", "application/octet-stream")
            return StreamingResponse(resp.iter_content(chunk_size=8192), media_type=content_type)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error fetching file from storage: {str(e)}")
    else:
        # Local fallback
        local_path = os.path.join(UPLOAD_DIR, file_id)
        if not os.path.exists(local_path):
            raise HTTPException(status_code=404, detail="File not found on disk")
        import mimetypes
        content_type, _ = mimetypes.guess_type(local_path)
        content_type = content_type or "application/octet-stream"
        def file_iter():
            with open(local_path, "rb") as f:
                yield from iter(lambda: f.read(8192), b"")
        return StreamingResponse(file_iter(), media_type=content_type)
