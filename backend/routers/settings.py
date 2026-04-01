from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import database
import models
import schemas
from auth import get_admin_user

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("/voice")
def get_voice_setting(db: Session = Depends(database.get_db)):
    setting_name = db.query(models.Setting).filter(models.Setting.key == "voice_name").first()
    setting_lang = db.query(models.Setting).filter(models.Setting.key == "voice_lang").first()
    
    return {
        "voice_name": setting_name.value if setting_name else "",
        "voice_lang": setting_lang.value if setting_lang else ""
    }

@router.post("/voice")
def update_voice_setting(voice: schemas.VoiceSetting, db: Session = Depends(database.get_db), admin: models.User = Depends(get_admin_user)):
    # Update or create voice_name
    setting_name = db.query(models.Setting).filter(models.Setting.key == "voice_name").first()
    if setting_name:
        setting_name.value = voice.voice_name
    else:
        setting_name = models.Setting(key="voice_name", value=voice.voice_name)
        db.add(setting_name)

    # Update or create voice_lang
    setting_lang = db.query(models.Setting).filter(models.Setting.key == "voice_lang").first()
    if setting_lang:
        setting_lang.value = voice.voice_lang
    else:
        setting_lang = models.Setting(key="voice_lang", value=voice.voice_lang)
        db.add(setting_lang)

    db.commit()
    return {"message": "Voice settings updated"}
