from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models, schemas, auth
from database import get_db
from rag.retrieval import generate_answer

router = APIRouter(
    prefix="/chat",
    tags=["Chat"]
)

@router.post("", response_model=schemas.ChatResponse)
def chat_with_bot(
    request: schemas.ChatRequest,
    db: Session = Depends(get_db)
):
    try:
        response_data = generate_answer(db, request.query)
        return schemas.ChatResponse(
            answer=response_data["answer"],
            sources=response_data["sources"]
        )
    except Exception as e:
        import traceback
        with open("chat_error_log.txt", "w") as f:
            f.write(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
