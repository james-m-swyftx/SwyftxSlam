# AWS Amplify Deployment Guide

## Account Details
- **Account Name**: swyftx-app-playground
- **Account ID**: 291389848510
- **Email**: swyftx-playground-aws@swyftx.com.au

## Prerequisites

1. AWS CLI configured with the swyftx-app-playground account credentials
2. AWS Amplify CLI installed: `npm install -g @aws-amplify/cli`
3. GitHub repository access (or alternative Git provider)

## Deployment Steps

### Option 1: Deploy via AWS Amplify Console (Recommended)

#### 1. Access AWS Amplify Console
```bash
# Login to AWS Console
# Navigate to: AWS Amplify Console
# Or direct URL: https://console.aws.amazon.com/amplify/home?region=ap-southeast-2
```

#### 2. Create New App
1. Click **"New app"** → **"Host web app"**
2. Select your Git provider (GitHub, GitLab, Bitbucket, or AWS CodeCommit)
3. Authorize AWS Amplify to access your repository
4. Select the `swyftx-slam` repository
5. Select the branch to deploy (e.g., `main` or `master`)

#### 3. Configure Build Settings
The `amplify.yml` file in the repository root will be automatically detected.

**Build settings preview:**
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci --production
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

#### 4. Configure Environment Variables
Add the following environment variables in the Amplify Console:

**Required Variables:**
- `SLACK_BOT_TOKEN` = `xoxb-your-token`
- `SLACK_SIGNING_SECRET` = `your-secret`
- `SLACK_APP_TOKEN` = `xapp-your-token`
- `RESULTS_CHANNEL_ID` = `C1234567890`
- `ADMIN_USERNAME` = `admin`
- `ADMIN_PASSWORD` = `your-secure-password`

**Optional Variables:**
- `NODE_ENV` = `production`
- `PORT` = `3000`
- `SESSION_SECRET` = `your-session-secret`
- `CRON_SCHEDULE` = `0 9 * * 1` (Monday 9 AM)

**To add environment variables:**
1. In Amplify Console, go to **App settings** → **Environment variables**
2. Click **"Manage variables"**
3. Add each variable with its value
4. Click **"Save"**

#### 5. Configure Advanced Settings

**App Settings → Build settings:**
- **Build image**: Amazon Linux 2023
- **Node version**: 22

**App Settings → General:**
- **App name**: swyftx-slam
- **Default domain**: `*.amplifyapp.com` (auto-generated)

**Custom domain (optional):**
- Go to **Domain management**
- Add your custom domain
- Follow DNS verification steps

#### 6. Deploy
1. Click **"Save and deploy"**
2. Amplify will:
   - Clone the repository
   - Install dependencies
   - Build the application
   - Deploy to AWS infrastructure
3. Monitor the build progress in the console

#### 7. Verify Deployment
Once deployment completes:
- Access the app via the Amplify-provided URL: `https://main.d1234abcd5678.amplifyapp.com`
- Test the health endpoint: `https://your-app-url/health`
- Check logs in the Amplify Console under **Monitoring** → **Logs**

### Option 2: Deploy via AWS CLI

#### 1. Install and Configure Amplify CLI
```bash
npm install -g @aws-amplify/cli
amplify configure
```

#### 2. Initialize Amplify in Your Project
```bash
cd /path/to/swyftx-slam
amplify init
```

**Configuration prompts:**
- App name: `swyftx-slam`
- Environment: `production`
- Default editor: Your choice
- App type: `javascript`
- Framework: `none`
- Source directory: `.`
- Distribution directory: `.`
- Build command: `npm run build`
- Start command: `npm start`
- AWS Profile: Select the swyftx-app-playground profile

#### 3. Add Hosting with Amplify Hosting
```bash
amplify add hosting
```

Select:
- **Hosting with Amplify Console**: Choose this option
- **Continuous deployment**: Choose this option

#### 4. Publish the App
```bash
amplify publish
```

This will:
- Build the application locally
- Deploy to AWS Amplify
- Provide the deployment URL

# AWS Amplify Deployment Guide

## Account Details
- **Account Name**: swyftx-app-playground
- **Account ID**: 291389848510
- **Email**: swyftx-playground-aws@swyftx.com.au

## ⚠️ Important: Ephemeral Database

**This application uses SQLite stored in `/tmp` - data is NOT persistent.**

- Database resets on every deployment
- Perfect for **testing, demos, and development**
- For production with persistent data, you would need to add external database support (e.g., RDS)

---

## Deployment Steps

### Option 1: Deploy via AWS Amplify Console (Recommended)

#### 1. Access AWS Amplify Console
```bash
# Login to AWS Console with swyftx-app-playground account
# Navigate to: AWS Amplify Console
# Or direct URL: https://console.aws.amazon.com/amplify/home?region=ap-southeast-2
```

