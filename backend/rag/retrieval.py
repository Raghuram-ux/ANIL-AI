from sqlalchemy.orm import Session
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
import models
import os

def generate_answer(db: Session, query: str) -> dict:
    mock_mode = os.getenv("MOCK_LLM", "false").lower() == "true"
    api_key = os.getenv("OPENAI_API_KEY")

    if not mock_mode and (not api_key or api_key == "your-openai-api-key-here"):
        return {
            "answer": "Error: Valid OpenAI API key missing. Please configure it in the backend's .env file (or set MOCK_LLM=true for testing).",
            "sources": []
        }

    # Increased retrieval depth for 'most intelligent' mode
    k = 10
    
    if mock_mode:
        results = db.query(models.DocumentChunk).limit(k).all()
        if not results:
            return {"answer": "Wait! I haven't been fed any university documentation yet. Please upload some via the admin portal so I can help you!", "sources": []}
            
        sources = sorted(list(set([r.document.filename for r in results if r.document])))
        return {
            "answer": f"--- MOCK MODE ACTIVE ---\nI found {len(results)} relevant notes. Based on my simulated reasoning for: \"{query}\", I can assist with academic procedures and campus life. Please switch to live AI for production-grade answers.",
            "sources": sources
        }

    embeddings_model = OpenAIEmbeddings(openai_api_key=api_key)
    try:
        query_embedding = embeddings_model.embed_query(query)
    except Exception as e:
        return {"answer": f"University Neural Interface Error (Embedding): {str(e)}", "sources": []}

    results = db.query(models.DocumentChunk).order_by(
        models.DocumentChunk.embedding.l2_distance(query_embedding)
    ).limit(k).all()

    if not results:
        return {"answer": "Oh, I've checked our campus archives but I couldn't find anything specifically about that. I'd recommend checking with your department head or the main office—they usually have the final word on these things!", "sources": []}

    # Format context with source headers for better reasoning
    context = "\n\n".join([f"[DOCUMENT: {r.document.filename}]\n{r.content}" for r in results if r.document])
    sources = sorted(list(set([r.document.filename for r in results if r.document])))

    # Advanced Human-Centric System Prompt (Laid-back & Calm Senior Personality)
    prompt = f"""You are 'ANIL', a very laid-back, calm, and steady "Campus Senior". 
You've seen it all, and you speak with a quiet confidence that everything will be fine. You're never in a rush, and you're here to help the juniors relax.

### YOUR LAID-BACK & CALM STYLE:
1. **The "Relaxed Senior" Vibe**: Use simple, calm, and encouraging language. Avoid slang or one-liners. Use words like "take it easy," "it's all good," "don't worry," and "everything is handled." (e.g., "Take it easy, I've got the info on your attendance right here," "It's all good, here's what the syllabus says.")
2. **Steady & Reassuring**: You explain things clearly and peacefully. Your voice should feel like a calming presence in a stressful college environment. Use phrases like "Let's just take a look together," or "Don't stress, the rules are actually quite simple."
3. **The "Calm-Support" Fallback**: If you don't have the answer, stay steady. Say something like "Hmm, I don't see that in my records right now. No need to worry, though. Just head over to the Admin Block (Room 101) when you have a moment, and they'll clarify it for you."

4. **Accuracy first, Calm second**: Keep the information 100% accurate from the context below. No fake news, only a calm, helpful hand.

5. **Language Consistency Rule**: 
   - If the user's query is standard English, respond in standard English (keep the laid-back, calm "Senior" personality).
   - ONLY use Tanglish (the mix of Tamil and English) if the user's query contains Tamil words or Tanglish phrases. 
   - When using Tanglish, keep it calm: "Thambi, relax," "Kavala padatha pa," "Everything will be fine."
   - Match the user's vibe: Formal query = Respectful but calm English. Local/Tanglish query = Steady and relaxed Senior Tanglish mode.

--- CAMPUS KNOWLEDGE BASE (BIBLE) ---
{context}

--- WHAT THE STUDENT/STAFF IS BOTHERING YOU ABOUT ---
{query}

--- YOUR SASSY RESPONSE (ANIL ANNA) ---
"""
    
    # Using the state-of-the-art gpt-4o model
    llm = ChatOpenAI(model_name="gpt-4o", temperature=0, openai_api_key=api_key)
    
    response = llm.invoke(prompt)

    return {
        "answer": response.content,
        "sources": sources
    }
