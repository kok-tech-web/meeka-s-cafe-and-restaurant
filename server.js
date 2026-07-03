const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// CREATE A CONNECTION POOL (instead of a single connection)
// A pool automatically reconnects and hands out fresh connections per request,
// so the server doesn't die if one connection drops or times out.
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

// Quick check that the pool can actually reach the database on startup
db.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed:', err.message);
        return;
    }
    console.log('Connected to MySQL database!');
    connection.release();
});

// HOME ROUTE
app.get('/', (req, res) => {
    res.send('MEEKA\'s backend is running!');
});

// RESERVATION ROUTE — validates input, then saves to database
app.post('/reservation', (req, res) => {
    const { name, phone, date, time, people, requests } = req.body;

    if (!name || !phone || !date || !time || !people) {
        return res.status(400).json({ success: false, message: 'Please fill in all required fields.' });
    }

    const sql = `INSERT INTO reservations (name, phone, date, time, people, requests) 
                 VALUES (?, ?, ?, ?, ?, ?)`;

    db.query(sql, [name, phone, date, time, people, requests || null], (err, result) => {
        if (err) {
            console.error('Error saving reservation:', err.message);
            return res.status(500).json({ success: false, message: 'Failed to save reservation' });
        }
        console.log('Reservation saved with ID:', result.insertId);
        res.json({ success: true, message: 'Reservation received successfully!' });
    });
});

// GET all reservations (for the future staff dashboard)
app.get('/reservations', (req, res) => {
    db.query('SELECT * FROM reservations ORDER BY created_at DESC', (err, results) => {
        if (err) {
            console.error('Error fetching reservations:', err.message);
            return res.status(500).json({ success: false, message: 'Failed to fetch reservations' });
        }
        res.json({ success: true, data: results });
    });
});

// REVIEW ROUTE — validates input, then saves to database
app.post('/review', (req, res) => {
    const { name, rating, review } = req.body;

    if (!name || !rating || !review) {
        return res.status(400).json({ success: false, message: 'Please fill in all required fields.' });
    }
    if (rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
    }

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

// GET all reviews (so reviews.html can eventually display real reviews)
app.get('/reviews', (req, res) => {
    db.query('SELECT * FROM reviews ORDER BY created_at DESC', (err, results) => {
        if (err) {
            console.error('Error fetching reviews:', err.message);
            return res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
        }
        res.json({ success: true, data: results });
    });
});

// JOB APPLICATION ROUTE — validates input, then saves to database
app.post('/apply', (req, res) => {
    const { name, email, phone, position, message } = req.body;

    if (!name || !email || !phone || !position) {
        return res.status(400).json({ success: false, message: 'Please fill in all required fields.' });
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    const sql = `INSERT INTO applications (name, email, phone, position, message) 
                 VALUES (?, ?, ?, ?, ?)`;

    db.query(sql, [name, email, phone, position, message || null], (err, result) => {
        if (err) {
            console.error('Error saving application:', err.message);
            return res.status(500).json({ success: false, message: 'Failed to save application' });
        }
        console.log('Application saved with ID:', result.insertId);
        res.json({ success: true, message: 'Application received successfully!' });
    });
});

// GET all applications (for the future staff dashboard)
app.get('/applications', (req, res) => {
    db.query('SELECT * FROM applications ORDER BY created_at DESC', (err, results) => {
        if (err) {
            console.error('Error fetching applications:', err.message);
            return res.status(500).json({ success: false, message: 'Failed to fetch applications' });
        }
        res.json({ success: true, data: results });
    });
});

// STAFF LOGIN ROUTE
app.post('/staff/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Please fill in all fields.' });
    }

    const sql = 'SELECT * FROM managers WHERE email = ? AND password = ?';
    db.query(sql, [email, password], (err, results) => {
        if (err) {
            console.error('Login error:', err.message);
            return res.status(500).json({ success: false, message: 'Server error.' });
        }
        if (results.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }
        res.json({ success: true, name: results[0].name });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});