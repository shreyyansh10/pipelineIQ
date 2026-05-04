from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, PayloadSchemaType, Filter, FieldCondition, MatchValue
import os
import uuid
from datetime import datetime

app = FastAPI()

# Environment variables
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
PAPER_SERVICE_URL = os.getenv("PAPER_SERVICE_URL", "http://localhost:8001")

# Initialize embedding model
print("Loading sentence-transformers model...")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("✅ Model loaded successfully")

# Qdrant configuration
COLLECTION_NAME = "paper_chunks"
VECTOR_SIZE = 384

# Initialize Qdrant client
if QDRANT_URL and QDRANT_API_KEY:
    try:
        qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
        print(f"✅ Connected to Qdrant at {QDRANT_URL}")
    except Exception as e:
        print(f"❌ Qdrant connection failed: {e}")
        qdrant = None
else:
    qdrant = None
    print("⚠️ WARNING: Qdrant credentials not found")

@app.on_event("startup")
async def startup():
    """Create Qdrant collection if it doesn't exist"""
    if qdrant:
        try:
            # Try to get collection info
            try:
                collection_info = qdrant.get_collection(COLLECTION_NAME)
                print(f"✅ Qdrant collection already exists: {COLLECTION_NAME}")
                
                # Create index on paper_id if it doesn't exist
                try:
                    qdrant.create_payload_index(
                        collection_name=COLLECTION_NAME,
                        field_name="paper_id",
                        field_schema=PayloadSchemaType.KEYWORD
                    )
                    print(f"✅ Created index on paper_id field")
                except Exception as idx_err:
                    if "already exists" in str(idx_err).lower():
                        print(f"✅ Index on paper_id already exists")
                    else:
                        print(f"⚠️ Index creation warning: {idx_err}")
                        
            except Exception:
                # Collection doesn't exist, create it
                qdrant.create_collection(
                    collection_name=COLLECTION_NAME,
                    vectors_config=VectorParams(
                        size=VECTOR_SIZE, 
                        distance=Distance.COSINE
                    )
                )
                print(f"✅ Created Qdrant collection: {COLLECTION_NAME}")
                
                # Create index on paper_id
                qdrant.create_payload_index(
                    collection_name=COLLECTION_NAME,
                    field_name="paper_id",
                    field_schema=PayloadSchemaType.KEYWORD
                )
                print(f"✅ Created index on paper_id field")
        except Exception as e:
            if "already exists" not in str(e).lower():
                print(f"❌ Qdrant startup error: {e}")

class EmbedRequest(BaseModel):
    paper_id: str
    chunks: list[str]
    user_id: str = "anonymous"

class SearchRequest(BaseModel):
    paper_id: str
    query: str
    top_k: int = 5
    user_id: str = "anonymous"

@app.post("/embed")
async def embed_chunks(request: EmbedRequest):
    """Generate embeddings and store in Qdrant"""
    try:
        if not qdrant:
            raise HTTPException(
                status_code=503,
                detail="Qdrant not configured. Check QDRANT_URL and QDRANT_API_KEY"
            )

        print(f"Embedding {len(request.chunks)} chunks for paper {request.paper_id}")

        embeddings = model.encode(request.chunks)

        points = []
        for i, (chunk, embedding) in enumerate(zip(request.chunks, embeddings)):
            points.append(PointStruct(
                id=str(uuid.uuid4()),
                vector=embedding.tolist(),
                payload={
                    "paper_id": request.paper_id,
                    "user_id": request.user_id,
                    "chunk_text": chunk,
                    "chunk_index": i,
                    "created_at": datetime.utcnow().isoformat()
                }
            ))

        qdrant.upsert(
            collection_name=COLLECTION_NAME,
            points=points
        )

        # Verify points count for this paper_id
        info = qdrant.count(
            collection_name=COLLECTION_NAME,
            count_filter=Filter(
                must=[FieldCondition(key="paper_id", match=MatchValue(value=request.paper_id))]
            )
        )
        print(f"✅ Successfully embedded {len(points)} chunks. Total points for this paper: {info.count}")

        return {
            "success": True,
            "message": f"Embedded {len(request.chunks)} chunks for paper {request.paper_id}",
            "chunks_count": len(request.chunks),
            "total_paper_points": info.count
        }

    except Exception as e:
        print(f"❌ Embedding failed: {e}")
        raise HTTPException(status_code=500, detail=f"Embedding failed: {str(e)}")

@app.post("/search")
async def search_similar(request: SearchRequest):
    """Search for similar chunks using vector similarity"""
    try:
        if not qdrant:
            raise HTTPException(
                status_code=503,
                detail="Qdrant not configured. Check QDRANT_URL and QDRANT_API_KEY"
            )

        print(f"Searching for paper_id: {request.paper_id}, query: {request.query[:50]}...")

        # First check if there are ANY points for this paper_id
        count_info = qdrant.count(
            collection_name=COLLECTION_NAME,
            count_filter=Filter(
                must=[FieldCondition(key="paper_id", match=MatchValue(value=request.paper_id))]
            )
        )
        print(f"Total points found in DB for paper_id {request.paper_id}: {count_info.count}")

        if count_info.count == 0:
            # Check total points in collection to see if it's generally empty
            total_info = qdrant.get_collection(COLLECTION_NAME)
            print(f"WARNING: No points for this paper. Total points in whole collection: {total_info.points_count}")

        query_embedding = model.encode([request.query])[0]

        results = qdrant.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_embedding.tolist(),
            query_filter=Filter(
                must=[
                    FieldCondition(
                        key="paper_id",
                        match=MatchValue(value=request.paper_id)
                    )
                ]
            ),
            limit=request.top_k
        )

        chunks = [hit.payload["chunk_text"] for hit in results]

        print(f"✅ Found {len(chunks)} relevant chunks")

        return {
            "success": True,
            "chunks": chunks,
            "count": len(chunks),
            "total_available": count_info.count
        }

    except Exception as e:
        print(f"❌ Search failed: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    qdrant_status = "connected" if qdrant else "not configured"
    return {
        "status": "healthy",
        "service": "vector-service",
        "qdrant": qdrant_status,
        "model": "all-MiniLM-L6-v2",
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
