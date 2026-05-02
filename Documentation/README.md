# ChamaOS

ChamaOS is an Express-based web application for managing a savings and credit cooperative (Chama) with role-based workflows for administrators, members, treasurers, secretaries, and chairpersons.

## Features

- Public landing pages: Home, Services, About, Privacy, Contact
- User sign-up, login, forgot password, and join workflows
- Role-based access control for:
  - `member`
  - `treasurer`
  - `secretary`
  - `chairperson`
- Member dashboard with contributions, loans, meetings, group details, and profile management
- Treasurer dashboard with contribution recording, loan management, member statements, and settings
- Secretary dashboard with meeting scheduling, attendance tracking, document uploads, communications, and member records
- Chairperson dashboard with member oversight, governance documents, meeting creation, reports, and welfare decisions
- File upload support for meeting attachments and governance documents
- MySQL database integration using `mysql2`
- Views rendered with `ejs`

## Tech Stack

- Node.js
- Express 5
- EJS
- MySQL
- bcrypt
- express-session
- multer

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MySQL server installed and running

### Install dependencies

```bash
npm install
```

### Database setup

1. Create a MySQL database named `chamaos`.
2. Apply the schema from `db.sql`.

#### Database Migrations

This project uses `db-migrate` for database version control. Migrations allow you to:

- Track database schema changes
- Roll back changes safely
- Maintain consistent schemas across environments

**Available migration commands:**

```bash
# Run all pending migrations
npm run migrate

# Rollback the last migration
npm run migrate:down

# Create a new migration file
npm run migrate:create migration_name

# Reset all migrations (drops all tables)
npm run migrate:reset
```

**Migration files are located in:**

- `migrations/` - Migration JavaScript files
- `migrations/sqls/` - SQL up/down files

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=chamaos
DB_PORT=3306

# Email Configuration (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password

# Session Secret
SESSION_SECRET=your-secure-session-secret
```

### Email Setup

The contact form sends email notifications to administrators. To set this up:

1. Use a Gmail account for sending emails
2. Enable 2-factor authentication on the Gmail account
3. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
4. Add the Gmail address and app password to your `.env` file

### Run the app

```bash
npm start
```

For automatic restarts during development:

```bash
npm run dev
```

The application listens on `http://localhost:3002`.

## Project Structure

- `index.js` – main Express application and route definitions
- `package.json` – project dependencies and scripts
- `db.sql` – database schema and setup
- `public/` – static assets, CSS, images, file uploads
- `views/` – EJS templates for public pages and role-specific dashboards

## Role-based Pages

- `/member/*`
- `/treasurer/*`
- `/secretary/*`
- `/chairperson/*`

## Notes

- There are no automated tests configured in this repository.
- Ensure the MySQL database is available before authenticating users.
- Static assets are served from the `public` folder.

## License

This project is licensed under the MIT License.
