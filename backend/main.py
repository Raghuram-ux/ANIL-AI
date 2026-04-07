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

# Ensure audience column exists
with database.engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS audience VARCHAR DEFAULT 'all';"))
        # Force fill any existing nulls just in case
        conn.execute(text("UPDATE documents SET audience = 'all' WHERE audience IS NULL;"))
        conn.commit()
    except Exception as e:
        print(f"Migration warning (audience): {e}")

# Ensure file_id column exists
with database.engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_id VARCHAR;"))
        conn.commit()
    except Exception as e:
        print(f"Migration warning (file_id): {e}")

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
