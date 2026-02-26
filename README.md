# BOOKCOV

BOOKCOV is an Express + EJS backend project for tracking books you have read, are reading, and want to read.

## Tech Stack

- Node.js (ES Modules)
- Express 5
- EJS templates
- PostgreSQL driver (`pg`)
- `dotenv` for environment config
- `body-parser`
- `axios`

## Database Schema

![BOOKCOV Database Schema](./db-schema.png)

## Prerequisites

- Node.js 18+
- npm
- PostgreSQL 14+ (for database integration)

## Environment Variables

Create a `.env` file in the project root:

```env
APP_PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_NAME=bookcov
```

## Install

```bash
npm install
```

## Run Locally

Start with Node:

```bash
node index.js
```

Or start with Nodemon:

```bash
npx nodemon index.js
```

Open:

```text
http://127.0.0.1:3000
```

## Current Routes

- `GET /` renders the books list page.

## Current App Behavior

- The home page renders data from in-memory arrays in `index.js` (`authors` and `books`).
- PostgreSQL env variables are configured, but database queries are not wired in yet.

## Project Structure

- `index.js` - Express app entry point
- `views/` - EJS templates
- `db-schema.png` - Database schema diagram
- `.env` - Local environment variables (do not commit secrets)

## Repository

- GitHub: <https://github.com/savyez/Bookcov>
