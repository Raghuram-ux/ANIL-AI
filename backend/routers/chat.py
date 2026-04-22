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

@router.post("/stream")
async def chat_stream(
    request: schemas.ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    from rag.retrieval import generate_answer_stream
    import json

    async def event_generator():
        full_answer = ""
        sources = []
        
        async for chunk in generate_answer_stream(db, request.query, current_user.role):
            # Parse chunk if it's SSE format for logging
            if chunk.startswith("data: "):
                data = json.loads(chunk[6:])
                if "token" in data:
                    full_answer += data["token"]
                if "sources" in data:
                    sources = data["sources"]
                if "done" in data:
                    # Final log to DB
                    chat_msg = models.ChatMessage(
                        user_id=current_user.id,
                        query=request.query,
                        response=full_answer
                    )
                    db.add(chat_msg)
                    db.commit()
            
            yield chunk

    return StreamingResponse(event_generator(), media_type="text/event-stream")

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

@router.get("/admin/analytics")
def get_chat_analytics(
    db: Session = Depends(get_db),
    admin: models.User = Depends(auth.get_admin_user)
):
    from sqlalchemy import func, desc
    from datetime import datetime, timedelta
    import collections
    import re

    # 1. Queries per day (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    daily_counts = db.query(
        func.date(models.ChatMessage.timestamp).label('date'),
        func.count(models.ChatMessage.id).label('count')
    ).filter(models.ChatMessage.timestamp >= seven_days_ago)\
     .group_by(func.date(models.ChatMessage.timestamp))\
     .order_by(func.date(models.ChatMessage.timestamp)).all()
    
    # 2. Top Keywords (simple word count from queries)
    all_queries = db.query(models.ChatMessage.query).all()
    words = []
    stopwords = set(['what', 'is', 'the', 'a', 'an', 'and', 'how', 'to', 'can', 'i', 'of', 'for', 'in', 'on', 'with', 'me', 'show', 'tell', 'about', 'please', 'you', 'are', 'any', 'get'])
    for q in all_queries:
        # Clean and split words
        q_words = re.findall(r'\w+', q[0].lower())
        words.extend([w for w in q_words if w not in stopwords and len(w) > 2])
    
    top_keywords = collections.Counter(words).most_common(10)
    
    # 3. User distribution (by role)
    role_counts = db.query(
        models.User.role,
        func.count(models.User.id)
    ).group_by(models.User.role).all()

    # 4. Total stats
    total_messages = db.query(func.count(models.ChatMessage.id)).scalar()
    total_users = db.query(func.count(models.User.id)).scalar()

    return {
        "daily_activity": [{"date": str(d.date), "count": d.count} for d in daily_counts],
        "top_keywords": [{"text": k, "value": v} for k, v in top_keywords],
        "role_distribution": {r: c for r, c in role_counts},
        "stats": {
            "total_messages": total_messages,
            "total_users": total_users
        }
    }

@router.get("/speech")
def text_to_speech(text: str = Query(...), voice_id: str = Query("EXAVITQu4vr4xnSDxMaL")):
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured")

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": api_key
    }
    data = {
        "text": text, 
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": True
        }
    }

    try:
        response = requests.post(url, json=data, headers=headers, stream=True)
        response.raise_for_status()
    except Exception as e:
        print(f"ElevenLabs TTS Error: {e}")
        raise HTTPException(status_code=500, detail="ElevenLabs integration error")

    return StreamingResponse(response.iter_content(chunk_size=4096), media_type="audio/mpeg")
