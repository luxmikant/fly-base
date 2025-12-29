#!/bin/bash

# 🚁 Drone Mission Management System - Quick Setup Script
# This script sets up the complete development environment

set -e

echo "🚁 Setting up Drone Mission Management System..."
echo "=================================================="

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please install Node.js 20+."
    exit 1
fi

echo "✅ Node.js $(node -v) found"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Download from: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

echo "✅ Docker $(docker --version | cut -d' ' -f3 | cut -d',' -f1) found"

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker first."
    echo "   Run: sudo systemctl start docker"
    echo "   Or start Docker Desktop if using it"
    exit 1
fi

echo "✅ Docker is running"

# Check Docker Compose
COMPOSE_CMD=""
if command -v "docker compose" &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ Docker Compose is not available. Please install Docker with Compose."
    exit 1
fi

echo "✅ Docker Compose found"

echo ""
echo "🔧 Setting up backend..."
echo "========================"

# Check if we're in the right directory
if [ ! -d "backend" ]; then
    echo "❌ Backend directory not found. Please run this script from the project root."
    exit 1
fi

# Backend setup
cd backend

# Install dependencies
echo "📦 Installing backend dependencies..."
if ! npm install; then
    echo "❌ Failed to install backend dependencies"
    exit 1
fi

# Copy environment file
if [ ! -f .env ]; then
    echo "📝 Creating backend environment file..."
    cp .env.example .env
    echo "✅ Backend .env created from .env.example"
else
    echo "✅ Backend .env already exists"
fi

cd ..

echo ""
echo "🎨 Setting up frontend..."
echo "========================="

# Check frontend directory
if [ ! -d "frontend" ]; then
    echo "❌ Frontend directory not found. Please run this script from the project root."
    exit 1
fi

# Frontend setup
cd frontend

# Install dependencies
echo "📦 Installing frontend dependencies..."
if ! npm install; then
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi

# Copy environment file
if [ ! -f .env ]; then
    echo "📝 Creating frontend environment file..."
    cp .env.example .env
    echo "✅ Frontend .env created from .env.example"
else
    echo "✅ Frontend .env already exists"
fi

cd ..

echo ""
echo "🐳 Starting infrastructure services..."
echo "======================================"

# Start Docker services
echo "🚀 Starting PostgreSQL, TimescaleDB, Redis, Kafka, and MQTT..."
if ! $COMPOSE_CMD up -d postgres timescale redis kafka mosquitto zookeeper; then
    echo "❌ Failed to start Docker services"
    echo "   Please check Docker is running and try again"
    exit 1
fi

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check if services are running
echo "🔍 Checking service health..."

# Check PostgreSQL
if docker exec $(docker ps -q -f name=postgres) pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
else
    echo "⚠️  PostgreSQL might not be ready yet, waiting longer..."
    sleep 15
fi

# Check Redis
if docker exec $(docker ps -q -f name=redis) redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is ready"
else
    echo "⚠️  Redis might not be ready yet"
fi

echo ""
echo "🗄️  Setting up database..."
echo "=========================="

cd backend

# Run database migrations
echo "🔄 Running database migrations..."
if npm run migrate; then
    echo "✅ Database setup completed"
else
    echo "⚠️  Database migration failed. Services might still be starting."
    echo "   You can run 'npm run migrate' manually once services are ready."
fi

cd ..

echo ""
echo "🎉 Setup completed!"
echo "=================="
echo ""
echo "🚀 To start the development servers:"
echo ""
echo "1. Backend (Terminal 1):"
echo "   cd backend"
echo "   npm run dev"
echo ""
echo "2. Frontend (Terminal 2):"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "📱 Access the application:"
echo "   • Frontend: http://localhost:5173"
echo "   • Backend API: http://localhost:3000"
echo "   • API Docs: http://localhost:3000/api-docs"
echo ""
echo "🔑 Default login (development mode):"
echo "   • Email: operator@flytbase.com"
echo "   • Password: password123"
echo "   • (Any email/password works in mock mode)"
echo ""
echo "📚 Documentation:"
echo "   • Testing Guide: ./TESTING_GUIDE.md"
echo "   • Deployment Guide: ./DEPLOYMENT_GUIDE.md"
echo "   • System Design: ./systemDesign.md"
echo ""
echo "🛠️  Useful commands:"
echo "   • Run tests: cd backend && npm test"
echo "   • View logs: $COMPOSE_CMD logs -f"
echo "   • Stop services: $COMPOSE_CMD down"
echo "   • Restart services: $COMPOSE_CMD restart"
echo ""
echo "🔧 If you encounter issues:"
echo "   1. Make sure Docker is running"
echo "   2. Wait a bit longer for services to start"
echo "   3. Run: cd backend && npm run migrate"
echo "   4. Check service logs: $COMPOSE_CMD logs"
echo ""
echo "Happy coding! 🚁✨"