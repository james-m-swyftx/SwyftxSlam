# Swyftx Slam - Deployment Guide

## Quick Start - Production Deployment

### 1. Prerequisites Checklist

- [ ] AWS EKS cluster access configured
- [ ] kubectl configured and authenticated
- [ ] Helm 3.x installed
- [ ] Docker installed and authenticated to ECR
- [ ] Istio service mesh installed on cluster
- [ ] cert-manager installed on cluster
- [ ] Slack app configured with tokens

### 2. Configure Secrets

Edit `.buildkite/helm/values.dev.yaml` and add your secrets:

```yaml
secrets:
  SLACK_BOT_TOKEN: "xoxb-your-actual-token"
  SLACK_SIGNING_SECRET: "your-actual-secret"
  SLACK_APP_TOKEN: "xapp-your-actual-token"
  RESULTS_CHANNEL_ID: "C1234567890"
  ADMIN_USERNAME: "admin"
  ADMIN_PASSWORD: "your-secure-password"
```

**Security Note**: Never commit these secrets to Git. Use AWS Secrets Manager or Kubernetes secrets in production.

### 3. Build & Push Docker Image

```bash
# Authenticate to ECR
aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin 551534631324.dkr.ecr.ap-southeast-2.amazonaws.com

# Build image
docker build -t 551534631324.dkr.ecr.ap-southeast-2.amazonaws.com/swyftx-slam/swyftx-slam-app:latest .

# Push to ECR
docker push 551534631324.dkr.ecr.ap-southeast-2.amazonaws.com/swyftx-slam/swyftx-slam-app:latest
```

### 4. Deploy to Kubernetes

```bash
# Deploy with Helm
helm upgrade --install swyftx-slam ./.buildkite/helm/swyftx-slam \
  --values ./.buildkite/helm/values.dev.yaml \
  --set imageTag=latest \
  --set env.GIT_COMMIT=$(git rev-parse HEAD) \
  --namespace swyftx-slam \
  --create-namespace \
  --wait \
  --timeout 5m

# Verify deployment
kubectl get pods -n swyftx-slam
kubectl get svc -n swyftx-slam
kubectl get virtualservice -n swyftx-slam
```

### 5. Verify Deployment

```bash
# Check pod status
kubectl get pods -n swyftx-slam -w

# View logs
kubectl logs -n swyftx-slam -l app=swyftx-slam-app -f

# Test health endpoint
kubectl port-forward -n swyftx-slam svc/swyftx-slam-app 3000:80
curl http://localhost:3000/health
```

### 6. Access Application

**Production URL**: https://api.swyftx-dev.net/swyftx-slam/

Wait 2-3 minutes for:
- Certificate to be issued by Let's Encrypt
- DNS to propagate
- Istio routing to configure

## Local Development with Docker

```bash
# Build and run locally
docker-compose up

# Access at http://localhost:3000
```

## Buildkite CI/CD Deployment

1. Push code to GitHub
2. Buildkite pipeline automatically runs
3. Approve "Deploy to Dev" step in Buildkite UI
4. Deployment happens automatically

## Monitoring & Logs

### View Application Logs
```bash
kubectl logs -n swyftx-slam -l app=swyftx-slam-app -f --tail=100
```

### Check Pod Health
```bash
kubectl describe pod -n swyftx-slam -l app=swyftx-slam-app
```

### View Events
```bash
kubectl get events -n swyftx-slam --sort-by='.lastTimestamp'
```

### Database Backup
```bash
# Copy database from pod
kubectl cp swyftx-slam/$(kubectl get pod -n swyftx-slam -l app=swyftx-slam-app -o jsonpath='{.items[0].metadata.name}'):/data/swyftx-slam.db ./backup-$(date +%Y%m%d).db
```

## Rollback

### Via Helm
```bash
# List releases
helm history swyftx-slam -n swyftx-slam

# Rollback to previous version
helm rollback swyftx-slam 0 -n swyftx-slam --wait

# Rollback to specific revision
helm rollback swyftx-slam 3 -n swyftx-slam --wait
```

### Via Buildkite
1. Go to Buildkite pipeline
2. Unblock "Rollback Dev" step
3. Confirm rollback

## Troubleshooting

### Pod Won't Start
```bash
# Check pod events
kubectl describe pod -n swyftx-slam -l app=swyftx-slam-app

# Check logs
kubectl logs -n swyftx-slam -l app=swyftx-slam-app --previous
```

### Database Issues
```bash
# Check PVC
kubectl get pvc -n swyftx-slam

# Check volume mount
kubectl exec -it -n swyftx-slam $(kubectl get pod -n swyftx-slam -l app=swyftx-slam-app -o jsonpath='{.items[0].metadata.name}') -- ls -la /data
```

### SSL Certificate Not Working
```bash
# Check certificate status
kubectl get certificate -n swyftx-slam
kubectl describe certificate -n swyftx-slam

# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager
```

### Can't Access via URL
```bash
# Check VirtualService
kubectl get virtualservice -n swyftx-slam -o yaml

# Check Istio gateway
kubectl get gateway -n istio-ingress

# Test from within cluster
kubectl run curl --image=curlimages/curl -i --tty --rm -- curl http://swyftx-slam-app.swyftx-slam/health
```

## Updating Configuration

### Update Environment Variables
1. Edit `.buildkite/helm/values.dev.yaml`
2. Run helm upgrade:
   ```bash
   helm upgrade swyftx-slam ./.buildkite/helm/swyftx-slam \
     --values ./.buildkite/helm/values.dev.yaml \
     --namespace swyftx-slam \
     --reuse-values
   ```

### Update Secrets
```bash
# Update via kubectl
kubectl create secret generic swyftx-slam-app-secrets \
  --from-literal=SLACK_BOT_TOKEN=xoxb-new-token \
  --from-literal=ADMIN_PASSWORD=new-password \
  --namespace swyftx-slam \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart pods to pick up new secrets
kubectl rollout restart deployment/swyftx-slam-app -n swyftx-slam
```

## Scaling

```bash
# Scale to 2 replicas
kubectl scale deployment/swyftx-slam-app --replicas=2 -n swyftx-slam

# Or via Helm values
# Edit values.dev.yaml: slamApp.replicas: 2
helm upgrade swyftx-slam ./.buildkite/helm/swyftx-slam \
  --values ./.buildkite/helm/values.dev.yaml \
  --namespace swyftx-slam
```

**Note**: SQLite doesn't support multiple writers. If scaling >1 replica, migrate to PostgreSQL.

## Complete Uninstall

```bash
# Uninstall Helm release
helm uninstall swyftx-slam -n swyftx-slam

# Delete namespace (including PVC)
kubectl delete namespace swyftx-slam
```

## Next Steps

- [ ] Configure AWS Secrets Manager integration
- [ ] Set up Prometheus monitoring
- [ ] Configure Grafana dashboards
- [ ] Set up log aggregation (CloudWatch/ELK)
- [ ] Add automated backups for database
- [ ] Configure Slack alerts for deployment failures
- [ ] Migrate to PostgreSQL for multi-replica support
