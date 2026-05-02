# Database Migrations Guide

Comprehensive guide for managing database schema changes using db-migrate.

## What Are Migrations?

Migrations are version-controlled SQL scripts that safely manage database schema changes. They allow you to:

- **Track changes**: Every schema change is recorded with a timestamp
- **Collaborate**: Multiple developers can work on different migrations
- **Rollback**: Safely undo changes if something goes wrong
- **Consistency**: Keep schemas identical across dev/staging/production
- **Automation**: Run migrations as part of deployment process

---

## How Migrations Work

Each migration has two parts:

### UP (Forward)

Describes what to do when applying the migration:

- Create tables
- Add columns
- Modify constraints
- Insert data

### DOWN (Reverse)

Describes how to undo the changes:

- Drop tables
- Remove columns
- Restore previous structure

### Example

**Creating a new column:**

```sql
-- UP: Add the column
ALTER TABLE Users ADD COLUMN avatar_url VARCHAR(500);

-- DOWN: Remove the column
ALTER TABLE Users DROP COLUMN avatar_url;
```

---

## Migration Files Structure

```
migrations/
├── 20260502181123-initial-schema.js
├── 20260502181343-add-user-profile-fields.js
└── sqls/
    ├── 20260502181123-initial-schema-up.sql
    ├── 20260502181123-initial-schema-down.sql
    ├── 20260502181343-add-user-profile-fields-up.sql
    └── 20260502181343-add-user-profile-fields-down.sql
```

### Filename Format

```
YYYYMMDDHHMMSS-migration-name-{up|down}.sql
```

- **YYYYMMDDHHMMSS**: Timestamp ensures migrations run in order
- **migration-name**: Descriptive name for the change
- **{up|down}**: Direction of the migration

---

## Available Commands

### 1. Check Pending Migrations

View migrations that haven't been applied yet:

```bash
npx db-migrate check --config database.json --env dev
```

**Example Output:**

```
[INFO] Migrations to run: [
  '20260502181123-initial-schema',
  '20260502181343-add-user-profile-fields'
]
```

### 2. Run Migrations (Apply)

Apply all pending migrations:

```bash
npm run migrate
```

This is equivalent to:

```bash
npx db-migrate up --config database.json --env dev
```

**Example Output:**

```
[INFO] Executing migration: 20260502181123-initial-schema
[INFO] Executing migration: 20260502181343-add-user-profile-fields
[INFO] Done
```

### 3. Rollback (Undo)

Undo the last migration:

```bash
npm run migrate:down
```

This is equivalent to:

```bash
npx db-migrate down --config database.json --env dev
```

**Rollback specific number of migrations:**

```bash
npx db-migrate down:2 --config database.json --env dev
```

(Undoes the last 2 migrations)

### 4. Create New Migration

Generate a new migration file:

```bash
npm run migrate:create migration_name
```

Replace `migration_name` with a descriptive name using lowercase and hyphens:

```bash
# Good examples:
npm run migrate:create add_avatar_to_users
npm run migrate:create create_posts_table
npm run migrate:create add_indexes_for_performance
```

This creates:

```
migrations/
├── YYYYMMDDHHMMSS-add-avatar-to-users.js
└── sqls/
    ├── YYYYMMDDHHMMSS-add-avatar-to-users-up.sql
    └── YYYYMMDDHHMMSS-add-avatar-to-users-down.sql
```

### 5. Reset Database

⚠️ **WARNING: This deletes all data!**

```bash
npm run migrate:reset
```

Only use during development to completely reset:

```bash
# This will:
# 1. Undo all migrations (running DOWN scripts in reverse order)
# 2. Leave you with a clean database
```

### 6. Dry Run (Preview Changes)

See what SQL will be executed without actually running it:

```bash
npm run migrate -- --dry-run
```

Or:

```bash
npx db-migrate up --config database.json --env dev --dry-run
```

---

## Step-by-Step: Create a New Migration

### Scenario: Add an avatar field to Users table