#### 2. Create New App
1. Click **"New app"** → **"Host web app"**
2. Select your Git provider (GitHub, GitLab, Bitbucket, or AWS CodeCommit)
3. Authorize AWS Amplify to access your repository
4. Select the `swyftx-slam` repository
5. Select the branch to deploy (e.g., `main` or `master`)

#### 3. Configure Build Settings
The `amplify.yml` file in the repository root will be automatically detected.

**Build settings preview:**
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci --production
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

#### 4. Configure Environment Variables
Add the following environment variables in the Amplify Console:

**Required Variables:**
- `SLACK_BOT_TOKEN` = `xoxb-your-token`
- `SLACK_SIGNING_SECRET` = `your-secret`
- `SLACK_APP_TOKEN` = `xapp-your-token`
- `RESULTS_CHANNEL_ID` = `C1234567890`
- `ADMIN_USERNAME` = `admin`
- `ADMIN_PASSWORD` = `your-secure-password`

**Optional Variables:**
- `NODE_ENV` = `production`
- `PORT` = `3000`
- `SESSION_SECRET` = `your-session-secret`
- `CRON_SCHEDULE` = `0 9 * * 1` (Monday 9 AM)

**To add environment variables:**
1. In Amplify Console, go to **App settings** → **Environment variables**
2. Click **"Manage variables"**
3. Add each variable with its value
4. Click **"Save"**

#### 5. Configure Advanced Settings

**App Settings → Build settings:**
- **Build image**: Amazon Linux 2023
- **Node version**: 22

**App Settings → General:**
- **App name**: swyftx-slam
- **Default domain**: `*.amplifyapp.com` (auto-generated)

**Custom domain (optional):**
- Go to **Domain management**
- Add your custom domain
- Follow DNS verification steps

#### 6. Deploy
1. Click **"Save and deploy"**
2. Amplify will:
   - Clone the repository
   - Install dependencies
   - Build the application
   - Deploy to AWS infrastructure
3. Monitor the build progress in the console

#### 7. Verify Deployment
Once deployment completes:
- Access the app via the Amplify-provided URL: `https://main.d1234abcd5678.amplifyapp.com`
- Test the health endpoint: `https://your-app-url/health`
- Check logs in the Amplify Console under **Monitoring** → **Logs**

---

## Important Notes for Node.js Backend Apps

### Database (Ephemeral)
⚠️ **SQLite database is stored in `/tmp` and resets on each deployment**

- Data is **NOT persistent** between deployments
- Perfect for testing, demos, and staging environments
- Each deployment starts with a fresh database

**For production with persistent data:**
- Consider adding PostgreSQL/MySQL support with AWS RDS
- Or use DynamoDB for serverless persistence
- Or use external database service

### WebSocket Support
The Slack Bolt SDK uses WebSocket connections (Socket Mode). Amplify Hosting supports WebSockets, but ensure:
- The app properly handles connection reconnections
- Health checks don't fail during WebSocket upgrades

### Port Configuration
- Amplify uses port **3000** by default for Node.js apps (configured in environment variables)
- App uses `process.env.PORT || 3000`

### Cron Jobs
- Node-cron will work in Amplify
- However, Amplify hosting may scale down during inactivity
- Consider using **AWS EventBridge** (CloudWatch Events) for production scheduled tasks

---

## Monitoring and Logging

### View Logs
1. Go to Amplify Console
2. Select your app
3. Click **Monitoring** → **Logs**
4. View build logs and runtime logs

### CloudWatch Integration
Amplify automatically sends logs to CloudWatch:
```bash
aws logs tail /aws/amplify/swyftx-slam/production --follow
```

---

## Updating the Application

### Automatic Deployments
When you push to the connected Git branch, Amplify automatically:
1. Detects the change
2. Starts a new build
3. Deploys the new version
4. Routes traffic to the new deployment

**⚠️ Database resets on each deployment**

### Manual Redeploy
In Amplify Console:
1. Go to your app
2. Click **"Redeploy this version"**
3. Confirm

---

## Rollback

### Via Amplify Console
1. Go to **App settings** → **Build history**
2. Find the previous successful build
3. Click **"Redeploy this version"**

---

## Troubleshooting

### Build Fails
- Check build logs in Amplify Console
- Verify `amplify.yml` syntax
- Ensure all dependencies are in `package.json`
- Check Node.js version compatibility

### App Not Starting
- Verify environment variables are set correctly
- Check that `PORT` environment variable is configured
- Review application logs in CloudWatch

### Database Issues
- Database is ephemeral - resets on each deploy
- Check `/tmp` directory permissions
- Verify schema.sql loads correctly

