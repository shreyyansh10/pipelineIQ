import os
import httpx
import json
from openai import OpenAI
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

# -- Groq Configuration --------------------------------
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_BASE_URL = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
PAPER_SERVICE_URL = os.getenv("PAPER_SERVICE_URL", "http://localhost:8001")
VECTOR_SERVICE_URL = os.getenv("VECTOR_SERVICE_URL", "http://localhost:8003")

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB = os.getenv("MONGODB_DB", "paperpilot")

if MONGODB_URI:
    mongo_client = AsyncIOMotorClient(MONGODB_URI)
    db = mongo_client[MONGODB_DB]
    print(f"✅ Connected to MongoDB: {MONGODB_DB}")
else:
    db = None
    print("⚠️ WARNING: MONGODB_URI not set, database features disabled")

# Initialize Groq client (OpenAI-compatible)
groq_client = OpenAI(
    api_key=GROQ_API_KEY,
    base_url=GROQ_BASE_URL
)

app = FastAPI(title="AI Service", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -- Request Models ------------------------------------

class SummarizeRequest(BaseModel):
    paper_id: str

class AnalyzeRequest(BaseModel):
    paper_id: str
    file_type: str = "python"

class ScoreRequest(BaseModel):
    paper_id: str

class ExplainRequest(BaseModel):
    paper_id: str
    level: str = "beginner"

class ChatRequest(BaseModel):
    paper_id: str
    question: str

# -- Helper: Fetch paper text from Paper Service -------

async def fetch_paper_text(paper_id: str) -> str:
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(
            f"{PAPER_SERVICE_URL}/paper/{paper_id}"
        )
        if response.status_code == 404:
            raise HTTPException(
                status_code=404,
                detail="Paper not found. Please upload the paper first."
            )
        if response.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail="Failed to fetch paper from Paper Service."
            )
        data = response.json()
        chunks = data.get("chunks", [])
        if not chunks:
            raise HTTPException(
                status_code=422,
                detail="Paper has no text content."
            )
        full_text = " ".join(chunks)
        return full_text[:30000]

# -- Helper: Call Groq API -----------------------------

def call_groq(
    prompt: str,
    system_prompt: str = "You are an expert ML engineer assistant.",
    max_tokens: int = 1000,
    temperature: float = 0.7
) -> str:
    try:
        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=max_tokens,
            temperature=temperature
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Groq API error: {str(e)}"
        )

# -- Health --------------------------------------------

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "ai-service",
        "timestamp": datetime.utcnow().isoformat()
    }

# -- Summarize (Pipeline Overview) ---------------------

@app.post("/summarize")
async def summarize(request: SummarizeRequest, http_request: Request):
    pipeline_text = await fetch_paper_text(request.paper_id)
    user_id = http_request.headers.get("X-User-Id", "anonymous")

    prompt = f"""You are a senior ML engineer conducting a production code review of an ML pipeline.

Analyze this ML pipeline code/content and provide a comprehensive overview covering:

1. PIPELINE OVERVIEW
   What type of ML pipeline is this?
   What problem does it solve?
   What is the overall architecture?

2. TECHNOLOGY STACK
   What frameworks/libraries are used?
   (TensorFlow, PyTorch, scikit-learn, etc.)
   What data sources/formats?

3. PIPELINE STAGES IDENTIFIED
   List each stage found:
   - Data loading/ingestion
   - Preprocessing/feature engineering
   - Model definition
   - Training loop
   - Evaluation
   - Deployment/serving

4. QUICK ASSESSMENT
   Overall quality: [Poor/Fair/Good/Excellent]
   Production readiness: [Not Ready/Partial/Ready]
   Most critical concern in one sentence.

Be specific and reference actual code/content found.
Format as a clear technical summary.

Pipeline content:
{pipeline_text}"""

    summary = call_groq(prompt, max_tokens=800)

    if db is not None:
        try:
            await db.summaries.update_one(
                {"paper_id": request.paper_id, "user_id": user_id},
                {"$set": {
                    "summary": summary,
                    "updated_at": datetime.utcnow()
                }},
                upsert=True
            )
        except Exception as e:
            print(f"MongoDB save error: {e}")

    return {
        "success": True,
        "paper_id": request.paper_id,
        "summary": summary
    }

# -- Analyze (Detailed Pipeline Analysis) -------------