#### Step 1: Create Migration File

```bash
npm run migrate:create add_avatar_to_users
```

Output:

```
[INFO] Created migration at D:\EldoHubProjects\ChamaOS\migrations\20260502182000-add-avatar-to-users.js
```

#### Step 2: Edit UP Migration

**File:** `migrations/sqls/20260502182000-add-avatar-to-users-up.sql`

```sql
-- Add avatar URL field to Users table
ALTER TABLE Users ADD COLUMN avatar_url VARCHAR(500);
ALTER TABLE Users ADD COLUMN avatar_uploaded_at TIMESTAMP NULL;
```

#### Step 3: Edit DOWN Migration

**File:** `migrations/sqls/20260502182000-add-avatar-to-users-down.sql`

```sql
-- Remove avatar fields from Users table
ALTER TABLE Users DROP COLUMN avatar_uploaded_at;
ALTER TABLE Users DROP COLUMN avatar_url;
```

#### Step 4: Verify Changes

Preview the SQL that will run:

```bash
npx db-migrate up --config database.json --env dev --dry-run
```

#### Step 5: Apply Migration

```bash
npm run migrate
```

Expected output:

```
[INFO] Executing migration: 20260502182000-add-avatar-to-users
[INFO] Done
```

#### Step 6: Verify in Database

```bash
mysql -u root -p chamaos
DESCRIBE Users;
# You should see the new avatar_url and avatar_uploaded_at columns
exit
```

---

## Database Schema Reference

### Current Tables (Initial Schema)

1. **Chama** - Savings groups
   - chama_id, chama_name, invite_code, description, meeting_day, contribution_amount, currency, created_at, is_active

2. **Users** - Platform users
   - user_id, phone_number, full_name, email, gender, location, password_hash, user_type, created_at
   - _Plus profile fields from migration 2: date_of_birth, occupation, emergency_contact_name, emergency_contact_phone_

3. **Chama_Members** - Group membership
   - member_id, user_id, chama_id, role, email, phone_number, joined_date, total_contributions

4. **Transactions** - Financial transactions
   - transaction_id, chama_id, user_id, transaction_type, amount, month, description, status, loan_id, created_at

5. **Loans** - Member loans
   - loan_id, chama_id, user_id, amount, interest_rate, issue_date, due_date, status, remaining_balance, approved_at, rejected_at

6. **Meetings** - Group meetings
   - meeting_id, chama_id, meeting_title, meeting_date, meeting_time, location, invite_scope, meeting_kind, agenda, decisions, created_at

7. **Meeting_Attendance** - Meeting attendance tracking
   - attendance_id, meeting_id, user_id, attended

8. **Meeting_Attachments** - Meeting files
   - attachment_id, meeting_id, file_name, file_path, uploaded_by, uploaded_at

9. **Announcements** - Group announcements
   - announcement_id, chama_id, posted_by, title, content, priority, created_at

10. **Group_Documents** - Governance documents
    - document_id, chama_id, title, document_type, content, file_path, uploaded_by, uploaded_at

11. **Member_Reminder_Preferences** - Notification settings
    - preference_id, chama_id, user_id, sms_enabled, email_enabled, updated_at

12. **Disciplinary_Records** - Member discipline
    - record_id, chama_id, reported_by, reported_member_id, subject, description, status, created_at

13. **Welfare_Requests** - Welfare fund requests
    - request_id, chama_id, requested_by, request_type, requested_amount, reason, status, reviewed_by, reviewed_at, created_at

14. **Contact_Messages** - Landing page contact form
    - message_id, contact_name, contact_email, message, status, created_at

---

## Common Migration Patterns

### Add a Column

```sql
-- UP
ALTER TABLE Users ADD COLUMN date_of_birth DATE;

-- DOWN
ALTER TABLE Users DROP COLUMN date_of_birth;
```

### Rename a Column

```sql
-- UP
ALTER TABLE Users CHANGE COLUMN full_name name VARCHAR(100);

-- DOWN
ALTER TABLE Users CHANGE COLUMN name full_name VARCHAR(100);
```

