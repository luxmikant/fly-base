# 🧪 Comprehensive Testing Guide

This guide covers testing the complete Drone Mission Management System, from backend services to frontend integration.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Testing](#backend-testing)
3. [Frontend Testing](#frontend-testing)
4. [Integration Testing](#integration-testing)
5. [End-to-End Testing](#end-to-end-testing)
6. [Performance Testing](#performance-testing)
7. [Monitoring & Observability](#monitoring--observability)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
```bash
# Core requirements
Node.js 20+
Docker & Docker Compose
PostgreSQL 15+
Redis 7+

# Testing tools
curl or Postman
WebSocket testing tool (wscat)
Artillery (for load testing)
```

### Environment Setup
```bash
# Clone repository
git clone <repository-url>
cd drone-mission-system

# Backend setup
cd backend
npm install
cp .env.example .env

# Frontend setup
cd ../frontend
npm install
cp .env.example .env
```

## Backend Testing

### 1. Infrastructure Setup

Start all required services:
```bash
# Start infrastructure
docker-compose up -d postgres timescale redis kafka mosquitto

# Verify services are running
docker-compose ps

# Check service health
curl http://localhost:3000/health
```

### 2. Database Testing

```bash
# Run migrations
cd backend
npm run migrate

# Verify database schema
npx prisma studio
# Open http://localhost:5555 to inspect database
```

### 3. Unit Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# Test specific service
npm test -- --testPathPattern=services/mission.service.test.ts
```

### 4. API Endpoint Testing

#### Authentication
```bash
# Register user (if auth endpoints exist)
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User",
    "role": "OPERATOR"
  }'

# Login to get JWT token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Save the token for subsequent requests
export JWT_TOKEN="your-jwt-token-here"
```

#### Mission Management
```bash
# Create a mission
curl -X POST http://localhost:3000/api/v1/missions \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Survey Mission",
    "siteId": "site-sf-01",
    "droneId": "DJI-M300-001",
    "surveyArea": {
      "type": "Polygon",
      "coordinates": [[
        [-122.4194, 37.7749],
        [-122.4184, 37.7749],
        [-122.4184, 37.7759],
        [-122.4194, 37.7759],
        [-122.4194, 37.7749]
      ]]
    },
    "flightPattern": "GRID",
    "parameters": {
      "altitude": 120,
      "speed": 5,
      "overlap": 80
    }
  }'

# List missions
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3000/api/v1/missions

# Get specific mission
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3000/api/v1/missions/{mission-id}

# Start mission
curl -X POST http://localhost:3000/api/v1/missions/{mission-id}/start \
  -H "Authorization: Bearer $JWT_TOKEN"

# Pause mission
curl -X POST http://localhost:3000/api/v1/missions/{mission-id}/pause \
  -H "Authorization: Bearer $JWT_TOKEN"

# Abort mission
curl -X POST http://localhost:3000/api/v1/missions/{mission-id}/abort \
  -H "Authorization: Bearer $JWT_TOKEN"
```

#### Drone Management
```bash
# List drones
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3000/api/v1/drones

# Get fleet status
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3000/api/v1/drones/site/site-sf-01/fleet-status

# Get available drones
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3000/api/v1/drones/site/site-sf-01/available
```

### 5. WebSocket Testing

Install wscat for WebSocket testing:
```bash
npm install -g wscat
```

Test WebSocket connection:
```bash
# Connect with authentication
wscat -c "ws://localhost:3000" -H "Authorization: Bearer $JWT_TOKEN"

# Or pass token as query parameter
wscat -c "ws://localhost:3000?token=$JWT_TOKEN"

# Once connected, test subscriptions:
# Subscribe to mission telemetry
{"type": "subscribe:mission", "missionId": "mission-id-here"}

# Subscribe to drone status
{"type": "subscribe:drone", "droneId": "DJI-M300-001"}

# Subscribe to site alerts
{"type": "subscribe:site", "siteId": "site-sf-01"}
```

### 6. Message Queue Testing

#### Kafka Testing
```bash
# List topics
docker exec -it kafka kafka-topics --bootstrap-server localhost:9092 --list

# Produce test message
docker exec -it kafka kafka-console-producer \
  --bootstrap-server localhost:9092 \
  --topic drone.telemetry

# Consume messages
docker exec -it kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic drone.telemetry \
  --from-beginning
```

#### MQTT Testing
```bash
# Install MQTT client
npm install -g mqtt

# Subscribe to telemetry
mqtt sub -t "drone/+/telemetry" -h localhost -p 1883

# Publish test telemetry
mqtt pub -t "drone/DJI-M300-001/telemetry" -h localhost -p 1883 -m '{
  "droneId": "DJI-M300-001",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "altitude": 120.5,
  "battery": 78,
  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
}'
```

## Frontend Testing

### 1. Development Server

```bash
cd frontend
npm run dev
# Open http://localhost:5173
```

### 2. Build Testing

```bash
# Production build
npm run build

# Preview production build
npm run preview
# Open http://localhost:4173
```

### 3. Component Testing

```bash
# Run component tests (if configured)
npm test

# Visual testing with Storybook (if configured)
npm run storybook
```

### 4. Browser Testing

#### Manual Testing Checklist

**Authentication Flow:**
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Token expiration handling
- [ ] Logout functionality

**Dashboard:**
- [ ] Real-time telemetry updates
- [ ] Mission status changes
- [ ] Fleet status display
- [ ] Alert notifications

**Mission Control:**
- [ ] Create new mission
- [ ] Start mission
- [ ] Pause/Resume mission
- [ ] Abort mission
- [ ] Return to home command

**WebSocket Connection:**
- [ ] Initial connection
- [ ] Reconnection on disconnect
- [ ] Real-time data updates
- [ ] Error handling

## Integration Testing

### 1. Full Stack Integration

Create a test script to verify end-to-end functionality:

```bash
#!/bin/bash
# integration-test.sh

set -e

echo "🚀 Starting Integration Tests"

# 1. Start backend
cd backend
npm run dev &
BACKEND_PID=$!
sleep 10

# 2. Start frontend
cd ../frontend
npm run dev &
FRONTEND_PID=$!
sleep 5

# 3. Run API tests
echo "Testing API endpoints..."
curl -f http://localhost:3000/health || exit 1

# 4. Test WebSocket connection
echo "Testing WebSocket..."
timeout 10s wscat -c "ws://localhost:3000" -x '{"test": true}' || echo "WebSocket test completed"

# 5. Test frontend
echo "Testing frontend..."
curl -f http://localhost:5173 || exit 1

echo "✅ Integration tests completed"

# Cleanup
kill $BACKEND_PID $FRONTEND_PID
```

### 2. Database Integration

```bash
# Test database operations
cd backend

# Create test data
npx prisma db seed

# Run integration tests
npm run test:integration
```

### 3. Message Queue Integration

Test the complete message flow:

```bash
# Terminal 1: Start consumers
npm run dev

# Terminal 2: Publish test messages
node scripts/test-kafka-flow.js

# Terminal 3: Monitor WebSocket updates
wscat -c "ws://localhost:3000?token=$JWT_TOKEN"
```

## End-to-End Testing

### 1. Automated E2E Tests

If using Playwright or Cypress:

```bash
# Install E2E testing framework
npm install -D @playwright/test

# Run E2E tests
npx playwright test

# Run with UI
npx playwright test --ui
```

### 2. Manual E2E Scenarios

**Scenario 1: Complete Mission Lifecycle**
1. Login to dashboard
2. Create new mission
3. Assign drone
4. Start mission
5. Monitor real-time telemetry
6. Complete mission
7. View mission results

**Scenario 2: Emergency Procedures**
1. Start mission
2. Simulate emergency (low battery alert)
3. Execute return to home
4. Verify safe landing

**Scenario 3: Multi-Drone Operations**
1. Deploy multiple drones
2. Monitor fleet status
3. Handle concurrent missions
4. Manage resource allocation

## Performance Testing

### 1. Load Testing with Artillery

Install Artillery:
```bash
npm install -g artillery
```

Create load test configuration:
```yaml
# load-test.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
  defaults:
    headers:
      Authorization: 'Bearer YOUR_JWT_TOKEN'

scenarios:
  - name: "API Load Test"
    flow:
      - get:
          url: "/api/v1/missions"
      - get:
          url: "/api/v1/drones"
      - get:
          url: "/api/v1/drones/site/site-sf-01/fleet-status"
```

Run load tests:
```bash
artillery run load-test.yml
```

### 2. WebSocket Load Testing

```javascript
// ws-load-test.js
const WebSocket = require('ws');

const connections = [];
const numConnections = 100;

for (let i = 0; i < numConnections; i++) {
  const ws = new WebSocket('ws://localhost:3000', {
    headers: { Authorization: 'Bearer YOUR_JWT_TOKEN' }
  });
  
  ws.on('open', () => {
    console.log(`Connection ${i} opened`);
    ws.send(JSON.stringify({ type: 'subscribe:mission', missionId: 'test-mission' }));
  });
  
  connections.push(ws);
}

// Monitor memory usage
setInterval(() => {
  console.log('Memory usage:', process.memoryUsage());
}, 5000);
```

### 3. Database Performance

```sql
-- Test query performance
EXPLAIN ANALYZE SELECT * FROM missions WHERE status = 'ACTIVE';
EXPLAIN ANALYZE SELECT * FROM telemetry WHERE drone_id = 'DJI-M300-001' ORDER BY timestamp DESC LIMIT 100;

-- Monitor slow queries
SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

## Monitoring & Observability

### 1. Health Checks

```bash
# Backend health
curl http://localhost:3000/health

# Database connectivity
curl http://localhost:3000/health/db

# Redis connectivity
curl http://localhost:3000/health/redis

# Kafka connectivity
curl http://localhost:3000/health/kafka
```

### 2. Metrics Monitoring

```bash
# View application metrics
curl http://localhost:3000/metrics

# Monitor WebSocket connections
curl http://localhost:3000/metrics/websocket

# Check Kafka consumer lag
docker exec kafka kafka-consumer-groups --bootstrap-server localhost:9092 --describe --all-groups
```

### 3. Log Analysis

```bash
# View application logs
docker-compose logs -f backend

# Filter for errors
docker-compose logs backend | grep ERROR

# Monitor real-time logs
tail -f backend/logs/app.log
```

## Troubleshooting

### Common Issues

**Backend won't start:**
```bash
# Check port availability
lsof -i :3000

# Verify environment variables
cat backend/.env

# Check database connection
npx prisma db pull
```

**WebSocket connection fails:**
```bash
# Check WebSocket endpoint
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" http://localhost:3000/socket.io/

# Verify authentication
echo $JWT_TOKEN
```

**Frontend API calls fail:**
```bash
# Check CORS configuration
curl -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: X-Requested-With" -X OPTIONS http://localhost:3000/api/v1/missions

# Verify API URL in frontend
grep VITE_API_URL frontend/.env
```

**Database connection issues:**
```bash
# Test PostgreSQL connection
psql -h localhost -p 5432 -U postgres -d drone_missions

# Check TimescaleDB extension
psql -h localhost -p 5433 -U postgres -d telemetry -c "SELECT * FROM pg_extension WHERE extname = 'timescaledb';"
```

**Kafka issues:**
```bash
# Check Kafka broker
docker exec kafka kafka-broker-api-versions --bootstrap-server localhost:9092

# Verify topic creation
docker exec kafka kafka-topics --bootstrap-server localhost:9092 --describe --topic drone.telemetry
```

### Debug Mode

Enable debug logging:
```bash
# Backend
export DEBUG=drone-mission:*
npm run dev

# Frontend
export VITE_ENABLE_DEBUG_LOGS=true
npm run dev
```

### Performance Issues

```bash
# Monitor resource usage
docker stats

# Check database performance
SELECT * FROM pg_stat_activity WHERE state = 'active';

# Monitor Redis memory
redis-cli info memory
```

## Test Data Setup

Create test data for comprehensive testing:

```bash
# Run seed script
cd backend
npx prisma db seed

# Or create manual test data
curl -X POST http://localhost:3000/api/v1/missions \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d @test-data/sample-mission.json
```

## Continuous Testing

Set up automated testing in CI/CD:

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd backend && npm ci
          cd ../frontend && npm ci
      
      - name: Run backend tests
        run: cd backend && npm test
      
      - name: Run integration tests
        run: ./scripts/integration-test.sh
```

This comprehensive testing guide covers all aspects of the system. Start with the basic backend and frontend tests, then progress to integration and performance testing as needed.