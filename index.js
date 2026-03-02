import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: '.env'
});

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

let coverUrl = '';

let isLoggedIn = false;


// Home Route
app.get('/', async (_req, res) => {
  try {
    const authorResult = await db.query("SELECT * FROM book_authors");
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


app.get('/sort', async (req, res) => {
  const sort = (req.query.by || 'title').toString().toLowerCase();
  const order = req.query.order === 'desc' ? 'DESC' : 'ASC';

  let orderBy = 'book_name';
  if (sort === 'rating') {
    orderBy = 'rating';
  }

  try {
    const authorResult = await db.query("SELECT * FROM book_authors");
    const bookResult = await db.query(`SELECT * FROM books ORDER BY ${orderBy} ${order}`);
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



// Search route
app.get('/search', (_req, res) => {
  res.render('book.ejs');
});


// Search book route
app.post('/search', async (req, res) => {
  const searchBook = req.body.search_book.trim();
  const authorBook = req.body.search_author.trim();
  console.log(`Searching for book: ${searchBook}`);
  const result = await axios.get(process.env.BOOK_SEARCH_URL + `?q=${searchBook}&field=key`)
  console.log('Search result:', result.data.key);
});



// New book form route
app.get('/internal/dashboard/new', async (_req, res) => {
  try {
    const authorResult = await db.query("SELECT * FROM book_authors ORDER BY author_name ASC");
    res.render('new.ejs', {
      authors: authorResult.rows
    });
  } catch (err) {
    console.error('Error fetching authors:', err.stack);
    res.status(500).send('Error loading new book form');
  }
});



// Internal dashboard route
app.get('/internal/dashboard', async (_req, res) => {
  if (!isLoggedIn) {
    return res.redirect('/internal/dashboard/login');
  }
  res.render('internal-dashboard.ejs');
});



// Login form route
app.get('/internal/dashboard/login', async (_req, res) => {
  res.render('login.ejs');
});


// Login route
app.post('/internal/dashboard/login', async (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    isLoggedIn = true;
    res.redirect('/internal/dashboard');
  } else {
    res.status(401).send('Invalid credentials');
  }
});


// Add new book route
app.post('/internal/dashboard/new', async (req, res) => {
  const { book_name, author_name, new_author_name, date_read, rating, review } = req.body;

  const submittedAuthorName = author_name === '__new__' ? new_author_name : author_name;
  const normalizedAuthorName = submittedAuthorName?.trim();

  const normalizedBookName = book_name?.trim();

  if (!normalizedAuthorName) {
    return res.status(400).send('Author name is required');
  }

  const response = await axios.get(`${process.env.BOOK_SEARCH_URL}?title=${encodeURIComponent(normalizedBookName)}&author=${encodeURIComponent(submittedAuthorName)}&limit=1`);

  if (!response.data.docs.length) {
    return res.status(404).json({ error: "Book not found" });
  }

  let authorKey = response.data.docs[0].author_key ? response.data.docs[0].author_key[0] : null;
  console.log('Author key:', authorKey);

  if (response.data.docs[0].isbn && response.data.docs[0].isbn.length > 0) {
    coverUrl = `https://covers.openlibrary.org/b/isbn/${response.data.docs[0].isbn[0]}-L.jpg`;
  } else if (response.data.docs[0].cover_i) {
    coverUrl = `https://covers.openlibrary.org/b/id/${response.data.docs[0].cover_i}-L.jpg`;
  }

  let newAuthorId;

  try {
    if(await db.query("SELECT ol_author_key FROM book_authors WHERE ol_author_key = $1", [authorKey]).then(result => result.rowCount > 0)) {
      const existingAuthorResult = await db.query("SELECT author_id FROM book_authors WHERE ol_author_key = $1", [authorKey]);
      newAuthorId = existingAuthorResult.rows[0].author_id;
    } else {
      const insertAuthorResult = await db.query("INSERT INTO book_authors (author_name, ol_author_key) VALUES ($1, $2) RETURNING author_id", [normalizedAuthorName, authorKey]);
      newAuthorId = insertAuthorResult.rows[0].author_id;
    }
  } catch (err) {
    console.error('Error inserting author:', err.stack);
    return res.status(500).send('Error adding author');
  }

  try {
    const exisitingBooks = await db.query("SELECT book_name FROM books");
    if(exisitingBooks.rows.find(b => b.book_name.toLowerCase() === normalizedBookName.toLowerCase())) {
      console.log('Book already exists, skipping insertion');
    } else {
      await db.query(
        "INSERT INTO books (book_name, author_id, date_read, rating, cover_url, review) VALUES ($1, $2, $3, $4, $5, $6)",
        [normalizedBookName, newAuthorId, date_read || null, rating || null, coverUrl || null, review || null]
      );
    }
  } catch (err) {
    console.error('Error inserting book:', err.stack);
    return res.status(500).send('Error adding book');
  }
  
  res.redirect('/');
});


app.post('/internal/dashboard/logout', async (_req, res) => {
  isLoggedIn = false;
  res.redirect('/internal/dashboard/login');
});


// Listen to the server
app.listen(port, () => {
  console.log(`Server is running on port https://127.0.0.1:${port}`);
});
