# 🛠️ Manual Setup Guide

If the automated setup script fails, follow these manual steps to set up the Drone Mission Management System.

## Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js 20+ installed
- ✅ Docker Desktop running
- ✅ Git (to clone the repository)

## Step 1: Project Setup

```bash
# Navigate to project directory
cd drone-mission-system

# Verify directory structure
ls -la
# Should see: backend/, frontend/, docker-compose.yml, setup.bat, setup.sh
```

## Step 2: Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env file to ensure correct database credentials
# Make sure these lines are correct:
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/drone_missions?schema=public"
# TIMESCALE_URL="postgresql://postgres:postgres@localhost:5433/telemetry?schema=public"
```

## Step 3: Frontend Setup

```bash
# Navigate to frontend (from project root)
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# The default .env should work for development
```

## Step 4: Start Infrastructure Services

### Option A: Start All Services at Once
```bash
# From project root
docker-compose up -d postgres timescale redis zookeeper kafka mosquitto
```

### Option B: Start Services One by One (Recommended for troubleshooting)
```bash
# Start PostgreSQL first
docker-compose up -d postgres
echo "Waiting for PostgreSQL..."
sleep 15

# Start TimescaleDB
docker-compose up -d timescale
echo "Waiting for TimescaleDB..."
sleep 15

# Start Redis
docker-compose up -d redis
echo "Waiting for Redis..."
sleep 10

# Start Zookeeper (required for Kafka)
docker-compose up -d zookeeper
echo "Waiting for Zookeeper..."
sleep 15

# Start Kafka
docker-compose up -d kafka
echo "Waiting for Kafka..."
sleep 20

# Start MQTT Broker
docker-compose up -d mosquitto
echo "All services started!"
```

## Step 5: Verify Services

```bash
# Check all services are running
docker-compose ps

# Should show all services as "Up"
# If any service shows "Exit" status, check logs:
docker-compose logs [service-name]
```

### Test Individual Services

```bash
# Test PostgreSQL
docker exec -it $(docker ps -q -f name=postgres) pg_isready -U postgres

# Test Redis
docker exec -it $(docker ps -q -f name=redis) redis-cli ping

# Test TimescaleDB
docker exec -it $(docker ps -q -f name=timescale) pg_isready -U postgres
```

## Step 6: Database Setup

```bash
# Navigate to backend
cd backend

# Run database migrations
npm run migrate

# If migration fails, try manual database creation:
docker exec -it $(docker ps -q -f name=postgres) createdb -U postgres drone_missions
docker exec -it $(docker ps -q -f name=timescale) createdb -U postgres telemetry

# Then run migrations again
npm run migrate
```

## Step 7: Start Development Servers

### Terminal 1: Backend
```bash
cd backend
npm run dev

# Should see:
# Server running on port 3000
# Database connected
# WebSocket server initialized
```

### Terminal 2: Frontend
```bash
cd frontend
npm run dev

# Should see:
# Local:   http://localhost:5173/
# Network: use --host to expose
```

## Step 8: Verify Setup

1. **Open browser** and go to http://localhost:5173
2. **Login** with test credentials:
   - Email: `operator@flytbase.com`
   - Password: `password123`
3. **Check dashboard** loads with tactical interface
4. **Verify API** at http://localhost:3000/health

## Troubleshooting Common Issues

### Issue: Docker services won't start

```bash
# Check Docker Desktop is running
docker info

# Check available ports
netstat -an | findstr "5432\|5433\|6379\|9092\|1883"  # Windows
lsof -i :5432,:5433,:6379,:9092,:1883                 # Linux/Mac

# Stop conflicting services
sudo systemctl stop postgresql  # Linux
brew services stop postgresql   # Mac
```

### Issue: Database connection fails

```bash
# Check PostgreSQL container logs
docker-compose logs postgres

# Try connecting manually
docker exec -it $(docker ps -q -f name=postgres) psql -U postgres

# If connection works, check .env file in backend/
cat backend/.env | grep DATABASE_URL
```

### Issue: npm install fails

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and try again
rm -rf node_modules package-lock.json
npm install

# Try with different registry
npm install --registry https://registry.npmjs.org/
```

### Issue: Port conflicts

```bash
# Find process using port 3000
lsof -i :3000        # Linux/Mac
netstat -ano | findstr :3000  # Windows

# Kill the process
kill -9 <PID>        # Linux/Mac
taskkill /PID <PID> /F  # Windows

# Or use different port in backend/.env
PORT=3001
```

## Alternative: Docker-only Setup

If you prefer to run everything in Docker:

```bash
# Build and start all services including API
docker-compose up -d

# Check logs
docker-compose logs -f api

# Access application at http://localhost:3000
```

## Verification Checklist

- [ ] All Docker containers running (`docker-compose ps`)
- [ ] PostgreSQL accessible (`docker exec ... pg_isready`)
- [ ] Redis accessible (`docker exec ... redis-cli ping`)
- [ ] Backend starts without errors (`npm run dev`)
- [ ] Frontend starts without errors (`npm run dev`)
- [ ] Can access http://localhost:5173
- [ ] Can login to dashboard
- [ ] API health check passes (http://localhost:3000/health)

## Next Steps

Once setup is complete:

1. **Read the documentation**:
   - [Testing Guide](./TESTING_GUIDE.md)
   - [Deployment Guide](./DEPLOYMENT_GUIDE.md)
   - [Troubleshooting Guide](./TROUBLESHOOTING.md)

2. **Explore the application**:
   - Create test missions
   - Monitor drone status
   - Test real-time updates

3. **Run tests**:
   ```bash
   cd backend
   npm test
   ```

4. **Check API documentation**:
   - Visit http://localhost:3000/api-docs

## Getting Help

If you're still having issues:

1. Check the [Troubleshooting Guide](./TROUBLESHOOTING.md)
2. Review service logs: `docker-compose logs`
3. Ensure all prerequisites are met
4. Try the complete reset procedure in the troubleshooting guide

Happy coding! 🚁✨