# 🏓 The Swyftx Slam - Quick Reference

## 📁 Project Structure

```
swyftx-slam/
├── app.js              # Main Slack Bolt application
├── elo.js              # ELO calculations & Swiss pairing
├── schema.sql          # SQLite database schema
├── package.json        # Dependencies & scripts
├── .env.example        # Environment variable template
├── .gitignore          # Git ignore rules
├── README.md           # Full documentation
└── DEPLOYMENT.md       # Deployment guide
```

## 🚀 Quick Start Commands

```bash
# Install dependencies
npm install

# Start server (auto-initializes DB with 20 seed players)
npm start

# Development mode (auto-restart on changes)
npm run dev
```

## 🎮 Slack Commands

| Command | Description | Output |
|---------|-------------|--------|
| `/leaderboard` | View top 10 players | Block Kit table with ELO, tiers, records |
| `/report` | Report match result | Modal → Updates ELO → Posts trash talk |

## 🗄️ Database Tables

### `players`
- Stores: id, slack_id, name, elo_rating, wins, losses, tier
- Seeded with 20 players (Player 1 through Player 20)

### `matches`
- Records: winner_id, loser_id, scores, elo_change, timestamp

### `rounds`
- Tracks: weekly tournament rounds

### `pairings`
- Stores: weekly matchmaking assignments

## 📊 ELO System

- **Starting ELO**: 1200
- **K-Factor**: 32
- **Formula**: Standard competitive ELO
- **Rating Change**: ±8 to ±32 per match (based on rating difference)

## 🏆 Tier Breakdown

| Tier | ELO Range | Emoji |
|------|-----------|-------|
| 💎 Diamond | 1600+ | Top ~5 players |
| 🥇 Gold | 1450-1599 | Next ~5 players |
| 🥈 Silver | 1300-1449 | Middle players |
| 🥉 Bronze | 1150-1299 | Improving players |
| ⚪ Iron | <1150 | New/learning players |

## ⏰ Automated Features

**Every Monday at 9:00 AM** (configurable):
1. Swiss-System pairings generated
2. Players matched by similar ELO
3. DMs sent to all players with opponent info
4. Players schedule games throughout the week

## 🔧 Key Environment Variables

```bash
SLACK_BOT_TOKEN=xoxb-...          # Required: Bot OAuth token
SLACK_SIGNING_SECRET=...          # Required: App signing secret
RESULTS_CHANNEL_ID=C...           # Required: Channel for results
PORT=3000                         # Optional: Server port
CRON_SCHEDULE=0 9 * * 1          # Optional: Mon 9 AM
TZ=Australia/Brisbane             # Optional: Timezone
```

## 🎯 Swiss-System Pairing Algorithm

```javascript
// From elo.js
generateSwissPairings(players)
```

**How it works:**
1. Sort all players by ELO (highest to lowest)
2. Pair adjacent players (#1 vs #2, #3 vs #4, etc.)
3. Creates balanced, competitive matches
4. Prevents skill mismatches

## 💬 Trash Talk Messages

Auto-generated based on:
- **Score margin**: Close games vs blowouts
- **ELO change**: Upsets get special messages
- **Random selection**: 8 different message templates

Example outputs:
- `🏓 James absolutely DEMOLISHED Adam 11-3! (+28 ELO)`
- `🚀 UPSET ALERT! Player 15 shocked everyone by beating Player 2 11-9! (+31 ELO)`

## 🛠️ Useful Functions

### In `app.js`:
```javascript
initDatabase()              // Initialize & seed database
getLeaderboard(limit)       // Get top N players
getAllPlayers()             // Get all players for matchmaking
generateWeeklyPairings()    // Manual pairing generation
```

### In `elo.js`:
```javascript
calculateNewRatings(winner, loser)  // Calculate ELO changes
getTier(elo)                         // Get tier from ELO
generateSwissPairings(players)       // Generate matchups
generateTrashTalk(...)               // Create result message
```

## 🧪 Testing Locally

1. **Test Commands**:
   - Use ngrok to expose localhost to Slack
   - `ngrok http 3000`
   - Update Slack Request URLs to ngrok URL

2. **Test Cron Job**:
   ```bash
   node -e "require('./app.js').generateWeeklyPairings()"
   ```

3. **Test ELO Calculations**:
   ```bash
   node -e "console.log(require('./elo.js').calculateNewRatings(1400, 1200))"
   ```

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| `@slack/bolt` | Slack app framework |
| `better-sqlite3` | Fast SQLite database |
| `node-cron` | Schedule weekly pairings |
| `dotenv` | Environment variables |

## 🚨 Common Issues & Fixes

### Bot not responding
- ✅ Check Slack Request URLs match your deployment URL
- ✅ Verify bot is installed to workspace
- ✅ Check server logs for errors

### Database resets on deploy
- ✅ Render Free tier doesn't persist files
- ✅ Solution: Upgrade + add Persistent Disk
- ✅ Or use external database (PostgreSQL)

### DMs not sending
- ✅ Update seed data with real Slack user IDs
- ✅ Verify `im:write` scope is enabled
- ✅ Check bot has permission to DM users

### Cron not firing
- ✅ Set `TZ` environment variable
- ✅ Use correct cron syntax: `0 9 * * 1` = Mon 9 AM
- ✅ Test manually first

## 🎨 Customization Ideas

1. **Add Achievements**: "5-game win streak", "Giant Slayer" (beat higher ELO)
2. **Season System**: Reset ELO quarterly, crown champions
3. **Stats Commands**: `/stats @player` for individual stats
4. **Reminders**: DM players who haven't played their match
5. **Tournament Mode**: Single elimination brackets
6. **Handicap System**: Adjust scoring for skill gaps

## 🔐 Security Best Practices

- ✅ Never commit `.env` file
- ✅ Rotate tokens regularly
- ✅ Use environment variables for all secrets
- ✅ Enable Slack request verification (built-in with Bolt)
- ✅ Limit bot scopes to minimum required

## 📈 Scaling Considerations

**Current setup handles:**
- ✅ 20-50 players easily
- ✅ 100+ matches per week
- ✅ Multiple concurrent slash commands

**To scale beyond:**
- Upgrade to PostgreSQL for 100+ concurrent users
- Add Redis for caching leaderboard
- Implement database connection pooling
- Use job queue for DM sending

## 🎉 Go Live Checklist

- [ ] Code deployed to production
- [ ] Database initialized with real players
- [ ] Slack app configured with production URLs
- [ ] Test all slash commands
- [ ] Test modal submission
- [ ] Verify DMs send correctly
- [ ] Confirm cron schedule is correct for your timezone
- [ ] Announce to team!

---

**Need help?** Check `README.md` and `DEPLOYMENT.md` for full details.

**Let the games begin! 🏓**
