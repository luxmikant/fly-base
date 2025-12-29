@echo off
setlocal enabledelayedexpansion

echo 🚁 Setting up Drone Mission Management System...
echo ==================================================

REM Check prerequisites
echo 📋 Checking prerequisites...

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 20+ first.
    echo    Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js found

REM Check Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    echo    Download from: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

echo ✅ Docker found

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Desktop is not running. Please start Docker Desktop first.
    echo    1. Open Docker Desktop application
    echo    2. Wait for it to start completely
    echo    3. Run this script again
    pause
    exit /b 1
)

echo ✅ Docker is running

REM Check Docker Compose
docker compose version >nul 2>&1
if errorlevel 1 (
    docker-compose --version >nul 2>&1
    if errorlevel 1 (
        echo ❌ Docker Compose is not available. Please install Docker Desktop with Compose.
        pause
        exit /b 1
    )
    set COMPOSE_CMD=docker-compose
) else (
    set COMPOSE_CMD=docker compose
)

echo ✅ Docker Compose found

echo.
echo 🔧 Setting up backend...
echo ========================

REM Backend setup
if not exist backend (
    echo ❌ Backend directory not found. Please run this script from the project root.
    pause
    exit /b 1
)

cd backend

REM Install dependencies
echo 📦 Installing backend dependencies...
call npm install
if errorlevel 1 (
    echo ❌ Failed to install backend dependencies
    pause
    exit /b 1
)

REM Copy environment file
if not exist .env (
    echo 📝 Creating backend environment file...
    copy .env.example .env
    echo ✅ Backend .env created from .env.example
) else (
    echo ✅ Backend .env already exists
)

cd ..

echo.
echo 🎨 Setting up frontend...
echo =========================

REM Frontend setup
if not exist frontend (
    echo ❌ Frontend directory not found. Please run this script from the project root.
    pause
    exit /b 1
)

cd frontend

REM Install dependencies
echo 📦 Installing frontend dependencies...
call npm install
if errorlevel 1 (
    echo ❌ Failed to install frontend dependencies
    pause
    exit /b 1
)

REM Copy environment file
if not exist .env (
    echo 📝 Creating frontend environment file...
    copy .env.example .env
    echo ✅ Frontend .env created from .env.example
) else (
    echo ✅ Frontend .env already exists
)

cd ..

echo.
echo 🐳 Starting infrastructure services...
echo ======================================

REM Start Docker services
echo 🚀 Starting PostgreSQL, TimescaleDB, Redis, Kafka, and MQTT...
%COMPOSE_CMD% up -d postgres timescale redis kafka mosquitto zookeeper
if errorlevel 1 (
    echo ❌ Failed to start Docker services
    echo    Please check Docker Desktop is running and try again
    pause
    exit /b 1
)

REM Wait for services to be ready
echo ⏳ Waiting for services to be ready...
timeout /t 30 /nobreak >nul

echo 🔍 Checking service health...

REM Check PostgreSQL
docker exec drone-mission-postgres-1 pg_isready -U postgres >nul 2>&1
if errorlevel 1 (
    echo ⚠️  PostgreSQL might not be ready yet, waiting longer...
    timeout /t 15 /nobreak >nul
) else (
    echo ✅ PostgreSQL is ready
)

REM Check Redis
docker exec drone-mission-redis-1 redis-cli ping >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Redis might not be ready yet
) else (
    echo ✅ Redis is ready
)

echo.
echo 🗄️  Setting up database...
echo ==========================

cd backend

REM Run database migrations
echo 🔄 Running database migrations...
call npm run migrate
if errorlevel 1 (
    echo ⚠️  Database migration failed. Services might still be starting.
    echo    You can run 'npm run migrate' manually once services are ready.
) else (
    echo ✅ Database setup completed
)

cd ..

echo.
echo 🎉 Setup completed!
echo ==================
echo.
echo 🚀 To start the development servers:
echo.
echo 1. Backend (Terminal 1):
echo    cd backend
echo    npm run dev
echo.
echo 2. Frontend (Terminal 2):
echo    cd frontend
echo    npm run dev
echo.
echo 📱 Access the application:
echo    • Frontend: http://localhost:5173
echo    • Backend API: http://localhost:3000
echo    • API Docs: http://localhost:3000/api-docs
echo.
echo 🔑 Default login (development mode):
echo    • Email: operator@flytbase.com
echo    • Password: password123
echo    • (Any email/password works in mock mode)
echo.
echo 📚 Documentation:
echo    • Testing Guide: ./TESTING_GUIDE.md
echo    • Deployment Guide: ./DEPLOYMENT_GUIDE.md
echo    • System Design: ./systemDesign.md
echo.
echo 🛠️  Useful commands:
echo    • Run tests: cd backend ^&^& npm test
echo    • View logs: %COMPOSE_CMD% logs -f
echo    • Stop services: %COMPOSE_CMD% down
echo    • Restart services: %COMPOSE_CMD% restart
echo.
echo 🔧 If you encounter issues:
echo    1. Make sure Docker Desktop is running
echo    2. Wait a bit longer for services to start
echo    3. Run: cd backend ^&^& npm run migrate
echo    4. Check service logs: %COMPOSE_CMD% logs
echo.
echo Happy coding! 🚁✨
pause