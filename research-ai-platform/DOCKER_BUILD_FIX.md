# Docker Build Fix Guide

## Issue: Network Timeout During Build

The error `ReadTimeoutError: HTTPSConnectionPool(host='files.pythonhosted.org', port=443): Read timed out` occurs when pip takes too long to download packages.

## ✅ FIXES APPLIED

All Dockerfiles have been updated with:
- `--default-timeout=100` (increased from default 15 seconds)
- `--retries 5` (automatic retry on failure)

## 🚀 RECOMMENDED BUILD METHOD

### Option 1: Use Build Script (Recommended)
```powershell
.\build-docker.ps1
```

This script:
- Builds services one at a time
- Automatically retries on failure
- Shows clear progress and summary

### Option 2: Build Services Individually
```powershell
# Build one service at a time to avoid overwhelming your network
docker build -t paperpilot-frontend ./frontend
docker build -t paperpilot-api-gateway ./services/api-gateway
docker build -t paperpilot-citation-service ./services/citation-service
docker build -t paperpilot-paper-service ./services/paper-service
docker build -t paperpilot-ai-service ./services/ai-service
docker build -t paperpilot-vector-service ./services/vector-service
docker build -t paperpilot-auth-service ./services/auth-service
```

### Option 3: Use docker-compose with Retry
```powershell
# If build fails, just run it again
docker-compose build --no-cache
```

## 🔧 ADDITIONAL TROUBLESHOOTING

### 1. Clean Docker Cache
```powershell
docker system prune -a
docker builder prune -a
```

### 2. Increase Docker Resources
- Open Docker Desktop
- Settings → Resources
- Increase Memory to 4GB+
- Increase CPU to 4 cores+

### 3. Check Internet Connection
```powershell
# Test PyPI connectivity
curl https://files.pythonhosted.org
```

### 4. Use Docker BuildKit
```powershell
$env:DOCKER_BUILDKIT=1
docker-compose build
```

### 5. Build with Progress
```powershell
docker-compose build --progress=plain
```

## 📊 Build Time Estimates

- Frontend: 3-5 minutes
- API Gateway: 2-3 minutes
- Citation Service: 2-3 minutes
- Paper Service: 3-4 minutes (includes system packages)
- AI Service: 2-3 minutes
- Vector Service: 5-10 minutes (downloads ML model)
- Auth Service: 2-3 minutes

Total: 20-30 minutes for first build

## ⚡ QUICK START

```powershell
# 1. Build all services (use script for better reliability)
.\build-docker.ps1

# 2. Configure environment
cp .env.docker .env
# Edit .env with your values

# 3. Start services
docker-compose up -d

# 4. Check status
docker-compose ps

# 5. View logs
docker-compose logs -f
```

## 🐛 If Build Still Fails

### For Python Services (timeout errors):
1. Check if you're behind a proxy/firewall
2. Try building during off-peak hours
3. Use a VPN if regional restrictions exist

### For Node Services (auth-service, frontend):
1. Clear npm cache: `npm cache clean --force`
2. Delete node_modules in service directory
3. Try again

### For Vector Service (large downloads):
This service downloads a 90MB+ ML model. If it fails:
```powershell
# Build without the model pre-download first
# Edit services/vector-service/Dockerfile
# Comment out the model download line temporarily
# The model will download on first run instead
```

## 📝 Notes

- Removed obsolete `version: '3.8'` from docker-compose.yml
- All pip installs now have 100s timeout and 5 retries
- Frontend build includes npm vulnerabilities (non-critical)
- Vector service takes longest due to ML model download
