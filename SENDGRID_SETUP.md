# 📧 SendGrid Setup Guide for FlashSpace

## ✅ Why SendGrid?
- ✨ Simple API key authentication (no complex app passwords)
- 🎯 Works with custom domain emails (team@flashspace.co)
- 🚀 Free tier: 100 emails/day
- 📊 Email analytics & tracking
- 💯 99% deliverability rate

---

## 🚀 Step-by-Step Setup

### Step 1: Create SendGrid Account
1. Visit: **https://sendgrid.com/free**
2. Click **"Start for Free"**
3. Fill in your details:
   - Email: `your-email@gmail.com`
   - Password: Create strong password
   - Complete signup

### Step 2: Verify Your Email
1. Check your inbox for verification email from SendGrid
2. Click **"Verify Your Account"**
3. Login to SendGrid Dashboard

### Step 3: Add Sender Email (IMPORTANT!)
1. Go to **Settings** → **Sender Authentication**
2. Click **"Get Started"** under Single Sender Verification
3. Click **"Create New Sender"**
4. Fill in the form:
   ```
   From Name: FlashSpace Team
   From Email Address: team@flashspace.co
   Reply To: team@flashspace.co
   Company Address: Your address
   City: Your city
   Country: India
   ```
5. Click **"Create"**
6. Check `team@flashspace.co` inbox for verification email
7. Click **"Verify Single Sender"**

### Step 4: Generate API Key
1. Go to **Settings** → **API Keys**
2. Click **"Create API Key"**
3. Enter name: `FlashSpace Production`
4. Select **"Full Access"**
5. Click **"Create & View"**
6. **IMPORTANT:** Copy the API key immediately (starts with `SG.`)
   ```
   Example: SG.1234567890abcdefghijklmnopqrstuvwxyz
   ```
7. Store it safely - you won't be able to see it again!

### Step 5: Update .env File
Open `.env` in flashspace-web-server and update:

```bash
# Email Configuration (SendGrid)
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.paste-your-api-key-here
EMAIL_FROM=team@flashspace.co
```

### Step 6: Test Email Configuration
```bash
npm run test:email
```

Expected output:
```
🧪 Testing email configuration...
📧 Service: sendgrid
📫 From: team@flashspace.co
✅ SendGrid email service initialized
📤 Sending test email...
✅ Email sent successfully via SendGrid
✅ Test email sent successfully!
📬 Check your inbox
```

---

## 🔧 Complete .env Configuration

```bash
# Database
DB_URI="mongodb+srv://flash-space:Stirring_minds@flashspace-database.l3kzod7.mongodb.net/"

# Server
PORT=5000
NODE_ENV=development

# Email (SendGrid)
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.your-actual-api-key-here
EMAIL_FROM=team@flashspace.co

# JWT (Generate strong secrets for production)
JWT_ACCESS_SECRET=your-super-secret-access-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Frontend
FRONTEND_URL=http://localhost:3000
```

---

## 📋 SendGrid Dashboard Features

### Email Activity
- **Settings** → **Activity Feed**
- See all sent emails, delivery status, opens, clicks

### Email Templates (Optional)
- Create reusable email templates
- Drag & drop email designer
- Dynamic content support

### Analytics
- Delivery rates
- Open rates
- Click rates
- Bounce reports

---

## 🧪 Testing Checklist

After setup, test these:

```bash
# 1. Test email connection
npm run test:email

# 2. Start server
npm run dev

# 3. Test signup endpoint (will send verification email)
POST http://localhost:5000/api/auth/signup
{
  "email": "test@example.com",
  "password": "Test@123",
  "confirmPassword": "Test@123",
  "fullName": "Test User"
}

# 4. Check SendGrid Activity Feed
# Go to: https://app.sendgrid.com/email_activity
```

---

## ⚠️ Important Notes

### Free Tier Limits
- ✅ 100 emails/day
- ✅ No credit card required
- ✅ Unlimited contacts
- ✅ 2,000 contacts storage

### Sender Verification
⚠️ **MUST verify sender email** before sending emails
- Unverified emails will be rejected
- Verification link sent to sender email
- Takes 1-2 minutes to verify

### API Key Security
🔒 **Keep API key secret!**
- Never commit to Git
- Use environment variables only
- Rotate keys periodically
- Create different keys for dev/prod

---

## 🆘 Troubleshooting

### Error: "The from address does not match a verified Sender Identity"
**Solution:** Verify your sender email in SendGrid dashboard
1. Settings → Sender Authentication
2. Verify the email address

### Error: "API key does not have permission"
**Solution:** Recreate API key with Full Access
1. Delete old key
2. Create new with Full Access permission

### Error: "Invalid API key"
**Solution:** 
1. Check for typos in .env
2. Ensure no extra spaces
3. API key should start with `SG.`

### Emails not arriving
**Check:**
1. Spam folder
2. SendGrid Activity Feed for delivery status
3. Sender email is verified
4. API key has Full Access

---

## 📧 Available Email Templates

Your authentication system includes:

### 1. Verification Email
- Sent after user signup
- Contains verification link
- Expires in 24 hours

### 2. Password Reset Email  
- Sent when user forgets password
- Contains reset link
- Expires in 1 hour

### 3. Welcome Email
- Sent after email verification
- Welcome message with feature highlights
- Call-to-action to explore platform

---

## 🎯 Production Checklist

Before going live:

- [ ] Verify sender email in SendGrid
- [ ] Generate production API key
- [ ] Set `NODE_ENV=production` in .env
- [ ] Use strong JWT secrets (not defaults)
- [ ] Set correct `FRONTEND_URL`
- [ ] Test all email flows
- [ ] Monitor SendGrid Activity Feed
- [ ] Set up custom domain (optional)

---

## 🔗 Useful Links

- **SendGrid Dashboard:** https://app.sendgrid.com
- **API Documentation:** https://docs.sendgrid.com
- **Support:** https://support.sendgrid.com
- **Status Page:** https://status.sendgrid.com

---

## ✅ You're All Set!

Once configured, your authentication emails will be sent beautifully through SendGrid with professional deliverability! 🚀

For any issues, check the SendGrid Activity Feed to see delivery status and error messages.
