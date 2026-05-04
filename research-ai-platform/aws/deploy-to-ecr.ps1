# AWS ECR Deployment Script for PaperPilot (PowerShell)
# This script builds and pushes all Docker images to AWS ECR

$ErrorActionPreference = "Stop"

# Configuration
$AWS_REGION = "us-east-1"
$AWS_ACCOUNT_ID = "<YOUR_ACCOUNT_ID>"
$ECR_REGISTRY = "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
$PROJECT_NAME = "paperpilot"

Write-Host "========================================" -ForegroundColor Blue
Write-Host "PaperPilot AWS ECR Deployment" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue

# Step 1: Login to ECR
Write-Host "`n[1/4] Logging in to AWS ECR..." -ForegroundColor Green
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

# Step 2: Create ECR repositories if they don't exist
Write-Host "`n[2/4] Creating ECR repositories..." -ForegroundColor Green
$SERVICES = @("api-gateway", "paper-service", "ai-service", "vector-service", "citation-service", "auth-service", "frontend")

foreach ($service in $SERVICES) {
    Write-Host "Creating repository: $PROJECT_NAME/$service"
    try {
        aws ecr create-repository `
            --repository-name "$PROJECT_NAME/$service" `
            --region $AWS_REGION `
            --image-scanning-configuration scanOnPush=true `
            2>$null
    } catch {
        Write-Host "Repository $PROJECT_NAME/$service already exists"
    }
}

# Step 3: Build all images
Write-Host "`n[3/4] Building Docker images..." -ForegroundColor Green

# Build Python services
$pythonServices = @("api-gateway", "paper-service", "ai-service", "vector-service", "citation-service")
foreach ($service in $pythonServices) {
    Write-Host "`nBuilding $service..." -ForegroundColor Blue
    docker build -t "$PROJECT_NAME/${service}:latest" "./services/$service"
    docker tag "$PROJECT_NAME/${service}:latest" "$ECR_REGISTRY/$PROJECT_NAME/${service}:latest"
}

# Build Auth Service (Node.js)
Write-Host "`nBuilding auth-service..." -ForegroundColor Blue
docker build -t "$PROJECT_NAME/auth-service:latest" "./services/auth-service"
docker tag "$PROJECT_NAME/auth-service:latest" "$ECR_REGISTRY/$PROJECT_NAME/auth-service:latest"

# Build Frontend
Write-Host "`nBuilding frontend..." -ForegroundColor Blue
$VITE_GOOGLE_CLIENT_ID = $env:VITE_GOOGLE_CLIENT_ID
docker build `
    --build-arg VITE_API_URL=https://api.yourdomain.com `
    --build-arg VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID `
    -t "$PROJECT_NAME/frontend:latest" "./frontend"
docker tag "$PROJECT_NAME/frontend:latest" "$ECR_REGISTRY/$PROJECT_NAME/frontend:latest"

# Step 4: Push all images
Write-Host "`n[4/4] Pushing images to ECR..." -ForegroundColor Green

foreach ($service in $SERVICES) {
    Write-Host "`nPushing $service..." -ForegroundColor Blue
    docker push "$ECR_REGISTRY/$PROJECT_NAME/${service}:latest"
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nAll images have been pushed to ECR:"
foreach ($service in $SERVICES) {
    Write-Host "  - $ECR_REGISTRY/$PROJECT_NAME/${service}:latest"
}

Write-Host "`nNext steps:" -ForegroundColor Blue
Write-Host "1. Update ECS task definitions with these image URIs"
Write-Host "2. Create or update ECS services"
Write-Host "3. Configure Application Load Balancer"
Write-Host "4. Update DNS records"