### Slack Integration Not Working
- Verify all Slack tokens are correctly set in environment variables
- Check that Slack App has correct permissions
- Ensure WebSocket connections are not being blocked

---

## Cost Considerations

**AWS Amplify Pricing (ap-southeast-2):**
- Build minutes: First 1,000 minutes free, then $0.01/minute
- Hosting: First 15 GB served free, then $0.15/GB
- Storage: First 5 GB free, then $0.023/GB/month

**Estimated monthly cost for this app:**
- Build: ~100 minutes/month = ~$1
- Hosting: ~5 GB/month = Free
- Storage: <1 GB = Free
- **Total: ~$1-5/month**

---

## Next Steps

1. ✅ Created `amplify.yml` configuration file
2. ⬜ Deploy via Amplify Console
3. ⬜ Configure environment variables
4. ⬜ Test Slack integration
5. ⬜ Set up custom domain (optional)
6. ⬜ Configure CloudWatch alarms for monitoring

---

## Support

For issues or questions:
- AWS Amplify Documentation: https://docs.amplify.aws/
- AWS Support: Available in your AWS Console
- Amplify Discord: https://discord.gg/amplify

### WebSocket Support
The Slack Bolt SDK uses WebSocket connections (Socket Mode). Amplify Hosting supports WebSockets, but ensure:
- The app properly handles connection reconnections
- Health checks don't fail during WebSocket upgrades

### Port Configuration
- Amplify uses port **8080** by default for Node.js apps
- Update `web-app.js` to use `process.env.PORT || 3000`
- Or set `PORT=8080` in environment variables

### Cron Jobs
- Node-cron will work in Amplify
- However, Amplify hosting may scale down during inactivity
- Consider using **AWS EventBridge** (CloudWatch Events) instead for scheduled tasks

## Monitoring and Logging

### View Logs
1. Go to Amplify Console
2. Select your app
3. Click **Monitoring** → **Logs**
4. View build logs and runtime logs

### CloudWatch Integration
Amplify automatically sends logs to CloudWatch:
```bash
aws logs tail /aws/amplify/swyftx-slam/production --follow
```

## Updating the Application

### Automatic Deployments
When you push to the connected Git branch, Amplify automatically:
1. Detects the change
2. Starts a new build
3. Deploys the new version
4. Routes traffic to the new deployment

### Manual Redeploy
In Amplify Console:
1. Go to your app
2. Click **"Redeploy this version"**
3. Confirm

## Rollback

### Via Amplify Console
1. Go to **App settings** → **Build history**
2. Find the previous successful build
3. Click **"Redeploy this version"**

### Via CLI
```bash
amplify publish --yes
```

## Troubleshooting

### Build Fails
- Check build logs in Amplify Console
- Verify `amplify.yml` syntax
- Ensure all dependencies are in `package.json`
- Check Node.js version compatibility

### App Not Starting
- Verify environment variables are set correctly
- Check that `PORT` environment variable is configured
- Review application logs in CloudWatch

### Database Connection Issues
- SQLite requires write access - ensure proper permissions
- Consider migrating to RDS for production use
- Check that database directory exists and is writable

### Slack Integration Not Working
- Verify all Slack tokens are correctly set in environment variables
- Check that Slack App has correct permissions
- Ensure WebSocket connections are not being blocked

## Cost Considerations

**AWS Amplify Pricing (ap-southeast-2):**
- Build minutes: First 1,000 minutes free, then $0.01/minute
- Hosting: First 15 GB served free, then $0.15/GB
- Storage: First 5 GB free, then $0.023/GB/month

**Estimated monthly cost for this app:**
- Build: ~100 minutes/month = ~$1
- Hosting: ~5 GB/month = Free
- Storage: <1 GB = Free
- **Total: ~$1-5/month**

Compare with current EKS deployment costs for better decision.

## Alternative: Keep Using EKS

If you prefer the current Kubernetes deployment:
- ✅ Better for stateful apps with SQLite
- ✅ Already configured and working
- ✅ More control over infrastructure
- ✅ PersistentVolumeClaim for database
- ❌ Higher complexity
- ❌ Higher cost

**Recommendation**: Use Amplify for simpler deployment, or migrate to PostgreSQL first.

## Next Steps

1. ✅ Created `amplify.yml` configuration file
2. ⬜ Deploy via Amplify Console
3. ⬜ Configure environment variables
4. ⬜ Test Slack integration
5. ⬜ Set up custom domain (optional)
6. ⬜ Configure CloudWatch alarms for monitoring

## Support

For issues or questions:
- AWS Amplify Documentation: https://docs.amplify.aws/
- AWS Support: Available in your AWS Console
- Amplify Discord: https://discord.gg/amplify
