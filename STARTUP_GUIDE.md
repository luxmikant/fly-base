# 🚀 Drone Mission System - Startup Guide

## Quick Start

### 1. Start Backend Server
```bash
cd backend
npm run dev
```
Backend will run on: **http://localhost:3001**

### 2. Start Frontend
```bash
cd frontend  
npm run dev
```
Frontend will open automatically on: **http://localhost:5173**

---

## ✅ System Status

### Services Running
- ✅ PostgreSQL: localhost:5434
- ✅ Confluent Kafka: Cloud (lkc-6ry86q)
- ✅ Datadog APM: us5.datadoghq.com
- ✅ MQTT: localhost:1883
- ✅ Redis: localhost:6380

### API Endpoints (Backend on 3001)
- Health: http://localhost:3001/health
- Missions: http://localhost:3001/api/v1/missions
- Drones: http://localhost:3001/api/v1/drones
- Sites: http://localhost:3001/api/v1/sites

### Frontend (on 5173)
- Dashboard: http://localhost:5173

---

## 🔧 Fixes Applied

### Frontend Errors Fixed:
1. ✅ **Dashboard crash** - Added null safety to `missions?.find()`
2. ✅ **Port conflict** - Frontend moved to 5173, Backend on 3001
3. ✅ **WebSocket** - Updated to connect to localhost:3001

### Configuration Updates:
- **Frontend .env**: API_URL → http://localhost:3001/api/v1
- **Frontend .env**: WS_URL → ws://localhost:3001
- **Frontend vite.config**: port → 5173
- **Backend .env**: PORT → 3001

---

## 🐛 Known Issues

### WebSocket "Invalid Token" Errors
**Cause**: Backend WebSocket expects JWT authentication  
**Fix**: Need to implement auth login first

**Temporary workaround:**
1. The app will work without WebSocket (no real-time updates)
2. Or implement token-less WebSocket for development

### To enable WebSocket:
1. Login through the UI to get JWT token
2. Token will be stored and used for WebSocket auth

---

## 📊 Test the System

### 1. Health Check
```bash
curl http://localhost:3001/health
```

### 2. List Missions
```bash
curl http://localhost:3001/api/v1/missions
```

### 3. Create Test Mission
```bash
curl -X POST http://localhost:3001/api/v1/missions \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Mission",
    "siteId": "site-sf-01",
    "droneId": "drone-001",
    "surveyArea": {
      "type": "Polygon",
      "coordinates": [[[-122.4194, 37.7749], [-122.4184, 37.7749], [-122.4184, 37.7759], [-122.4194, 37.7759], [-122.4194, 37.7749]]]
    },
    "flightPattern": "CROSSHATCH",
    "parameters": {"altitude": 120, "speed": 5, "overlap": 80}
  }'
```

---

## 🎯 Next Steps

1. **Start both servers** (backend + frontend)
2. **Open http://localhost:5173** in browser
3. **Create test data** (sites, drones, missions)
4. **Monitor with Datadog**: https://us5.datadoghq.com

---

## 🆘 Troubleshooting

### Backend won't start
```bash
# Check if port 3001 is free
netstat -an | findstr "3001"

# If occupied, kill the process or change PORT in backend/.env
```

### Frontend won't start
```bash
# Check if port 5173 is free
netstat -an | findstr "5173"

# Clear cache
cd frontend
rm -rf node_modules/.vite
npm run dev
```

### Database connection fails
```bash
# Verify PostgreSQL is running
Get-Service -Name "postgresql-x64-17"

# Test connection
psql -U postgres -h localhost -p 5434 -d drone_missions
```

---

## 📝 Environment Variables

### Backend (.env)
- PORT=3001
- DATABASE_URL=postgresql://postgres:Shree%402254@localhost:5434/drone_missions
- TIMESCALE_URL=postgresql://postgres:Shree%402254@localhost:5434/telemetry
- DD_SITE=us5.datadoghq.com

### Frontend (.env)
- VITE_API_URL=http://localhost:3001/api/v1
- VITE_WS_URL=ws://localhost:3001
- VITE_DEFAULT_SITE_ID=site-sf-01

---

**Your system is ready! 🎉**
