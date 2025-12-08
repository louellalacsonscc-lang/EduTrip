const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = 3000;

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image and document files are allowed'));
        }
    }
});

// Middleware - Serve static files from correct directories
app.use(express.json());
app.use(express.static('.')); // Serve from main folder
app.use('/main', express.static('main')); // Serve main folder files
app.use('/student', express.static('student')); // Serve student folder files
app.use('/img', express.static('img')); // Serve image folder
app.use('/uploads', express.static('uploads')); // Serve uploaded files
app.use('/frontp', express.static('frontp')); // Serve frontp folder files

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
const db = new sqlite3.Database('./edutrip.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

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
    )`, (err) => {
        if (err) console.error('Error creating users table:', err);
        else console.log('Users table ready');
    });
    
    // Events table
    db.run(`CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        date TEXT,
        location TEXT,
        max_participants INTEGER,
        current_participants INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active'
    )`, (err) => {
        if (err) console.error('Error creating events table:', err);
        else console.log('Events table ready');
    });
    
    // Registration requests table
    db.run(`CREATE TABLE IF NOT EXISTS registration_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        event_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        registration_form TEXT,
        waiver_form TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (event_id) REFERENCES events (id)
    )`, (err) => {
        if (err) console.error('Error creating registration_requests table:', err);
        else console.log('Registration requests table ready');
    });
    
    // Insert default admin user
    const adminPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (name, email, password, role) 
            VALUES (?, ?, ?, ?)`, 
            ['Admin', 'admin@edutrip.com', adminPassword, 'admin'],
            function(err) {
                if (err) console.error('Error inserting admin user:', err);
                else console.log('Admin user ready');
            });
    
    // Insert sample student user
    const studentPassword = bcrypt.hashSync('student123', 10);
    db.run(`INSERT OR IGNORE INTO users (name, student_number, email, password, role) 
            VALUES (?, ?, ?, ?, ?)`, 
            ['John Student', 'S123456', 'student@edutrip.com', studentPassword, 'student'],
            function(err) {
                if (err) console.error('Error inserting student user:', err);
                else console.log('Student user ready');
            });

const requireAuth = (req, res, next) => {
    next();
};

// Routes
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    console.log('Login attempt for:', email);
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    
    db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
        if (err) {
            console.log('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!user) {
            console.log('User not found:', email);
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        console.log('User found:', user.email, 'Role:', user.role);
        
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
            res.status(401).json({ error: 'Invalid email or password' });
        }
    });
});

app.post('/api/register', (req, res) => {
    const { name, studentNumber, email, password } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    db.run("INSERT INTO users (name, student_number, email, password) VALUES (?, ?, ?, ?)", 
        [name, studentNumber, email, hashedPassword], 
        function(err) {
            if (err) {
                console.error('Registration error:', err);
                if (err.message.includes('UNIQUE constraint failed')) {
                    res.status(400).json({ error: 'Email already exists' });
                } else {
                    res.status(500).json({ error: 'Registration failed' });
                }
            } else {
                res.json({ success: true, message: 'Registration successful' });
            }
        });
});

