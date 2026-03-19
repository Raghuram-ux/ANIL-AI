from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import database
import models
from routers import auth, documents, chat

from sqlalchemy import text

# Create database extension first
with database.engine.connect() as conn:
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    conn.commit()

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

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(chat.router)

@app.get("/")
def health_check():
    return {"status": "healthy"}
