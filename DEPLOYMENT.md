# Deployment Guide

## Production Environment Setup

### Infrastructure Requirements

**Minimum Server Specifications:**
- CPU: 2 vCPUs
- RAM: 4GB
- Storage: 50GB SSD
- Network: 1Gbps connection

**Recommended Production Specifications:**
- CPU: 4+ vCPUs
- RAM: 8GB+
- Storage: 100GB+ SSD
- Network: 10Gbps connection
- Load balancer for high availability

### Database Configuration

**PostgreSQL Production Setup:**
```sql
-- Create production database
CREATE DATABASE operabase_production;

-- Create dedicated user
CREATE USER operabase_prod WITH PASSWORD 'secure_production_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE operabase_production TO operabase_prod;
GRANT ALL ON SCHEMA public TO operabase_prod;

-- Configure connection limits
ALTER USER operabase_prod CONNECTION LIMIT 20;
```

**Database Optimization:**
```sql
-- Performance tuning
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.7;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- Reload configuration
SELECT pg_reload_conf();
```

**Backup Strategy:**
```bash
#!/bin/bash
# Daily backup script
BACKUP_DIR="/var/backups/operabase"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="operabase_production"

mkdir -p $BACKUP_DIR

# Create compressed backup
pg_dump -h localhost -U operabase_prod -d $DB_NAME | gzip > $BACKUP_DIR/operabase_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "operabase_*.sql.gz" -mtime +30 -delete

# Upload to cloud storage (optional)
aws s3 cp $BACKUP_DIR/operabase_$DATE.sql.gz s3://operabase-backups/
```

### Environment Configuration

**Production Environment Variables:**
```env
# Application
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL=postgresql://operabase_prod:secure_password@localhost:5432/operabase_production
PGHOST=localhost
PGPORT=5432
PGUSER=operabase_prod
PGPASSWORD=secure_production_password
PGDATABASE=operabase_production

# Security
SESSION_SECRET=ultra-secure-session-secret-for-production-use
COOKIE_SECURE=true
TRUST_PROXY=1

# External APIs
ASAAS_API_KEY=production_asaas_key
ANTHROPIC_API_KEY=production_anthropic_key

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=https://your-sentry-dsn
```

### Build and Deployment Process

**Build for Production:**
```bash
# Install dependencies
npm ci --only=production

# Build frontend
npm run build

# Run database migrations
npm run db:push

# Start production server
npm run start
```

**Docker Deployment:**
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine AS production

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S operabase -u 1001
USER operabase

EXPOSE 5000

