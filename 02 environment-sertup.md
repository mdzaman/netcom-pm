# Local Development Environment Setup Guide

## Prerequisites Installation

1. **Install Homebrew**
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

2. **Install Node.js (LTS version)**
```bash
brew install node@18
```

3. **Install Python**
```bash
brew install python@3.11
```

4. **Install Docker Desktop**
```bash
brew install --cask docker
```

5. **Install AWS CLI**
```bash
brew install awscli
```

6. **Install VS Code Extensions**
- AWS Toolkit
- Docker
- ESLint
- Prettier
- Python
- React/Redux Snippets
- GitLens
- Thunder Client (REST API Client)

## Project Setup

1. **Create Project Directory**
```bash
mkdir jira-alternative
cd jira-alternative
```

2. **Initialize Git Repository**
```bash
git init
```

3. **Create Base Project Structure**
```bash
mkdir -p frontend/src backend/src infrastructure docs tests
```

4. **Frontend Setup (React + TypeScript)**
```bash
cd frontend
npx create-react-app . --template typescript
npm install @aws-amplify/ui-react aws-amplify @emotion/react @chakra-ui/react @chakra-ui/icons
npm install @tanstack/react-query axios react-router-dom @types/node
```

5. **Backend Setup (Node.js + TypeScript)**
```bash
cd ../backend
npm init -y
npm install -D typescript @types/node @types/express ts-node nodemon
npm install express aws-sdk @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
npm install dotenv cors helmet
npx tsc --init
```

6. **Infrastructure Setup (AWS CDK)**
```bash
cd ../infrastructure
npm install -g aws-cdk
mkdir lib
cdk init app --language typescript
```

7. **Create Essential Configuration Files**

`.gitignore` in root directory:
```
# Dependencies
node_modules/
.pnp/
.pnp.js

# Testing
coverage/

# Production
build/
dist/

# Misc
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local
.env

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.idea/
.vscode/
*.swp
*.swo

# AWS
.aws-sam/
cdk.out/
```

## AWS Configuration

1. **Configure AWS CLI**
```bash
aws configure
```
Enter your AWS access key ID, secret access key, default region (e.g., us-west-2), and output format (json)

2. **Create `.env` Files**

Frontend `.env`:
```
REACT_APP_AWS_REGION=us-west-2
REACT_APP_API_ENDPOINT=http://localhost:3001
```

Backend `.env`:
```
PORT=3001
NODE_ENV=development
AWS_REGION=us-west-2
```

## Database Setup (Local Development)

1. **Start Local DynamoDB**
```bash
docker run -p 8000:8000 amazon/dynamodb-local
```

2. **Start Local PostgreSQL**
```bash
docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
```

## Running the Application

1. **Start Backend**
```bash
cd backend
npm run dev
```

2. **Start Frontend**
```bash
cd frontend
npm start
```

## Next Steps

1. Set up the CI/CD pipeline using GitHub Actions or AWS CodePipeline
2. Configure AWS services (Cognito, S3, etc.)
3. Implement basic authentication flow
4. Set up database schemas and models
5. Create initial API endpoints
6. Develop core UI components

## Important Notes

- Keep sensitive information in `.env` files and never commit them to version control
- Use AWS Parameter Store or Secrets Manager for production secrets
- Follow the principle of least privilege when setting up IAM roles
- Implement proper error handling and logging from the start
- Set up monitoring and alerting early in development

## Useful Commands

**DynamoDB Local:**
```bash
aws dynamodb list-tables --endpoint-url http://localhost:8000
```

**PostgreSQL:**
```bash
psql -h localhost -U postgres
```

**AWS CDK:**
```bash
cdk diff
cdk deploy
```
