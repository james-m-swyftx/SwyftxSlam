# 🚀 Deployment Guide for The Swyftx Slam

This guide walks you through deploying your Ping Pong competition bot to production.

## 📋 Pre-Deployment Checklist

- [ ] Code pushed to GitHub repository
- [ ] Slack App created at https://api.slack.com/apps
- [ ] Slack App configured with proper scopes and commands
- [ ] Hosting platform account (Render.com or Railway.app)
- [ ] Results channel created in Slack workspace

## 🔐 Step 1: Configure Your Slack App

### Create Slack App

1. Go to https://api.slack.com/apps
2. Click **"Create New App"** → **"From scratch"**
3. Name: "The Swyftx Slam"
4. Select your workspace

### OAuth & Permissions

Navigate to **OAuth & Permissions** and add these **Bot Token Scopes**:

- `chat:write` - Post messages
- `chat:write.public` - Post to public channels
- `commands` - Use slash commands
- `im:write` - Send direct messages
- `users:read` - Read user information

### Slash Commands

Navigate to **Slash Commands** and create:

#### Command 1: /leaderboard
- **Command**: `/leaderboard`
- **Request URL**: `https://your-app-url.com/slack/events` (update after deployment)
- **Short Description**: View the ping pong leaderboard
- **Usage Hint**: (leave blank)

#### Command 2: /report
- **Command**: `/report`
- **Request URL**: `https://your-app-url.com/slack/events` (update after deployment)
- **Short Description**: Report a match result
- **Usage Hint**: (leave blank)

### Interactivity & Shortcuts

1. Navigate to **Interactivity & Shortcuts**
2. Toggle **Interactivity** to **On**
3. **Request URL**: `https://your-app-url.com/slack/events` (update after deployment)

### Install App

1. Navigate to **Install App**
2. Click **"Install to Workspace"**
3. Authorize the app
4. Copy your **Bot User OAuth Token** (starts with `xoxb-`)

### Get Signing Secret

1. Navigate to **Basic Information**
2. Scroll to **App Credentials**
3. Copy your **Signing Secret**

## 🌐 Step 2: Deploy to Render.com

### Initial Setup

1. Go to https://render.com
2. Sign up or log in
3. Click **"New +"** → **"Web Service"**
4. Connect your GitHub repository

### Configure Web Service

**Basic Settings:**
- **Name**: `swyftx-slam`
- **Region**: Choose closest to your team
- **Branch**: `main`
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

**Instance Type:**
- Select **Free** tier (or higher for production)

### Environment Variables

Click **"Advanced"** and add these environment variables:

| Key | Value | Where to Get It |
|-----|-------|-----------------|
| `SLACK_BOT_TOKEN` | xoxb-your-token | Slack App → Install App |
| `SLACK_SIGNING_SECRET` | your-secret | Slack App → Basic Information |
| `PORT` | 3000 | (default) |
| `RESULTS_CHANNEL_ID` | C1234567890 | Right-click channel → Copy link (ID at end) |
| `CRON_SCHEDULE` | 0 9 * * 1 | (Monday 9 AM - adjust as needed) |
| `TZ` | Australia/Brisbane | Your timezone |

### Deploy

1. Click **"Create Web Service"**
2. Wait for deployment to complete (3-5 minutes)
3. Copy your app URL (e.g., `https://swyftx-slam.onrender.com`)

## 🔄 Step 3: Update Slack App URLs

Now that you have your deployment URL:

1. Go back to https://api.slack.com/apps → Your App
2. **Slash Commands** → Edit each command:
   - Update Request URL to: `https://your-app-url.onrender.com/slack/events`
3. **Interactivity & Shortcuts**:
   - Update Request URL to: `https://your-app-url.onrender.com/slack/events`
4. **Save all changes**

## ✅ Step 4: Test Your Deployment

### Test /leaderboard Command

1. In any Slack channel, type: `/leaderboard`
2. You should see a formatted leaderboard with 20 seed players

### Test /report Command

1. Type: `/report`
2. A modal should appear with dropdowns for winner/loser and score inputs
3. Submit a test match
4. Check your results channel for the trash talk message

### Test Cron Job (Optional)

To test the weekly pairing system without waiting until Monday:

1. SSH into Render or use Railway CLI
2. Run: `node -e "require('./app.js').generateWeeklyPairings()"`
3. Check that DMs were sent to the seed players

## 🎨 Step 5: Customize Branding

### Upload App Icon

1. Go to Slack App → **Basic Information**
2. Scroll to **Display Information**
3. Upload a custom icon (512x512 PNG)
   - Suggestion: Ping pong paddle with Swyftx logo
4. Set **Background Color** to match Swyftx brand

### Set App Description

- **Short Description**: "Ranked ping pong competition at the Swyftx Ping Pong Table"
- **Long Description**: Add more details about your tournament

## 🔧 Step 6: Production Readiness

### Enable Persistent Storage

Render.com Free tier resets files on each deploy. For production:

1. Upgrade to **Starter** plan
2. Add a **Persistent Disk** in Render dashboard
3. Mount point: `/app/data`
4. Update database path in `app.js`: `new Database('/app/data/swyftx-slam.db')`

### Set Up Monitoring

1. **Render Dashboard** → Your service → **Metrics**
2. Monitor CPU, memory, and response times
3. Set up alerts for downtime

### Health Checks

Add a health check endpoint to `app.js`:

```javascript
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date() });
});
```

Set in Render:
- **Health Check Path**: `/health`

## 🎯 Alternative: Deploy to Railway.app

### Quick Deploy

1. Go to https://railway.app
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository
4. Railway auto-detects Node.js

### Add Environment Variables

1. Click your service → **Variables**
2. Add all environment variables from above
3. Railway auto-generates a domain

### Update Slack URLs

Use your Railway domain (e.g., `https://swyftx-slam.up.railway.app/slack/events`)

## 🎊 You're Live!

Your bot is now running 24/7! Here's what happens automatically:

✅ **Every Monday at 9 AM**: Pairings generated and DMs sent
✅ **Anytime**: Players can use `/leaderboard` and `/report`
✅ **After each match**: Trash talk posted to results channel

## 📞 Troubleshooting

### Bot not responding to commands

- Check Render logs for errors
- Verify Slack URLs are correct
- Ensure bot is installed to workspace

### Cron job not firing

- Verify `TZ` environment variable
- Check Render logs at scheduled time
- Test manually with: `generateWeeklyPairings()`

### Database not persisting

- Render Free tier: Expected behavior
- Solution: Upgrade to Starter + add Persistent Disk

### DMs not sending

- Verify seed player `slack_id` values are actual Slack user IDs
- Bot needs `im:write` scope
- Update seed data with real user IDs

## 🔄 Updating Your App

```bash
# Make changes locally
git add .
git commit -m "Update feature"
git push origin main

# Render auto-deploys on push
# Check deployment status in dashboard
```

## 🎉 Next Steps

1. **Replace Seed Data**: Update player slack_ids with real user IDs
2. **Customize Tiers**: Adjust ELO thresholds in `elo.js`
3. **Add Stats**: Build `/stats` command for individual player stats
4. **Season System**: Add season resets and championships
5. **Leaderboard Channel**: Pin leaderboard to dedicated channel

---

**Need help?** Check the logs in Render dashboard or Railway CLI

**Happy Pinging! 🏓**
