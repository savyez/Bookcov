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

let authors = [
  {
    author_id: 1,
    author_name: "George Orwell"
  },
  {
    author_id: 2,
    author_name: "J.K. Rowling"
  }
];

let books = [
  {
    book_id: 1,
    book_name: "1984",
    author_id: 1,
    date_read: "2025-12-10",
    rating: 9,
    cover_url: "https://example.com/1984.jpg"
  },
  {
    book_id: 2,
    book_name: "Harry Potter and the Philosopher's Stone",
    author_id: 2,
    date_read: "2026-01-05",
    rating: 10,
    cover_url: "https://example.com/hp1.jpg"
  }
];


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
  if (books.length === 0) {
    books.push({
      book_id: 0,
      book_name: "No books to display",
      author_id: 0,
      date_read: null,
      rating: 0,
      cover_url: null
    });
  }
  if (authors.length === 0) {
    authors.push({
      author_id: 0,
      author_name: "No authors to display"
    });
  }
  res.render('index.ejs', {
      authors: authors,
      books: books,
  });
});



// Listen to the server
app.listen(port, () => {
    console.log(`Server is running on port https://127.0.0.1:${port}`);
});