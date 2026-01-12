# Docker Deployment FAQ

## Can one docker-compose file deploy on different machines?

**Short answer:** Not directly, but there are several strategies to achieve this.

### Option 1: Docker Swarm (Recommended for Multi-Machine)

Docker Swarm allows you to use one `docker-compose.yml` file to deploy services across multiple machines.

**How it works:**
1. Initialize a Swarm cluster (one manager, multiple workers)
2. Services defined in docker-compose.yml are distributed across nodes
3. Docker handles networking and service discovery automatically

**Example:**
```bash
# On manager node
docker swarm init

# On worker nodes
docker swarm join --token <token> <manager-ip>:2377

# Deploy stack
docker stack deploy -c docker-compose.distributed.yml stackwise
```

**Pros:**
- Single file for all machines
- Automatic service discovery
- Built-in load balancing
- Easy scaling

**Cons:**
- Requires Docker Swarm setup
- All machines must be on same network
- More complex initial setup

### Option 2: Separate Compose Files (Simpler)

Create separate docker-compose files for each machine and connect them via network.

**How it works:**
1. Each machine runs its own docker-compose file
2. Services connect using external IPs/hostnames
3. You manually configure networking

**Example:**

**Machine 1 (Database):**
```yaml
# docker-compose.db.yml
services:
  postgres:
    ports:
      - "5432:5432"  # Expose to other machines
```

**Machine 2 (Backend):**
```yaml
# docker-compose.backend.yml
services:
  backend:
    environment:
      DATABASE_URL: postgresql://postgres:pass@<MACHINE1_IP>:5432/db
```

**Pros:**
- Simple, no special setup needed
- Works with any Docker installation
- Easy to understand

**Cons:**
- Multiple files to manage
- Manual network configuration
- Need to update IPs if machines change

### Option 3: Environment Variables (Flexible)

Use one docker-compose file with environment variables that change per machine.

**How it works:**
1. Same docker-compose.yml on all machines
2. Different .env files per machine
3. Services connect using environment variables

**Example:**

**Machine 1 .env:**
```env
POSTGRES_HOST=localhost
REDIS_HOST=localhost
ROLE=database
```

**Machine 2 .env:**
```env
POSTGRES_HOST=192.168.1.10  # Machine 1 IP
REDIS_HOST=192.168.1.10
ROLE=backend
```

**Pros:**
- Single compose file
- Easy to customize per machine
- Version control friendly

**Cons:**
- Still need to manage multiple .env files
- Manual IP configuration

## Which approach should I use?

### Use Docker Swarm if:
- ✅ You have 3+ machines
- ✅ You want automatic failover
- ✅ You need easy scaling
- ✅ Machines are on same network/VPN

### Use Separate Compose Files if:
- ✅ You have 2-3 machines
- ✅ Machines are on different networks
- ✅ You want simple, explicit configuration
- ✅ You're not familiar with Swarm

### Use Environment Variables if:
- ✅ You want one compose file in git
- ✅ Machines have different configurations
- ✅ You're comfortable with networking

## Network Requirements

For distributed deployment, ensure:

1. **Ports are accessible:**
   - Database: 5432 (or custom)
   - Redis: 6379 (or custom)
   - Backend: 8000 (or custom)
   - Frontend: 3000 (or 80/443)

2. **Firewall rules:**
   ```bash
   # Allow database access from backend servers
   sudo ufw allow from <BACKEND_IP> to any port 5432
   
   # Allow Redis access from backend/celery
   sudo ufw allow from <BACKEND_IP> to any port 6379
   ```

3. **Network connectivity:**
   ```bash
   # Test connection
   telnet <REMOTE_IP> <PORT>
   # or
   nc -zv <REMOTE_IP> <PORT>
   ```

## Security Considerations

1. **Use private networks/VPN** for service communication
2. **Don't expose database/Redis** to public internet
3. **Use strong passwords** in environment variables
4. **Enable SSL/TLS** for production
5. **Use firewall rules** to restrict access

## Example: Two-Machine Setup

### Machine 1 (Database Server - 192.168.1.10)

```bash
# Run only database services
docker-compose -f docker-compose.yml up -d postgres redis
```

### Machine 2 (Application Server - 192.168.1.11)

```bash
# Create .env with remote database
cat > .env << EOF
POSTGRES_HOST=192.168.1.10
REDIS_HOST=192.168.1.10
DATABASE_URL=postgresql://postgres:password@192.168.1.10:5432/error_ingestion
REDIS_URL=redis://192.168.1.10:6379/0
EOF

# Run application services
docker-compose -f docker-compose.yml up -d backend celery frontend
```

## Troubleshooting

### Services can't connect

1. **Check network connectivity:**
   ```bash
   ping <REMOTE_IP>
   telnet <REMOTE_IP> <PORT>
   ```

2. **Check firewall:**
   ```bash
   sudo ufw status
   ```

3. **Check service is listening:**
   ```bash
   netstat -tulpn | grep <PORT>
   ```

4. **Check Docker network:**
   ```bash
   docker network ls
   docker network inspect <network_name>
   ```

### Connection refused errors

- Verify service is running: `docker-compose ps`
- Check service logs: `docker-compose logs <service>`
- Verify IP/hostname in environment variables
- Check firewall rules

## Summary

- **One file, multiple machines**: Use Docker Swarm
- **Simple setup**: Use separate compose files per machine
- **Flexible**: Use environment variables with one compose file
- **All approaches work**: Choose based on your needs and expertise

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).
