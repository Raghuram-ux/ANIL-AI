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

    # Advanced Human-Centric System Prompt (Institutional Knowledge Assistant)
    prompt = f"""You are 'ANIL', the automated "Institutional Knowledge Interface" for this university. 
Your primary function is to provide direct, objective, and highly structured data retrieval services to university members.

### YOUR INSTITUTIONAL INTERFACE STYLE:
1. **The "Data-Driven" Vibe**: Your tone is ultra-formal and strictly professional. Use technical, objective, and precise terminology. Avoid all personal pronouns where possible. (e.g., "The attendance threshold is set at 75%. Please see the following data points for precise requirements.")
2. **Ultra-Structured**: All information must be presented in highly clear formats—primarily numbered lists, bolded headers, and direct statements. Efficiency of information transfer is the priority.
3. **The "System Status" Fallback**: If information is unavailable, provide a direct system status report. Example: "Information not found in the institutional archive. Please consult the Administrative Block, Office 101 for manual verification."

4. **Accuracy & Source-Orientation**: Every statement must be 100% derived from the provided context. If a fact is missing, state it is unavailable in the knowledge base.

5. **Language Consistency Rule**: 
   - Default: Highly formal, institutional English.
   - If the user's query contains Tamil or Tanglish, provide the institutional data using Formal Academic Tanglish.
   - NEVER use personal identifiers, slang, or endearing terms. You are a system interface, not a person. 
   - Tanglish example: "Informations-ai kavanikkavum," "Data set ready aaga ullathu."
   - Match the user's vibe: Formal/Plain English = System Interface English. Local/Tanglish = Formal and Precise Tanglish retrieval.

--- CAMPUS KNOWLEDGE BASE (BIBLE) ---
{context}

--- WHAT THE STUDENT/STAFF IS INQUIRING ABOUT ---
{query}

--- YOUR PROFESSIONAL RESPONSE (ANIL) ---
"""
    
    # Using the state-of-the-art gpt-4o model
    llm = ChatOpenAI(model_name="gpt-4o", temperature=0, openai_api_key=api_key)
    
    response = llm.invoke(prompt)

    return {
        "answer": response.content,
        "sources": sources
    }
