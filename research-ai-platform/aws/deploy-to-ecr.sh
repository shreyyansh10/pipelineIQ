#!/bin/bash

# AWS ECR Deployment Script for PaperPilot
# This script builds and pushes all Docker images to AWS ECR

set -e

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="<YOUR_ACCOUNT_ID>"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
PROJECT_NAME="paperpilot"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PaperPilot AWS ECR Deployment${NC}"
echo -e "${BLUE}========================================${NC}"

# Step 1: Login to ECR
echo -e "\n${GREEN}[1/4] Logging in to AWS ECR...${NC}"
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

# Step 2: Create ECR repositories if they don't exist
echo -e "\n${GREEN}[2/4] Creating ECR repositories...${NC}"
SERVICES=("api-gateway" "paper-service" "ai-service" "vector-service" "citation-service" "auth-service" "frontend")

for service in "${SERVICES[@]}"; do
    echo "Creating repository: ${PROJECT_NAME}/${service}"
    aws ecr create-repository \
        --repository-name ${PROJECT_NAME}/${service} \
        --region ${AWS_REGION} \
        --image-scanning-configuration scanOnPush=true \
        2>/dev/null || echo "Repository ${PROJECT_NAME}/${service} already exists"
done

# Step 3: Build all images
echo -e "\n${GREEN}[3/4] Building Docker images...${NC}"

# Build Python services
for service in "api-gateway" "paper-service" "ai-service" "vector-service" "citation-service"; do
    echo -e "\n${BLUE}Building ${service}...${NC}"
    docker build -t ${PROJECT_NAME}/${service}:latest ./services/${service}
    docker tag ${PROJECT_NAME}/${service}:latest ${ECR_REGISTRY}/${PROJECT_NAME}/${service}:latest
done

# Build Auth Service (Node.js)
echo -e "\n${BLUE}Building auth-service...${NC}"
docker build -t ${PROJECT_NAME}/auth-service:latest ./services/auth-service
docker tag ${PROJECT_NAME}/auth-service:latest ${ECR_REGISTRY}/${PROJECT_NAME}/auth-service:latest

# Build Frontend
echo -e "\n${BLUE}Building frontend...${NC}"
docker build \
    --build-arg VITE_API_URL=https://api.yourdomain.com \
    --build-arg VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID} \
    -t ${PROJECT_NAME}/frontend:latest ./frontend
docker tag ${PROJECT_NAME}/frontend:latest ${ECR_REGISTRY}/${PROJECT_NAME}/frontend:latest

# Step 4: Push all images
echo -e "\n${GREEN}[4/4] Pushing images to ECR...${NC}"

for service in "${SERVICES[@]}"; do
    echo -e "\n${BLUE}Pushing ${service}...${NC}"
    docker push ${ECR_REGISTRY}/${PROJECT_NAME}/${service}:latest
done

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\nAll images have been pushed to ECR:"
for service in "${SERVICES[@]}"; do
    echo "  - ${ECR_REGISTRY}/${PROJECT_NAME}/${service}:latest"
done

echo -e "\n${BLUE}Next steps:${NC}"
echo "1. Update ECS task definitions with these image URIs"
echo "2. Create or update ECS services"
echo "3. Configure Application Load Balancer"
echo "4. Update DNS records"
