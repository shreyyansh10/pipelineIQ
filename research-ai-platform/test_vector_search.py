import httpx
import json

async def test_search():
    async with httpx.AsyncClient() as client:
        # We don't have a paper_id handy, so let's try to list papers first if possible
        # Or just try a dummy search
        response = await client.post(
            "http://localhost:8003/search",
            json={
                "paper_id": "dummy",
                "query": "test",
                "top_k": 1
            }
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_search())
