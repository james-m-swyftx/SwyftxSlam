# 🏓 The Swyftx Slam

A ranked Ping Pong competition system built for Slack using ELO ratings and Swiss-System matchmaking.

## 📋 Features

- **ELO Rating System**: Players are ranked using the competitive ELO system (K=32)
- **Swiss-System Matchmaking**: Weekly pairings based on similar skill levels
- **Slack Integration**: Slash commands and interactive modals
- **Tier System**: Diamond, Gold, Silver, Bronze, and Iron tiers
- **Automated Scheduling**: Bot DMs players every Monday at 9 AM with pairings
- **Trash Talk**: Fun, automated match result announcements

## 🚀 Quick Start

### Prerequisites

- Node.js 24? or 22? 
- A Slack workspace with admin access - will have to check with Nelson!!!
- Slack Bot Token and Signing Secret - should be company policy, will apply a short lived test (maybe with website)

### Installation

1. **Clone and install dependencies:**

```bash
cd swyftx-slam
npm install
```

2. **Configure environment variables:**

```bash
cp .env.example .env
# Edit .env with your Slack credentials
```

3. **Initialize database:**

```bash
npm run start
# Database will auto-initialize with 20 seed players on first run
```

4. **Start the server:**

```bash
npm start
# Or for development:
npm run dev
```

## 🎮 Slack Commands

### `/leaderboard`
Displays the top 10 players with their ELO ratings, tiers, and win/loss records in a beautiful Block Kit table.

### `/report`
Opens an interactive modal to report match results:
- Select winner and loser from dropdowns
- Enter scores
- Automatically updates ELO ratings
- Posts trash talk to the results channel

## 🏗️ Architecture

### Files

- **`app.js`**: Main Slack Bolt application and server
- **`elo.js`**: ELO calculation utilities and Swiss pairing algorithm
- **`schema.sql`**: SQLite database schema
- **`package.json`**: Dependencies and scripts
- **`.env.example`**: Environment variable template

### Database Schema

- **`players`**: Player profiles with ELO ratings
- **`matches`**: Historical match records
- **`rounds`**: Weekly tournament rounds
- **`pairings`**: Weekly matchmaking assignments

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SLACK_BOT_TOKEN` | Bot User OAuth Token (xoxb-...) | Yes |
| `SLACK_SIGNING_SECRET` | App signing secret | Yes |
| `PORT` | Server port (default: 3000) | No |
| `RESULTS_CHANNEL_ID` | Channel ID for match results | Yes |
| `CRON_SCHEDULE` | Cron expression (default: Monday 9 AM) | No |

### Slack App Setup

1. Create a new Slack App at https://api.slack.com/apps
2. **OAuth & Permissions** → Add these Bot Token Scopes:
   - `chat:write`
   - `commands`
   - `im:write`
   - `users:read`
3. **Slash Commands** → Create:
   - `/leaderboard` → Request URL: `https://your-url.com/slack/events`
   - `/report` → Request URL: `https://your-url.com/slack/events`
4. **Interactivity & Shortcuts** → Enable and set Request URL: `https://your-url.com/slack/events`
5. Install the app to your workspace (might only need admin access here)

## 🌐 Deployment

### Render.com (Recommended)

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect your repository
4. Set environment variables
5. Deploy!

**Build Command:** `npm install`
**Start Command:** `npm start`

### Railway.app

1. Push code to GitHub
2. Create new project on Railway
3. Connect repository
4. Add environment variables
5. Deploy!

## 🎨 Tier System

| Tier | ELO Range | Emoji |
|------|-----------|-------|
| Diamond | 1600+ | 💎 |
| Gold | 1450-1599 | 🥇 |
| Silver | 1300-1449 | 🥈 |
| Bronze | 1150-1299 | 🥉 |
| Iron | <1150 | ⚪ |

## 📊 ELO System

- **Starting ELO**: 1200
- **K-Factor**: 32
- **Formula**: Standard ELO rating system used in chess and competitive games
- Expected score calculation: `1 / (1 + 10^((opponent_rating - player_rating) / 400))`

## 🤖 Automated Matchmaking

Every Monday at 9:00 AM (configurable):
1. Bot generates Swiss-System pairings based on current ELO
2. Players with similar ratings are matched
3. Each player receives a DM with their opponent and match details
4. Players schedule and play during the week
5. Results reported via `/report` command

## 📝 License

MIT License - feel free to use this for your own ping pong tournaments!

## 🏓 The Swyftx Ping Pong Table

All matches take place at the legendary Swyftx Ping Pong Table. May the best player win!

---

**Built with:** Slack Bolt SDK, SQLite, better-sqlite3, node-cron

**Created for:** The Swyftx Team 🚀
