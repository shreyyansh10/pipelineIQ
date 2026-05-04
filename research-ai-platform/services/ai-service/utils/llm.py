"""
LLM utility functions — AI generation with Groq API.
"""

import os
import httpx
from openai import OpenAI

# Initialize Groq client
client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url=os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
)

GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
VECTOR_SERVICE_URL = os.getenv("VECTOR_SERVICE_URL", "http://localhost:8003")


def generate_summary(text: str) -> str:
    """
    Generate a summary of the given paper text using Groq.
    """
    try:
        preview = text[:3000] if len(text) > 3000 else text
        
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": "You are a helpful AI assistant that summarizes research papers and code clearly and concisely."},
                {"role": "user", "content": f"Please provide a concise summary of the following content:\n\n{preview}"}
            ],
            temperature=0.3,
            max_tokens=500
        )
        
        return response.choices[0].message.content
    except Exception as e:
        return f"Error generating summary: {str(e)}"


def generate_explanation(text: str, level: str = "beginner") -> str:
    """
    Generate an explanation at the specified complexity level.
    Levels: beginner, intermediate, expert.
    """
    try:
        level_prompts = {
            "beginner": "Explain this in simple terms that anyone can understand, avoiding technical jargon.",
            "intermediate": "Explain this assuming the reader has some technical background.",
            "expert": "Provide a detailed technical explanation for domain experts.",
        }
        
        prompt = level_prompts.get(level, level_prompts["beginner"])
        preview = text[:3000] if len(text) > 3000 else text
        
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": f"You are a helpful AI assistant. {prompt}"},
                {"role": "user", "content": f"Please explain the following content:\n\n{preview}"}
            ],
            temperature=0.5,
            max_tokens=800
        )
        
        return response.choices[0].message.content
    except Exception as e:
        return f"Error generating explanation: {str(e)}"


async def answer_question(question: str, paper_id: str) -> str:
    """
    Answer a question about the paper using RAG (Retrieval Augmented Generation).
    Retrieves relevant chunks from Vector Service and generates answer with Groq.
    """
    try:
        # Step 1: Retrieve relevant chunks from vector service
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            search_response = await http_client.post(
                f"{VECTOR_SERVICE_URL}/search",
                json={
                    "paper_id": paper_id,
                    "query": question,
                    "top_k": 5
                }
            )
            
            if search_response.status_code != 200:
                return f"Error: Vector search failed."
            
            search_data = search_response.json()
            chunks = search_data.get("chunks", [])
            
            if not chunks:
                return "I couldn't find relevant information in the document to answer your question."
            
            # Step 2: Combine chunks as context
            context = "\n\n".join(chunks)
            
            # Step 3: Generate answer using Groq with context
            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": "You are a helpful AI assistant that answers questions about documents. Use the provided context to answer accurately. If the context doesn't contain the answer, say so."},
                    {"role": "user", "content": f"Context from the document:\n{context}\n\nQuestion: {question}\n\nPlease provide a clear and accurate answer based on the context above."}
                ],
                temperature=0.3,
                max_tokens=1000
            )
            
            return response.choices[0].message.content
            
    except Exception as e:
        print(f"Error in answer_question: {e}")
        return f"Error generating answer: {str(e)}"
