# Email Configuration Guide

Step-by-step guide to set up Gmail email notifications for contact form submissions.

## Overview

The ChamaOS contact form automatically sends email notifications when someone submits a message from the landing page. These emails go to your support email address.

---

## How It Works

```
User submits contact form on landing page
            ↓
Message saved to database
            ↓
Email notification sent to admin
            ↓
Admin receives email about new contact
```

### What Gets Sent

**Email Subject:** `New Contact Form Message from [User Name]`

**Email Body:**

```
New Contact Form Submission

Name: John Doe
Email: john@example.com

Message:
Hello, I would like to know more about ChamaOS...

This message was sent from the ChamaOS contact form.
```

---

## Setup Instructions

### Step 1: Enable 2-Factor Authentication

Gmail requires 2FA to use app passwords.

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Click **Security** in the left menu
3. Scroll to **How you sign in to Google**
4. Click **2-Step Verification**
5. Follow the prompts (you'll need to verify your phone number)
6. Once enabled, you'll see "2-Step Verification is on"

### Step 2: Generate App Password

1. Go back to [myaccount.google.com/security](https://myaccount.google.com/security)
2. Scroll to **App passwords** (only appears if 2FA is enabled)
3. Select:
   - **App**: Mail
   - **Device**: Windows Computer (or your device type)
4. Click **Generate**
5. Gmail will show a 16-character password like: `abcd efgh ijkl mnop`
6. Copy this password (you'll need it next)

⚠️ **Important:** Save this password somewhere safe! Gmail only shows it once.

### Step 3: Update .env File

Edit your `.env` file and add:

```env
# Email Configuration (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
```

**Example:**

```env
EMAIL_USER=support.chamaos@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
```

⚠️ **Security Note:** Never commit `.env` to Git. It's already in `.gitignore`.

### Step 4: Start the Application

```bash
npm run dev
```

The server will test the email connection. Look for this in the console:

```
Server running on port 3002
Database connected successfully.
```

---

## Testing Email

### Manual Test

1. Visit [http://localhost:3002](http://localhost:3002)
2. Scroll to the "Contact Us" section
3. Fill in the form:
   - Name: Test User
   - Email: test@example.com
   - Message: This is a test message
4. Click "Send Message"
5. You should see: "Thank you for your message. We will get back to you soon!"

### Check Email

Within a few seconds, check your Gmail inbox:

- Look for an email from `support.chamaos@gmail.com` (or your configured EMAIL_USER)
- Subject should be: `New Contact Form Message from Test User`

### If Email Doesn't Arrive

1. Check **Spam** folder
2. Check Gmail notification settings
3. See **Troubleshooting** section below

---

## Database Storage

Emails are also stored in the database for backup:

```bash
mysql -u root -p chamaos
SELECT * FROM Contact_Messages;
exit
```

**Columns:**

- `message_id`: Unique identifier
- `contact_name`: Sender's name
- `contact_email`: Sender's email
- `message`: The message content
- `status`: 'new' (unread), can be updated to 'read', 'archived', etc.
- `created_at`: When message was received

---

## Email Features

### ✅ What Works

- Sends HTML formatted emails
- Includes sender name, email, and message
- Email marked with metadata showing it's from contact form
- Message stored in database for record-keeping
- Form still works even if email fails (graceful degradation)

### ⚠️ Current Limitations

- Emails sent to one address (can be extended to multiple)
- No email read receipt tracking
- No automatic replies to sender
- No email threading/replies from admin

### 🔄 Possible Enhancements

- Send auto-reply to sender
- Send to multiple admin addresses
- Admin dashboard to manage contact messages
- Email templates with logo
- SMS notifications as fallback

---

## Environment Variables

| Variable       | Example             | Notes                                     |
| -------------- | ------------------- | ----------------------------------------- |
| EMAIL_USER     | support@example.com | Gmail address for sending                 |
| EMAIL_PASSWORD | abcd efgh ijkl mnop | Gmail app password (not regular password) |

**Key Points:**

- `EMAIL_PASSWORD` is NOT your regular Gmail password
- It's a 16-character app-specific password
- You can revoke it anytime from Google Account settings
- Each device can have its own app password

---

## Troubleshooting

### Email Not Sending

**Problem:** Form submits but no email received

**Checklist:**

1. ✅ 2FA enabled on Gmail?
   - Go to [myaccount.google.com/security](https://myaccount.google.com/security)
   - Look for "2-Step Verification is on"

2. ✅ App password generated?
   - Should be 16 characters with spaces
   - Format: `abcd efgh ijkl mnop`

3. ✅ `.env` file correct?

   ```bash
   # Verify .env exists
   type .env
   ```

4. ✅ No typos in `.env`?
   - `EMAIL_USER` should be valid Gmail
   - `EMAIL_PASSWORD` should be the app password (not regular password)

5. ✅ Server restarted after .env change?
   ```bash
   # Stop: Ctrl+C
   npm run dev
   ```

**Check console logs:**

```
# If successful:
Contact form email sent: <message-id>

# If failed:
Email sending error: Error message here
```

### "Invalid Login" Error

**Problem:** `Error: Invalid login credentials`

**Solution:**

1. Verify 2FA is enabled on Gmail
2. Regenerate app password:
   - Go to [myaccount.google.com/security](https://myaccount.google.com/security)
   - Remove old app password
   - Generate new one
   - Update `.env`
3. Restart server

### "Authentication Failed" Error

**Problem:** `Error: Invalid credentials`

**Solution:**

1. Double-check EMAIL_PASSWORD has no extra spaces
2. Verify EMAIL_USER is correct Gmail address
3. Make sure app password is for "Mail" app
4. Try generating new app password

### Gmail Blocking Sign-In

**Problem:** Email doesn't send, Gmail blocks the attempt

**Gmail's safety check:**

- New app access is blocked by default
- Gmail sends security notification
- Click "Yes, this was me" in Gmail notification
- Then app password will work

**To approve the app:**

1. Google sends security alert email
2. Click the link or go to [myaccount.google.com/notifications](https://myaccount.google.com/notifications)
3. Look for "Didn't recognize an activity on your Google Account"
4. Click "Yes, it was me"
5. Allow the app

### Email Goes to Spam

**Problem:** Email received in Spam folder

**Solution:**

1. Mark email as "Not spam"
2. Update Gmail filters:
   - Go to [mail.google.com](https://mail.google.com)
   - Click Settings → Filters and Blocked Addresses
   - Create filter for sender to go to Inbox
3. Whitelist domain in your email client

### Form Says Success But No Email

**Problem:** Form submission successful (status 200) but email not received

**This is normal!** The app doesn't fail the form if email fails. Check:

1. Spam folder
2. Email sent within 5 seconds? (check timestamp)
3. Console logs on server for errors
4. Database to confirm message saved:
   ```bash
   mysql -u root -p chamaos
   SELECT * FROM Contact_Messages ORDER BY created_at DESC LIMIT 1;
   ```

---

## Security Considerations

### ✅ What's Secure

- App password is unique to this app (can revoke anytime)
- `.env` not committed to Git
- Email password never exposed in frontend
- Messages encrypted in transit (TLS/SSL)
- Database stores contact messages securely

### ⚠️ What to Watch

- Don't share `.env` file
- Don't commit `.env` to version control
- Rotate app password periodically
- Monitor Gmail account for unusual activity
- Consider using a dedicated Gmail account for app

### 🔒 Best Practices

```bash
# Verify .env is not tracked by Git
git status
# Should NOT show .env

# Double-check .gitignore includes .env
cat .gitignore
# Should have: .env

# Never expose in logs
# Never share app password in email/chat
# Rotate password yearly or if compromised
```

---

## Alternative Email Providers

Currently configured for **Gmail** only. To use other providers:

Edit `index.js`, find email configuration section:

```javascript
// Current Gmail setup
const emailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});
```

### Use Different Provider (Example: SendGrid)

```javascript
const emailTransporter = nodemailer.createTransport({
  host: "smtp.sendgrid.net",
  port: 587,
  auth: {
    user: "apikey",
    pass: process.env.SENDGRID_API_KEY,
  },
});
```

Then update `.env`:

```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxx
```

### Common Email Providers

- **Gmail**: service: "gmail"
- **Outlook**: service: "outlook"
- **SendGrid**: host: "smtp.sendgrid.net"
- **AWS SES**: host: "email-smtp.region.amazonaws.com"
- **Mailgun**: host: "smtp.mailgun.org"

---

## Testing Email in Development

### Quick Test Script

Add this temporarily to `index.js` for testing:

```javascript
// Test email connection
emailTransporter.verify((error, success) => {
  if (error) {
    console.log("❌ Email Error:", error);
  } else {
    console.log("✅ Email Ready:", success);
  }
});
```

### Full Email Test

```javascript
// Send test email
emailTransporter.sendMail(
  {
    from: "support@example.com",
    to: "your-email@gmail.com",
    subject: "Test Email",
    html: "<h1>Test</h1><p>This is a test email</p>",
  },
  (error, info) => {
    if (error) {
      console.log("❌ Email Error:", error);
    } else {
      console.log("✅ Email Sent:", info.response);
    }
  },
);
```

---

## Email Logs

The server logs all email activity:

```
✅ Contact form email sent: <message-id>
❌ Email sending error: Error description

Database: Contact_Messages table
```

To view logs in real-time:

```bash
# Start server with verbose logging
npm run dev
```

---

## Quick Reference

```bash
# 1. Generate Gmail app password
# Go to: https://myaccount.google.com/security → App passwords

# 2. Update .env
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASSWORD=abcd efgh ijkl mnop

# 3. Start server
npm run dev

# 4. Test contact form at
http://localhost:3002

# 5. Check email inbox (or spam folder)

# 6. View database records
mysql -u root -p chamaos
SELECT * FROM Contact_Messages;
```

---

Good luck with your email setup! 📧🚀
