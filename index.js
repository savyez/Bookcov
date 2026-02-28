import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({path: '.env'});

const app = express();
const port = process.env.APP_PORT;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

db.connect()
    .then(() => console.log('Connected to the database'))
    .catch(err => console.error('Database connection error:', err.stack));

let authors = [];

let books = [];


// Home Route
app.get('/', async (_req, res) => {
  try {
    const authorResult = await db.query("SELECT * FROM authors");
    const bookResult = await db.query("SELECT * FROM books");
    authors = authorResult.rows;
    books = bookResult.rows;
  } catch (err) {
    console.error('Error fetching data from database:', err.stack);
  }
  res.render('index.ejs', {
      authors: authors,
      books: books,
  });
});

app.get('/new', async (_req, res) => {
  try {
    const authorResult = await db.query("SELECT * FROM authors ORDER BY author_name");
    res.render('new.ejs', {
      authors: authorResult.rows
    });
  } catch (err) {
    console.error('Error fetching authors:', err.stack);
    res.status(500).send('Error loading new book form');
  }
});


// Add new book route
app.post('/new', async (req, res) => {
  const { book_name, author_name, new_author_name, date_read, rating, cover_url, review } = req.body;
  const submittedAuthorName = author_name === '__new__' ? new_author_name : author_name;
  const normalizedAuthorName = submittedAuthorName?.trim();

  if (!normalizedAuthorName) {
    return res.status(400).send('Author name is required');
  }

  try {
    await db.query("BEGIN");

    const existingAuthor = await db.query(
      "SELECT author_id FROM authors WHERE LOWER(author_name) = LOWER($1) LIMIT 1",
      [normalizedAuthorName]
    );

    let resolvedAuthorId = existingAuthor.rows[0]?.author_id;

    if (!resolvedAuthorId) {
      const newAuthor = await db.query(
        "INSERT INTO authors (author_name) VALUES ($1) RETURNING author_id",
        [normalizedAuthorName]
      );
      resolvedAuthorId = newAuthor.rows[0].author_id;
    }

    await db.query(
      "INSERT INTO books (book_name, author_id, date_read, rating, cover_url, review) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [book_name, resolvedAuthorId, date_read, rating, cover_url || null, review || null]
    );

    await db.query("COMMIT");
    res.redirect('/');
  } catch (err) {
    await db.query("ROLLBACK");
    console.error('Error adding book:', err.stack);
    res.status(500).send('Error adding book');
  }
});


app.post('/search', async (req, res) => {
  const searchBook = req.body.search_book.trim();
  console.log(`Searching for book: ${searchBook}`);
  const result = await axios.get(process.env.BOOK_SEARCH_URL + `?title=${searchBook}`)
  console.log('Search result:', result.data);
});



// Listen to the server
app.listen(port, () => {
    console.log(`Server is running on port https://127.0.0.1:${port}`);
});
