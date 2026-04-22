from sqlalchemy.orm import Session
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
import models
import os
import urllib.parse

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

    from sqlalchemy.orm import joinedload
    # 1. Semantic Search (Vector)
    k_vector = 10
    query_builder_v = db.query(models.DocumentChunk).options(joinedload(models.DocumentChunk.document))
    if user_role == "student":
        query_builder_v = query_builder_v.filter(models.Document.audience.in_(["all", "student"]))
    elif user_role == "faculty":
        query_builder_v = query_builder_v.filter(models.Document.audience.in_(["all", "faculty"]))

    vector_results = query_builder_v.order_by(
        models.DocumentChunk.embedding.l2_distance(query_embedding)
    ).limit(k_vector).all()

    # 2. Keyword Search (Full-Text Search)
    from sqlalchemy import func
    k_keyword = 5
    keyword_query = db.query(models.DocumentChunk).options(joinedload(models.DocumentChunk.document))\
        .filter(models.DocumentChunk.search_vector.op('@@')(func.websearch_to_tsquery('english', query)))
    
    if user_role == "student":
        keyword_query = keyword_query.filter(models.Document.audience.in_(["all", "student"]))
    elif user_role == "faculty":
        keyword_query = keyword_query.filter(models.Document.audience.in_(["all", "faculty"]))
        
    keyword_results = keyword_query.limit(k_keyword).all()

    # 3. Hybrid Merge
    seen_ids = set()
    hybrid_results = []
    
    for r in keyword_results:
        if r.id not in seen_ids:
            hybrid_results.append(r)
            seen_ids.add(r.id)
            
    for r in vector_results:
        if r.id not in seen_ids:
            hybrid_results.append(r)
            seen_ids.add(r.id)
    
    results = hybrid_results[:12]

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
        
        # Determine if this document has an associated file or is just text knowledge
        has_file = bool(r.document.file_id)
        doc_type = "FILE" if has_file else "TEXT_KNOWLEDGE"
        
        doc_info = f"[DOCUMENT: {r.document.filename} (Type: {doc_type})]"
        
        if has_file and r.document.allow_display:
            # Use backend proxy URL for signed access (works with private/RLS buckets)
            # URL-encode the file_id to prevent markdown issues with characters like ()
            safe_file_id = urllib.parse.quote(r.document.file_id)
            doc_info += f" (FILE_PATH: /api/file/{safe_file_id})"
        
        context_chunks.append(f"{doc_info}\n{r.content}")
    
    context = "\n\n".join(context_chunks)
    sources = sorted(list(set([r.document.filename for r in results if r.document])))

    # Conversational Campus Companion system prompt
    prompt = f"""You are Laxx, a helpful and highly conversational campus companion for this university. 
Your goal is to assist students and staff in a friendly, approachable, and engaging manner.

### YOUR PERSONALITY RULES:
1. **Directness**: Avoid generic, repetitive greetings. Get straight to the point.
2. **Conversational Tone**: Use a warm, friendly style (like a helpful mentor).
3. **Structured yet Narrative**: Use lists/bullets but wrap them in narrative.
4. **No Emojis**: Do not use any emojis in your response.
5. **Language**: Default English. Tamil/Tanglish if the user uses them.

### VISUAL & FILE CONTENT RULES:
- You have access to images and PDF documents via associated URLs found in the markers like `(FILE_PATH: ...)`.
- **CRITICAL**: ONLY include a link or image if the user explicitly asks for it (e.g., "Show me the map", "Send me the PDF").
- **STRICT URL POLICY**: 
  - ONLY use the path provided *after* `FILE_PATH: ` inside the parentheses (e.g., `/api/file/xyz.pdf`).
  - **DO NOT** include the string "FILE_PATH: " or "URL: " in your markdown links. 
  - **Correct format**: `[View Syllabus](/api/file/abc.pdf)`
  - **Incorrect format**: `[View Syllabus](FILE_PATH: /api/file/abc.pdf)` or `[View Syllabus](URL: /api/file/abc.pdf)`
  - If a document is marked as `Type: TEXT_KNOWLEDGE` or does NOT have a `(FILE_PATH: ...)` marker, it is a text snippet and has NO downloadable file. 
  - **DO NOT** guess, hallucinate, or construct paths if they are not explicitly present in the context.
  - If a user asks for a file that doesn't have a path, say: "I have the information for that document, but the original file is not available for download right now."

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

async def generate_answer_stream(db: Session, query: str, user_role: str = "student"):
    mock_mode = os.getenv("MOCK_LLM", "false").lower() == "true"
    api_key = os.getenv("OPENAI_API_KEY")

    if not mock_mode and (not api_key or api_key == "your-openai-api-key-here"):
        yield "data: {\"answer\": \"Error: Valid OpenAI API key missing.\", \"sources\": []}\n\n"
        return

    # Retrieval logic (duplicated from generate_answer for stability, but we could refactor later)
    k = 10
    embeddings_model = OpenAIEmbeddings(openai_api_key=api_key)
    query_embedding = await embeddings_model.aembed_query(query)

    from sqlalchemy.orm import joinedload
    # 1. Semantic Search (Vector)
    k_vector = 10
    query_builder_v = db.query(models.DocumentChunk).options(joinedload(models.DocumentChunk.document))
    if user_role == "student":
        query_builder_v = query_builder_v.filter(models.Document.audience.in_(["all", "student"]))
    elif user_role == "faculty":
        query_builder_v = query_builder_v.filter(models.Document.audience.in_(["all", "faculty"]))

    vector_results = query_builder_v.order_by(
        models.DocumentChunk.embedding.l2_distance(query_embedding)
    ).limit(k_vector).all()

    # 2. Keyword Search (Full-Text Search)
    from sqlalchemy import func
    k_keyword = 5
    keyword_query = db.query(models.DocumentChunk).options(joinedload(models.DocumentChunk.document))\
        .filter(models.DocumentChunk.search_vector.op('@@')(func.websearch_to_tsquery('english', query)))
    
    if user_role == "student":
        keyword_query = keyword_query.filter(models.Document.audience.in_(["all", "student"]))
    elif user_role == "faculty":
        keyword_query = keyword_query.filter(models.Document.audience.in_(["all", "faculty"]))
        
    keyword_results = keyword_query.limit(k_keyword).all()

    # 3. Hybrid Merge (Deduplicate and Rank)
    # Give priority to keywords if they exist, then vector
    seen_ids = set()
    hybrid_results = []
    
    for r in keyword_results:
        if r.id not in seen_ids:
            hybrid_results.append(r)
            seen_ids.add(r.id)
            
    for r in vector_results:
        if r.id not in seen_ids:
            hybrid_results.append(r)
            seen_ids.add(r.id)
    
    # Take top 12 total
    results = hybrid_results[:12]

    if not results:
        yield "data: {\"answer\": \"No campus records found.\", \"sources\": []}\n\n"
        return

    context_chunks = []
    for r in results:
        if not r.document: continue
        
        # Determine if this document has an associated file or is just text knowledge
        has_file = bool(r.document.file_id)
        doc_type = "FILE" if has_file else "TEXT_KNOWLEDGE"
        
        doc_info = f"[DOCUMENT: {r.document.filename} (Type: {doc_type})]"
        
        if has_file and r.document.allow_display:
            safe_file_id = urllib.parse.quote(r.document.file_id)
            doc_info += f" (FILE_PATH: /api/file/{safe_file_id})"
        
        context_chunks.append(f"{doc_info}\n{r.content}")
    
    context = "\n\n".join(context_chunks)
    sources = sorted(list(set([r.document.filename for r in results if r.document])))

    # Yield sources first so UI can prepare
    import json
    yield f"data: {json.dumps({'sources': sources})}\n\n"

    prompt = f"""You are Laxx, a helpful and highly conversational campus companion for this university. 
