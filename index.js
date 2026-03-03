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


// Utility function to clean up book descriptions by removing markdown links and extra whitespace
function cleanDescription(text) {
  return text
    .replace(/\[[^\]]*\]\[\d+\]/g, "")     // Remove markdown reference-style links like [text][1]

    .replace(/\[\d+\]:\s*https?:\/\/\S+/g, "")     // Remove reference definitions like [1]: https://...

    .replace(/\(\s*\)/g, "")     // Remove empty parentheses left behind

    .replace(/See also:[\s\S]*/i, "")     // Remove "See also:" section entirely

    .replace(/-{5,}/g, "")    // Remove horizontal separators

    .replace(/^\s*-\s*$/gm, "")    // Remove stray bullet lines

    .replace(/\n\s*\n/g, "\n\n")    // Clean excessive blank lines

    .trim();
}


// Home Route
app.get('/', async (_req, res) => {
  try {
    const authorResult = await db.query("SELECT * FROM book_authors");
    const bookResult = await db.query("SELECT * FROM books ORDER BY date_read DESC");
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


// book details route
app.get('/book/:book_id', async (req, res) => {
  const bookId = req.params.book_id;
  try {
    const bookResult = await db.query("SELECT * FROM books WHERE book_id = $1", [bookId]);
    if (bookResult.rowCount === 0) {
      return res.status(404).send('Book not found');
    }
    const book = bookResult.rows[0];
    const authorResult = await db.query("SELECT * FROM books JOIN book_authors ON books.author_id = book_authors.author_id WHERE book_id = $1", [bookId]);
    const authorName = authorResult.rows[0].author_name;
    const bookName = authorResult.rows[0].book_name;
    
    res.render('book.ejs', {
      book: book,
      authorName: authorName,
      bookName: bookName
    });
  } catch (err) {
    console.error('Error fetching book details:', err.stack);
    res.status(500).send('Error fetching book details');
  }
})


// Search route
app.get('/search', (_req, res) => {
  res.render('search.ejs');
});


// Search book route
app.post('/search', async (req, res) => {
  const searchBook = req.body.search_book.trim();
  const authorBook = req.body.search_author.trim();

  const searchResponse = await axios.get(process.env.BOOK_SEARCH_URL + `?title=${encodeURIComponent(searchBook)}&author=${encodeURIComponent(authorBook)}&limit=1`);
  const searchResult = searchResponse.data.docs;

  if (searchResult.length === 0) {
    return res.status(404).send('No results found');
  } else {
    const book = searchResult[0];
    const bookTitle = book.title || 'Unknown Title';
    const authorName = book.author_name ? book.author_name[0] : 'Unknown Author';
    const coverId = book.cover_i;
    const coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;
    const readingUrl = `https://openlibrary.org${book.key}`;

    const description = await axios.get(readingUrl+ '.json')
      .then(response => response.data.description)
      .catch(err => {
        console.error('Error fetching book description:', err.stack);
        return 'No description available';
      });

      const bookDescription =
        typeof description === 'string'
          ? cleanDescription(description)
          : (typeof description?.value === 'string'
              ? cleanDescription(description.value)
              : 'No description available');

    res.render('search.ejs', {
      searchBook: searchBook,
      searchAuthor: authorBook,
      bookTitle: bookTitle,
      authorName: authorName,
      coverUrl: coverUrl,
      readingUrl: readingUrl,
      bookDescription: bookDescription,
    });
  }
});


/*----------------------------------------ADMIN SECTION---------------------------------------------*/


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
  const { book_name, author_name, new_author_name, date_read, rating, shortnote, description } = req.body;

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
        "INSERT INTO books (book_name, author_id, date_read, rating, cover_url, shortnote, description) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [normalizedBookName, newAuthorId, date_read || null, rating || null, coverUrl || null, shortnote || null, description || null]
      );
    }
  } catch (err) {
    console.error('Error inserting book:', err.stack);
    return res.status(500).send('Error adding book');
  }
  
  res.redirect('/');
});


app.get('/internal/dashboard/manage', async (_req, res) => {
  if (!isLoggedIn) {
    return res.redirect('/internal/dashboard/login');
  }
  try {
    const bookResult = await db.query("SELECT * FROM books ORDER BY date_read DESC");
    const authorResult = await db.query("SELECT * FROM book_authors");
    res.render('manage.ejs', {
      books: bookResult.rows,
      authors: authorResult.rows
    });
  } catch (err) {
    console.error('Error fetching books or authors:', err.stack);
    res.status(500).send('Error fetching data');
  }
});

app.get('/internal/dashboard/edit/:book_id', async (req, res) => {
  if (!isLoggedIn) {
    return res.redirect('/internal/dashboard/login');
  }

  const book_id = parseInt(req.params.book_id, 10);
  if (!Number.isInteger(book_id)) {
    return res.status(400).send('Invalid book id');
  }

  try {
    const bookResult = await db.query('SELECT * FROM books WHERE book_id = $1', [book_id]);
    if (bookResult.rowCount === 0) {
      return res.status(404).send('Book not found');
    }

    const authorResult = await db.query('SELECT * FROM book_authors ORDER BY author_name ASC');
    return res.render('edit.ejs', {
      book: bookResult.rows[0],
      authors: authorResult.rows
    });
  } catch (err) {
    console.error('Error loading edit form:', err.stack);
    return res.status(500).send('Error loading edit form');
  }
});

app.post('/internal/dashboard/edit/:book_id', async (req, res) => {
  const book_id = parseInt(req.params.book_id, 10);
  const { book_name, author_id, date_read, rating, shortnote, description } = req.body;
  const trimmedBookName = (book_name || '').trim();

  if (!Number.isInteger(book_id)) {
    return res.status(400).send('Invalid book id');
  }

  if (!trimmedBookName) {
    return res.status(400).send('Book name cannot be empty');
  }

  try {
    await db.query(
      "UPDATE books SET book_name = $1, author_id = $2, date_read = $3, rating = $4, shortnote = $5, description = $6 WHERE book_id = $7",
      [trimmedBookName, author_id, date_read || null, rating || null, shortnote || null, description || null, book_id]
    );
    res.redirect('/internal/dashboard/manage');
  } catch (err) {
    console.error('Error updating book:', err.stack);
    res.status(500).send('Error updating book');
  }
});

app.post('/internal/dashboard/delete/:book_id', async (req, res) => {
  const book_id = parseInt(req.params.book_id);
  try {
    await db.query("DELETE FROM books WHERE book_id = $1", [book_id]);
    res.redirect('/internal/dashboard/manage');
  } catch (err) {
    console.error('Error deleting book:', err.stack);
    res.status(500).send('Error deleting book');
  }
});

app.post('/internal/dashboard/logout', async (_req, res) => {
  isLoggedIn = false;
  res.redirect('/internal/dashboard/login');
});


// Listen to the server
app.listen(port, () => {
  console.log(`Server is running on port https://127.0.0.1:${port}`);
});
