# 🚀 SendGrid Quick Setup - FlashSpace

## ⚡ Super Quick Setup (5 minutes)

### 1️⃣ Create Account
- Go to: https://sendgrid.com/free
- Sign up with your email
- Verify email

### 2️⃣ Verify Sender Email
- Dashboard → Settings → **Sender Authentication**
- Click **Single Sender Verification**
- Add: `team@flashspace.co`
- Verify the email sent to team@flashspace.co

### 3️⃣ Get API Key
- Settings → **API Keys**
- Create API Key → **Full Access**
- Copy the key (starts with `SG.`)

### 4️⃣ Update .env
```bash
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.paste-your-key-here
EMAIL_FROM=team@flashspace.co
```

### 5️⃣ Test It
```bash
npm run test:email
```

✅ **Done! Emails will now work perfectly!** 🎉

---

## 📧 What's Configured

Your authentication system now sends:

1. **✅ Verification Email** - After signup
2. **🔒 Password Reset Email** - When user forgets password  
3. **🎉 Welcome Email** - After email verification

---

## 🔗 Quick Links

- **Dashboard:** https://app.sendgrid.com
- **Activity Feed:** https://app.sendgrid.com/email_activity
- **Full Guide:** See `SENDGRID_SETUP.md`

---

## ⚠️ Important

**Before sending emails:**
- ✅ Verify sender email (`team@flashspace.co`)
- ✅ Use correct API key (Full Access)
- ✅ Test with `npm run test:email`

---

## 🆘 Having Issues?

**Email not sending?**
1. Check SendGrid Activity Feed
2. Ensure sender email is verified
3. Check API key has Full Access
4. Look for errors in console

**Still stuck?**
- See detailed guide: `SENDGRID_SETUP.md`
- Check SendGrid docs: https://docs.sendgrid.com

---

Happy emailing! 📧✨
