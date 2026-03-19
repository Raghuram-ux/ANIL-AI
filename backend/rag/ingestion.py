import fitz # PyMuPDF
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from sqlalchemy.orm import Session
import models
import os
import uuid

def process_and_store_document(db: Session, document_id: uuid.UUID, file_content: bytes, filename: str):
    mock_mode = os.getenv("MOCK_LLM", "false").lower() == "true"
    api_key = os.getenv("OPENAI_API_KEY")

    if not mock_mode and (not api_key or api_key == "your-openai-api-key-here"):
        print("Warning: OPENAI_API_KEY not set or placeholder. Cannot generate embeddings.")
        return

    text = ""
    if filename.lower().endswith(".pdf"):
        # Parse PDF
        doc = fitz.open(stream=file_content, filetype="pdf")
        for page in doc:
            text += page.get_text()
    else:
        # Parse Text/Markdown
        try:
            text = file_content.decode("utf-8")
        except UnicodeDecodeError:
            text = file_content.decode("latin-1")
    
    if not text.strip():
        return
    
    # Split text
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = text_splitter.split_text(text)
    
    if not chunks:
        return

    if mock_mode:
        print(f"Mocking embeddings for {len(chunks)} chunks...")
        # OpenAI dimensions are 1536
        embeddings = [[0.0] * 1536 for _ in chunks]
    else:
        embeddings_model = OpenAIEmbeddings(openai_api_key=api_key)
        # Get embeddings
        embeddings = embeddings_model.embed_documents(chunks)
    
    # Store in DB
    db_chunks = []
    for chunk, embedding in zip(chunks, embeddings):
        db_chunk = models.DocumentChunk(
            document_id=document_id,
            content=chunk,
            embedding=embedding
        )
        db_chunks.append(db_chunk)
    
    db.add_all(db_chunks)
    db.commit()
