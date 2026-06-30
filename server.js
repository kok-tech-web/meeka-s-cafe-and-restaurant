const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// CREATE THE DATABASE CONNECTION
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// CONNECT TO THE DATABASE
db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.message);
        return;
    }
    console.log('Connected to MySQL database!');
});

// HOME ROUTE
app.get('/', (req, res) => {
    res.send('MEEKA\'s backend is running!');
});

// RESERVATION ROUTE — now saves to database
app.post('/reservation', (req, res) => {
    const { name, phone, date, time, people, requests } = req.body;

    const sql = `INSERT INTO reservations (name, phone, date, time, people, requests) 
                 VALUES (?, ?, ?, ?, ?, ?)`;

    db.query(sql, [name, phone, date, time, people, requests], (err, result) => {
        if (err) {
            console.error('Error saving reservation:', err.message);
            return res.status(500).json({ success: false, message: 'Failed to save reservation' });
        }
        console.log('Reservation saved with ID:', result.insertId);
        res.json({ success: true, message: 'Reservation received successfully!' });
    });
});

// REVIEW ROUTE — now saves to database
app.post('/review', (req, res) => {
    const { name, rating, review } = req.body;

    const sql = `INSERT INTO reviews (name, rating, review) VALUES (?, ?, ?)`;

    db.query(sql, [name, rating, review], (err, result) => {
        if (err) {
            console.error('Error saving review:', err.message);
            return res.status(500).json({ success: false, message: 'Failed to save review' });
        }
        console.log('Review saved with ID:', result.insertId);
        res.json({ success: true, message: 'Review submitted successfully!' });
    });
});

// JOB APPLICATION ROUTE — now saves to database
app.post('/apply', (req, res) => {
    const { name, email, phone, position, message } = req.body;

    const sql = `INSERT INTO applications (name, email, phone, position, message) 
                 VALUES (?, ?, ?, ?, ?)`;

    db.query(sql, [name, email, phone, position, message], (err, result) => {
        if (err) {
            console.error('Error saving application:', err.message);
            return res.status(500).json({ success: false, message: 'Failed to save application' });
        }
        console.log('Application saved with ID:', result.insertId);
        res.json({ success: true, message: 'Application received successfully!' });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});