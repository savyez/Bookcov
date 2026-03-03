# BOOKCOV

BOOKCOV is a Node.js + Express + EJS app to track books you read, discover new books from Open Library, and manage entries from an internal admin dashboard.

## Tech Stack

- Node.js (ES Modules)
- Express 5
- EJS
- PostgreSQL (`pg`)
- Axios
- dotenv
- body-parser

## Features

- Browse all books on the home page (`/`)
- Sort books by title or rating (`/sort`)
- View book details (`/book/:book_id`)
- Search books using Open Library (`/search`)
- Admin login and dashboard (`/internal/dashboard/*`)
- Add books (and optionally new authors) to PostgreSQL

## Prerequisites

- Node.js 18+
- npm
- PostgreSQL 14+

## Environment Variables

Create a `.env` file in the project root:

```env
APP_PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=bookcov

BOOK_SEARCH_URL=https://openlibrary.org/search.json
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_me
```

## Installation

```bash
npm install
```

## Run

```bash
node index.js
```

For auto-reload during development:

```bash
npx nodemon index.js
```

App URL:

```text
http://127.0.0.1:3000
```

## Routes

| Method | Route | Description |
| --- | --- | --- |
| GET | `/` | Home page with books list |
| GET | `/sort?by=title|rating&order=asc|desc` | Sorted books list |
| GET | `/book/:book_id` | Book detail page |
| GET | `/search` | Search form |
| POST | `/search` | Search Open Library and render result |
| GET | `/internal/dashboard/login` | Admin login page |
| POST | `/internal/dashboard/login` | Admin login submit |
| GET | `/internal/dashboard` | Admin dashboard (requires login) |
| GET | `/internal/dashboard/new` | New book form (requires login) |
| POST | `/internal/dashboard/new` | Insert new book/author |
| POST | `/internal/dashboard/logout` | Logout admin session |

## Project Structure

- `index.js` - Express app and routes
- `views/` - EJS templates
- `public/` - Static assets (CSS/images)
- `db-schema.png` - Database schema diagram
- `.env` - Local configuration

## Notes

- Login state is currently stored in a global variable (`isLoggedIn`), not in per-user sessions.
- `coverUrl` is also a shared global variable; concurrent requests can overwrite it.
- No test suite is currently configured.

## Database Schema

![BOOKCOV Database Schema](./db-schema.png)

## Repository

- GitHub: <https://github.com/savyez/Bookcov>