// Get events for front page (limited to 5 most recent)
app.get('/api/frontpage-events', (req, res) => {
    db.all("SELECT * FROM events WHERE status = 'active' ORDER BY date DESC LIMIT 5", [], (err, rows) => {
        if (err) {
            console.log('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});
// Get all events
app.get('/api/events', (req, res) => {
    db.all("SELECT * FROM events WHERE status = 'active' ORDER BY date", [], (err, rows) => {
        if (err) {
            console.log('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

// Get event by ID
app.get('/api/events/:id', (req, res) => {
    const { id } = req.params;
    
    db.get("SELECT * FROM events WHERE id = ?", [id], (err, row) => {
        if (err) {
            console.log('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Event not found' });
        }
        res.json(row);
    });
});

// Get user's registration requests
// Get user's registration requests - UPDATED VERSION
app.get('/api/user/registration-requests', (req, res) => {
    const userId = req.query.user_id;
    
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    
    const query = `
        SELECT rr.*, e.title as event_title, e.date as event_date, e.location as event_location, e.status as event_status
        FROM registration_requests rr
        JOIN events e ON rr.event_id = e.id
        WHERE rr.user_id = ? AND e.status != 'cancelled'
        ORDER BY rr.created_at DESC
    `;
    
    db.all(query, [userId], (err, rows) => {
        if (err) {
            console.log('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

// Create new registration request with file upload
app.post('/api/registration-requests', upload.fields([
    { name: 'registration_form', maxCount: 1 },
    { name: 'waiver_form', maxCount: 1 }
]), (req, res) => {
    const { user_id, event_id } = req.body;
    
    if (!user_id || !event_id) {
        return res.status(400).json({ error: 'User ID and Event ID are required' });
    }
    
    const registrationForm = req.files['registration_form'] ? req.files['registration_form'][0].filename : null;
    const waiverForm = req.files['waiver_form'] ? req.files['waiver_form'][0].filename : null;
    
    console.log('Creating registration request:', { user_id, event_id, registrationForm, waiverForm });
    
    // Check if request already exists
    db.get("SELECT * FROM registration_requests WHERE user_id = ? AND event_id = ?", 
        [user_id, event_id], (err, existing) => {
        if (err) {
            console.error('Error checking existing request:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (existing) {
            return res.status(400).json({ error: 'Already registered for this event' });
        }
        
        db.run("INSERT INTO registration_requests (user_id, event_id, registration_form, waiver_form) VALUES (?, ?, ?, ?)", 
            [user_id, event_id, registrationForm, waiverForm], 
            function(err) {
                if (err) {
                    console.log('Database error creating request:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                res.json({ success: true, message: 'Registration request submitted successfully' });
            });
    });
});

// Get all registration requests (admin) - UPDATED VERSION
app.get('/api/registration-requests', (req, res) => {
    console.log('Fetching registration requests...');
    
    const query = `
        SELECT rr.*, u.name, u.email, u.student_number, 
               e.title as event_title, e.date as event_date, 
               e.location as event_location, e.status as event_status
        FROM registration_requests rr
        JOIN users u ON rr.user_id = u.id
        JOIN events e ON rr.event_id = e.id
        ORDER BY rr.created_at DESC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.log('Database error fetching requests:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        console.log(`Found ${rows.length} registration requests`);
        res.json(rows);
    });
});
// Create new event (admin only)
app.post('/api/events', (req, res) => {
    const { title, description, date, location } = req.body;
    
    if (!title || !description || !date || !location) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    db.run("INSERT INTO events (title, description, date, location) VALUES (?, ?, ?, ?)", 
        [title, description, date, location], 
        function(err) {
            if (err) {
                console.log('Database error creating event:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true, message: 'Event created successfully', eventId: this.lastID });
        });
});

// Delete event (admin only)
app.delete('/api/events/:id', (req, res) => {
    const { id } = req.params;
    
    // Check if there are any registration requests for this event
    db.get("SELECT COUNT(*) as count FROM registration_requests WHERE event_id = ?", [id], (err, row) => {
        if (err) {
            console.log('Database error checking registrations:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (row.count > 0) {
            return res.status(400).json({ error: 'Cannot delete event with existing registrations' });
        }
        
        db.run("DELETE FROM events WHERE id = ?", [id], function(err) {
            if (err) {
                console.log('Database error deleting event:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true, message: 'Event deleted successfully' });
        });
    });
});
// Update registration request status
app.put('/api/registration-requests/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log(`Updating request ${id} to status: ${status}`);
    
    if (!['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    
    db.run("UPDATE registration_requests SET status = ? WHERE id = ?", 
        [status, id], 
        function(err) {
            if (err) {
                console.log('Database error updating request:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true, message: 'Request updated successfully' });
        });
});

// Debug endpoint to check database state
app.get('/api/debug/db-state', (req, res) => {
    const tables = ['users', 'events', 'registration_requests'];
    const results = {};
    let completed = 0;
    
    tables.forEach(table => {
        db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
            results[table] = { error: err, data: rows };
            completed++;
            
            if (completed === tables.length) {
                res.json(results);
            }
        });
    });
});
// Get ALL user's registration requests (including cancelled events)
app.get('/api/user/all-registration-requests', (req, res) => {
    const userId = req.query.user_id;
    
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    
    const query = `
        SELECT rr.*, e.title as event_title, e.date as event_date, 
               e.location as event_location, e.status as event_status
        FROM registration_requests rr
        JOIN events e ON rr.event_id = e.id
        WHERE rr.user_id = ?
        ORDER BY rr.created_at DESC
    `;
    
    db.all(query, [userId], (err, rows) => {
        if (err) {
            console.log('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});
// With authentication checks
app.get('/admin', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'adminpage.html'));
});

app.get('/student', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'student/studpage.html'));
});

// Correct paths
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontp/frontp.html'));
});
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'main/mainpage.html'));
});

// Logout route
app.post('/api/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
});
// Add this route in server.js after the existing routes

// Serve uploaded files with proper headers
app.get('/api/uploads/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'uploads', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }
    
    // Set appropriate headers
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.doc') contentType = 'application/msword';
    else if (ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    
    res.sendFile(filePath);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// Add this to the CREATE TABLES section in server.js
db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
)`, (err) => {
    if (err) console.error('Error creating notifications table:', err);
    else console.log('Notifications table ready');
});
// Add these routes to server.js:

// Create notification
// Create notification
app.post('/api/notifications', (req, res) => {
    const { user_id, title, message, type } = req.body;
    
    if (!user_id || !title || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    db.run("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
        [user_id, title, message, type || 'info'],
        function(err) {
            if (err) {
                console.error('Error creating notification:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true, notificationId: this.lastID });
        });
});

// Get user notifications
app.get('/api/notifications/:user_id', (req, res) => {
    const { user_id } = req.params;
    
    db.all("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC", 
        [user_id], (err, notifications) => {
            if (err) {
                console.error('Error fetching user notifications:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json(notifications);
        });
});

// Mark notification as read
app.put('/api/notifications/:id/read', (req, res) => {
    const { id } = req.params;
    
    db.run("UPDATE notifications SET is_read = 1 WHERE id = ?", [id], function(err) {
        if (err) {
            console.error('Error marking notification as read:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true });
    });
});
// Update event (admin only)
app.put('/api/events/:id', (req, res) => {
    const { id } = req.params;
    const { title, description, date, location, status } = req.body;
    
    if (!title || !description || !date || !location) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    const validStatuses = ['active', 'cancelled', 'completed', 'upcoming'];
    const eventStatus = status && validStatuses.includes(status) ? status : 'active';
    
    db.run(
        `UPDATE events 
         SET title = ?, description = ?, date = ?, location = ?, status = ?
         WHERE id = ?`,
        [title, description, date, location, eventStatus, id],
        function(err) {
            if (err) {
                console.log('Database error updating event:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true, message: 'Event updated successfully' });
        }
    );
});
// Get notifications by user ID
app.get('/api/notifications/user/:user_id', (req, res) => {
    const { user_id } = req.params;
    
    db.all("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC", 
        [user_id], (err, notifications) => {
            if (err) {
                console.error('Error fetching user notifications:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json(notifications);
        });
});
app.listen(PORT, () => {
    console.log(`🚀 EduTrip server running on http://localhost:${PORT}`);
    console.log(`📊 Using SQLite database: edutrip.db`);
    console.log(`🔑 Test credentials:`);
    console.log(`   Admin: admin@edutrip.com / admin123`);
    console.log(`   Student: student@edutrip.com / student123`);
    console.log(`🐛 Debug endpoint available: http://localhost:${PORT}/api/debug/db-state`);
});
})