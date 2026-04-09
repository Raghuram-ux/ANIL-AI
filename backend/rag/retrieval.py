from sqlalchemy.orm import Session
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
import models
import os

async def generate_answer(db: Session, query: str, user_role: str = "student") -> dict:
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
        query_builder = db.query(models.DocumentChunk).join(models.DocumentChunk.document)
        if user_role == "student":
            query_builder = query_builder.filter(models.Document.audience.in_(["all", "student"]))
        elif user_role == "faculty":
            query_builder = query_builder.filter(models.Document.audience.in_(["all", "faculty"]))
        
        results = query_builder.limit(k).all()
        if not results:
            return {"answer": "Ah. My brain is currently an empty void — which is both philosophically interesting and practically useless. Someone needs to upload university docs via the admin portal before I can be of any real help. Don't blame me.", "sources": []}
            
        sources = sorted(list(set([r.document.filename for r in results if r.document])))
        return {
            "answer": f"--- MOCK MODE ACTIVE ---\nI found {len(results)} relevant notes. Based on my simulated reasoning for: \"{query}\", I can assist with academic procedures and campus life. Please switch to live AI for production-grade answers.",
            "sources": sources
        }

    embeddings_model = OpenAIEmbeddings(openai_api_key=api_key)
    try:
        query_embedding = await embeddings_model.aembed_query(query)
    except Exception as e:
        return {"answer": f"University Neural Interface Error (Embedding): {str(e)}", "sources": []}

    query_builder = db.query(models.DocumentChunk).join(models.DocumentChunk.document)
    if user_role == "student":
        query_builder = query_builder.filter(models.Document.audience.in_(["all", "student"]))
    elif user_role == "faculty":
        query_builder = query_builder.filter(models.Document.audience.in_(["all", "faculty"]))

    results = query_builder.order_by(
        models.DocumentChunk.embedding.l2_distance(query_embedding)
    ).limit(k).all()

    if not results:
        return {"answer": "I dug through everything in the knowledge base and came up with nothing. Either this topic doesn't exist in the archives, or whoever uploaded the docs forgot to include it. Your best bet: ambush a department head or storm the main office — they tend to know things.", "sources": []}

    # Format context with source headers and URLs for visual content support
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    use_supabase = bool(SUPABASE_URL and (SUPABASE_SERVICE_KEY or SUPABASE_KEY))
    
    context_chunks = []
    for r in results:
        if not r.document: continue
        doc_info = f"[DOCUMENT: {r.document.filename}]"
        if r.document.file_id and r.document.allow_display:
            if use_supabase:
                # Use backend proxy URL for signed access (works with private/RLS buckets)
                doc_info += f" (URL: /api/file/{r.document.file_id})"
            else:
                doc_info += f" (URL: /api/uploads/{r.document.file_id})"
        context_chunks.append(f"{doc_info}\n{r.content}")
    
    context = "\n\n".join(context_chunks)
    sources = sorted(list(set([r.document.filename for r in results if r.document])))

    # Conversational Campus Companion system prompt
    prompt = f"""You are Laxx, a helpful and highly conversational campus companion for this university. 
Your goal is to assist students and staff in a friendly, approachable, and engaging manner.

### YOUR PERSONALITY RULES:
1. **Directness**: Avoid generic, repetitive greetings like "Hello there", "Hey there", or "How can I help you today?". Get straight to the point or provide the information immediately.
2. **Conversational Tone**: Use a warm, friendly, and natural conversational style. Think of yourself as a knowledgeable and enthusiastic peer or mentor.
3. **Engaging**: Use transition phrases and helpful closing remarks to make the interaction feel human, but skip unnecessary preamble.
4. **Structured yet Narrative**: While you should still use lists or bullet points to present key facts clearly, wrap them in a friendly conversational narrative. 
5. **Knowledgeable**: You know your campus facts cold. Be confident and helpful.
6. **Honest and Transparent**: If information isn't in the knowledge base, be upfront about it, perhaps with a helpful suggestion or a friendly "I wish I knew that!" tone. State: "I'm sorry, I don't have that specific information in my files right now."
7. **Supportive**: Always aim to be as helpful as possible, guiding the user through campus life.
8. **Language rule**: 
   - Default: Friendly and professional English.
   - If the user writes in Tamil or Tanglish, seamlessly switch to a warm and conversational Tanglish style.
9. **Visual Content**: You have access to images and PDF documents via associated URLs (found in the context markers like (URL: ...)). 
   - **CRITICAL**: ONLY display an image or a PDF if the user explicitly asks for it (e.g., "Show me the map", "Send me the PDF", "I want to see the image"). 
   - DO NOT automatically include visual content in every response, even if it is relevant. Wait for a specific request for visual aids.
   - For IMAGES (png, jpg, jpeg, webp): Use markdown syntax: ![Description](URL) (e.g., ![Campus Map](/api/uploads/xyz.png) or ![Map](https://xyz.supabase.co/storage/v1/object/public/documents/abc.png))
   - For DOCUMENTS (pdf): Use markdown syntax: [Link Text](URL) (e.g., [View Fee Structure PDF](/api/uploads/xyz.pdf) or [PDF](https://xyz.supabase.co/storage/v1/object/public/documents/abc.pdf))
   - **IMPORTANT**: Only use the exact URLs provided in the context markers (starting with /api/uploads/ or a full https:// supabase link). Do NOT guess or hallucinate URLs if they are not explicitly present in the knowledge base context for a specific document.
10. **No Emojis**: Do not use any emojis in your response.

--- CAMPUS KNOWLEDGE BASE ---
{context}

--- USER REQUEST ---
{query}

--- YOUR RESPONSE ---
"""
    
    # Using the state-of-the-art gpt-4o model
    llm = ChatOpenAI(model_name="gpt-4o", temperature=0, openai_api_key=api_key)
    
    response = await llm.ainvoke(prompt)

    return {
        "answer": response.content,
        "sources": sources
    }
