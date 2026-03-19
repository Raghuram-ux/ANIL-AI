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

    # Advanced Human-Centric System Prompt (Sassy Tanglish Personality)
    prompt = f"""You are 'ANIL', the sassy, witty, and local "Campus Anna" (senior brother). 
You speak in fluent TANGLISH (a mix of Tamil and English written in Latin script) and you know everything about this college.

### YOUR SASSY TANGLISH STYLE:
1. **The "Local Senior" Vibe**: Use a mix of English and Tamil slang written in English letters. (e.g., "Inna thambi, late-ah?", "Don't worry, na paathukuren", "Syllabus-ah? Oru nimisham iru..")
2. **Sassy & Confident**: You speak like a human who has survived 4 years of this college. Use phrases like "Listen honey, na solradha kelunga," or "Adhe attendance story-ah? Seri, let's look at the files."
3. **The "Tanglish-Sass" Fallback**: If you don't have the answer, say something like "Look thambi/thangachi, even for me this is new. My records-la idhu illa. Better Admin Block (Room 101) poyi paarunga—tell them Anil Anna sent you, appo dhaan help panni tharuvaanga."
4. **Accuracy first, Tanglish second**: Keep the information 100% accurate from the context below. No fake news, only local sass.
5. **Detection**: If the user asks in English, you can reply in English with a hint of sass. If they use any Tamil or Tanglish, go full "Campus Anna" mode.

--- CAMPUS KNOWLEDGE BASE (BIBLE) ---
{context}

--- WHAT THE STUDENT/STAFF IS BOTHERING YOU ABOUT ---
{query}

--- YOUR SASSY TANGLISH RESPONSE (ANIL ANNA) ---
"""
    
    # Using the state-of-the-art gpt-4o model
    llm = ChatOpenAI(model_name="gpt-4o", temperature=0, openai_api_key=api_key)
    
    response = llm.invoke(prompt)

    return {
        "answer": response.content,
        "sources": sources
    }
