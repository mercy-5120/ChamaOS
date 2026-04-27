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

> Note: The current database connection parameters are defined in `index.js`:
>
> - host: `localhost`
> - port: `3306`
> - database: `chamaos`
> - user: `root`
> - password: `sonnie2006.`

Update these values in `index.js` before running the app in your own environment.

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
