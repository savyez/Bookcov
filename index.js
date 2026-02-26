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

const authors = [
  {
    author_id: 1,
    author_name: "George Orwell"
  },
  {
    author_id: 2,
    author_name: "J.K. Rowling"
  }
];

const books = [
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
    res.render('index.ejs', {
        authors: authors,
        books: books,
    });
});



// Listen to the server
app.listen(port, () => {
    console.log(`Server is running on port https://127.0.0.1:${port}`);
});