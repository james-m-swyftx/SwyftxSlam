# Changelog - AWS Amplify Deployment

## 2026-02-18 - Simplified for AWS Amplify (Ephemeral Database)

### Current Configuration
- ✅ SQLite database (ephemeral - resets on each deployment)
- ✅ AWS Amplify deployment ready
- ✅ Minimal dependencies
- ✅ Simple deployment process

### Database Behavior
⚠️ **Database is NOT persistent** - resets on every deployment
- Perfect for testing, demos, and development
- Data stored in `/tmp` directory (ephemeral)
- Fresh database on each deploy

### Added
- ✅ AWS Amplify deployment configuration (`amplify.yml`)
- ✅ Simplified documentation for Amplify
- ✅ Environment variables template (`.env.example`)
- ✅ Ephemeral database warning in logs

### Changed
- 🔄 Reverted to SQLite-only (removed PostgreSQL support)
- 🔄 Database path: `/tmp/swyftx-slam.db` (ephemeral)
- 🔄 Simplified README.md for Amplify deployment
- 🔄 Updated AWS_AMPLIFY_DEPLOYMENT.md with ephemeral database notice
- 🔄 All documentation focused on swyftx-app-playground account

### Removed
- ❌ PostgreSQL support (`pg` package)
- ❌ Database abstraction layer (`database.js`)
- ❌ PostgreSQL setup guide (`DATABASE_MIGRATION.md`)
- ❌ Database test script (`test-database.js`)
- ❌ `.buildkite/` (Kubernetes/Helm configs)
- ❌ `Dockerfile` and `docker-compose.yml`
- ❌ `DEPLOYMENT.md` (Kubernetes guide)

## Deployment Target

- **Platform**: AWS Amplify
- **Account**: swyftx-app-playground (291389848510)
- **Region**: ap-southeast-2 (Sydney)
- **Database**: SQLite (ephemeral, non-persistent)

## Benefits

- ✅ **Simple deployment** - No database setup required
- ✅ **Zero configuration** - Works out of the box
- ✅ **Cost effective** - ~$1-5/month
- ✅ **Fast setup** - Deploy in minutes
- ✅ **Perfect for testing/demos** - Fresh data on each deploy

## Trade-offs

- ⚠️ **Data loss** - Database resets on each deployment
- ⚠️ **Not for production** - Use only for testing/development
- ⚠️ **No persistence** - All data is ephemeral

## For Production Use

If you need persistent data:
- Add PostgreSQL/MySQL with AWS RDS
- Use DynamoDB for serverless persistence
- Use external database service

## Documentation

- `README.md` - Project overview
- `AWS_AMPLIFY_DEPLOYMENT.md` - Complete deployment guide
- `.env.example` - Environment variables template
- `CHANGELOG.md` - This file

## Tech Stack

- **Backend**: Node.js 22.x, Express
- **Database**: SQLite (ephemeral)
- **Slack**: Bolt SDK with Socket Mode
- **Deployment**: AWS Amplify
- **Scheduling**: node-cron
