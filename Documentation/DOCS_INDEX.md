# ChamaOS Documentation

Complete documentation for setup, configuration, and development.

## 📖 Documentation Files

### 1. **QUICK_START.md** ⚡ START HERE

- 5-minute setup guide
- Essential steps only
- Common tasks reference
- Perfect if you're in a hurry

### 2. **SETUP_GUIDE.md** 📋 COMPREHENSIVE

- Complete installation walkthrough
- Step-by-step instructions
- Database migration guide
- Email configuration
- Troubleshooting section
- Project structure overview

### 3. **MIGRATION_GUIDE.md** 🗃️ DATABASE MANAGEMENT

- Understanding migrations
- Migration file structure
- All available commands
- Creating new migrations
- Database schema reference
- Migration patterns
- Best practices
- Troubleshooting migrations

### 4. **EMAIL_SETUP_GUIDE.md** 📧 EMAIL CONFIGURATION

- Setting up Gmail
- Generating app passwords
- Testing email
- Troubleshooting
- Security considerations
- Alternative email providers

### 5. **README.md** 📚 PROJECT OVERVIEW

- Feature list
- Tech stack
- Project structure
- Role-based access
- License

---

## 🎯 Quick Navigation

### "I'm new and just want to get it working"

→ Go to **QUICK_START.md**

### "I need complete setup with all details"

→ Go to **SETUP_GUIDE.md**

### "I need to add/modify database tables"

→ Go to **MIGRATION_GUIDE.md**

### "I want email notifications working"

→ Go to **EMAIL_SETUP_GUIDE.md**

### "I want to understand the project"

→ Go to **README.md**

---

## 📋 Common Tasks

### First Time Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env file (see SETUP_GUIDE.md)
# 3. Run migrations
npm run migrate

# 4. Start development
npm run dev

# 5. Visit http://localhost:3002
```

### Create Database Migration

```bash
npm run migrate:create migration_name
# Edit migrations/sqls/TIMESTAMP-migration-name-up.sql
# Edit migrations/sqls/TIMESTAMP-migration-name-down.sql
npm run migrate
```

See **MIGRATION_GUIDE.md** for detailed examples.

### Set Up Email Notifications

1. Enable Gmail 2FA
2. Generate app password
3. Add to `.env` file
4. Restart server

See **EMAIL_SETUP_GUIDE.md** for step-by-step instructions.

### Deploy to Production

```bash
# 1. Update .env for production
# 2. Run migrations
npm run migrate

# 3. Start server
npm start
```

---

## 🛠️ Development Commands

```bash
# Install dependencies
npm install

# Run development (auto-reload)
npm run dev

# Run production
npm start

# Database migration
npm run migrate

# Undo migration
npm run migrate:down

# Create migration
npm run migrate:create name

# Check migration status
npx db-migrate check --config database.json --env dev
```

---

## 📁 Project Structure

```
ChamaOS/
├── QUICK_START.md              ← Start here!
├── SETUP_GUIDE.md              ← Complete setup
├── MIGRATION_GUIDE.md          ← Database migrations
├── EMAIL_SETUP_GUIDE.md        ← Email configuration
├── README.md                   ← Project info
├── .env                        ← Your configuration (secret)
├── index.js                    ← Main application
├── package.json                ← Dependencies
├── database.json               ← Migration config
├── db.sql                      ← Original schema
├── migrations/                 ← Database migrations
├── views/                      ← Web page templates
├── public/                     ← Images, CSS, uploads
└── node_modules/               ← Installed packages
```

---

## 🚀 Getting Help

### Step 1: Check the Docs

1. Check relevant documentation file above
2. Look for "Troubleshooting" section
3. Search for error message

### Step 2: Check Console Logs

```bash
npm run dev
# Look for error messages in console
```

### Step 3: Check Database

```bash
mysql -u root -p chamaos
SHOW TABLES;
SELECT * FROM Contact_Messages;
```

### Step 4: Check Migration Status

```bash
npx db-migrate check --config database.json --env dev
```

---

## ⚙️ Configuration

### Environment Variables (.env)

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=chamaos
DB_PORT=3306

# Email
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Session
SESSION_SECRET=your-secret-key
```

See **SETUP_GUIDE.md** for detailed explanations.

---

## 🔐 Security

- ✅ Never commit `.env` to Git (it's in `.gitignore`)
- ✅ Use app passwords for Gmail, not regular passwords
- ✅ Rotate passwords periodically
- ✅ Keep dependencies updated: `npm audit fix`
- ✅ Use HTTPS in production

---

## 📊 Database Schema

### 14 Tables

1. Users
2. Chama (savings groups)
3. Chama_Members
4. Transactions
5. Loans
6. Meetings
7. Meeting_Attendance
8. Meeting_Attachments
9. Announcements
10. Group_Documents
11. Member_Reminder_Preferences
12. Disciplinary_Records
13. Welfare_Requests
14. Contact_Messages

See **MIGRATION_GUIDE.md** for full details on each table.

---

## 🎓 Learning Path

1. **Read QUICK_START.md** (5 min)
   - Get app running

2. **Read SETUP_GUIDE.md** (15 min)
   - Understand full setup

3. **Read MIGRATION_GUIDE.md** (15 min)
   - Learn database management

4. **Read EMAIL_SETUP_GUIDE.md** (10 min)
   - Configure email

5. **Start developing!** 🚀

---

## 📝 Changelog

### Initial Setup (v1.0.0)

- Database migrations system
- Email notifications
- Complete documentation
- 14 database tables
- Role-based access

---

## 🤝 Contributing

When adding new features:

1. Create a migration for schema changes
2. Update documentation
3. Test locally with `npm run dev`
4. Run all migrations: `npm run migrate`
5. Test rollback: `npm run migrate:down` → `npm run migrate`

---

## 📞 Support

For detailed help on specific topics:

| Topic          | File                 |
| -------------- | -------------------- |
| Quick Setup    | QUICK_START.md       |
| Complete Setup | SETUP_GUIDE.md       |
| Migrations     | MIGRATION_GUIDE.md   |
| Email          | EMAIL_SETUP_GUIDE.md |
| Overview       | README.md            |

---

## ✅ Pre-Launch Checklist

- [ ] Node.js 18+ installed
- [ ] MySQL running
- [ ] Dependencies installed: `npm install`
- [ ] `.env` file created with correct values
- [ ] Migrations run: `npm run migrate`
- [ ] Email configured (optional)
- [ ] Server starts: `npm run dev`
- [ ] Can access http://localhost:3002

---

## 🎉 Ready to Go!

You now have:

- ✅ Complete documentation
- ✅ Database migration system
- ✅ Email notifications
- ✅ Development environment setup
- ✅ Troubleshooting guides

**Next Step:** Choose your starting point above and dive in! 🚀

---

**Last Updated:** May 2, 2026
