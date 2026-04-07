from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Form
from sqlalchemy.orm import Session
import os
import uuid
import models, schemas, auth
from database import get_db
from rag.ingestion import process_and_store_document

router = APIRouter(
    prefix="/admin/documents",
    tags=["Documents"]
)

@router.post("", response_model=schemas.DocumentResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    audience: str = Form("all"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_staff_user)
):
    valid_extensions = (".pdf", ".txt", ".md")
    if not file.filename.lower().endswith(valid_extensions):
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type. Supported types: {', '.join(valid_extensions)}"
        )
    
    file_content = await file.read()
    
    db_document = models.Document(
        filename=file.filename,
        uploaded_by=current_user.id,
        audience=audience
    )
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    
    # Process file asynchronously
    background_tasks.add_task(process_and_store_document, db, db_document.id, file_content, file.filename)
    
    return db_document

@router.get("", response_model=list[schemas.DocumentResponse])
def list_documents(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_staff_user)
):
    documents = db.query(models.Document).all()
    return documents

@router.delete("/{document_id}")
def delete_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_staff_user)
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
        audience=data.audience
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
