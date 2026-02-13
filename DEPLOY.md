# 🚀 Deployment Guide

## Quick Deploy Options

### Option 1: Render.com (Easiest - 5 minutes)

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push
   ```

2. **Deploy on Render**
   - Go to [render.com](https://render.com) and sign up
   - Click "New +" → "Web Service"
   - Connect your GitHub account and select your repo
   - Settings:
     - **Name**: swyftx-slam
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
   - Add Environment Variable:
     - Key: `SESSION_SECRET`
     - Value: (any random string, like "my-secret-key-123")
   - Click "Create Web Service"

3. **Done!** Your app will be at `https://swyftx-slam.onrender.com`

**Note**: Free tier sleeps after 15 min inactivity. First visit takes ~30 seconds to wake up.

---

### Option 2: Railway.app (No Sleep)

1. **Push code to GitHub**

2. **Deploy on Railway**
   - Go to [railway.app](https://railway.app) and sign up
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Click the deployment → "Variables" tab
   - Add: `SESSION_SECRET` = "your-secret-here"
   - Railway auto-deploys!

3. **Done!** Railway gives you a URL like `https://swyftx-slam-production.up.railway.app`

**Free $5/month credit** - Good for ~500 hours

---

### Option 3: Fly.io (Most Professional)

1. **Install Fly CLI**
   ```bash
   brew install flyctl  # Mac
   # or visit fly.io/docs/hands-on/install-flyctl for other OS
   ```

2. **Login and Deploy**
   ```bash
   flyctl auth signup  # or flyctl auth login
   flyctl launch --no-deploy
   
   # Set your secret
   flyctl secrets set SESSION_SECRET=your-random-secret-here
   
   # Create persistent storage for database
   flyctl volumes create swyftx_data --size 1
   
   # Deploy!
   flyctl deploy
   ```

3. **Done!** Your app is at `https://swyftx-slam.fly.dev`

**Free tier**: 3 VMs, persistent storage included

---

## 🎮 After Deployment

Once deployed, share the URL with your team:
- Register accounts
- Matches automatically schedule Wed & Fri at 9 AM
- Everyone can track their ELO and compete!

## 💡 Pro Tips

1. **Custom Domain** (optional):
   - Buy domain on Namecheap (~$10/year)
   - Point to your Render/Railway/Fly URL
   - Example: `pingpong.yourcompany.com`

2. **Keep Free Tier Active**:
   - Render: Use a free uptime monitor like uptimerobot.com to ping your site every 5 minutes
   - This prevents sleeping on Render

3. **Database Backups**:
   - Download your database occasionally:
     ```bash
     flyctl ssh console
     cat /data/swyftx-slam.db > ~/backup.db
     ```

---

## ⚠️ Important: Set a Strong Secret

Before deploying, generate a strong session secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use that as your `SESSION_SECRET` environment variable.

---

**My Recommendation**: Start with **Render.com** - it's the easiest and completely free!
