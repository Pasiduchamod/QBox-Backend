# QBox Backend - Heroku Deployment Guide

## Prerequisites
- Heroku account (sign up at https://heroku.com)
- Heroku CLI installed

## Install Heroku CLI
Download and install from: https://devcenter.heroku.com/articles/heroku-cli

Or use npm:
```bash
npm install -g heroku
```

## Deployment Steps

### 1. Login to Heroku
```bash
heroku login
```

### 2. Create Heroku App
```bash
cd QBox-Backend
heroku create qbox-backend
```
(If name is taken, Heroku will suggest an alternative or you can choose another name)

### 3. Add MongoDB Atlas (Free)
Your app already uses MongoDB Atlas, so just set the connection string as environment variable.

### 4. Set Environment Variables
```bash
heroku config:set MONGODB_URI="your_mongodb_atlas_connection_string"
heroku config:set JWT_SECRET="your_jwt_secret_key"
heroku config:set EMAIL_USER="your_email@gmail.com"
heroku config:set EMAIL_PASS="your_gmail_app_password"
heroku config:set NODE_ENV="production"
```

### 5. Deploy to Heroku
```bash
git add .
git commit -m "Prepare for Heroku deployment"
git push heroku main
```

If you're on a different branch:
```bash
git push heroku your-branch:main
```

### 6. Open Your App
```bash
heroku open
```

Your backend will be available at: `https://your-app-name.herokuapp.com`

### 7. View Logs
```bash
heroku logs --tail
```

## Environment Variables Needed

Copy these from your local `.env` file:
- `MONGODB_URI` - Your MongoDB Atlas connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `EMAIL_USER` - Gmail address for sending emails
- `EMAIL_PASS` - Gmail app password
- `NODE_ENV` - Set to "production"

## After Deployment

Update your React Native app's API URL in `src/services/api.js`:
```javascript
const API_URL = 'https://your-app-name.herokuapp.com/api';
const SOCKET_URL = 'https://your-app-name.herokuapp.com';
```

Then rebuild your APK with the new production URL.

## Troubleshooting

### Check app status:
```bash
heroku ps
```

### Restart app:
```bash
heroku restart
```

### View environment variables:
```bash
heroku config
```

### Run commands on Heroku:
```bash
heroku run node
```
