# QBox Backend - Render Deployment Guide (100% FREE)

## Why Render?
- ✅ Completely FREE (no credit card required)
- ✅ Automatic deployments from GitHub
- ✅ Free SSL certificates
- ✅ Easy setup (no CLI needed)

## Deployment Steps

### 1. Sign Up for Render
Go to: **https://render.com** and sign up with your GitHub account

### 2. Push Your Code to GitHub (Already Done!)
Your backend is already on GitHub at:
`https://github.com/Pasiduchamod/QBox-Backend`

### 3. Create Web Service on Render

1. Click **"New +"** button → Select **"Web Service"**

2. Connect your GitHub repository:
   - Click **"Connect account"** if not already connected
   - Select repository: **QBox-Backend**

3. Configure your service:
   - **Name**: `qbox-backend` (or any name you prefer)
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Select **"Free"**

4. Add Environment Variables (click **"Advanced"**):
   ```
   MONGODB_URI = your_mongodb_atlas_connection_string
   JWT_SECRET = your_jwt_secret_key
   EMAIL_USER = your_gmail@gmail.com
   EMAIL_PASS = your_gmail_app_password
   NODE_ENV = production
   PORT = 10000
   ```

5. Click **"Create Web Service"**

### 4. Wait for Deployment
Render will automatically:
- Install dependencies
- Build your app
- Deploy it
- Give you a URL like: `https://qbox-backend.onrender.com`

This takes 2-5 minutes for the first deployment.

### 5. Test Your Backend
Once deployed, visit: `https://your-app-name.onrender.com`
You should see a response or error page (not "Cannot GET /")

Test the API: `https://your-app-name.onrender.com/api/auth/health`

## Get Your Environment Variables

Run this command to see your current `.env` file:
```bash
type .env
```

## After Deployment

1. Copy your Render URL (e.g., `https://qbox-backend.onrender.com`)
2. Update React Native app's `src/services/api.js`:
   ```javascript
   const API_URL = 'https://qbox-backend.onrender.com/api';
   const SOCKET_URL = 'https://qbox-backend.onrender.com';
   ```
3. Rebuild APK: `eas build --platform android --profile preview`

## Important Notes

⚠️ **Free Render services sleep after 15 minutes of inactivity**
- First request after sleep takes 30-60 seconds to wake up
- Subsequent requests are instant
- This is normal for free tier

💡 **To keep it awake** (optional):
- Upgrade to paid plan ($7/month)
- Or use a service like UptimeRobot to ping it every 10 minutes

## Troubleshooting

### View Logs:
Go to your service dashboard → Click **"Logs"** tab

### Redeploy:
Dashboard → Click **"Manual Deploy"** → Select branch → Deploy

### Update Environment Variables:
Dashboard → **"Environment"** tab → Add/Edit variables → Save Changes
(Service will automatically redeploy)
