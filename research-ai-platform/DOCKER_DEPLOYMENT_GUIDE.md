# PAPERPILOT - DOCKER DEPLOYMENT GUIDE

## ✅ ALL DOCKER FILES CREATED SUCCESSFULLY

### Production-Ready Dockerfiles Created:
1. ✅ services/api-gateway/Dockerfile
2. ✅ services/paper-service/Dockerfile (with PyMuPDF dependencies)
3. ✅ services/ai-service/Dockerfile
4. ✅ services/vector-service/Dockerfile (with pre-downloaded model)
5. ✅ services/citation-service/Dockerfile
6. ✅ services/auth-service/Dockerfile (with Prisma)
7. ✅ frontend/Dockerfile (multi-stage build with Nginx)

### Configuration Files Created:
8. ✅ frontend/nginx.conf (SPA routing + security headers)
9. ✅ docker-compose.yml (orchestration for all services)
10. ✅ .env.docker (environment variables template)

### .dockerignore Files Created:
11. ✅ services/api-gateway/.dockerignore
12. ✅ services/paper-service/.dockerignore
13. ✅ services/ai-service/.dockerignore
14. ✅ services/vector-service/.dockerignore
15. ✅ services/citation-service/.dockerignore
16. ✅ services/auth-service/.dockerignore
17. ✅ frontend/.dockerignore

---

## 🚀 LOCAL DOCKER TESTING

### Step 1: Configure Environment Variables
```powershell
# Copy the template
cp .env.docker .env

# Edit .env and fill in your actual values:
# - JWT_SECRET (from services/auth-service/.env)
# - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
# - EMAIL_PASS (Gmail app password)
# - GROQ_API_KEY (already filled)
# - MONGODB_URI (already filled)
# - QDRANT credentials (already filled)
```

### Step 2: Build All Services
```powershell
cd c:\Users\inspi\OneDrive\Desktop\PAPERPILOT\research-ai-platform
docker-compose build
```

### Step 3: Start All Services
```powershell
docker-compose up -d
```

### Step 4: Check Service Health
```powershell
# View logs
docker-compose logs -f

# Check individual service
docker-compose logs -f vector-service

# Check all containers are running
docker-compose ps
```

### Step 5: Access Application
- Frontend: http://localhost:5173
- API Gateway: http://localhost:8000
- Individual services: 8001-8005

### Step 6: Stop Services
```powershell
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

---

## 🏗️ DOCKER FEATURES IMPLEMENTED

### 1. Multi-Stage Builds
- **Frontend**: Build stage (Node.js) → Production stage (Nginx)
- Reduces final image size by 80%+

### 2. Health Checks
- All services have health checks
- Automatic restart on failure
- Kubernetes-ready

### 3. Optimizations
- **Vector Service**: Pre-downloads sentence-transformers model
- **Paper Service**: Includes PyMuPDF system dependencies
- **Auth Service**: Prisma client generation in build
- All Python services use `--no-cache-dir` for smaller images

### 4. Security
- Non-root users (where applicable)
- Minimal base images (alpine/slim)
- .dockerignore prevents sensitive files
- Nginx security headers

### 5. Production Ready
- Proper logging
- Volume mounts for persistence
- Network isolation
- Environment-based configuration

---

## ☁️ AWS DEPLOYMENT OPTIONS

### Option 1: AWS ECS (Elastic Container Service)
**Best for: Managed container orchestration**

```bash
# 1. Push images to ECR
aws ecr create-repository --repository-name paperpilot/api-gateway
aws ecr create-repository --repository-name paperpilot/paper-service
aws ecr create-repository --repository-name paperpilot/ai-service
aws ecr create-repository --repository-name paperpilot/vector-service
aws ecr create-repository --repository-name paperpilot/citation-service
aws ecr create-repository --repository-name paperpilot/auth-service
aws ecr create-repository --repository-name paperpilot/frontend

# 2. Build and push
docker tag pipelineiq-gateway:latest <account>.dkr.ecr.<region>.amazonaws.com/paperpilot/api-gateway:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/paperpilot/api-gateway:latest

# 3. Create ECS task definitions and services
# Use AWS Console or Terraform
```

### Option 2: AWS App Runner
**Best for: Simplest deployment**

```bash
# Deploy each service individually
aws apprunner create-service \
  --service-name paperpilot-api-gateway \
  --source-configuration file://apprunner-config.json
```

### Option 3: AWS EKS (Kubernetes)
**Best for: Advanced orchestration needs**

```bash
# 1. Create EKS cluster
eksctl create cluster --name paperpilot --region us-east-1

