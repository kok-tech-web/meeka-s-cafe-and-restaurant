const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// HOME ROUTE — just to confirm server is running
app.get('/', (req, res) => {
    res.send('MEEKA\'s backend is running!');
});

// RESERVATION ROUTE
// This listens for POST requests sent from the reservation form
app.post('/reservation', (req, res) => {

    // req.body contains everything the user typed in the form
    const { name, phone, date, time, people, requests } = req.body;

    // For now just print it in the terminal so we can see it
    console.log('New reservation received:');
    console.log(`  Name: ${name}`);
    console.log(`  Phone: ${phone}`);
    console.log(`  Date: ${date}`);
    console.log(`  Time: ${time}`);
    console.log(`  People: ${people}`);
    console.log(`  Special requests: ${requests}`);

    // Send a response back to the frontend
    res.json({
        success: true,
        message: 'Reservation received successfully!'
    });
});

// REVIEW ROUTE
// This listens for POST requests sent from the reviews form
app.post('/review', (req, res) => {

    const { name, rating, review } = req.body;

    console.log('New review received:');
    console.log(`  Name: ${name}`);
    console.log(`  Rating: ${rating} stars`);
    console.log(`  Review: ${review}`);

    res.json({
        success: true,
        message: 'Review submitted successfully!'
    });
});

// JOB APPLICATION ROUTE
app.post('/apply', (req, res) => {

    const { name, email, phone, position, message } = req.body;

    console.log('New job application received:');
    console.log(`  Name: ${name}`);
    console.log(`  Email: ${email}`);
    console.log(`  Phone: ${phone}`);
    console.log(`  Position: ${position}`);

    res.json({
        success: true,
        message: 'Application received successfully!'
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});