"""
API Gateway — routes all frontend requests to downstream microservices.
"""

from datetime import datetime

from fastapi import FastAPI, Request, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
import jwt
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="PipelineIQ API Gateway", version="2.0.0")

# ── CORS ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service URLs - environment-aware
PAPER_SERVICE_URL = os.getenv("PAPER_SERVICE_URL", "http://localhost:8001")
AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://localhost:8002")
VECTOR_SERVICE_URL = os.getenv("VECTOR_SERVICE_URL", "http://localhost:8003")
CITATION_SERVICE_URL = os.getenv("CITATION_SERVICE_URL", "http://localhost:8004")
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8005")

JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")


# ── Helper: Extract user_id from JWT ─────────────────────────
def get_user_id_from_token(auth_header: str) -> str:
    """Extract user_id from Authorization header JWT token."""
    try:
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
        else:
            token = auth_header
        if not token:
            return "anonymous"
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload.get("userId", payload.get("id", "anonymous"))
    except Exception:
        return "anonymous"


# ── Health ────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "api-gateway",
        "timestamp": datetime.utcnow().isoformat()
    }


# ── Upload Paper ──────────────────────────────────────────────
@app.post("/upload-paper")
async def upload_paper(file: UploadFile = File(...)):
    """Forward file upload to Paper Service."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        files = {"file": (file.filename, await file.read(), file.content_type)}
        response = await client.post(f"{PAPER_SERVICE_URL}/upload", files=files)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()


# ── Get Paper ─────────────────────────────────────────────────
@app.get("/paper/{paper_id}")
async def get_paper(paper_id: str):
    """Forward paper retrieval to Paper Service."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(f"{PAPER_SERVICE_URL}/paper/{paper_id}")
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()


# ── Summarize ─────────────────────────────────────────────────
@app.post("/summarize")
async def summarize(request: Request):
    body = await request.json()
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{AI_SERVICE_URL}/summarize",
            json=body
        )
        return response.json()


# ── Explain ───────────────────────────────────────────────────
@app.post("/explain")
async def explain(request: Request):
    """Forward explanation request to AI Service."""
    body = await request.json()
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(f"{AI_SERVICE_URL}/explain", json=body)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()


# ── Analyze Pipeline ──────────────────────────────────────────
@app.post("/analyze")
async def analyze(request: Request):
    """Forward pipeline analysis request to AI Service."""
    body = await request.json()
    user_id = get_user_id_from_token(
        request.headers.get("Authorization", "")
    )
    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            f"{AI_SERVICE_URL}/analyze",
            json=body,
            headers={"X-User-Id": user_id}
        )
        return response.json()


# ── Get Analysis (cached) ────────────────────────────────────
@app.get("/analysis/{paper_id}")
async def get_analysis(paper_id: str, request: Request):
    """Retrieve cached analysis from AI Service."""
    user_id = get_user_id_from_token(
        request.headers.get("Authorization", "")
    )
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(
            f"{AI_SERVICE_URL}/analysis/{paper_id}",
            headers={"X-User-Id": user_id}
        )
        return response.json()


# ── Embed ─────────────────────────────────────────────────────
@app.post("/embed")
async def embed(request: Request):
    body = await request.json()
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{VECTOR_SERVICE_URL}/embed", json=body
        )
        return response.json()


# ── Search ────────────────────────────────────────────────────
@app.post("/search")
async def search(request: Request):
    body = await request.json()
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{VECTOR_SERVICE_URL}/search", json=body
        )
        return response.json()


# ── Chat ──────────────────────────────────────────────────────
@app.post("/chat")
async def chat(request: Request):
    """Forward chat request to AI Service (RAG pipeline)."""
    body = await request.json()
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(f"{AI_SERVICE_URL}/chat", json=body)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()


# ── Citations ─────────────────────────────────────────────────
@app.post("/citations/search")
async def citations_search(request: Request):
    body = await request.json()
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{CITATION_SERVICE_URL}/search",
            json=body
        )
        return response.json()


@app.get("/citations/paper/{paper_id}")
async def citations_paper(paper_id: str):
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(
            f"{CITATION_SERVICE_URL}/paper/{paper_id}"
        )
        return response.json()


@app.get("/citations/{paper_title}")
async def get_citations(paper_title: str):
    """Forward citation request to Citation Service."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(f"{CITATION_SERVICE_URL}/citations/{paper_title}")
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()


@app.post("/auth/register")
async def auth_register(request: Request):
    body = await request.json()
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{AUTH_SERVICE_URL}/auth/register", json=body
        )
        return response.json()


@app.post("/auth/login")
async def auth_login(request: Request):
    body = await request.json()
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{AUTH_SERVICE_URL}/auth/login", json=body
        )
        return response.json()


@app.post("/auth/google")
async def auth_google(request: Request):
    body = await request.json()
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{AUTH_SERVICE_URL}/auth/google", json=body
        )
        return response.json()


@app.post("/auth/send-otp")
async def send_otp(request: Request):
    body = await request.json()
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{AUTH_SERVICE_URL}/auth/send-otp", json=body
        )
        return response.json()


@app.post("/auth/verify-otp")
async def verify_otp(request: Request):
    body = await request.json()
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{AUTH_SERVICE_URL}/auth/verify-otp", json=body
        )
        return response.json()


@app.post("/auth/verify-otp-only")
async def verify_otp_only(request: Request):
    body = await request.json()
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{AUTH_SERVICE_URL}/auth/verify-otp-only",
            json=body
        )
        return response.json()


@app.get("/auth/me")
async def auth_me(request: Request):
    auth_header = request.headers.get("Authorization", "")
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(
            f"{AUTH_SERVICE_URL}/auth/me",
            headers={"Authorization": auth_header}
        )
        return response.json()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
