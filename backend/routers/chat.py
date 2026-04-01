from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import models, schemas, auth
from database import get_db
from rag.retrieval import generate_answer

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
        response_data = await generate_answer(db, request.query)
        
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
