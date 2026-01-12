# Deployment Guide

This guide covers deploying Stackwise using Docker Compose in different scenarios.

## Table of Contents

1. [Single Machine Deployment](#single-machine-deployment)
2. [Distributed Deployment](#distributed-deployment)
3. [Environment Configuration](#environment-configuration)
4. [Deployment Strategies](#deployment-strategies)
5. [Scaling](#scaling)

## Single Machine Deployment

Deploy all services on one machine (recommended for small to medium deployments).

### Prerequisites

- Docker and Docker Compose installed
- At least 4GB RAM
- 20GB disk space

### Steps

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd Stackwise
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.production.example .env
   # Edit .env with your production values
   ```

3. **Start all services:**
   ```bash
   docker-compose up -d
   ```

4. **Check service status:**
   ```bash
   docker-compose ps
   ```

5. **View logs:**
   ```bash
   docker-compose logs -f
   ```

6. **Stop services:**
   ```bash
   docker-compose down
   ```

### Services

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Distributed Deployment

Deploy services across multiple machines for better performance and scalability.

### Architecture Options

#### Option 1: Two Machines
- **Machine 1**: Database + Redis
- **Machine 2**: Backend + Celery + Frontend

#### Option 2: Three Machines
- **Machine 1**: Database + Redis
- **Machine 2**: Backend + Frontend
- **Machine 3**: Celery Workers (can scale horizontally)

#### Option 3: Four Machines (Production)
- **Machine 1**: PostgreSQL
- **Machine 2**: Redis
- **Machine 3**: Backend API
- **Machine 4**: Frontend + Celery Workers

### Using Docker Swarm (Recommended for Distributed)

1. **Initialize Swarm on manager node:**
   ```bash
   docker swarm init
   ```

2. **Join worker nodes:**
   ```bash
   # On worker nodes, run the command from swarm init output
   docker swarm join --token <token> <manager-ip>:2377
   ```

3. **Create overlay network:**
   ```bash
   docker network create --driver overlay stackwise-network
   ```

4. **Deploy stack:**
   ```bash
   docker stack deploy -c docker-compose.distributed.yml stackwise
   ```

### Using Separate Docker Compose Files

If not using Docker Swarm, you can deploy services separately:

#### On Database Server (Machine 1)

```bash
# docker-compose.db.yml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

#### On Backend Server (Machine 2)

```bash
# docker-compose.backend.yml
version: '3.8'
services:
  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@<DB_SERVER_IP>:5432/error_ingestion
      REDIS_URL: redis://<REDIS_SERVER_IP>:6379/0
    ports:
      - "8000:8000"
```

#### On Frontend Server (Machine 3)

```bash
# docker-compose.frontend.yml
version: '3.8'
services:
  frontend:
    build: ./frontend
    environment:
      NEXT_PUBLIC_API_BASE_URL: http://<BACKEND_SERVER_IP>:8000
    ports:
      - "3000:3000"
```

### Network Configuration

For distributed deployment, ensure:

1. **Firewall Rules:**
   - Database: Allow port 5432 from backend servers
   - Redis: Allow port 6379 from backend/celery servers
   - Backend: Allow port 8000 from frontend
   - Frontend: Allow port 3000 (or 80/443 with reverse proxy)

2. **Security:**
   - Use VPN or private network
   - Use strong passwords
   - Consider using SSL/TLS for database connections
   - Use firewall rules to restrict access

## Environment Configuration

### Required Variables

See `.env.production.example` for all required variables.

**Critical variables:**
- `POSTGRES_PASSWORD`: Strong password for database
- `JWT_SECRET`: Generate with: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
- `AUTH_SECRET`: Generate with: `openssl rand -base64 32`
- `OPENAI_API_KEY`: Your OpenAI API key
- `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`: For OAuth

### For Distributed Deployment

Update these variables based on your server IPs:

```env
# On Backend Server
POSTGRES_HOST=192.168.1.10  # Database server IP
REDIS_HOST=192.168.1.11    # Redis server IP

# On Frontend Server
NEXT_PUBLIC_API_BASE_URL=http://192.168.1.12:8000  # Backend server IP
AUTH_URL=http://192.168.1.13:3000  # Frontend server IP
```

## Deployment Strategies

### Strategy 1: All-in-One (Single Machine)

**Best for:**
- Development
- Small deployments (< 1000 errors/day)
- Testing

**Pros:**
- Simple setup
- Easy to manage
- Lower cost

**Cons:**
- Limited scalability
- Single point of failure
- Resource constraints

### Strategy 2: Database Separation

**Best for:**
- Medium deployments (1000-10000 errors/day)
- When database is the bottleneck

**Setup:**
- Machine 1: PostgreSQL + Redis
- Machine 2: Backend + Celery + Frontend

### Strategy 3: Full Distribution

**Best for:**
- Large deployments (> 10000 errors/day)
- High availability requirements
- Production environments

**Setup:**
- Machine 1: PostgreSQL
- Machine 2: Redis
- Machine 3: Backend API
- Machine 4: Frontend
- Machine 5+: Celery Workers (scale as needed)

## Scaling

### Horizontal Scaling

#### Scale Celery Workers

```bash
# Using Docker Compose
docker-compose up -d --scale celery=3

# Using Docker Swarm
docker service scale stackwise_celery=3
```

#### Scale Backend (with Load Balancer)

1. Run multiple backend instances:
   ```bash
   docker-compose up -d --scale backend=3
   ```

2. Use Nginx as load balancer:
   ```nginx
   upstream backend {
       server backend1:8000;
       server backend2:8000;
       server backend3:8000;
   }
   ```

### Vertical Scaling

Increase resources for containers:

```yaml
# In docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## Reverse Proxy Setup

### Nginx Configuration

```nginx
# Frontend
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### SSL/TLS with Let's Encrypt

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

## Monitoring

### Health Checks

All services include health checks. Monitor with:

```bash
docker-compose ps
# Check "Health" column
```

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Resource Usage

```bash
docker stats
```

## Backup

### Database Backup

```bash
# Create backup
docker-compose exec postgres pg_dump -U postgres error_ingestion > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U postgres error_ingestion < backup.sql
```

### Automated Backups

Create a cron job:

```bash
# Add to crontab
0 2 * * * docker-compose exec -T postgres pg_dump -U postgres error_ingestion > /backups/backup-$(date +\%Y\%m\%d).sql
```

## Troubleshooting

### Services won't start

1. Check logs: `docker-compose logs`
2. Verify environment variables
3. Check port conflicts: `netstat -tulpn | grep <port>`
4. Verify network connectivity between services

### Database connection issues

1. Verify `DATABASE_URL` is correct
2. Check PostgreSQL is accessible
3. Verify firewall rules
4. Check PostgreSQL logs: `docker-compose logs postgres`

### Celery not processing tasks

1. Check Redis connection
2. Verify Celery worker is running: `docker-compose logs celery`
3. Check queue: `docker-compose exec redis redis-cli LLEN celery`
4. Verify environment variables match between backend and celery

## Security Best Practices

1. **Use strong passwords** for all services
2. **Keep secrets in .env** (never commit to git)
3. **Use private networks** for service communication
4. **Enable SSL/TLS** for production
5. **Regular updates**: `docker-compose pull && docker-compose up -d`
6. **Backup regularly**
7. **Monitor logs** for suspicious activity
8. **Use firewall rules** to restrict access

## Next Steps

- Set up monitoring (Prometheus, Grafana)
- Configure log aggregation (ELK stack)
- Set up CI/CD pipeline
- Configure auto-scaling
- Set up alerting
