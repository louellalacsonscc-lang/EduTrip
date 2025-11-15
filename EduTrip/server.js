const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware - Serve static files from correct directories
app.use(express.json());
app.use(express.static('.')); // Serve from main folder
app.use('/main', express.static('main')); // Serve main folder files
app.use('/student', express.static('student')); // Serve student folder files
app.use('/img', express.static('img')); // Serve image folder

// Fix for missing JS and CSS files
app.get('/mainpage.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'main/mainpage.js'));
});

app.get('/mainpage.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'main/mainpage.css'));
});

app.get('/studpage.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'student/studpage.js'));
});

app.get('/studpage.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'student/studpage.css'));
});

app.get('/adminpage.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'adminpage.js'));
});

app.get('/adminpage.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'adminpage.css'));
});

// Database setup
const db = new sqlite3.Database('./edutrip.db');

// Create tables
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        student_number TEXT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'student'
    )`);
    
    // Events table
    db.run(`CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        date TEXT,
        location TEXT
    )`);
    
    // Insert default admin user
    const adminPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (name, email, password, role) 
            VALUES (?, ?, ?, ?)`, 
            ['Admin', 'admin@edutrip.com', adminPassword, 'admin']);
});

// Routes
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    console.log('Login attempt for:', email); // Debug log
    
    db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
        if (err) {
            console.log('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!user) {
            console.log('User not found:', email);
            return res.status(401).json({ error: 'User not found' });
        }
        
        console.log('User found:', user.email, 'Role:', user.role); // Debug log
        
        if (bcrypt.compareSync(password, user.password)) {
            console.log('Login successful for:', user.email);
            res.json({ 
                success: true, 
                user: { 
                    id: user.id, 
                    name: user.name, 
                    student_number: user.student_number,
                    email: user.email, 
                    role: user.role 
                } 
            });
        } else {
            console.log('Invalid password for:', email);
            res.status(401).json({ error: 'Invalid password' });
        }
    });
});

app.post('/api/register', (req, res) => {
    const { name, studentNumber, email, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    db.run("INSERT INTO users (name, student_number, email, password) VALUES (?, ?, ?, ?)", 
        [name, studentNumber, email, hashedPassword], 
        function(err) {
            if (err) {
                res.status(400).json({ error: 'Email already exists' });
            } else {
                res.json({ success: true, message: 'Registration successful' });
            }
        });
});

// Check if user is logged in middleware
function requireAuth(req, res, next) {
    // For now, we'll just allow access
    // In a real app, you'd check JWT tokens or sessions
    next();
}

// Protect admin and student pages
app.get('/admin', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'adminpage.html'));
});

app.get('/student', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'student/studpage.html'));
});

// Serve your existing HTML files with correct paths
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'main/mainpage.html'));
});

// Logout route
app.post('/api/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
});

app.listen(PORT, () => {
    console.log(`🚀 EduTrip server running on http://localhost:${PORT}`);
    console.log(`📊 Using SQLite database: edutrip.db`);
});