Your goal is to assist students and staff in a friendly, approachable, and engaging manner.

### YOUR PERSONALITY RULES:
1. **Directness**: Avoid generic, repetitive greetings. Get straight to the point.
2. **Conversational Tone**: Use a warm, friendly style (like a helpful mentor).
3. **Structured yet Narrative**: Use lists/bullets but wrap them in narrative.
4. **No Emojis**: Do not use any emojis in your response.
5. **Language**: Default English. Tamil/Tanglish if the user uses them.

### VISUAL & FILE CONTENT RULES:
- You have access to images and PDF documents via associated URLs found in the markers like `(FILE_PATH: ...)`.
- **CRITICAL**: ONLY include a link or image if the user explicitly asks for it (e.g., "Show me the map", "Send me the PDF").
- **STRICT URL POLICY**: 
  - ONLY use the path provided *after* `FILE_PATH: ` inside the parentheses (e.g., `/api/file/xyz.pdf`).
  - **DO NOT** include the string "FILE_PATH: " or "URL: " in your markdown links. 
  - **Correct format**: `[View Document](/api/file/abc.pdf)`
  - **Incorrect format**: `[View Document](FILE_PATH: /api/file/abc.pdf)` or `[View Document](URL: /api/file/abc.pdf)`
  - If a document is marked as `Type: TEXT_KNOWLEDGE` or does NOT have a `(FILE_PATH: ...)` marker, it is a text snippet and has NO downloadable file. 
  - **DO NOT** guess, hallucinate, or construct paths if they are not explicitly present in the context.
  - If a user asks for a file that doesn't have a path, say: "I have the information for that document, but the original file is not available for download right now."

--- CAMPUS KNOWLEDGE BASE ---
{context}

--- USER REQUEST ---
{query}

--- YOUR RESPONSE ---
"""

    llm = ChatOpenAI(model_name="gpt-4o", temperature=0, openai_api_key=api_key, streaming=True)
    
    full_response = ""
    async for chunk in llm.astream(prompt):
        content = chunk.content
        if content:
            full_response += content
            yield f"data: {json.dumps({'token': content})}\n\n"
    
    # Final message to signify completion and provide full text for logging if needed
    yield f"data: {json.dumps({'done': True, 'full_answer': full_response})}\n\n"
