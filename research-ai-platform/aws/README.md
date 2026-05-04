# AWS Deployment Guide for PaperPilot

This directory contains AWS deployment configurations and scripts for deploying PaperPilot to AWS.

## 📁 Directory Structure

```
aws/
├── deploy-to-ecr.sh              # Bash script to build and push images to ECR
├── deploy-to-ecr.ps1             # PowerShell script for Windows
├── ecs-task-definitions/         # ECS Fargate task definitions
│   └── api-gateway.json          # Example task definition
└── README.md                     # This file
```

## 🚀 Quick Start

### Prerequisites

1. **AWS CLI installed and configured**
   ```bash
   aws configure
   # Enter your AWS Access Key ID, Secret Access Key, and Region
   ```

2. **Docker installed and running**

3. **Environment variables set**
   ```bash
   export VITE_GOOGLE_CLIENT_ID="your-google-client-id"
   ```

### Deployment Steps

#### Option 1: Using Bash (Linux/Mac)
```bash
cd aws
chmod +x deploy-to-ecr.sh
./deploy-to-ecr.sh
```

#### Option 2: Using PowerShell (Windows)
```powershell
cd aws
.\deploy-to-ecr.ps1
```

## 📋 Deployment Options

### 1. AWS ECS Fargate (Recommended)

**Pros:**
- Serverless container management
- Auto-scaling built-in
- No server management
- Pay only for what you use

**Estimated Cost:** $200-400/month

### 2. AWS App Runner

**Pros:**
- Simplest deployment
- Automatic scaling
- Built-in load balancing

**Estimated Cost:** $150-300/month

### 3. AWS EKS (Kubernetes)

**Pros:**
- Full Kubernetes features
- Maximum flexibility
- Advanced orchestration

**Estimated Cost:** $300-600/month

### 4. AWS Lightsail Containers

**Pros:**
- Budget-friendly
- Simple pricing
- Good for small projects

**Estimated Cost:** $40-100/month

## 🔧 Configuration

### Update AWS Account ID

Before running deployment scripts, update:

1. **deploy-to-ecr.sh** or **deploy-to-ecr.ps1**
   ```bash
   AWS_ACCOUNT_ID="<YOUR_ACCOUNT_ID>"
   AWS_REGION="us-east-1"
   ```

2. **ECS Task Definitions**
   - Replace `<ACCOUNT_ID>` with your AWS account ID
   - Replace `<REGION>` with your AWS region

### Environment Variables

Create AWS Secrets Manager secrets for:
- `paperpilot/jwt-secret`
- `paperpilot/groq-api-key`
- `paperpilot/mongodb-uri`
- `paperpilot/qdrant-api-key`
- `paperpilot/google-client-secret`
- `paperpilot/email-password`

## 🔐 Security Best Practices

1. **Use IAM Roles** - Never use access keys in containers
2. **Enable VPC** - Deploy services in private subnets
3. **Secrets Management** - Store all secrets in AWS Secrets Manager
4. **Enable Encryption** - Use SSL/TLS for all traffic
5. **Network Security** - Use security groups to restrict traffic

## 💰 Cost Optimization

1. **Use Fargate Spot** - Save up to 70%
2. **Right-Size Resources** - Monitor and adjust
3. **Use Reserved Capacity** - Save up to 50%
4. **Optimize Images** - Use multi-stage builds

## 📞 Support

For issues:
1. Check AWS CloudWatch logs
2. Review ECS task events
3. Verify IAM permissions
