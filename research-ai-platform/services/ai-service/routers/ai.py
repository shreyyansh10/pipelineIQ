"""
AI router — summarize, explain, and chat endpoints.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from utils.llm import generate_summary, generate_explanation, answer_question

router = APIRouter()


class SummarizeRequest(BaseModel):
    paper_id: str
    text: str


class ExplainRequest(BaseModel):
    paper_id: str
    text: str
    level: str = "beginner"  # beginner | intermediate | expert


class ChatRequest(BaseModel):
    paper_id: str
    question: str
    context: Optional[str] = None


@router.post("/summarize")
async def summarize(req: SummarizeRequest):
    """Generate AI summary of the paper text."""
    summary = generate_summary(req.text)
    return {
        "paper_id": req.paper_id,
        "summary": summary,
    }


@router.post("/explain")
async def explain(req: ExplainRequest):
    """Generate multi-level explanation of the paper text."""
    explanation = generate_explanation(req.text, req.level)
    return {
        "paper_id": req.paper_id,
        "level": req.level,
        "explanation": explanation,
    }


@router.post("/chat")
async def chat(req: ChatRequest):
    """Answer a question about the paper (RAG pipeline)."""
    answer = await answer_question(req.question, req.paper_id)
    return {
        "paper_id": req.paper_id,
        "question": req.question,
        "answer": answer,
    }
