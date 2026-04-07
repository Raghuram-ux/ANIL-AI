from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import models, schemas, auth
from database import get_db
from rag.retrieval import generate_answer
import requests
import os

router = APIRouter(
    prefix="/chat",
    tags=["Chat"]
)

@router.post("", response_model=schemas.ChatResponse)
async def chat_with_bot(
    request: schemas.ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    try:
        response_data = await generate_answer(db, request.query, current_user.role)
        
        # Save chat log
        chat_msg = models.ChatMessage(
            user_id=current_user.id,
            query=request.query,
            response=response_data["answer"]
        )
        db.add(chat_msg)
        db.commit()

        return schemas.ChatResponse(
            answer=response_data["answer"],
            sources=response_data["sources"]
        )
    except Exception as e:
        import traceback
        with open("chat_error_log.txt", "w") as f:
            f.write(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/logs")
def get_global_chat_logs(
    username: str = Query(None, description="Filter logs by username"),
    db: Session = Depends(get_db),
    admin: models.User = Depends(auth.get_admin_user)
):
    # Retrieve all queries
    query = db.query(models.ChatMessage, models.User.username)\
              .join(models.User, models.ChatMessage.user_id == models.User.id)
    
    if username:
        query = query.filter(models.User.username.ilike(f"%{username}%"))
        
    query = query.order_by(models.ChatMessage.timestamp.desc()).limit(100)
    
    results = query.all()
    
    logs = []
    for msg, uname in results:
        logs.append({
            "id": str(msg.id),
            "username": uname,
            "query": msg.query,
            "response": msg.response,
            "timestamp": msg.timestamp.isoformat() if msg.timestamp else None
        })
        
    return logs

@router.get("/speech")
def text_to_speech(text: str = Query(...)):
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured")

    url = "https://api.elevenlabs.io/v1/text-to-speech/kPzsL2i3teMYv0FxEYQ6"
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": api_key
    }
    data = {"text": text, "model_id": "eleven_monolingual_v1"}

    try:
        response = requests.post(url, json=data, headers=headers, stream=True)
        response.raise_for_status()
    except Exception as e:
        print(f"ElevenLabs TTS Error: {e}")
        raise HTTPException(status_code=500, detail="ElevenLabs integration error")

    return StreamingResponse(response.iter_content(chunk_size=4096), media_type="audio/mpeg")
