from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Form
from sqlalchemy.orm import Session
import os
import uuid
import models, schemas, auth
from database import get_db
from rag.ingestion import process_and_store_document

# Supabase Storage Configuration
from supabase import create_client, Client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase_client: Client = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
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
        print(f"Local file saved: {file_path}")
    except Exception as e:
        print(f"Local file write failed: {str(e)}")
        if not supabase_client:
            # If we have no cloud storage either, this is a hard failure
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
    # Populate file_url for each document
    for doc in documents:
        if doc.file_id:
            if supabase_client:
                # Direct permanent link from Supabase
                doc.file_url = f"{SUPABASE_URL}/storage/v1/object/public/documents/{doc.file_id}"
            else:
                # Transient local link from Render
                doc.file_url = f"/api/uploads/{doc.file_id}"
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
    
    db.delete(document)
    db.commit()
    return {"message": "Document deleted successfully"}

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
        "key_present": SUPABASE_KEY is not None,
        "upload_dir_exists": os.path.exists(UPLOAD_DIR),
        "upload_dir_writable": os.access(UPLOAD_DIR, os.W_OK) if os.path.exists(UPLOAD_DIR) else False,
    }