### Add a Foreign Key

```sql
-- UP
ALTER TABLE Orders ADD COLUMN user_id INT;
ALTER TABLE Orders ADD FOREIGN KEY (user_id) REFERENCES Users(user_id);

-- DOWN
ALTER TABLE Orders DROP FOREIGN KEY orders_ibfk_1;
ALTER TABLE Orders DROP COLUMN user_id;
```

### Create an Index

```sql
-- UP
ALTER TABLE Users ADD INDEX idx_email (email);

-- DOWN
ALTER TABLE Users DROP INDEX idx_email;
```

### Add Data

```sql
-- UP
INSERT INTO Announcements (chama_id, posted_by, title, content, priority)
VALUES (1, 1, 'Welcome', 'Welcome to ChamaOS', 'high');

-- DOWN
DELETE FROM Announcements WHERE title = 'Welcome';
```

---

## Best Practices

### 1. Descriptive Names

❌ Bad: `add_field`
✅ Good: `add_profile_picture_to_users`

### 2. One Change Per Migration

❌ Bad: Create table AND add column AND create index
✅ Good: Separate migrations for each logical change

### 3. Always Write DOWN

⚠️ Every UP needs a corresponding DOWN for safety

### 4. Test Locally First

```bash
# Test migration
npm run migrate

# Test rollback
npm run migrate:down

# Re-apply
npm run migrate
```

### 5. Use Meaningful Data

```sql
-- For rollback testing
-- UP: ALTER TABLE ...
-- DOWN: DELETE FROM ... (only if you're adding data)
```

### 6. Keep Migrations Simple

Avoid complex business logic. Stick to schema changes.

---

## Troubleshooting Migrations

### Migration Fails

**Problem:** Migration fails and gets stuck

**Solution:**

```bash
# Check status
npx db-migrate check --config database.json --env dev

# View detailed logs
npx db-migrate up --config database.json --env dev -v

# Check database for partial application
mysql -u root -p chamaos
SHOW TABLES;
```

### "Already Applied" Error

**Problem:** Migration says it's already applied

**Solution:**

```bash
# The migration table stores history
# You can't re-run the same migration
# You must create a new migration for any new changes
```

### Rollback Not Working

**Problem:** `npm run migrate:down` does nothing

**Solution:**

```bash
# Check if there's anything to roll back
npx db-migrate check --config database.json --env dev

# Make sure DOWN SQL is correct
cat migrations/sqls/YYYYMMDDHHMMSS-name-down.sql
```

### Foreign Key Constraint Error

**Problem:** `Error: Cannot add or update a child row`

**Solution:**

```bash
# In DOWN migration, drop foreign keys first
ALTER TABLE Orders DROP FOREIGN KEY orders_ibfk_1;
ALTER TABLE Orders DROP COLUMN user_id;

# In UP migration, add referenced table/data first
ALTER TABLE Orders ADD COLUMN user_id INT;
ALTER TABLE Orders ADD FOREIGN KEY (user_id) REFERENCES Users(user_id);
```

---

## Environment Variables

Migrations use these from `.env`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sonnie2006.
DB_NAME=chamaos
DB_PORT=3306
```

Update these values in your `.env` file for different environments (production, staging, etc).

---

## Migration History

View your migration status anytime:

```bash
npx db-migrate check --config database.json --env dev
```

The database keeps a `migrations_journal` table that records:

- Migration name
- Run date
- Run time

---

## Quick Reference

```bash
# Check status
npx db-migrate check --config database.json --env dev

# Apply migrations
npm run migrate

# Undo one migration
npm run migrate:down

# Create new migration
npm run migrate:create your_migration_name

# Reset database (deletes all data)
npm run migrate:reset

# Dry run (preview SQL)
npm run migrate -- --dry-run

# Verbose output (debugging)
npm run migrate -- -v
```

---

Good luck with your migrations! 🚀