@app.post("/analyze")
async def analyze_pipeline(request: AnalyzeRequest, http_request: Request):
    pipeline_text = await fetch_paper_text(request.paper_id)
    user_id = http_request.headers.get("X-User-Id", "anonymous")

    prompt = f"""You are a senior ML engineer doing a detailed production-grade code review.

Analyze this ML pipeline for ALL of these aspects:

═══ 1. DATA PREPROCESSING ANALYSIS ═══
Check for:
- Missing value handling
- Data leakage risks
- Feature scaling/normalization
- Train/test split correctness
- Data augmentation appropriateness
- Imbalanced dataset handling

═══ 2. MODEL ARCHITECTURE ANALYSIS ═══
Check for:
- Architecture appropriateness for the task
- Layer configurations
- Activation functions correctness
- Regularization techniques (dropout, L1/L2)
- Parameter count efficiency
- Transfer learning usage

═══ 3. TRAINING LOOP ANALYSIS ═══
Check for:
- Learning rate configuration
- Optimizer choice and settings
- Loss function appropriateness
- Batch size considerations
- Early stopping implementation
- Gradient clipping
- Training stability issues

═══ 4. EVALUATION METRICS ANALYSIS ═══
Check for:
- Appropriate metrics for the task
- Validation strategy (k-fold, holdout)
- Overfitting/underfitting indicators
- Baseline comparison
- Statistical significance testing

═══ 5. DEPLOYMENT READINESS ═══
Check for:
- Model serialization/saving
- Inference optimization
- Error handling and logging
- Input validation
- Scalability considerations
- Monitoring and observability
- Security vulnerabilities

For EACH issue found provide:
- Issue title
- Severity: [CRITICAL/WARNING/INFO]
- Location: where in the code
- Description: what the problem is
- Fix: specific code example to fix it

Format your response as JSON:
{{
  "data_preprocessing": {{
    "score": 0-100,
    "issues": [
      {{
        "title": "issue name",
        "severity": "CRITICAL/WARNING/INFO",
        "location": "line/function name",
        "description": "what is wrong",
        "fix": "code or explanation to fix"
      }}
    ]
  }},
  "model_architecture": {{
    "score": 0-100,
    "issues": [...]
  }},
  "training_loop": {{
    "score": 0-100,
    "issues": [...]
  }},
  "evaluation_metrics": {{
    "score": 0-100,
    "issues": [...]
  }},
  "deployment_readiness": {{
    "score": 0-100,
    "issues": [...]
  }},
  "overall_score": 0-100,
  "summary": "one paragraph overall assessment",
  "top_3_priorities": ["most important fix 1", "fix 2", "fix 3"]
}}

Return ONLY valid JSON. No extra text.

Pipeline content:
{pipeline_text}"""

    try:
        raw_response = call_groq(
            prompt,
            system_prompt="You are a senior ML engineer. Always respond with valid JSON only.",
            max_tokens=2000,
            temperature=0.3
        )

        clean = raw_response.strip()
        if clean.startswith("```json"):
            clean = clean[7:]
        if clean.startswith("```"):
            clean = clean[3:]
        if clean.endswith("```"):
            clean = clean[:-3]

        analysis = json.loads(clean.strip())

        if db is not None:
            try:
                await db.analyses.update_one(
                    {"paper_id": request.paper_id, "user_id": user_id},
                    {"$set": {
                        "analysis": analysis,
                        "updated_at": datetime.utcnow()
                    }},
                    upsert=True
                )
            except Exception as e:
                print(f"MongoDB save error: {e}")

        return {
            "success": True,
            "paper_id": request.paper_id,
            "analysis": analysis
        }

    except json.JSONDecodeError:
        return {
            "success": True,
            "paper_id": request.paper_id,
            "analysis": {"raw": raw_response}
        }

# -- Get Analysis (cached) ----------------------------

@app.get("/analysis/{paper_id}")
async def get_analysis(paper_id: str, request: Request):
    user_id = request.headers.get("X-User-Id", "anonymous")
    # No persistent DB in this version — return not found
    return {"success": False, "analysis": None}

# -- Explain (Best Practices Review) ------------------

@app.post("/explain")
async def explain(request: ExplainRequest, http_request: Request):
    pipeline_text = await fetch_paper_text(request.paper_id)
    level = request.level.lower()
    user_id = http_request.headers.get("X-User-Id", "anonymous")

    if level == "beginner":
        prompt = f"""You are explaining ML code issues to a junior developer with 6 months experience.

Review this ML pipeline and explain:
1. What it does in very simple terms
2. The 3 most important problems found
   (explain WHY each is a problem simply)
3. Simple step-by-step fixes anyone can follow
4. What good ML code looks like vs this code

Use simple language. No jargon. 
Give analogies where helpful.
Be encouraging and constructive.

Pipeline:
{pipeline_text}"""

    elif level == "intermediate":
        prompt = f"""You are a ML engineer reviewing code for a mid-level data scientist.

Review this ML pipeline and provide:
1. Technical assessment of the architecture
2. Specific issues with technical explanations
3. Code-level fixes with examples
4. Best practices being violated
5. Performance optimization opportunities
6. Testing strategies to add

Use proper ML terminology.
Reference specific frameworks and tools.

Pipeline:
{pipeline_text}"""

    elif level == "expert":
        prompt = f"""You are a principal ML engineer reviewing for a senior researcher/engineer.

Provide a rigorous technical review covering:
1. Architecture decisions and trade-offs
2. Statistical validity of approach
3. Scalability analysis
4. Production engineering concerns
5. Research-level improvements possible
6. Comparison with SOTA approaches
7. Mathematical correctness of implementations
8. Distributed training considerations
9. MLOps maturity assessment
10. Security and compliance issues

Be critical. Reference papers and industry standards.
Assume expert-level knowledge.

Pipeline:
{pipeline_text}"""

    else:
        prompt = f"""Explain this ML pipeline clearly for a general educated audience in 300+ words.

Pipeline:
{pipeline_text}"""

    if level == "beginner":
        max_tokens, temperature = 800, 0.7
    elif level == "intermediate":
        max_tokens, temperature = 1000, 0.5
    elif level == "expert":
        max_tokens, temperature = 1400, 0.3
    else:
        max_tokens, temperature = 600, 0.7

    explanation = call_groq(
        prompt,
        system_prompt="You are an expert ML engineer reviewer.",
        max_tokens=max_tokens,
        temperature=temperature
    )

    if db is not None:
        try:
            await db.explanations.update_one(
                {"paper_id": request.paper_id, "user_id": user_id, "level": level},
                {"$set": {
                    "explanation": explanation,
                    "updated_at": datetime.utcnow()
                }},
                upsert=True
            )
        except Exception as e:
            print(f"MongoDB save error: {e}")

    return {
        "success": True,
        "paper_id": request.paper_id,
        "level": level,
        "explanation": explanation
    }

