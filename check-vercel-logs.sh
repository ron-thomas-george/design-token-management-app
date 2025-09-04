#!/bin/bash

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Vercel CLI is not installed. Please install it with 'npm install -g vercel'"
    exit 1
fi

# Check if user is logged in
if ! vercel whoami &> /dev/null; then
    echo "Please login to Vercel with 'vercel login'"
    exit 1
fi

# Get the project ID (replace with your project ID if needed)
PROJECT_ID="design-token-management-app"

# Get the last 20 logs
vercel logs $PROJECT_ID --limit 20
