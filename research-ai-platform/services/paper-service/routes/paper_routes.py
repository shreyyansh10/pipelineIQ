"""
Pipeline routes — file upload (.py, .ipynb, .pdf), text extraction, chunking, and retrieval.
"""

from datetime import datetime

from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
import httpx
from utils.pdf_extractor import extract_text_from_pdf, chunk_text
import os
import uuid
import json

router = APIRouter()

# In-memory storage for paper data
PAPERS = {}

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB = os.getenv("MONGODB_DB", "paperpilot")
VECTOR_SERVICE_URL = os.getenv("VECTOR_SERVICE_URL", "http://localhost:8003")

if MONGODB_URI:
    mongo_client = AsyncIOMotorClient(MONGODB_URI)
    db = mongo_client[MONGODB_DB]
    print(f"✅ Connected to MongoDB: {MONGODB_DB}")
else:
    db = None
    print("⚠️ WARNING: MONGODB_URI not set, database features disabled")

# Resolve storage path relative to this file: routes/ -> paper-service/ -> project root -> storage/pdfs
STORAGE_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "storage", "pdfs")
)

ALLOWED_EXTENSIONS = ['.py', '.ipynb', '.pdf']


def _detect_file_type(filename: str) -> str:
    """Return the file type string based on extension."""
    lower = filename.lower()
    if lower.endswith('.py'):
        return 'python'
    elif lower.endswith('.ipynb'):
        return 'notebook'
    elif lower.endswith('.pdf'):
        return 'pdf'
    return 'unknown'


def _extract_notebook_text(content_bytes: bytes) -> str:
    """Extract text from a Jupyter notebook (.ipynb) file."""
    try:
        notebook = json.loads(content_bytes.decode('utf-8'))
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        raise HTTPException(status_code=422, detail=f"Invalid notebook format: {str(e)}")

    cells = notebook.get("cells", [])

    # Extract code cells
    code_cells = [c for c in cells if c.get("cell_type") == "code"]
    code_text = "\n\n".join(
        ["".join(c.get("source", [])) for c in code_cells]
    )

    # Extract markdown cells
    markdown_cells = [c for c in cells if c.get("cell_type") == "markdown"]
    markdown_text = "\n\n".join(
        ["".join(c.get("source", [])) for c in markdown_cells]
    )

    # Combined text = markdown_text + code_text
    combined = markdown_text + "\n\n" + code_text
    return combined.strip()


def _extract_python_text(content_bytes: bytes) -> str:
    """Read Python file content directly as text."""
    try:
        return content_bytes.decode('utf-8')
    except UnicodeDecodeError:
        return content_bytes.decode('latin-1')


@router.post("/upload")
async def upload_paper(request: Request, file: UploadFile = File(...)):
    """
    Accept a file upload (.py, .ipynb, .pdf), save it locally, extract text,
    chunk it, and store metadata in memory.
    """
    if not any(file.filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=400,
            detail="Only .py, .ipynb, and .pdf files accepted."
        )

    # Detect file type
    file_type = _detect_file_type(file.filename)

    # Generate unique paper ID
    paper_id = str(uuid.uuid4())
    user_id = request.headers.get("X-User-Id", "anonymous")

    # Ensure storage directory exists
    os.makedirs(STORAGE_PATH, exist_ok=True)

    # Read file contents
    contents = await file.read()

    # Save uploaded file with appropriate extension
    ext = os.path.splitext(file.filename)[1]
    file_path = os.path.join(STORAGE_PATH, f"{paper_id}{ext}")
    with open(file_path, "wb") as f:
        f.write(contents)

    # Extract text based on file type
    if file_type == "python":
        extracted_text = _extract_python_text(contents)
    elif file_type == "notebook":
        extracted_text = _extract_notebook_text(contents)
    elif file_type == "pdf":
        extracted_text = extract_text_from_pdf(file_path)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type.")

    if not extracted_text:
        raise HTTPException(
            status_code=422, detail="Could not extract text from this file."
        )

    # Chunk the extracted text
    chunks = chunk_text(extracted_text, chunk_size=500, overlap=50)

    # Send chunks to vector service for embedding
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            embed_response = await client.post(
                f"{VECTOR_SERVICE_URL}/embed",
                json={
                    "paper_id": paper_id,
                    "chunks": chunks,
                    "user_id": user_id
                }
            )
            if embed_response.status_code == 200:
                print(f"✅ Embeddings created for paper {paper_id}")
            else:
                print(f"❌ Embedding failed: {embed_response.text}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to create embeddings: {embed_response.text}"
                )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Vector service error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Vector service connection failed: {str(e)}"
        )

    # Count words
    total_words = len(extracted_text.split())

    # Store paper data in memory
    PAPERS[paper_id] = {
        "paper_id": paper_id,
        "user_id": user_id,
        "filename": file.filename,
        "file_path": file_path,
        "file_type": file_type,
        "text": extracted_text,
        "chunks": chunks,
        "total_chunks": len(chunks),
        "total_words": total_words,
    }

    if db is not None:
        try:
            await db.papers.insert_one({
                "paper_id": paper_id,
                "user_id": user_id,
                "filename": file.filename,
                "file_type": file_type,
                "total_words": total_words,
                "total_chunks": len(chunks),
                "preview": extracted_text[:500] if len(extracted_text) > 500 else extracted_text,
                "uploaded_at": datetime.utcnow()
            })
            print(f"✅ Saved paper {paper_id} to MongoDB")
        except Exception as e:
            print(f"⚠️ MongoDB save failed: {e}")

    return {
        "success": True,
        "paper_id": paper_id,
        "filename": file.filename,
        "file_type": file_type,
        "total_words": total_words,
        "total_chunks": len(chunks),
        "preview": extracted_text[:500] + "..." if len(extracted_text) > 500 else extracted_text,
    }


@router.get("/paper/{paper_id}")
async def get_paper(paper_id: str):
    """Retrieve paper metadata and all text chunks by paper_id."""
    if paper_id not in PAPERS:
        raise HTTPException(status_code=404, detail="Paper not found.")

    paper = PAPERS[paper_id]
    return {
        "paper_id": paper["paper_id"],
        "filename": paper["filename"],
        "file_type": paper.get("file_type", "pdf"),
        "total_words": paper["total_words"],
        "total_chunks": paper["total_chunks"],
        "chunks": paper["chunks"],
    }


@router.get("/user-papers")
async def get_user_papers(request: Request):
    user_id = request.headers.get("X-User-Id", "anonymous")

    if db is not None:
        try:
            papers = await db.papers.find(
                {"user_id": user_id},
                {"_id": 0}
            ).sort("uploaded_at", -1).limit(20).to_list(20)
            return {"success": True, "papers": papers}
        except Exception as e:
            print(f"MongoDB fetch error: {e}")

    # Fallback to in-memory if DB not available
    user_papers = [p for p in PAPERS.values() if p.get("user_id") == user_id]
    return {"success": True, "papers": user_papers}
