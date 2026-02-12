#!/bin/bash

# SaaS Starter Kit - Project Setup Script
# This script helps you quickly create a new project from the starter kit

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  SaaS Starter Kit - Project Setup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Get project name
if [ -z "$1" ]; then
  echo -e "${YELLOW}Usage: ./setup.sh <project-name>${NC}"
  echo "Example: ./setup.sh my-awesome-saas"
  exit 1
fi

PROJECT_NAME=$1

# Check if directory already exists
if [ -d "$PROJECT_NAME" ]; then
  echo -e "${YELLOW}❌ Directory '$PROJECT_NAME' already exists!${NC}"
  exit 1
fi

echo -e "${GREEN}📦 Creating project: $PROJECT_NAME${NC}"
echo ""

# Copy template
cp -r . "$PROJECT_NAME"
cd "$PROJECT_NAME"

# Remove setup script from new project
rm -f setup.sh

# Initialize git
echo -e "${GREEN}🔧 Initializing Git repository...${NC}"
rm -rf .git
git init -q
git add .
git commit -q -m "Initial commit from SaaS Starter Kit"

# Create .env.local from example
echo -e "${GREEN}📝 Creating .env.local file...${NC}"
cp .env.example .env.local

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Project created successfully!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo "  1. cd $PROJECT_NAME"
echo "  2. Edit .env.local with your Supabase credentials"
echo "  3. npm install"
echo "  4. npm run db:generate"
echo "  5. npm run db:migrate"
echo "  6. npm run dev"
echo ""
echo -e "${BLUE}📚 Documentation: README.md${NC}"
echo -e "${BLUE}🤖 AI Ready: .cursorrules configured for Cursor${NC}"
echo ""
