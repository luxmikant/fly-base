# 🔧 Troubleshooting Guide

Common issues and solutions for the Drone Mission Management System setup.

## 🐳 Docker Issues

### Issue: "Docker Desktop is not running"
**Error**: `unable to get image 'redis:7-alpine': error during connect`

**Solution**:
1. **Start Docker Desktop**:
   - Windows: Open Docker Desktop from Start Menu
   - Mac: Open Docker Desktop from Applications
   - Linux: `sudo systemctl start docker`

2. **Wait for Docker to fully start** (green icon in system tray)

3. **Verify Docker is running**:
   ```bash
   docker info
   ```

4. **Run setup again**:
   ```bash
   setup.bat  # Windows
   ./setup.sh # Linux/Mac
   ```

### Issue: "The system cannot find the file specified"
**Error**: `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified`

**Solution**:
1. **Restart Docker Desktop completely**
2. **Check Docker Desktop settings**:
   - Go to Settings → General
   - Ensure "Use the WSL 2 based engine" is enabled (Windows)
3. **Reset Docker Desktop** (if needed):
   - Settings → Troubleshoot → Reset to factory defaults

### Issue: Docker Compose version warning
**Warning**: `the attribute 'version' is obsolete`

**Solution**: This is just a warning and can be ignored. The setup script now uses the newer Docker Compose format.

## 🗄️ Database Issues

### Issue: "Authentication failed against database server"
**Error**: `P1000: Authentication failed against database server at 'localhost'`

**Causes & Solutions**:

1. **Docker services not ready**:
   ```bash
   # Wait longer for services to start
   docker-compose logs postgres
   
   # Check if PostgreSQL is ready
   docker exec -it drone-mission-postgres-1 pg_isready -U postgres
   ```

2. **Wrong database credentials**:
   - Check `backend/.env` file
   - Ensure credentials match docker-compose.yml:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/drone_missions?schema=public"
   ```

3. **Port conflicts**:
   ```bash
   # Check if port 5432 is in use
   netstat -an | findstr 5432  # Windows
   lsof -i :5432               # Linux/Mac
   
   # Stop conflicting services
   sudo systemctl stop postgresql  # Linux
   ```

4. **Manual database setup**:
   ```bash
   # Connect to PostgreSQL container
   docker exec -it drone-mission-postgres-1 psql -U postgres
   
   # Create database manually
   CREATE DATABASE drone_missions;
   \q
   
   # Run migrations again
   cd backend
   npm run migrate
   ```

### Issue: "Database does not exist"
**Error**: `database "drone_missions" does not exist`

**Solution**:
```bash
# Create database manually
docker exec -it drone-mission-postgres-1 createdb -U postgres drone_missions

# Or connect and create
docker exec -it drone-mission-postgres-1 psql -U postgres -c "CREATE DATABASE drone_missions;"

# Run migrations
cd backend
npm run migrate
```

## 📦 NPM Issues

### Issue: "Could not read package.json"
**Error**: `ENOENT: no such file or directory, open 'package.json'`

**Solution**:
1. **Run from correct directory**:
   ```bash
   # Make sure you're in the project root
   ls -la  # Should see backend/, frontend/, setup.bat
   
   # Run setup from project root
   setup.bat
   ```

2. **Check directory structure**:
   ```
   drone-mission-system/
   ├── backend/
   │   ├── package.json
   │   └── ...
   ├── frontend/
   │   ├── package.json
   │   └── ...
   ├── setup.bat
   └── setup.sh
   ```

### Issue: NPM install fails
**Error**: Various npm installation errors

**Solutions**:
1. **Clear npm cache**:
   ```bash
   npm cache clean --force
   ```

2. **Delete node_modules and reinstall**:
   ```bash
   cd backend
   rm -rf node_modules package-lock.json
   npm install
   
   cd ../frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Use different npm registry**:
   ```bash
   npm install --registry https://registry.npmjs.org/
   ```

4. **Check Node.js version**:
   ```bash
   node --version  # Should be 18+ (recommended 20+)
   ```

## 🔌 Port Conflicts

