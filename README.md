# Swyftx Slam 🏓

The Swyftx Slam - Ranked Ping Pong Competition on Slack

## Features

- 🏆 ELO-based ranking system
- 📊 Real-time leaderboard
- 🎯 Swiss-style pairing algorithm
- 💬 Slack integration for match notifications
- 👑 Tier-based rankings (Bronze, Silver, Gold, Platinum, Diamond)
- 📅 Automated weekly match scheduling
- 🎮 Admin dashboard for match management

## Local Development

### Prerequisites

- Node.js 22.x
- npm

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env` and configure your environment variables:
   - Slack credentials (bot token, signing secret, app token)
   - Admin credentials
   - Results channel ID

4. Run the application:
   ```bash
   npm start
   ```

5. Access at: http://localhost:3000

## Docker Development

### Using Docker Compose

```bash
# Build and run
docker-compose up

# Build only
docker-compose build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

Access at: http://localhost:3000

## Production Deployment

### Architecture

- **Container**: Docker with Node.js 22 Alpine
- **Orchestration**: Kubernetes (AWS EKS)
- **Service Mesh**: Istio
- **SSL/TLS**: Let's Encrypt via cert-manager
- **Storage**: AWS EBS (gp2) for SQLite database persistence
- **CI/CD**: Buildkite

### Deployment URL

**Production**: https://api.swyftx-dev.net/swyftx-slam/

### Prerequisites

- AWS EKS cluster configured
- kubectl configured with cluster access
- Helm 3.x installed
- Buildkite agent with AWS ECR access
- Istio service mesh installed
- cert-manager installed

### Manual Deployment

1. **Build and push Docker image:**
   ```bash
   docker build -t 551534631324.dkr.ecr.ap-southeast-2.amazonaws.com/swyftx-slam/swyftx-slam-app:latest .
   docker push 551534631324.dkr.ecr.ap-southeast-2.amazonaws.com/swyftx-slam/swyftx-slam-app:latest
   ```

2. **Configure secrets in values.dev.yaml:**
   ```yaml
   secrets:
     SLACK_BOT_TOKEN: "xoxb-your-token"
     SLACK_SIGNING_SECRET: "your-secret"
     SLACK_APP_TOKEN: "xapp-your-token"
     RESULTS_CHANNEL_ID: "C1234567890"
     ADMIN_PASSWORD: "secure-password"
   ```

3. **Deploy with Helm:**
   ```bash
   helm upgrade --install swyftx-slam ./.buildkite/helm/swyftx-slam \
     --values ./.buildkite/helm/values.dev.yaml \
     --set imageTag=latest \
     --namespace swyftx-slam \
     --create-namespace
   ```

4. **Verify deployment:**
   ```bash
   kubectl get pods -n swyftx-slam
   kubectl get svc -n swyftx-slam
   kubectl logs -n swyftx-slam -l app=swyftx-slam-app
   ```

### Buildkite CI/CD

The pipeline automatically:
1. Installs dependencies and runs tests
2. Builds Docker image and pushes to ECR
3. Deploys to dev environment (with approval)
4. Provides rollback capability

**Trigger deployment**: Push to any branch, approve deployment in Buildkite UI

### Database Persistence

SQLite database is stored in a Kubernetes PersistentVolumeClaim:
- **Size**: 5Gi
- **Storage Class**: gp2 (AWS EBS)
- **Mount**: `/data/swyftx-slam.db`

### Health Checks

- **Endpoint**: `/health`
- **Response**: `{"status":"ok","timestamp":"..."}`
- **Liveness**: HTTP GET every 30s
- **Readiness**: HTTP GET every 10s

### Resource Limits

- **Requests**: 256Mi RAM, 250m CPU
- **Limits**: 512Mi RAM, 500m CPU

### Environment Variables

Configure in `.buildkite/helm/values.dev.yaml`:

```yaml
env:
  NODE_ENV: production
  PORT: "3000"
  SESSION_SECRET: "secure-random-string"
  CRON_SCHEDULE: "0 9 * * 1"  # Monday 9 AM
```

### Monitoring

View logs:
```bash
kubectl logs -n swyftx-slam -l app=swyftx-slam-app -f
```

Check pod status:
```bash
kubectl describe pod -n swyftx-slam -l app=swyftx-slam-app
```

### Rollback

Via Buildkite:
1. Trigger "Rollback Dev" step in pipeline

Via Helm:
```bash
helm rollback swyftx-slam 0 -n swyftx-slam
```

## HTTPS Configuration

HTTPS is automatically configured in production via:
- **Istio VirtualService** for routing
- **cert-manager** for Let's Encrypt certificates
- **Kubernetes Ingress** with automatic certificate renewal

Local development uses HTTP only. For local HTTPS, use a reverse proxy like nginx or configure Node.js HTTPS server.

## Project Structure

```
.
├── elo.js                 # ELO calculation and pairing logic
├── web-app.js            # Main Express application
├── schema.sql            # Database schema
├── public/               # Static frontend assets
├── Dockerfile            # Production container image
├── docker-compose.yml    # Local development
└── .buildkite/
    ├── pipeline.yaml     # CI/CD pipeline
    └── helm/             # Kubernetes deployment
        ├── values.dev.yaml
        └── swyftx-slam/
            ├── Chart.yaml
            └── templates/
```

## Troubleshooting

### Database locked errors
- Ensure only one instance is running
- Check PVC is properly mounted
- Verify WAL mode is enabled

### Slack integration not working
- Verify bot token has correct scopes
- Check signing secret matches Slack app config
- Ensure app token is valid for socket mode

### Pod crashes
- Check logs: `kubectl logs -n swyftx-slam -l app=swyftx-slam-app`
- Verify environment variables are set
- Check health endpoint responds

## License

MIT
