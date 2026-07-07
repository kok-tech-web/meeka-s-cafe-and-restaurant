const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config();
const rateLimit = require('express-rate-limit');

// Limits each visitor to 5 form submissions per 15 minutes
const formLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { success: false, message: 'Too many submissions, please try again later.' }
});

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
app.post('/reservation', formLimiter, (req, res) => {
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
// Simple protection: only allow requests that include the correct staff key
function checkStaffKey(req, res, next) {
    const key = req.headers['x-staff-key'];
    if (key !== process.env.STAFF_KEY) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    next();
}
app.get('/reservations', checkStaffKey, (req, res) => {
    db.query('SELECT * FROM reservations ORDER BY created_at DESC', (err, results) => {
        if (err) {
            console.error('Error fetching reservations:', err.message);
            return res.status(500).json({ success: false, message: 'Failed to fetch reservations' });
        }
        res.json({ success: true, data: results });
    });
});

// REVIEW ROUTE — validates input, then saves to database
app.post('/review', formLimiter, (req, res) => {
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
app.get('/reviews', checkStaffKey, (req, res) => {
    db.query('SELECT * FROM reviews ORDER BY created_at DESC', (err, results) => {
        if (err) {
            console.error('Error fetching reviews:', err.message);
            return res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
        }
        res.json({ success: true, data: results });
    });
});

// JOB APPLICATION ROUTE — validates input, then saves to database
app.post('/apply', formLimiter, (req, res) => {
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
app.get('/applications', checkStaffKey, (req, res) => {
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

// GET all employees
app.get('/employees', (req, res) => {
    db.query('SELECT id, name, email, role, shift, status, created_at FROM employees ORDER BY name', (err, results) => {
        if (err) {
            console.error('Error fetching employees:', err.message);
            return res.status(500).json({ success: false, message: 'Failed to fetch employees' });
        }
        res.json({ success: true, data: results });
    });
});

// ADD new employee
app.post('/employees', (req, res) => {
    const { name, email, password, role, shift } = req.body;
    if (!name || !email || !password || !role || !shift) {
        return res.status(400).json({ success: false, message: 'Please fill in all fields.' });
    }
    const sql = 'INSERT INTO employees (name, email, password, role, shift) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [name, email, password, role, shift], (err, result) => {
        if (err) {
            console.error('Error adding employee:', err.message);
            return res.status(500).json({ success: false, message: 'Failed to add employee.' });
        }
        res.json({ success: true, message: 'Employee added!' });
    });
});

// ATTENDANCE ROUTES
app.post('/attendance/clockin', (req, res) => {
    const { employee_id } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const sql = `INSERT INTO attendance (employee_id, clock_in, date) VALUES (?, NOW(), ?)
                 ON DUPLICATE KEY UPDATE clock_in = NOW()`;
    db.query(sql, [employee_id, today], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Failed to clock in.' });
        res.json({ success: true, message: 'Clocked in successfully!' });
    });
});

app.post('/attendance/clockout', (req, res) => {
    const { employee_id } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const sql = `UPDATE attendance SET clock_out = NOW() WHERE employee_id = ? AND date = ?`;
    db.query(sql, [employee_id, today], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Failed to clock out.' });
        res.json({ success: true, message: 'Clocked out successfully!' });
    });
});

app.get('/attendance/today', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const sql = `SELECT a.*, e.name as employee_name 
                 FROM attendance a 
                 JOIN employees e ON a.employee_id = e.id 
                 WHERE a.date = ?`;
    db.query(sql, [today], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Failed to fetch attendance.' });
        res.json({ success: true, data: results });
    });
});

// TASKS ROUTES
app.get('/tasks', (req, res) => {
    const sql = `SELECT t.*, e.name as employee_name 
                 FROM tasks t 
                 JOIN employees e ON t.assigned_to = e.id 
                 ORDER BY t.created_at DESC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Failed to fetch tasks.' });
        res.json({ success: true, data: results });
    });
});

app.post('/tasks', (req, res) => {
    const { title, assigned_to, due_date } = req.body;
    if (!title || !assigned_to) return res.status(400).json({ success: false, message: 'Please fill in all fields.' });
    db.query('INSERT INTO tasks (title, assigned_to, due_date) VALUES (?, ?, ?)',
        [title, assigned_to, due_date || null], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Failed to assign task.' });
        res.json({ success: true, message: 'Task assigned!' });
    });
});

app.put('/tasks/:id', (req, res) => {
    const { status } = req.body;
    db.query('UPDATE tasks SET status = ? WHERE id = ?', [status, req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Failed to update task.' });
        res.json({ success: true, message: 'Task updated!' });
    });
});

// UPDATE APPLICATION STATUS
app.put('/applications/:id', (req, res) => {
    const { status } = req.body;
    db.query('UPDATE applications SET status = ? WHERE id = ?', [status, req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Failed to update application.' });
        res.json({ success: true, message: 'Application updated!' });
    });
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});