### Issue: "Port already in use"
**Error**: `EADDRINUSE: address already in use :::3000`

**Solutions**:

1. **Find and kill process using port**:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   
   # Linux/Mac
   lsof -i :3000
   kill -9 <PID>
   ```

2. **Use different ports**:
   ```bash
   # Backend - edit backend/.env
   PORT=3001
   
   # Frontend - edit frontend/.env
   VITE_API_URL=http://localhost:3001/api/v1
   ```

3. **Stop all Docker containers**:
   ```bash
   docker-compose down
   docker stop $(docker ps -aq)
   ```

## 🌐 Network Issues

### Issue: "Connection refused" or "Network error"
**Error**: Various network connection errors

**Solutions**:

1. **Check firewall settings**:
   - Windows: Allow Docker Desktop through Windows Firewall
   - Mac: System Preferences → Security & Privacy → Firewall
   - Linux: `sudo ufw allow 3000` and `sudo ufw allow 5173`

2. **Check antivirus software**:
   - Temporarily disable antivirus
   - Add Docker Desktop to exceptions

3. **Reset network settings**:
   ```bash
   # Windows
   ipconfig /flushdns
   
   # Linux/Mac
   sudo dscacheutil -flushcache
   ```

## 🔧 Service-Specific Issues

### Kafka Issues
```bash
# Check Kafka logs
docker-compose logs kafka

# Restart Kafka services
docker-compose restart zookeeper kafka

# Create topics manually
docker exec -it drone-mission-kafka-1 kafka-topics --create --topic drone.telemetry --bootstrap-server localhost:9092
```

### Redis Issues
```bash
# Check Redis logs
docker-compose logs redis

# Test Redis connection
docker exec -it drone-mission-redis-1 redis-cli ping

# Clear Redis data
docker exec -it drone-mission-redis-1 redis-cli FLUSHALL
```

### MQTT Issues
```bash
# Check Mosquitto logs
docker-compose logs mosquitto

# Test MQTT connection
docker exec -it drone-mission-mosquitto-1 mosquitto_pub -h localhost -t test -m "hello"
```

## 🚀 Quick Fixes

### Complete Reset
If all else fails, perform a complete reset:

```bash
# Stop all services
docker-compose down -v

# Remove all containers and volumes
docker system prune -a --volumes

# Remove node_modules
rm -rf backend/node_modules frontend/node_modules
rm -rf backend/package-lock.json frontend/package-lock.json

# Run setup again
setup.bat  # Windows
./setup.sh # Linux/Mac
```

### Manual Setup Steps
If the setup script fails, run steps manually:

```bash
# 1. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Start services one by one
docker-compose up -d postgres
sleep 10
docker-compose up -d timescale
sleep 10
docker-compose up -d redis
sleep 10
docker-compose up -d zookeeper
sleep 10
docker-compose up -d kafka
sleep 10
docker-compose up -d mosquitto

# 4. Run migrations
cd backend && npm run migrate
```

### Check Service Status
```bash
# Check all services
docker-compose ps

# Check specific service logs
docker-compose logs postgres
docker-compose logs redis
docker-compose logs kafka

# Check service health
docker-compose exec postgres pg_isready -U postgres
docker-compose exec redis redis-cli ping
```

## 📞 Getting Help

If you're still experiencing issues:

1. **Check the logs**:
   ```bash
   docker-compose logs
   ```

2. **Verify system requirements**:
   - Node.js 20+
   - Docker Desktop with 4GB+ RAM allocated
   - 10GB+ free disk space

3. **Create an issue** with:
   - Operating system and version
   - Node.js version (`node --version`)
   - Docker version (`docker --version`)
   - Complete error message
   - Steps to reproduce

## 🎯 Success Indicators

Setup is successful when:

- ✅ All Docker containers are running: `docker-compose ps`
- ✅ Database migration completes: `npm run migrate`
- ✅ Backend starts: `npm run dev` (port 3000)
- ✅ Frontend starts: `npm run dev` (port 5173)
- ✅ Can access http://localhost:5173
- ✅ Can login with test credentials

Happy coding! 🚁✨