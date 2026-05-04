from datetime import datetime

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Citation Service", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

CROSSREF_URL = "https://api.crossref.org/works"

class SearchRequest(BaseModel):
    query: str
    limit: int = 10

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "citation-service",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/search")
async def search_papers(request: SearchRequest):
    if not request.query.strip():
        raise HTTPException(
            status_code=400,
            detail="Search query cannot be empty."
        )

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                CROSSREF_URL,
                headers={
                    "User-Agent": "PaperPilot/1.0 (mailto:paperpilot@research.com)"
                },
                params={
                    "query": request.query,
                    "rows": request.limit,
                    "select": "title,author,published,is-referenced-by-count,abstract,URL,container-title,DOI"
                }
            )

            print(f"CrossRef status: {response.status_code}")

            if response.status_code != 200:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to fetch from CrossRef API."
                )

            data = response.json()
            items = data.get("message", {}).get("items", [])

            results = []
            for item in items:
                # Authors
                authors_raw = item.get("author", [])
                author_names = []
                for a in authors_raw[:3]:
                    given = a.get("given", "")
                    family = a.get("family", "")
                    name = f"{given} {family}".strip()
                    if name:
                        author_names.append(name)
                if len(authors_raw) > 3:
                    author_names.append(
                        f"+{len(authors_raw)-3} more"
                    )
                if not author_names:
                    author_names = ["Unknown authors"]

                # Year
                published = item.get("published", {})
                date_parts = published.get("date-parts", [[]])
                year = "N/A"
                if date_parts and date_parts[0]:
                    year = date_parts[0][0]

                # Title
                title_list = item.get("title", [])
                title = title_list[0] if title_list else "Unknown Title"

                # Abstract
                abstract = item.get("abstract", "") or ""
                abstract = abstract.replace("<jats:p>", "")
                abstract = abstract.replace("</jats:p>", "")
                abstract = abstract.replace("<jats:italic>", "")
                abstract = abstract.replace("</jats:italic>", "")
                abstract = abstract.strip()
                if len(abstract) > 300:
                    abstract = abstract[:300] + "..."
                if not abstract:
                    abstract = "No abstract available."

                # Venue
                venue_list = item.get("container-title", [])
                venue = venue_list[0] if venue_list else ""

                # URL
                doi = item.get("DOI", "")
                url = item.get("URL", "")
                if not url and doi:
                    url = f"https://doi.org/{doi}"

                # Citations
                citation_count = item.get(
                    "is-referenced-by-count", 0
                ) or 0

                results.append({
                    "paper_id": doi,
                    "title": title,
                    "authors": author_names,
                    "year": year,
                    "citation_count": citation_count,
                    "abstract": abstract,
                    "url": url,
                    "venue": venue,
                    "source": "CrossRef"
                })

            return {
                "success": True,
                "query": request.query,
                "total_results": len(results),
                "papers": results
            }

    except HTTPException:
        raise
    except Exception as e:
        print(f"CrossRef error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {str(e)}"
        )

@app.get("/paper/{paper_id}")
async def get_paper_citations(paper_id: str):
    return {
        "success": True,
        "paper_id": paper_id,
        "total_citations": 0,
        "citations": [],
        "message": "Citation details available via CrossRef."
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8004,
        reload=True
    )