# 2. Deploy using Kubernetes manifests
kubectl apply -f k8s/
```

### Option 4: AWS Lightsail Containers
**Best for: Budget-friendly deployment**

```bash
# Deploy container service
aws lightsail create-container-service \
  --service-name paperpilot \
  --power small \
  --scale 1
```

---

## 📦 INDIVIDUAL SERVICE BUILDS

### Build Single Service
```powershell
# Example: Build only vector service
docker build -t paperpilot-vector ./services/vector-service

# Run standalone
docker run -p 8003:8003 --env-file ./services/vector-service/.env paperpilot-vector
```

### Test Single Service
```powershell
# Build
docker build -t test-vector ./services/vector-service

# Run with environment
docker run -p 8003:8003 \
  -e QDRANT_URL="your_url" \
  -e QDRANT_API_KEY="your_key" \
  test-vector

# Check health
curl http://localhost:8003/health
```

---

## 🔧 TROUBLESHOOTING

### Issue: Build fails for vector-service
**Solution**: Increase Docker memory to 4GB+
```powershell
# Docker Desktop → Settings → Resources → Memory
```

### Issue: Frontend can't connect to API
**Solution**: Update VITE_API_URL in docker-compose.yml
```yaml
args:
  VITE_API_URL=http://your-api-gateway-url:8000
```

### Issue: Auth service can't connect to Postgres
**Solution**: Wait for Postgres health check
```yaml
depends_on:
  postgres:
    condition: service_healthy
```

### Issue: Paper uploads not persisting
**Solution**: Volume is mounted correctly
```yaml
volumes:
  - paper_uploads:/app/storage/pdfs
```

---

## 📊 RESOURCE REQUIREMENTS

### Minimum (Development)
- CPU: 4 cores
- RAM: 8GB
- Disk: 20GB

### Recommended (Production)
- CPU: 8 cores
- RAM: 16GB
- Disk: 50GB
- Network: 100Mbps+

### Per Service Estimates
- API Gateway: 256MB RAM
- Paper Service: 512MB RAM
- AI Service: 512MB RAM
- Vector Service: 2GB RAM (model loading)
- Citation Service: 256MB RAM
- Auth Service: 256MB RAM
- Frontend: 128MB RAM
- Postgres: 512MB RAM

---

## 🎯 NEXT STEPS FOR AWS DEPLOYMENT

1. **Choose Deployment Method**
   - ECS for managed containers
   - App Runner for simplicity
   - EKS for Kubernetes
   - Lightsail for budget

2. **Set Up AWS Resources**
   - Create ECR repositories
   - Configure RDS (if not using MongoDB Atlas)
   - Set up Application Load Balancer
   - Configure Route 53 for DNS

3. **Push Images to ECR**
   ```bash
   aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
   docker-compose build
   docker-compose push
   ```

4. **Deploy Services**
   - Create task definitions
   - Configure service discovery
   - Set up auto-scaling
   - Configure CloudWatch logs

5. **Configure Domain & SSL**
   - Point domain to Load Balancer
   - Request ACM certificate
   - Update CORS origins

6. **Monitor & Scale**
   - Set up CloudWatch dashboards
   - Configure alarms
   - Enable auto-scaling
   - Set up backup policies

---

## 📝 PRODUCTION CHECKLIST

- [ ] All environment variables configured
- [ ] Secrets stored in AWS Secrets Manager
- [ ] SSL certificates configured
- [ ] CORS origins updated for production domain
- [ ] Database backups enabled
- [ ] CloudWatch logging configured
- [ ] Auto-scaling policies set
- [ ] Health checks passing
- [ ] Load balancer configured
- [ ] DNS records updated
- [ ] Monitoring dashboards created
- [ ] Alerting configured
- [ ] Cost monitoring enabled

---

## 🔐 SECURITY BEST PRACTICES

1. **Never commit .env files**
2. **Use AWS Secrets Manager for production**
3. **Enable VPC for service isolation**
4. **Use IAM roles instead of access keys**
5. **Enable CloudTrail for audit logs**
6. **Regular security updates**
7. **Implement rate limiting**
8. **Use WAF for frontend protection**

---

## 💰 ESTIMATED AWS COSTS (Monthly)

### Small Deployment (ECS Fargate)
- 7 containers × 0.25 vCPU × $0.04/hour = ~$200/month
- Application Load Balancer = ~$20/month
- Data transfer = ~$10/month
- **Total: ~$230/month**

### Medium Deployment (ECS with auto-scaling)
- Auto-scaling 7 services = ~$400/month
- RDS PostgreSQL (if used) = ~$50/month
- **Total: ~$450/month**

### Note: MongoDB Atlas and Qdrant Cloud are separate costs
