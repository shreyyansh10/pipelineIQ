<div align="center">

# 🤖 PipelineIQ

### AI-Powered ML Pipeline Analyzer & Document Intelligence Platform

[![Live Demo](https://img.shields.io/badge/Live%20Demo-51.20.49.67%3A5173-blue?style=for-the-badge&logo=aws)](http://51.20.49.67:5173)
[![GitHub](https://img.shields.io/badge/GitHub-shreyyansh10%2FPipelineIQ-black?style=for-the-badge&logo=github)](https://github.com/shreyyansh10/PipelineIQ)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python%203.11-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![AWS](https://img.shields.io/badge/AWS-EC2%20t3.small-FF9900?style=for-the-badge&logo=amazonaws)](https://aws.amazon.com/)

<br/>

> **Analyze ML pipelines and research papers using RAG-based conversational AI.**
> Upload any PDF or Python file and get instant summaries, multi-level explanations,
> structured issue detection, and context-aware chat — all powered by LLaMA 3.3 via Groq API.

<br/>

![PipelineIQ Banner](https://via.placeholder.com/900x300/0f172a/60a5fa?text=PipelineIQ+%E2%80%94+AI+Document+Intelligence)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Docker Setup](#-docker-setup)
- [API Reference](#-api-reference)
- [Project Structure](#-project-structure)
- [Deployment](#-deployment-aws-ec2)
- [How RAG Works](#-how-rag-works)
- [Screenshots](#-screenshots)
- [Contributing](#-contributing)
- [Author](#-author)

---

## 🔍 Overview

**PipelineIQ** is a full-stack AI platform designed to make research papers and ML code instantly understandable. It uses **Retrieval Augmented Generation (RAG)** to enable intelligent conversations with your documents — no more manually reading 50-page papers.

### What problem does it solve?

| Problem | PipelineIQ Solution |
|---------|-------------------|
| Reading 50-page research papers takes hours | AI summary generated in seconds |
| Same paper is hard for beginners and experts alike | 3-level explanation (Beginner / Intermediate / Expert) |
| Code reviews are slow and inconsistent | Automated issue detection (bugs, security, ML-specific) |
| Can't ask questions about a specific document | RAG-based chat with source citations |
| LLMs hallucinate facts not in the document | Vector search retrieves exact document chunks |

---

## ✨ Features

### 📄 Document Analysis
- **Instant Summary** — One-paragraph overview with key topics and main contribution
- **3-Level Explanation** — Same content explained for Beginner, Intermediate, and Expert audiences
- **Issue Detection** — Automated code review (bugs, performance, security, ML-specific issues like data leakage)
- **Citation Extraction** — Automatically parses and formats references from research papers

### 💬 Intelligent Chat (RAG)
- **Context-aware Q&A** — Ask anything about your uploaded document
- **Source Citations** — Every answer includes the exact chunk it came from
- **Sub-second retrieval** — Qdrant HNSW index delivers 50–150ms vector search
- **No hallucination** — Model answers only from document content

### 🔐 Authentication
- **Email/Password** signup with OTP email verification
- **Google OAuth 2.0** one-click login
- **JWT-based** stateless authentication across all microservices

### 🗂️ Dashboard
- Upload and manage multiple documents
- View analysis history
- Quick access to previous chats

---

## 🏗️ Architecture

PipelineIQ uses a **microservices architecture** with 7 independent services orchestrated by Docker Compose.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      User Browser                                    │
│              React 18 + Vite  (Port 5173)                           │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   API Gateway  :8000                                 │
│          (Routes all requests, JWT validation, CORS)                │
└────┬──────────┬──────────┬──────────┬──────────┬────────────────────┘
     │          │          │          │          │
     ▼          ▼          ▼          ▼          ▼
 ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌──────────┐
 │ Auth  │ │Paper  │ │  AI   │ │Vector │ │Citation  │
 │Service│ │Service│ │Service│ │Service│ │ Service  │
 │ :8005 │ │ :8001 │ │ :8002 │ │ :8003 │ │  :8004   │
 └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘ └──────────┘
     │         │          │         │
     ▼         ▼          ▼         ▼
┌──────────┐ ┌────────┐ ┌───────┐ ┌──────────────┐
│PostgreSQL│ │MongoDB │ │ Groq  │ │ Qdrant Cloud │
│ (Docker) │ │ Atlas  │ │  API  │ │   (Vectors)  │
└──────────┘ └────────┘ └───────┘ └──────────────┘
```

### Service Responsibilities

| Service | Port | Language | Responsibility |
|---------|------|----------|---------------|
| **API Gateway** | 8000 | Python/FastAPI | Route requests, auth middleware, CORS |
| **Auth Service** | 8005 | Node.js/Express + Prisma | JWT, Google OAuth, user management |
| **Paper Service** | 8001 | Python/FastAPI | File upload, PDF parsing, text chunking |
| **AI Service** | 8002 | Python/FastAPI | Groq LLaMA integration, summaries, explanations |
| **Vector Service** | 8003 | Python/FastAPI | Embeddings (MiniLM), Qdrant CRUD, semantic search |
| **Citation Service** | 8004 | Python/FastAPI | Citation extraction and formatting |
| **Frontend** | 5173 | React 18 + Nginx | User interface |

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18 | UI framework with concurrent rendering |
| Vite | 8 | Ultra-fast build tool (1.82s build time) |
| Tailwind CSS | 3 | Utility-first styling |
| React Router | v6 | Client-side routing |
| Nginx | Alpine | Production static file server |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| FastAPI | Latest | Async Python API framework |
| Python | 3.11 | Backend language for AI/ML services |
| Node.js | 20 | Auth service runtime |
| Prisma | Latest | Type-safe PostgreSQL ORM |
| Uvicorn | Latest | ASGI production server |
| PyMuPDF | Latest | PDF text extraction |

### AI / ML
| Technology | Purpose |
|-----------|---------|
| **Groq API** | LLM inference (500+ tokens/sec) |
| **LLaMA 3.3 70B** | Question answering, summaries, explanations |
| **all-MiniLM-L6-v2** | Sentence embeddings (384 dimensions) |
| **sentence-transformers** | Embedding model library |

### Databases
| Database | Hosting | Purpose |
|---------|---------|---------|
| **PostgreSQL 15** | Docker container | User accounts, sessions |
| **MongoDB Atlas** | Cloud (free tier) | Documents, metadata, chat history |
| **Qdrant Cloud** | Cloud (free tier) | Vector embeddings for semantic search |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| **Docker** | Containerization of all services |
| **Docker Compose** | Multi-container orchestration |
| **AWS EC2 t3.small** | Cloud deployment (eu-north-1) |
| **Elastic IP** | Static public IP (51.20.49.67) |

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v24+)
- [Docker Compose](https://docs.docker.com/compose/) (v2+)
- [Git](https://git-scm.com/)

### 1. Clone the repository

```bash
git clone https://github.com/shreyyansh10/PipelineIQ.git
cd PipelineIQ/research-ai-platform
```

### 2. Create environment file

```bash
cp .env.example .env
```

Open `.env` and fill in your actual credentials (see [Environment Variables](#-environment-variables) section).

### 3. Build Docker images

```bash
docker compose build
```

> First build takes 10–15 minutes (downloads base images, installs dependencies).
> Subsequent builds use cache and complete in 1–2 minutes.

### 4. Start all services

```bash
docker compose up -d
```

### 5. Verify all services are healthy

```bash
docker compose ps
```

Expected output — all 8 containers should show `Up (healthy)`:

```
NAME                  STATUS
pipelineiq-postgres   Up (healthy)
pipelineiq-auth       Up (healthy)
pipelineiq-gateway    Up (healthy)
pipelineiq-paper      Up (healthy)
pipelineiq-ai         Up (healthy)
pipelineiq-vector     Up (healthy)
pipelineiq-citation   Up (healthy)
pipelineiq-frontend   Up (healthy)
```

### 6. Open the application

```
http://localhost:5173
```

---

## 🔑 Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# ==========================================
# PIPELINEIQ ENVIRONMENT CONFIGURATION
# ==========================================

# JWT Authentication
# Generate with: openssl rand -hex 32
JWT_SECRET=your_jwt_secret_here

# Google OAuth 2.0
# Get from: https://console.cloud.google.com/
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret

# Email Configuration (Gmail)
# Use App Password, not regular password
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# Groq AI API
# Get free key from: https://console.groq.com/
GROQ_API_KEY=gsk_your_groq_api_key

# MongoDB Atlas
# Get from: https://cloud.mongodb.com/
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=yourapp

# Qdrant Vector Database
# Get from: https://cloud.qdrant.io/
QDRANT_URL=https://your-cluster-id.region.aws.cloud.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key

# PostgreSQL (Docker internal - leave as is for local)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/paperpilot_auth
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=paperpilot_auth

# Frontend Build Variables
# For local development:
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com

# Node Environment
NODE_ENV=production
```

### Getting Required API Keys

| Service | Where to Get | Free Tier |
|---------|-------------|-----------|
| **Groq API** | https://console.groq.com | Yes — generous limits |
| **MongoDB Atlas** | https://cloud.mongodb.com | Yes — 512MB |
| **Qdrant Cloud** | https://cloud.qdrant.io | Yes — 1GB |
| **Google OAuth** | https://console.cloud.google.com | Yes — free |
| **Gmail App Password** | Google Account → Security → App Passwords | Yes |

---

## 🐳 Docker Setup

### How it works

Each service has its own `Dockerfile`. Docker Compose orchestrates all services with proper startup order and health checks.

```yaml
# Services start in this order:
postgres (healthy)
    ↓
auth-service (waits for postgres)
    ↓
All other services start simultaneously
    ↓
frontend (Nginx serves built React app)
```

### Key Docker concepts used

**Layer caching** — Dependencies copied before source code so pip/npm install is cached:
```dockerfile
COPY requirements.txt .       # Cached if unchanged
RUN pip install -r requirements.txt  # Skipped if cached
COPY . .                      # Only this rebuilds on code changes
```

**Multi-stage builds** — Frontend image is 30MB instead of 800MB:
```dockerfile
FROM node:20-alpine AS builder    # 800MB — builds React
RUN npm run build                 # Creates /dist files

FROM nginx:alpine                  # 22MB — serves files
COPY --from=builder /app/dist /usr/share/nginx/html
```

**Internal networking** — Services communicate by name, not IP:
```
http://vector-service:8003    ✅ internal Docker DNS
http://postgres:5432          ✅ internal Docker DNS
http://172.18.0.3:8003       ❌ don't use raw IPs
```

### Useful Docker commands

```bash
# Build all images
docker compose build

# Build specific service (without cache)
docker compose build --no-cache frontend

# Start all services in background
docker compose up -d

# Stop all services
docker compose down

# View logs for a service
docker compose logs -f vector-service

# Check container resource usage
docker stats

# Open shell inside a container
docker compose exec auth-service sh

# Restart a specific service
docker compose restart ai-service
```

---

## 📡 API Reference

All endpoints go through the API Gateway at `http://localhost:8000`.

### Authentication

```http
POST /auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

```http
GET /auth/google
# Redirects to Google OAuth consent screen
```

### Papers

```http
POST /upload-paper
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

file: <pdf_or_python_file>
```

```http
GET /papers
Authorization: Bearer <jwt_token>
# Returns list of uploaded papers
```

```http
GET /papers/{paper_id}
Authorization: Bearer <jwt_token>
# Returns paper details with analysis
```

### Chat

```http
POST /chat
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "paper_id": "abc123",
  "message": "What optimizer was used in this paper?"
}
```

### Health Checks

```http
GET /health                  # API Gateway
GET http://localhost:8001/health  # Paper Service
GET http://localhost:8002/health  # AI Service
GET http://localhost:8003/health  # Vector Service
GET http://localhost:8005/health  # Auth Service
```

---

## 📁 Project Structure

```
research-ai-platform/
│
├── docker-compose.yml          # Orchestrates all 8 services
├── .env.example                # Environment variables template
├── .gitignore
│
├── frontend/                   # React 18 + Vite
│   ├── Dockerfile              # Multi-stage: Node builder + Nginx
│   ├── nginx.conf              # Nginx config for React Router
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── config/
│       │   └── api.js          # Centralized API URL config
│       ├── contexts/
│       │   └── AuthContext.jsx # JWT + Google OAuth state
│       ├── pages/
│       │   ├── LandingPage.jsx
│       │   ├── LoginPage.jsx
│       │   ├── SignupPage.jsx
│       │   ├── DashboardPage.jsx
│       │   ├── AnalyzerPage.jsx
│       │   └── ChatPage.jsx
│       └── components/
│           ├── Navbar.jsx
│           ├── FileUpload.jsx
│           ├── ChatInterface.jsx
│           └── ExplanationTabs.jsx
│
├── services/
│   │
│   ├── api-gateway/            # FastAPI — routes all requests
│   │   ├── Dockerfile
│   │   ├── main.py
│   │   └── requirements.txt
│   │
│   ├── auth-service/           # Node.js — JWT + Google OAuth
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── main.js
│   │   └── prisma/
│   │       └── schema.prisma   # PostgreSQL schema
│   │
│   ├── paper-service/          # FastAPI — upload + parsing
│   │   ├── Dockerfile
│   │   ├── main.py
│   │   ├── requirements.txt    # Includes PyMuPDF
│   │   └── routes/
│   │       └── paper_routes.py
│   │
│   ├── ai-service/             # FastAPI — Groq LLaMA integration
│   │   ├── Dockerfile
│   │   ├── main.py
│   │   └── requirements.txt
│   │
│   ├── vector-service/         # FastAPI — embeddings + Qdrant
│   │   ├── Dockerfile
│   │   ├── main.py             # Includes Filter, FieldCondition imports
│   │   └── requirements.txt    # qdrant-client==1.12.1, CPU torch
│   │
│   └── citation-service/       # FastAPI — citation extraction
│       ├── Dockerfile
│       ├── main.py
│       └── requirements.txt
```

---

## ☁️ Deployment (AWS EC2)

### Infrastructure

| Component | Details |
|-----------|---------|
| **Instance** | AWS EC2 t3.small |
| **vCPU** | 2 |
| **RAM** | 2 GB |
| **Storage** | 30 GB gp3 SSD |
| **OS** | Ubuntu 24.04 LTS |
| **Region** | eu-north-1 (Stockholm) |
| **Public IP** | 51.20.49.67 (Elastic IP) |
| **Monthly Cost** | $0 (free tier + student credit) |

### Security Group Rules

| Port | Protocol | Purpose |
|------|----------|---------|
| 22 | TCP | SSH access |
| 80 | TCP | HTTP |
| 443 | TCP | HTTPS |
| 5173 | TCP | React frontend |
| 8000 | TCP | API Gateway |

> PostgreSQL (5432) and internal services (8001–8005) are only accessible inside the Docker network — never exposed to the internet.

### Deploy to EC2

```bash
# 1. SSH into your EC2 instance
ssh -i your-key.pem ubuntu@YOUR_ELASTIC_IP

# 2. Install Docker
sudo apt update && sudo apt upgrade -y
sudo apt install docker.io docker-compose -y
sudo systemctl enable docker
sudo usermod -aG docker ubuntu
exit  # Re-login for group changes

# 3. Clone repository
ssh -i your-key.pem ubuntu@YOUR_ELASTIC_IP
git clone https://github.com/shreyyansh10/PipelineIQ.git
cd PipelineIQ/research-ai-platform

# 4. Create production .env
cp .env.example .env
nano .env
# Fill in all API keys and set VITE_API_URL=http://YOUR_ELASTIC_IP:8000

# 5. Build and start
docker compose build
docker compose up -d

# 6. Verify deployment
docker compose ps
curl http://localhost:8000/health
```

### Update deployment after code changes

```bash
# On local machine
git add .
git commit -m "Your changes"
git push origin main

# On EC2
cd PipelineIQ/research-ai-platform
git pull
docker compose build
docker compose up -d
```

---

## 🧠 How RAG Works

RAG (Retrieval Augmented Generation) is the core AI technique powering PipelineIQ's chat feature.

### Step 1: Document Ingestion (at upload time)

```
PDF / Python File
      ↓
Extract raw text (PyMuPDF for PDF, direct read for code)
      ↓
Split into chunks (512 tokens each, 50-token overlap)
      ↓
Generate 384-dim embedding for each chunk
(all-MiniLM-L6-v2 sentence transformer)
      ↓
Store in Qdrant with metadata {paper_id, chunk_text, page}
```

### Step 2: Query Processing (at chat time)

```
User Question: "What learning rate was used?"
      ↓
Generate 384-dim embedding of the question
(same MiniLM model)
      ↓
Cosine similarity search in Qdrant
Filter: WHERE paper_id = 'current_paper'
Retrieve: top 5 most similar chunks
      ↓
Build prompt:
  "Context: [chunk1] [chunk2] [chunk3] [chunk4] [chunk5]
   Question: What learning rate was used?
   Answer using only the context above."
      ↓
Send to Groq API → LLaMA 3.3 70B
      ↓
Return answer + source citations
```

### Why RAG beats fine-tuning

| | RAG | Fine-tuning |
|--|-----|-------------|
| **New documents** | Instant (just add vectors) | Requires retraining |
| **Cost** | Free (vector search) | Expensive (GPU hours) |
| **Accuracy** | Reads actual document text | May hallucinate |
| **Privacy** | Data stays local | Sent to training pipeline |
| **Latency** | 50–150ms retrieval | N/A (baked into weights) |

### Chunking Strategy

- **Chunk size:** 512 tokens — enough context, not too dilute
- **Overlap:** 50 tokens — prevents information loss at boundaries
- **Similarity metric:** Cosine distance — measures semantic direction, not magnitude
- **Top-K:** 5 chunks — balance between context and prompt length
- **Index type:** HNSW (Hierarchical Navigable Small World) — O(log n) search

---

## 🔧 Troubleshooting

### Containers not starting

```bash
# Check logs for specific service
docker compose logs auth-service
docker compose logs vector-service

# Restart specific service
docker compose restart auth-service
```

### PostgreSQL connection error

```bash
# Stop everything and reset postgres volume
docker compose down
docker volume rm research-ai-platform_postgres_data
docker compose up -d postgres
# Wait 15 seconds
docker compose up -d
```

### Vector service / embedding errors

```bash
# Check if Filter import is present in vector service
docker compose logs vector-service | grep -i error

# Rebuild vector service
docker compose build --no-cache vector-service
docker compose up -d vector-service
```

### Frontend calling localhost instead of EC2 IP

```bash
# Verify .env has correct VITE_API_URL
grep VITE_API_URL .env
# Should show: VITE_API_URL=http://YOUR_EC2_IP:8000

# Rebuild frontend with correct environment
docker compose build --no-cache frontend
docker compose up -d frontend
```

### Out of memory (t2.micro / t3.micro)

```bash
# Check memory usage
free -h
docker stats --no-stream

# Add swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## 🗺️ Roadmap

### ✅ Completed (v1.0)
- [x] User authentication (email + Google OAuth)
- [x] PDF and Python file upload
- [x] AI-generated document summary
- [x] 3-level explanation (Beginner / Intermediate / Expert)
- [x] Automated issue detection
- [x] RAG-based document chat with citations
- [x] Vector search with Qdrant
- [x] Docker containerization (7 services)
- [x] AWS EC2 production deployment

### 🔄 In Progress (v1.1)
- [ ] Chat history persistence (MongoDB chats collection)
- [ ] Dashboard → Analyzer navigation without re-upload
- [ ] Multi-file comparison

### 📅 Planned (v2.0)
- [ ] Custom domain + HTTPS (Let's Encrypt)
- [ ] Redis caching for repeated queries
- [ ] Collaborative document analysis
- [ ] Export chat sessions as PDF
- [ ] GitHub repository analysis (direct URL input)
- [ ] Voice input for chat queries

---

## 📊 Performance Metrics

| Metric | Value |
|--------|-------|
| Frontend load time | < 2 seconds |
| API response time | 200–500ms |
| Vector retrieval latency | 50–150ms |
| LLM response time | 2–5 seconds |
| Docker build time (fresh) | 10–15 minutes |
| Docker build time (cached) | 1–2 minutes |
| Container startup time | 30–45 seconds |
| Monthly infrastructure cost | $0 |

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

```bash
# 1. Fork the repository
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/PipelineIQ.git
cd PipelineIQ/research-ai-platform

# 3. Create a feature branch
git checkout -b feature/your-feature-name

# 4. Make changes and test locally
docker compose up -d

# 5. Commit with descriptive message
git commit -m "feat: add chat history persistence"

# 6. Push and create Pull Request
git push origin feature/your-feature-name
```

### Commit message convention

```
feat: add new feature
fix: bug fix
docs: documentation update
style: formatting changes
refactor: code restructure
perf: performance improvement
test: add tests
```

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2026 Shreyansh Pipaliya

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software.
```

---

## 👨‍💻 Author

<div align="center">

**Shreyansh Pipaliya**

[![Email](https://img.shields.io/badge/Email-pipaliyashreyansh%40gmail.com-red?style=flat-square&logo=gmail)](mailto:pipaliyashreyansh@gmail.com)
[![GitHub](https://img.shields.io/badge/GitHub-shreyyansh10-black?style=flat-square&logo=github)](https://github.com/shreyyansh10)

</div>

---

## 🙏 Acknowledgements

- [Groq](https://groq.com/) — Lightning-fast LLM inference with LPU hardware
- [Meta AI](https://ai.meta.com/) — LLaMA 3.3 open-source language model
- [Qdrant](https://qdrant.tech/) — High-performance vector database
- [Hugging Face](https://huggingface.co/) — all-MiniLM-L6-v2 sentence transformer
- [FastAPI](https://fastapi.tiangolo.com/) — Modern async Python web framework
- [MongoDB Atlas](https://www.mongodb.com/atlas) — Cloud database platform

---

<div align="center">

**⭐ Star this repo if you found it useful!**

[![GitHub stars](https://img.shields.io/github/stars/shreyyansh10/PipelineIQ?style=social)](https://github.com/shreyyansh10/PipelineIQ/stargazers)

Made with ❤️ by [Shreyansh Pipaliya](https://github.com/shreyyansh10)

</div>
