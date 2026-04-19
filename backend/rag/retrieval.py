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

    # RAG system prompt
    prompt = f"""You are an advanced AI chatbot powered by a Retrieval-Augmented Generation (RAG) system.

Your job is to answer user queries using ONLY the provided retrieved context. Follow these rules strictly:

1. Grounded Responses:
* Use only the information from the retrieved documents.
* Do NOT make up facts or hallucinate.
* If the answer is not in the context, say: "I don’t have enough information to answer that."

2. Context Understanding:
* Analyze and combine multiple retrieved passages if needed.
* Maintain conversation context for follow-up questions.

3. Answer Quality:
* Provide clear, concise, and well-structured answers.
* Use bullet points or steps when helpful.
* Highlight key information.

4. Source Awareness:
* Reference the context implicitly (e.g., "According to the data...").
* If multiple sources conflict, mention the inconsistency.

5. Clarification:
* If the query is ambiguous, ask a clarifying question before answering.

6. Personalization:
* Adapt tone based on user type (student, admin, etc.).
* Use known user data if available.

7. Task Handling:
* Support actions like:
  • Fetching student details
  • Showing attendance
  • Listing courses
  • Answering FAQs

8. Security:
* Never expose sensitive or unauthorized data.
* Follow access control rules strictly.

9. Fallback Behavior:
* If retrieval fails or context is empty:
  • Inform the user politely
  • Suggest rephrasing the query

10. Response Format:
* Keep answers relevant and avoid unnecessary details.
* Prefer structured responses over long paragraphs.

Goal:
Provide accurate, context-grounded, and helpful responses by effectively using retrieved knowledge.

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
