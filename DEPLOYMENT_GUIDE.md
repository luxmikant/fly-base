# 🚀 Deployment Guide

Complete deployment guide for the Drone Mission Management System in production environments.

## Table of Contents

1. [Infrastructure Requirements](#infrastructure-requirements)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Monitoring Setup](#monitoring-setup)
7. [Security Configuration](#security-configuration)
8. [Scaling Considerations](#scaling-considerations)

## Infrastructure Requirements

### Minimum Production Requirements

| Component | Specification |
|-----------|---------------|
| **Application Server** | 4 vCPU, 8GB RAM, 50GB SSD |
| **Database Server** | 4 vCPU, 16GB RAM, 100GB SSD |
| **TimescaleDB** | 2 vCPU, 8GB RAM, 200GB SSD |
| **Redis** | 2 vCPU, 4GB RAM, 20GB SSD |
| **Load Balancer** | 2 vCPU, 4GB RAM |

### Recommended Production Setup

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer                             │
│                     (NGINX/HAProxy)                              │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                    Application Tier                              │
│  Backend API (3 instances) │ Frontend (CDN/Static)              │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                      Message Layer                               │
│  Confluent Kafka │ MQTT Broker │ Redis Cluster                  │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                       Data Layer                                 │
│  PostgreSQL (Primary/Replica) │ TimescaleDB Cluster             │
└─────────────────────────────────────────────────────────────────┘
```

## Environment Setup

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2
```

### 2. SSL Certificate Setup

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Generate SSL certificate
sudo certbot --nginx -d api.yourdomain.com -d app.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Database Setup

### 1. PostgreSQL Production Setup

```bash
# Install PostgreSQL 15
sudo apt install postgresql-15 postgresql-contrib-15

# Configure PostgreSQL
sudo -u postgres psql
```

```sql
-- Create database and user
CREATE DATABASE drone_missions;
CREATE USER drone_user WITH ENCRYPTED PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE drone_missions TO drone_user;

-- Performance tuning
ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET effective_cache_size = '6GB';
ALTER SYSTEM SET maintenance_work_mem = '512MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

SELECT pg_reload_conf();
```

### 2. TimescaleDB Setup

```bash
# Install TimescaleDB
sudo apt install timescaledb-2-postgresql-15

# Configure TimescaleDB
sudo -u postgres psql -d drone_missions
```

```sql
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create telemetry table
CREATE TABLE telemetry (
  time TIMESTAMPTZ NOT NULL,
  drone_id TEXT NOT NULL,
  mission_id TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  altitude DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  battery_level INTEGER,
  signal_strength INTEGER,
  data JSONB
);

-- Create hypertable
SELECT create_hypertable('telemetry', 'time');

-- Create indexes
CREATE INDEX idx_telemetry_drone_time ON telemetry (drone_id, time DESC);
CREATE INDEX idx_telemetry_mission_time ON telemetry (mission_id, time DESC);

-- Set up data retention (keep 90 days)
SELECT add_retention_policy('telemetry', INTERVAL '90 days');
```

### 3. Redis Cluster Setup

```yaml
# docker-compose.redis.yml
version: '3.8'
services:
  redis-master:
    image: redis:7-alpine
    command: redis-server --appendonly yes --replica-read-only no
    ports:
      - "6379:6379"
    volumes:
      - redis_master_data:/data
    environment:
      - REDIS_REPLICATION_MODE=master

  redis-replica:
    image: redis:7-alpine
    command: redis-server --appendonly yes --replica-read-only yes --slaveof redis-master 6379
    depends_on:
      - redis-master
    volumes:
      - redis_replica_data:/data

volumes:
  redis_master_data:
  redis_replica_data:
```

## Backend Deployment

### 1. Production Docker Setup

```dockerfile
# backend/Dockerfile.prod
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:20-alpine AS production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### 2. Production Environment Variables

```bash
# backend/.env.production
NODE_ENV=production
PORT=3000

# Database URLs
DATABASE_URL=postgresql://drone_user:secure_password@db.internal:5432/drone_missions
TIMESCALE_URL=postgresql://drone_user:secure_password@timescale.internal:5432/telemetry
REDIS_URL=redis://redis.internal:6379

# Confluent Kafka
KAFKA_BOOTSTRAP_SERVERS=pkc-xxx.confluent.cloud:9092
KAFKA_API_KEY=your_api_key
KAFKA_API_SECRET=your_api_secret

# MQTT
MQTT_BROKER_URL=mqtt://mqtt.internal:1883

# Security
JWT_SECRET=your_super_secure_jwt_secret_here
JWT_EXPIRES_IN=24h

# Datadog
DD_API_KEY=your_datadog_api_key
DD_SERVICE=drone-mission-backend
DD_ENV=production
DD_VERSION=1.0.0

# CORS
CORS_ORIGIN=https://app.yourdomain.com

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'drone-mission-api',
    script: 'dist/index.js',
    instances: 3,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

### 4. Deployment Script

```bash
#!/bin/bash
# deploy-backend.sh

set -e

echo "🚀 Deploying Backend..."

# Pull latest code
git pull origin main

# Install dependencies
cd backend
npm ci --only=production

# Run database migrations
npm run migrate:prod

# Build application
npm run build

# Restart PM2 processes
pm2 reload ecosystem.config.js

# Health check
sleep 10
curl -f http://localhost:3000/health || exit 1

echo "✅ Backend deployment completed"
```

## Frontend Deployment

### 1. Production Build

```bash
# frontend/.env.production
VITE_API_URL=https://api.yourdomain.com/api/v1
VITE_WS_URL=wss://api.yourdomain.com
VITE_NODE_ENV=production
VITE_DEFAULT_SITE_ID=site-prod-01
VITE_ENABLE_MOCK_DATA=false
VITE_ENABLE_DEBUG_LOGS=false
```

### 2. Build and Deploy Script

```bash
#!/bin/bash
# deploy-frontend.sh

set -e

echo "🚀 Deploying Frontend..."

cd frontend

# Install dependencies
npm ci

# Build for production
npm run build

# Deploy to CDN/Static hosting
# Option 1: AWS S3 + CloudFront
aws s3 sync dist/ s3://your-bucket-name --delete
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"

# Option 2: Nginx static files
# sudo cp -r dist/* /var/www/html/

echo "✅ Frontend deployment completed"
```

### 3. Nginx Configuration

```nginx
# /etc/nginx/sites-available/drone-mission
server {
    listen 443 ssl http2;
    server_name app.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/app.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.yourdomain.com/privkey.pem;

    root /var/www/drone-mission;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Handle client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# API proxy
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Monitoring Setup

### 1. Datadog Agent Installation

```bash
# Install Datadog Agent
DD_API_KEY=your_api_key DD_SITE="datadoghq.com" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"

# Configure agent
sudo tee /etc/datadog-agent/datadog.yaml << EOF
api_key: your_api_key
site: datadoghq.com
hostname: drone-mission-prod
tags:
  - env:production
  - service:drone-mission
logs_enabled: true
process_config:
  enabled: "true"
EOF

# Restart agent
sudo systemctl restart datadog-agent
```

### 2. Application Monitoring

```bash
# Run monitoring setup scripts
cd scripts
chmod +x *.sh

# Create Datadog dashboard
python3 create-datadog-dashboard.py

# Create monitors
python3 create-datadog-monitors.py

# Install agent
./install-datadog-agent.sh
```

### 3. Log Aggregation

```yaml
# docker-compose.logging.yml
version: '3.8'
services:
  filebeat:
    image: docker.elastic.co/beats/filebeat:8.8.0
    user: root
    volumes:
      - ./filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - ELASTICSEARCH_HOST=your-elasticsearch-host
      - KIBANA_HOST=your-kibana-host
```

## Security Configuration

### 1. Firewall Setup

```bash
# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Application-specific ports (internal only)
sudo ufw allow from 10.0.0.0/8 to any port 3000  # API
sudo ufw allow from 10.0.0.0/8 to any port 5432  # PostgreSQL
sudo ufw allow from 10.0.0.0/8 to any port 6379  # Redis
```

### 2. Database Security

```sql
-- PostgreSQL security
ALTER USER drone_user SET default_transaction_isolation = 'read committed';
ALTER USER drone_user SET timezone = 'UTC';
ALTER USER drone_user SET log_statement = 'all';

-- Create read-only user for monitoring
CREATE USER monitoring WITH ENCRYPTED PASSWORD 'monitoring_password';
GRANT CONNECT ON DATABASE drone_missions TO monitoring;
GRANT USAGE ON SCHEMA public TO monitoring;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitoring;
```

### 3. API Security

```javascript
// Additional security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## Scaling Considerations

### 1. Horizontal Scaling

```yaml
# docker-compose.scale.yml
version: '3.8'
services:
  api:
    image: drone-mission-backend:latest
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G
```

### 2. Database Scaling

```sql
-- Read replicas setup
-- On primary server
ALTER SYSTEM SET wal_level = replica;
ALTER SYSTEM SET max_wal_senders = 3;
ALTER SYSTEM SET wal_keep_segments = 64;
SELECT pg_reload_conf();

-- Create replication user
CREATE USER replicator REPLICATION LOGIN CONNECTION LIMIT 3 ENCRYPTED PASSWORD 'replication_password';
```

### 3. Caching Strategy

```javascript
// Redis caching layers
const cacheConfig = {
  // L1: Application cache (5 minutes)
  app: { ttl: 300 },
  // L2: API response cache (1 hour)
  api: { ttl: 3600 },
  // L3: Database query cache (24 hours)
  db: { ttl: 86400 }
};
```

### 4. Load Balancing

```nginx
# Load balancer configuration
upstream backend {
    least_conn;
    server api1.internal:3000 max_fails=3 fail_timeout=30s;
    server api2.internal:3000 max_fails=3 fail_timeout=30s;
    server api3.internal:3000 max_fails=3 fail_timeout=30s;
}

server {
    location / {
        proxy_pass http://backend;
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
    }
}
```

## Backup and Recovery

### 1. Database Backups

```bash
#!/bin/bash
# backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgresql"

# PostgreSQL backup
pg_dump -h localhost -U drone_user -d drone_missions | gzip > "$BACKUP_DIR/drone_missions_$DATE.sql.gz"

# TimescaleDB backup
pg_dump -h localhost -U drone_user -d telemetry | gzip > "$BACKUP_DIR/telemetry_$DATE.sql.gz"

# Upload to S3
aws s3 cp "$BACKUP_DIR/drone_missions_$DATE.sql.gz" s3://your-backup-bucket/postgresql/
aws s3 cp "$BACKUP_DIR/telemetry_$DATE.sql.gz" s3://your-backup-bucket/timescale/

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

### 2. Automated Backup Schedule

```bash
# Add to crontab
0 2 * * * /opt/scripts/backup-db.sh
0 4 * * 0 /opt/scripts/backup-full-system.sh
```

This deployment guide provides a comprehensive approach to deploying the drone mission management system in production. Adjust configurations based on your specific infrastructure requirements and security policies.