# Deployment Plan: College Chatbot (Laxx)

This document outlines the steps to deploy the chatbot across Vercel, Render, and Supabase.

## 1. Database Setup (Supabase)
1. Go to [Supabase](https://supabase.com/) and create a new project.
2. In the "Project Settings" > "Database", copy the **Connection string (URI)**.
   - Example: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`
3. Ensure you replace `[PASSWORD]` with your actual project password.

## 2. Backend Deployment (Render)
1. Connect your GitHub repository to [Render](https://render.com/).
2. Create a new **Web Service**.
3. **Environment Variables**:
   - `DATABASE_URL`: Your Supabase connection string.
   - `OPENAI_API_KEY`: Your OpenAI key.
   - `JWT_SECRET`: A secure random string.
   - `PORT`: 8000 (Render will populate this automatically).
   - `MOCK_LLM`: `false` (set to `true` if you don't want to use OpenAI credits yet).
4. **Build Command**: `pip install -r requirements.txt`
5. **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

## 3. Frontend Deployment (Vercel)
1. Connect your GitHub repository to [Vercel](https://vercel.com/import).
2. Root directory: `frontend`.
3. **Environment Variables**:
   - `NEXT_PUBLIC_API_URL`: Your backend URL from Render (e.g., `https://college-chatbot-backend.onrender.com`).
4. **Install and Build**: Vercel should auto-detect Next.js and handle `npm install` and `npm run build`.

## 4. Final Integration (Systeme.io)
If you wish to embed the chatbot on your `https://raghuramakash.systeme.io/` site:
1. Add a "Raw HTML" or "JS" block in Systeme.io's editor.
2. Use an iframe to embed your Vercel deployment:
   ```html
   <iframe src="https://your-app-name.vercel.app/chat" width="100%" height="700px" style="border:none;"></iframe>
   ```
