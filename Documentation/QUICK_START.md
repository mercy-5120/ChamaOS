# Quick Start Guide

Get ChamaOS running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- MySQL server running
- A Gmail account (for email notifications)

## 5-Minute Setup

### 1. Install Dependencies (1 min)

```bash
cd d:\EldoHubProjects\ChamaOS
npm install
```

### 2. Create .env File (1 min)

Create file `d:\EldoHubProjects\ChamaOS\.env`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sonnie2006.
DB_NAME=chamaos
DB_PORT=3306

EMAIL_USER=support.chamaos@gmail.com
EMAIL_PASSWORD=your-gmail-app-password

SESSION_SECRET=encryptionKey
```

**For EMAIL_PASSWORD:**

1. Go to [myaccount.google.com/security](https://myaccount.google.com/security)
2. Enable 2-Step Verification (if not already enabled)
3. Go to App passwords → Mail → Windows Computer
4. Copy the 16-character password into EMAIL_PASSWORD

### 3. Run Database Migrations (1 min)

```bash
npm run migrate
```

Expected output:

```
[INFO] Executing migration: 20260502181123-initial-schema
[INFO] Executing migration: 20260502181343-add-user-profile-fields
[INFO] Done
```

### 4. Start the App (1 min)

```bash
npm run dev
```

Expected output:

```
Server running on port 3002
Database connected successfully.
```

### 5. Access the App (1 min)

Open browser and go to:

```
http://localhost:3002
```

✅ **Done!** Your app is running!

---

## Common Tasks

### Run in Production

```bash
npm start
```

### Create New Migration

```bash
npm run migrate:create table_name
```

Edit the SQL files in `migrations/sqls/`, then:

```bash
npm run migrate
```

### Rollback Last Migration

```bash
npm run migrate:down
```

### Check Migration Status

```bash
npx db-migrate check --config database.json --env dev
```

### View Contact Messages

```bash
mysql -u root -p chamaos
SELECT * FROM Contact_Messages ORDER BY created_at DESC;
exit
```

---

## Troubleshooting

### Error: Database connection refused

**Fix:**

1. Check MySQL is running
2. Verify .env DB_PASSWORD is correct

```bash
mysql -u root -p
exit
```

### Error: Port 3002 in use

**Fix:**

```bash
# Kill the process
netstat -ano | findstr :3002
taskkill /PID <PID> /F
```

### Email not sending

**Fix:**

1. Verify EMAIL_USER and EMAIL_PASSWORD in .env
2. Restart server after .env changes
3. Check Gmail spam folder
4. Enable app access if blocked

---

## File Structure

```
ChamaOS/
├── index.js              ← Main app
├── .env                  ← Your secrets (not in git)
├── package.json          ← Dependencies
├── database.json         ← Migration config
├── migrations/           ← Database changes
├── views/                ← Web pages
├── public/               ← Images, CSS, files
└── SETUP_GUIDE.md       ← Full documentation
```

---

## Documentation Files

- **SETUP_GUIDE.md** - Complete setup with all details
- **MIGRATION_GUIDE.md** - Database migration reference
- **EMAIL_SETUP_GUIDE.md** - Email configuration details
- **README.md** - Project overview

---

## Next Steps

1. ✅ Create `.env` file
2. ✅ Run `npm run migrate`
3. ✅ Start with `npm run dev`
4. ✅ Test at http://localhost:3002
5. ✅ Read SETUP_GUIDE.md for detailed info

---

## Need Help?

- Check console for error messages
- See SETUP_GUIDE.md → Troubleshooting
- View migration status: `npx db-migrate check --config database.json --env dev`
- Test database: `mysql -u root -p chamaos`

---

Happy coding! 🚀