CMD ["npm", "start"]
```

**Docker Compose for Production:**
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://operabase_prod:${DB_PASSWORD}@db:5432/operabase_production
      - SESSION_SECRET=${SESSION_SECRET}
    depends_on:
      - db
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_DB=operabase_production
      - POSTGRES_USER=operabase_prod
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U operabase_prod"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Nginx Configuration

**Production Nginx Setup:**
```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/javascript application/xml+rss 
               application/json application/xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Main server block
    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

        # Static files
        location /assets/ {
            root /app/client/dist;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # API endpoints
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app:5000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Login endpoint with stricter rate limiting
        location /api/login {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://app:5000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Frontend application
        location / {
            try_files $uri $uri/ @fallback;
        }

        location @fallback {
            proxy_pass http://app:5000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### Monitoring and Logging

**Application Health Check:**
```typescript
// server/health.ts
import { db } from './db';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'up' | 'down';
    memory: number;
    uptime: number;
  };
}

export async function getHealthStatus(): Promise<HealthStatus> {
  const timestamp = new Date().toISOString();
  
  try {
    // Test database connection
    await db.raw('SELECT 1');
    const databaseStatus = 'up';
    
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    // Get uptime
    const uptime = process.uptime();
    
    return {
      status: 'healthy',
      timestamp,
      services: {
        database: databaseStatus,
        memory: Math.round(memoryPercent),
        uptime: Math.round(uptime)
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp,
      services: {
        database: 'down',
        memory: 0,
        uptime: 0
      }
    };
  }
}
```

**Structured Logging:**
```typescript
// server/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'operabase-api' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export { logger };
```

**Request Logging Middleware:**
```typescript
// server/middleware/logging.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: (req as any).user?.id
    });
  });
  
  next();
}
```

### Security Hardening

**Security Middleware:**
```typescript
// server/security.ts
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Rate limiting
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts',
  skipSuccessfulRequests: true,
});
```

**Environment Validation:**
```typescript
// server/config.ts
import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.string().transform(Number),
  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  ASAAS_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
});

export const config = configSchema.parse(process.env);
```

### Performance Optimization

**Database Connection Pooling:**
```typescript
// server/db.ts
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
});

export const db = drizzle(pool);
```

**Redis Session Store:**
```typescript
// server/session.ts
import session from 'express-session';
import connectRedis from 'connect-redis';
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.connect().catch(console.error);

const RedisStore = connectRedis(session);

export const sessionConfig = {
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
};
```

### Deployment Scripts

**Automated Deployment Script:**
```bash
#!/bin/bash
# deploy.sh

set -e

echo "Starting deployment..."

# Pull latest code
git pull origin main

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Run database migrations
npm run db:push

# Restart services
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 30

# Health check
if curl -f http://localhost:5000/health; then
    echo "Deployment successful!"
else
    echo "Deployment failed - rolling back..."
    docker-compose -f docker-compose.prod.yml down
    docker-compose -f docker-compose.prod.yml up -d
    exit 1
fi
```

**Zero-Downtime Deployment:**
```bash
#!/bin/bash
# blue-green-deploy.sh

set -e

CURRENT_COLOR=$(docker-compose -f docker-compose.prod.yml ps | grep app | grep Up | awk '{print $1}' | cut -d'_' -f2)
NEW_COLOR=$([ "$CURRENT_COLOR" = "blue" ] && echo "green" || echo "blue")

echo "Current: $CURRENT_COLOR, Deploying: $NEW_COLOR"

# Start new version
docker-compose -f docker-compose.$NEW_COLOR.yml up -d --build

# Wait for new version to be ready
echo "Waiting for new version to be ready..."
for i in {1..30}; do
    if curl -f http://localhost:500$([[ "$NEW_COLOR" = "blue" ]] && echo "0" || echo "1")/health; then
        echo "New version is ready"
        break
    fi
    sleep 10
done

# Switch traffic to new version
echo "Switching traffic to $NEW_COLOR"
# Update load balancer configuration here

# Stop old version
docker-compose -f docker-compose.$CURRENT_COLOR.yml down

echo "Deployment completed successfully"
```

### SSL Certificate Management

**Let's Encrypt Setup:**
```bash
#!/bin/bash
# ssl-setup.sh

# Install certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### Backup and Recovery

**Automated Backup System:**
```bash
#!/bin/bash
# backup-system.sh

BACKUP_DIR="/var/backups/operabase"
S3_BUCKET="operabase-backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
pg_dump $DATABASE_URL | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Application files backup
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /app/uploads /app/config

# Upload to S3
aws s3 cp $BACKUP_DIR/db_$DATE.sql.gz s3://$S3_BUCKET/database/
aws s3 cp $BACKUP_DIR/files_$DATE.tar.gz s3://$S3_BUCKET/files/

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

**Recovery Procedures:**
```bash
#!/bin/bash
# recovery.sh

BACKUP_FILE=$1
DATABASE_NAME="operabase_production"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: ./recovery.sh <backup_file>"
    exit 1
fi

# Stop application
docker-compose down

# Restore database
gunzip -c $BACKUP_FILE | psql $DATABASE_URL

# Start application
docker-compose up -d

echo "Recovery completed"
```

This deployment guide provides comprehensive instructions for securely deploying and maintaining the Operabase healthcare management platform in production environments.