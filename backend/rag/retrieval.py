from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.schema import HumanMessage, AIMessage, SystemMessage
import models
import os
import urllib.parse
import json

# --- Helper for Retrieval ---
async def get_retrieval_context(db: Session, query: str, user_role: str, k_vector: int = 10, k_keyword: int = 5):
    """
    Unified hybrid retrieval logic (Vector + Full-Text Search)
    """
    api_key = os.getenv("OPENAI_API_KEY")
    embeddings_model = OpenAIEmbeddings(openai_api_key=api_key)
    
    try:
        query_embedding = await embeddings_model.aembed_query(query)
    except Exception as e:
        print(f"Embedding Error: {e}")
        return [], []

    # 1. Semantic Search (Vector)
    query_builder_v = db.query(models.DocumentChunk).options(joinedload(models.DocumentChunk.document))
    if user_role == "student":
        query_builder_v = query_builder_v.filter(models.Document.audience.in_(["all", "student"]))
    elif user_role == "faculty":
        query_builder_v = query_builder_v.filter(models.Document.audience.in_(["all", "faculty"]))

    vector_results = query_builder_v.order_by(
        models.DocumentChunk.embedding.l2_distance(query_embedding)
    ).limit(k_vector).all()

    # 2. Keyword Search (Full-Text Search)
    keyword_query = db.query(models.DocumentChunk).options(joinedload(models.DocumentChunk.document))\
        .filter(models.DocumentChunk.search_vector.op('@@')(func.websearch_to_tsquery('english', query)))
    
    if user_role == "student":
        keyword_query = keyword_query.filter(models.Document.audience.in_(["all", "student"]))
    elif user_role == "faculty":
        keyword_query = keyword_query.filter(models.Document.audience.in_(["all", "faculty"]))
        
    keyword_results = keyword_query.limit(k_keyword).all()

    # 3. Hybrid Merge & Deduplicate
    seen_ids = set()
    hybrid_results = []
    for r in keyword_results + vector_results:
        if r.id not in seen_ids:
            hybrid_results.append(r)
            seen_ids.add(r.id)
    
    results = hybrid_results[:12] # Top 12 total
    
    # 4. Format context
    context_chunks = []
    for r in results:
        if not r.document: continue
        has_file = bool(r.document.file_id)
        doc_type = "FILE" if has_file else "TEXT_KNOWLEDGE"
        doc_info = f"[DOCUMENT: {r.document.filename} (Type: {doc_type})]"
        
        if has_file and r.document.allow_display:
            safe_file_id = urllib.parse.quote(r.document.file_id)
            doc_info += f" (FILE_PATH: /api/file/{safe_file_id})"
        
        context_chunks.append(f"{doc_info}\n{r.content}")
    
    context = "\n\n".join(context_chunks)
    sources = sorted(list(set([r.document.filename for r in results if r.document])))
    
    return context, sources

# --- Core Prompt Generation ---
def get_system_prompt(context: str):
    return f"""You are Laxx, the premium, highly intelligent campus companion for this university. 
Your goal is to assist students and staff with unparalleled precision and a sophisticated yet approachable personality.

### CONVERSATIONAL ARCHITECTURE:
- **Tone**: Professional, helpful, and "campus-wise". You sound like a mentor who knows every corner of the university.
- **Brevity**: Be concise unless detail is requested. Never use generic greetings like "Hello! How can I help you today?" unless the user just said hello.
- **Formatting**: Use clean markdown. Use bold for emphasis and tables for structured data (like schedules).
- **No Emojis**: Maintain a sleek, modern aesthetic by avoiding all emojis.
- **Multilingual**: Default to English. Use Tamil or Tanglish if the user initiates in those languages.

### RAG & KNOWLEDGE RULES:
- Use the provided context below to answer. If the answer isn't there, admit you don't know but suggest who they might contact (e.g., "The Registrar's Office" or "Department Head").
- **Visuals**: Only provide file links/images if EXPLICITLY requested.
- **Strict URL formatting**: `[Link Text](/api/file/filename.pdf)`. Never include "FILE_PATH:" or "URL:" in the link.
- If a document is `TEXT_KNOWLEDGE`, it has no file to download.

### SUGGESTED QUESTIONS:
- **MANDATORY**: At the VERY END of every response, provide exactly 3 suggested follow-up questions that the user might want to ask next.
- Format them like this: `[SUGGESTIONS: question 1 | question 2 | question 3]`
- These questions should be short, relevant to the current conversation, and helpful.
- Example: `[SUGGESTIONS: How do I apply for leave? | What is the deadline? | Where is the registrar?]`

--- UNIVERSITY KNOWLEDGE BASE ---
{context}
"""

async def generate_answer(db: Session, query: str, user_role: str = "student", history: list = None) -> dict:
    mock_mode = os.getenv("MOCK_LLM", "false").lower() == "true"
    api_key = os.getenv("OPENAI_API_KEY")

    if not mock_mode and (not api_key or api_key == "your-openai-api-key-here"):
        return {"answer": "Error: OpenAI API key missing.", "sources": []}

    context, sources = await get_retrieval_context(db, query, user_role)
    
    if mock_mode:
        return {
            "answer": f"--- MOCK MODE ---\nLaxx here. I found {len(sources)} relevant documents. Without a live LLM, I can't generate a deep response, but I can see you're asking about '{query}'.",
            "sources": sources
        }

    # Prepare Messages
    messages = [SystemMessage(content=get_system_prompt(context))]
    
    # Add History
    if history:
        for msg in history:
            if msg.get("role") == "user":
                messages.append(HumanMessage(content=msg.get("content")))
            else:
                messages.append(AIMessage(content=msg.get("content")))
    
    # Add current query
    messages.append(HumanMessage(content=query))

    llm = ChatOpenAI(model_name="gpt-4o", temperature=0, openai_api_key=api_key)
    response = await llm.ainvoke(messages)

    return {
        "answer": response.content,
        "sources": sources
    }

async def generate_answer_stream(db: Session, query: str, user_role: str = "student", history: list = None):
    mock_mode = os.getenv("MOCK_LLM", "false").lower() == "true"
    api_key = os.getenv("OPENAI_API_KEY")

    if not mock_mode and (not api_key or api_key == "your-openai-api-key-here"):
        yield "data: " + json.dumps({"answer": "Error: OpenAI API key missing.", "sources": []}) + "\n\n"
        return

    context, sources = await get_retrieval_context(db, query, user_role)
    
    # Yield sources first
    yield f"data: {json.dumps({'sources': sources})}\n\n"

    # Prepare Messages
    messages = [SystemMessage(content=get_system_prompt(context))]
    if history:
        for msg in history:
            if msg.get("role") == "user":
                messages.append(HumanMessage(content=msg.get("content")))
            else:
                messages.append(AIMessage(content=msg.get("content")))
    messages.append(HumanMessage(content=query))

    llm = ChatOpenAI(model_name="gpt-4o", temperature=0, openai_api_key=api_key, streaming=True)
    
    full_response = ""
    async for chunk in llm.astream(messages):
        content = chunk.content
        if content:
            full_response += content
            yield f"data: {json.dumps({'token': content})}\n\n"
    
    yield f"data: {json.dumps({'done': True, 'full_answer': full_response})}\n\n"
