import express from 'express';
import axios from 'axios';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({path: '.env'});

const app = express();
const port = process.env.APP_PORT;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Home Route
app.get('/', async (_req, res) => {
    res.render('index.ejs');
});



// Listen to the server
app.listen(port, () => {
    console.log(`Server is running on port https://127.0.0.1:${port}`);
});