# -- Chat (RAG - Debug Assistant) ----------------------

@app.post("/chat")
async def chat(request: ChatRequest, http_request: Request):
    paper_id = request.paper_id
    question = request.question
    user_id = http_request.headers.get("X-User-Id", "anonymous")

    if db is not None:
        try:
            await db.chat_history.insert_one({
                "paper_id": paper_id,
                "user_id": user_id,
                "role": "user",
                "content": question,
                "timestamp": datetime.utcnow()
            })
        except Exception as e:
            print(f"MongoDB save error: {e}")

    # Step 1: Search relevant chunks via Vector Service
    async with httpx.AsyncClient(timeout=30) as http_client:
        search_response = await http_client.post(
            f"{VECTOR_SERVICE_URL}/search",
            json={
                "paper_id": paper_id,
                "query": question,
                "top_k": 5
            }
        )
        if search_response.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail="Vector search failed."
            )
        search_data = search_response.json()
        relevant_chunks = search_data.get("chunks", search_data.get("results", []))

    if not relevant_chunks:
        print(f"WARNING: No relevant chunks found for paper {paper_id}. Possible embedding failure.")
        raise HTTPException(
            status_code=422,
            detail="No relevant content found in this paper. This usually happens if the paper wasn't processed correctly. Please try re-uploading the paper."
        )

    # Step 2: Build context from top chunks
    if relevant_chunks and isinstance(relevant_chunks[0], str):
        context = "\n\n---\n\n".join([
            f"Excerpt {i+1}:\n{chunk}"
            for i, chunk in enumerate(relevant_chunks)
        ])
    else:
        context = "\n\n---\n\n".join([
            f"Excerpt {i+1}:\n{chunk['chunk_text']}"
            for i, chunk in enumerate(relevant_chunks)
        ])

    # Step 3: Build RAG prompt
    prompt = f"""Use ONLY the following excerpts from 
the document to answer the question. If the answer is 
not found in the excerpts, say "I could not find 
information about this in the provided document."

Document Excerpts:
{context}

User Question: {question}

Instructions:
- Answer directly and clearly
- Base your answer only on the excerpts above
- Keep the answer focused and concise
- If the question cannot be answered from the excerpts,
  say so honestly

Answer:"""

    system_prompt = """You are an expert ML engineer helping a developer debug and improve their ML pipeline.
You have deep knowledge of:
- PyTorch, TensorFlow, scikit-learn, HuggingFace
- MLOps, model serving, monitoring
- Data engineering and feature stores
- Distributed training
- Model optimization and quantization

Answer questions about the pipeline accurately.
Suggest specific code fixes when asked.
Reference best practices from the industry."""

    answer = call_groq(
        prompt,
        system_prompt=system_prompt,
        max_tokens=800
    )

    if db is not None:
        try:
            await db.chat_history.insert_one({
                "paper_id": paper_id,
                "user_id": user_id,
                "role": "assistant",
                "content": answer,
                "timestamp": datetime.utcnow()
            })
        except Exception as e:
            print(f"MongoDB save error: {e}")

    return {
        "success": True,
        "paper_id": paper_id,
        "question": question,
        "answer": answer,
        "sources_used": len(relevant_chunks)
    }


@app.get("/chat-history/{paper_id}")
async def get_chat_history(paper_id: str, request: Request):
    user_id = request.headers.get("X-User-Id", "anonymous")

    if db is not None:
        try:
            messages = await db.chat_history.find(
                {"paper_id": paper_id, "user_id": user_id},
                {"_id": 0}
            ).sort("timestamp", 1).to_list(100)
            return {"success": True, "messages": messages}
        except Exception as e:
            print(f"MongoDB fetch error: {e}")
            return {"success": False, "messages": []}

    return {"success": False, "messages": []}

# -- Run -----------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8002,
        reload=True
    )
