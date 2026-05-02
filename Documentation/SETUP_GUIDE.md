# ChamaOS Setup & Configuration Guide

Complete step-by-step guide to set up and run the ChamaOS application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Database Setup](#database-setup)
4. [Email Configuration](#email-configuration)
5. [Running the Application](#running-the-application)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **MySQL Server** (v5.7 or higher) - [Download](https://dev.mysql.com/downloads/mysql/)
- **Git** (optional) - [Download](https://git-scm.com/)

### Verify Installations

```bash
node --version
npm --version
mysql --version
```

---

## Installation

### Step 1: Clone or Extract Project

```bash
cd your-projects-folder
git clone https://github.com/mercy-5120/ChamaOS.git
cd ChamaOS
```

Or if you already have the project folder:

```bash
cd d:\EldoHubProjects\ChamaOS
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs all required packages:

- express (web framework)
- mysql2 (database driver)
- bcrypt (password hashing)
- nodemailer (email sending)
- db-migrate (database migrations)
- dotenv (environment variables)

---

## Database Setup

### Step 1: Start MySQL Server

**Windows:**

```bash
# MySQL typically runs as a service - verify it's running:
# Services app → look for "MySQL80" or similar
```

**Verify MySQL is running:**

```bash
mysql -u root -p
# Enter your password
# If successful, you'll see: mysql>
# Type: exit
```

### Step 2: Configure Environment Variables

Create a `.env` file in the project root:

```bash
# File: .env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sonnie2006.
DB_NAME=chamaos
DB_PORT=3306
```

Replace `sonnie2006.` with your MySQL root password.

### Step 3: Run Database Migrations

The migration system automatically creates all required tables:

```bash
# Apply all pending migrations
npm run migrate
```

**Expected output:**

```
[INFO] Defaulting to running 1 up migration.
[INFO] Executing migration: 20260502181123-initial-schema
[INFO] Executing migration: 20260502181343-add-user-profile-fields
[INFO] Done
```

### Step 4: Verify Database Setup

Connect to MySQL and check tables:

```bash
mysql -u root -p chamaos
# Enter password

# View all tables:
SHOW TABLES;

# Exit MySQL:
exit
```

You should see these 14 tables:

- Announcements
- Chama
- Chama_Members
- Contact_Messages
- Disciplinary_Records
- Group_Documents
- Loans
- Meeting_Attachments
- Meeting_Attendance
- Meetings
- Member_Reminder_Preferences
- Transactions
- Users
- Welfare_Requests

---

## Email Configuration

The contact form sends email notifications. To enable this:

### Step 1: Set Up Gmail Account

1. Go to [myaccount.google.com/security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** (if not already enabled)
3. Go to **App passwords**
4. Select "Mail" as the app
5. Select "Windows Computer" as the device
6. Google will generate a 16-character password

### Step 2: Update .env File

Add the Gmail credentials to your `.env` file:

```env
# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
```

Example:

```env
EMAIL_USER=support.chamaos@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
```

### Step 3: Test Email Configuration

The app will automatically test the email connection when you start it. Check the console logs for confirmation.

---

## Running the Application

### Option 1: Development Mode (with auto-reload)

```bash
npm run dev
```

This uses `node --watch` to automatically restart the server when you make code changes.

### Option 2: Production Mode

```bash
npm start
```

### Expected Startup Output

```
◇ injected env (X) from .env
Server running on port 3002
Database connected successfully.
```

### Access the Application

Open your browser and go to:

```
http://localhost:3002
```

---

## Database Migrations Reference

### Understanding Migrations

Migrations are version-controlled database changes that allow you to:

- Add/modify/delete tables
- Add/remove columns
- Create consistent schemas across environments

### Migration Files Structure

```
migrations/
├── 20260502181123-initial-schema.js          ← Migration file
└── sqls/
    ├── 20260502181123-initial-schema-up.sql   ← What to do (add tables)
    └── 20260502181123-initial-schema-down.sql ← How to undo (drop tables)
```

### Available Migration Commands

```bash
# View pending migrations
npx db-migrate check --config database.json --env dev

# Run all pending migrations
npm run migrate

# Rollback one migration
npm run migrate:down

# Create a new migration
npm run migrate:create your_migration_name

# Reset all migrations (⚠️ WARNING: Deletes all data)
npm run migrate:reset
```

### Creating a New Migration

**Example: Add a new field to Users table**

```bash
npm run migrate:create add_avatar_field_to_users
```

Edit the generated SQL files:

**File:** `migrations/sqls/YYYYMMDDHHMMSS-add-avatar-field-to-users-up.sql`

```sql
ALTER TABLE Users ADD COLUMN avatar_url VARCHAR(500);
```

**File:** `migrations/sqls/YYYYMMDDHHMMSS-add-avatar-field-to-users-down.sql`

```sql
ALTER TABLE Users DROP COLUMN avatar_url;
```

Apply the migration:

```bash
npm run migrate
```

---

## Troubleshooting

### Database Connection Error

**Error:** `Error: connect ECONNREFUSED 127.0.0.1:3306`

**Solution:**

1. Verify MySQL is running:
   ```bash
   mysql -u root -p
   ```
2. Check your `.env` file has correct credentials
3. Ensure DB_HOST is `localhost` or `127.0.0.1`

### Migration Failed

**Error:** `ERROR 1045 (28000): Access denied for user 'root'@'localhost'`

**Solution:**

1. Verify MySQL password in `.env` file is correct
2. Test MySQL connection:
   ```bash
   mysql -u root -p
   ```
3. Run migration with verbose output:
   ```bash
   npx db-migrate up --config database.json --env dev -v
   ```

### Port Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::3002`

**Solution:**

```bash
# Kill the process using port 3002 (Windows):
netstat -ano | findstr :3002
taskkill /PID <PID> /F

# Or use a different port by editing index.js
```

### Email Not Sending

**Problem:** Contact form submissions not sending emails

**Solution:**

1. Verify Gmail app password in `.env` is correct
2. Check browser console for error messages
3. Check server console logs for email errors
4. Verify 2FA is enabled on Gmail account
5. Test with a simple email:
   ```bash
   # Add this to index.js temporarily to test
   emailTransporter.verify((error, success) => {
     if (error) console.log('Email error:', error);
     else console.log('Email ready:', success);
   });
   ```

### Can't Access http://localhost:3002

**Solution:**

1. Check if server is running:
   ```bash
   npm run dev
   ```
2. Check console output for errors
3. Verify port 3002 is accessible
4. Try: `http://127.0.0.1:3002`

---

## Environment Variables Reference

| Variable       | Example             | Required | Notes                                     |
| -------------- | ------------------- | -------- | ----------------------------------------- |
| DB_HOST        | localhost           | Yes      | MySQL server hostname                     |
| DB_USER        | root                | Yes      | MySQL username                            |
| DB_PASSWORD    | password123         | Yes      | MySQL password                            |
| DB_NAME        | chamaos             | Yes      | Database name                             |
| DB_PORT        | 3306                | Yes      | MySQL port (default: 3306)                |
| EMAIL_USER     | support@example.com | Yes      | Gmail address for sending                 |
| EMAIL_PASSWORD | abcd efgh ijkl mnop | Yes      | Gmail app password (not regular password) |
| SESSION_SECRET | random-key-here     | No       | Session encryption key                    |

---

## Project Structure

```
ChamaOS/
├── index.js                      ← Main application file
├── package.json                  ← Dependencies & scripts
├── database.json                 ← Migration configuration
├── .env                          ← Environment variables (not in git)
├── .gitignore                    ← Git ignore rules
├── db.sql                        ← Original database schema
├── README.md                     ← Project overview
├── SETUP_GUIDE.md               ← This file
├── migrations/                   ← Database migrations
│   ├── 20260502181123-initial-schema.js
│   ├── 20260502181343-add-user-profile-fields.js
│   └── sqls/                     ← SQL migration files
├── public/                       ← Static files
│   ├── css/                      ← Stylesheets
│   ├── images/                   ← Images
│   └── uploads/                  ← File uploads
├── views/                        ← EJS templates
│   └── pages/                    ← Page templates
│       ├── user/                 ← Public pages
│       ├── member/               ← Member dashboard
│       ├── treasurer/            ← Treasurer dashboard
│       ├── secretary/            ← Secretary dashboard
│       ├── chairperson/          ← Chairperson dashboard
│       ├── admin/                ← Admin dashboard
│       └── partials/             ← Reusable components
└── node_modules/                ← Installed packages
```

---

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Create `.env` file with database credentials
3. ✅ Run migrations: `npm run migrate`
4. ✅ Configure Gmail for email notifications
5. ✅ Start development: `npm run dev`
6. ✅ Visit http://localhost:3002

---

## Getting Help

- Check the console logs for error messages
- Review the troubleshooting section above
- Check database migration status: `npx db-migrate check --config database.json --env dev`
- Test database connection: `mysql -u root -p chamaos`

Good luck! 🚀
