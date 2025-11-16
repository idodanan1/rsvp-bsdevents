#!/bin/bash

# Deploy script for Render
# Usage: ./deploy.sh

echo "🚀 Starting deployment process..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git not initialized. Initializing..."
    git init
    git add .
    git commit -m "Initial commit - ready for deployment"
fi

# Check if remote exists
if ! git remote | grep -q "origin"; then
    echo "📋 Please add your GitHub remote:"
    echo "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
    exit 1
fi

# Push to GitHub
echo "📤 Pushing to GitHub..."
git add .
git commit -m "Deploy to production" || echo "No changes to commit"
git push origin main || git push origin master

echo "✅ Code pushed to GitHub!"
echo ""
echo "📋 Next steps:"
echo "1. Go to https://render.com/"
echo "2. Click 'New' → 'Blueprint'"
echo "3. Select your repository"
echo "4. Render will deploy automatically!"
echo ""
echo "🔐 Don't forget to add Environment Variables in Render:"
echo "   - WHATSAPP_ACCESS_TOKEN"
echo "   - WHATSAPP_PHONE_NUMBER_ID"

