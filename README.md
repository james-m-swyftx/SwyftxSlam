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

## Deployment to AWS Amplify

See **[AWS_AMPLIFY_DEPLOYMENT.md](AWS_AMPLIFY_DEPLOYMENT.md)** for complete deployment instructions.

### Quick Start

1. **Connect Repository to Amplify**
   - Go to AWS Amplify Console
   - Connect your Git repository
   - Select the branch to deploy

2. **Configure Environment Variables**
   ```bash
   SLACK_BOT_TOKEN=xoxb-your-token
   SLACK_SIGNING_SECRET=your-secret
   SLACK_APP_TOKEN=xapp-your-token
   RESULTS_CHANNEL_ID=C1234567890
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your-secure-password
   SESSION_SECRET=your-random-secret
   NODE_ENV=production
   ```

3. **Deploy**
   - Amplify will automatically build and deploy using `amplify.yml`
   - Access your app via the Amplify-provided URL

See `.env.example` for complete environment variable template.

### ⚠️ Important: Database is Ephemeral

**The SQLite database resets on each deployment.**

- Data is stored in `/tmp` (temporary storage)
- Perfect for **testing, demos, and development**
- For production with persistent data, consider adding external database support

## Local Development

```bash
# Install dependencies
npm install

# Copy .env.example to .env and configure
cp .env.example .env

# Add Slack credentials and admin details to .env

# Run locally
npm start

# Access at http://localhost:3000
```

## AWS Account

- **Account**: swyftx-app-playground (291389848510)
- **Email**: swyftx-playground-aws@swyftx.com.au
- **Region**: ap-southeast-2 (Sydney)

## Tech Stack

- **Backend**: Node.js 22.x, Express
- **Database**: SQLite (ephemeral)
- **Slack**: Bolt SDK with Socket Mode
- **Deployment**: AWS Amplify
- **Scheduling**: node-cron for weekly pairings

## Documentation

- **[AWS_AMPLIFY_DEPLOYMENT.md](AWS_AMPLIFY_DEPLOYMENT.md)** - Complete Amplify deployment guide
- **[.env.example](.env.example)** - Environment variables template
- **[CHANGELOG.md](CHANGELOG.md)** - Version history

## Project Structure

```
.
├── web-app.js          # Main Express application
├── elo.js              # ELO calculation and pairing logic
├── schema.sql          # Database schema
├── public/             # Static frontend assets
├── amplify.yml         # Amplify build configuration
└── .env.example        # Environment variables template
```

## License

MIT
