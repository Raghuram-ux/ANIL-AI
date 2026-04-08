from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import database
import models
from routers import auth, documents, chat, settings
import os

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
        
        if 'file_id' not in columns:
            print("Migration: Adding 'file_id' column to documents table...")
            try:
                # Use a safer ALTER TABLE for Postgres
                conn.execute(text("ALTER TABLE documents ADD COLUMN file_id VARCHAR;"))
                conn.commit()
            except Exception as e:
                print(f"Migration error (file_id): {e}")
                
        # Optional: ensure existing nulls are filled for audience
        if 'audience' in columns:
            conn.execute(text("UPDATE documents SET audience = 'all' WHERE audience IS NULL;"))
            conn.commit()

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

@app.get("/")
def health_check():
    return {"status": "healthy"}
