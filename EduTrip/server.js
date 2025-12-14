const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const nodemailer = require('nodemailer');
require('dotenv').config();

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
const transporter = nodemailer.createTransport({
    service: 'gmail', // or use another service like Outlook, Yahoo, etc.
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'your-app-password'
    }
});
transporter.verify(function(error, success) {
    if (error) {
        console.log('❌ Email configuration error:', error);
    } else {
        console.log('✅ Email server is ready to send messages');
    }
});
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, verificationCode, userName) {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER || 'edutrip@example.com',
            to: email,
            subject: 'Verify Your EduTrip Account',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #1f2937; padding: 20px; text-align: center;">
                        <h1 style="color: #3b82f6; margin: 0;">EduTrip</h1>
                        <p style="color: #9ca3af; margin: 5px 0;">Educational Trips & Events Platform</p>
                    </div>
                    <div style="padding: 30px; background: #111827; color: #e5e7eb;">
                        <h2 style="color: white; margin-top: 0;">Email Verification Required</h2>
                        <p>Hello ${userName},</p>
                        <p>Thank you for registering with EduTrip! Please use the verification code below to complete your registration:</p>
                        
                        <div style="background: #1f2937; padding: 20px; margin: 30px 0; text-align: center; border-radius: 8px;">
                            <div style="font-size: 32px; font-weight: bold; color: #3b82f6; letter-spacing: 10px;">
                                ${verificationCode}
                            </div>
                            <p style="color: #9ca3af; margin-top: 10px;">This code will expire in 24 hours</p>
                        </div>
                        
                        <p>If you didn't create an account with EduTrip, please ignore this email.</p>
                        <p>Best regards,<br>The EduTrip Team</p>
                    </div>
                    <div style="background: #030712; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                        <p>© 2024 EduTrip. Educational platform for trips and events.</p>
                        <p>This is an automated email, please do not reply.</p>
                    </div>
                </div>
            `,
            text: `Hello ${userName},\n\nThank you for registering with EduTrip! Your verification code is: ${verificationCode}\n\nThis code will expire in 24 hours.\n\nBest regards,\nThe EduTrip Team`
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Verification email sent to: ${email}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending verification email:', error);
        return false;
    }
}
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
    res.sendFile(path.join(__dirname, 'admin/adminpage.js'));
});

app.get('/adminpage.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin/adminpage.css'));
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
    db.run(`CREATE TABLE IF NOT EXISTS email_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    verification_code TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    verified BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
)`, (err) => {
    if (err) console.error('Error creating email_verifications table:', err);
    else console.log('Email verifications table ready');
});

// Add verified column to users table
db.all("PRAGMA table_info(users)", [], (err, columns) => {
    if (err) {
        console.error('Error checking users table:', err);
        return;
    }
    
    // Check if columns is defined and is an array
    if (!columns || !Array.isArray(columns)) {
        console.log('⚠️ Users table might not exist yet, creating with verified column...');
        return;
    }
    
    const hasVerifiedColumn = columns.some(col => col && col.name === 'verified');
    if (!hasVerifiedColumn) {
        db.run("ALTER TABLE users ADD COLUMN verified BOOLEAN DEFAULT 0", (err) => {
            if (err) {
                console.error('Error adding verified column:', err);
                // If column already exists, that's fine
                if (err.message && err.message.includes('duplicate column name')) {
                    console.log('✅ verified column already exists');
                }
            } else {
                console.log('✅ Added verified column to users table');
            }
        });
    } else {
        console.log('✅ verified column already exists');
    }
});
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
    // Add this with other CREATE TABLE statements
db.run(`CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    reset_token TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
)`, (err) => {
    if (err) console.error('Error creating password_resets table:', err);
    else console.log('Password resets table ready');
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
    // Add this to the CREATE TABLES section in server.js
db.run(`CREATE TABLE IF NOT EXISTS buses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bus_number TEXT UNIQUE NOT NULL,
    capacity INTEGER NOT NULL,
    current_passengers INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`, (err) => {
    if (err) console.error('Error creating buses table:', err);
    else console.log('Buses table ready');
});

db.run(`CREATE TABLE IF NOT EXISTS bus_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    event_id INTEGER NOT NULL,
    bus_id INTEGER NOT NULL,
    assignment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (event_id) REFERENCES events (id),
    FOREIGN KEY (bus_id) REFERENCES buses (id),
    UNIQUE(user_id, event_id)  -- One user per event
)`, (err) => {
    if (err) console.error('Error creating bus_assignments table:', err);
    else console.log('Bus assignments table ready');
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
        
        console.log('User found:', user.email, 'Role:', user.role, 'Verified:', user.verified);
        
        // Check if email is verified
        if (!user.verified) {
            return res.status(403).json({ 
                error: 'Email not verified', 
                requires_verification: true,
                user_id: user.id 
            });
        }
        
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

// Update the /api/register endpoint
app.post('/api/register', async (req, res) => {
    const { name, studentNumber, email, password } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    // Check if email already exists
    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, existingUser) => {
        if (err) {
            console.error('Registration error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (existingUser) {
            // If user exists but is not verified, allow resending verification
            if (!existingUser.verified) {
                // Generate new verification code
                const verificationCode = generateVerificationCode();
                const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
                
                // Delete old verification codes
                db.run("DELETE FROM email_verifications WHERE user_id = ?", [existingUser.id], function(err) {
                    if (err) {
                        console.error('Error clearing old verifications:', err);
                    }
                    
                    // Store new verification code
                    db.run("INSERT INTO email_verifications (user_id, verification_code, expires_at) VALUES (?, ?, ?)",
                        [existingUser.id, verificationCode, expiresAt.toISOString()],
                        async function(err) {
                            if (err) {
                                console.error('Error storing verification code:', err);
                                return res.status(500).json({ error: 'Failed to create verification code' });
                            }
                            
                            // Send verification email
                            const emailSent = await sendVerificationEmail(email, verificationCode, existingUser.name);
                            
                            if (emailSent) {
                                res.json({ 
                                    success: true, 
                                    message: 'Verification code resent! Please check your email.',
                                    requires_verification: true,
                                    user_id: existingUser.id
                                });
                            } else {
                                res.status(500).json({ 
                                    error: 'Failed to send verification email. Please try again later.' 
                                });
                            }
                        }
                    );
                });
                return;
            }
            
            // If user exists and is verified, show error
            return res.status(400).json({ error: 'Email already exists and is verified. Please login instead.' });
        }
        
        // Create new user (new email)
        const hashedPassword = bcrypt.hashSync(password, 10);
        
        db.run("INSERT INTO users (name, student_number, email, password, verified) VALUES (?, ?, ?, ?, 0)", 
            [name, studentNumber, email, hashedPassword], 
            async function(err) {
                if (err) {
                    console.error('Registration error:', err);
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ error: 'Email already exists' });
                    }
                    return res.status(500).json({ error: 'Registration failed' });
                }
                
                const userId = this.lastID;
                const verificationCode = generateVerificationCode();
                const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
                
                // Store verification code
                db.run("INSERT INTO email_verifications (user_id, verification_code, expires_at) VALUES (?, ?, ?)",
                    [userId, verificationCode, expiresAt.toISOString()],
                    async function(err) {
                        if (err) {
                            console.error('Error storing verification code:', err);
                            return res.status(500).json({ error: 'Failed to create verification code' });
                        }
                        
                        // Send verification email
                        const emailSent = await sendVerificationEmail(email, verificationCode, name);
                        
                        if (emailSent) {
                            res.json({ 
                                success: true, 
                                message: 'Registration successful! Please check your email for verification code.',
                                requires_verification: true,
                                user_id: userId
                            });
                        } else {
                            res.status(500).json({ 
                                error: 'Registration completed but failed to send verification email. Please contact support.' 
                            });
                        }
                    }
                );
            });
    });
});
// Email verification endpoint
app.post('/api/verify-email', (req, res) => {
    const { user_id, verification_code } = req.body;
    
    if (!user_id || !verification_code) {
        return res.status(400).json({ error: 'User ID and verification code are required' });
    }
    
    const now = new Date().toISOString();
    
    db.get(`
        SELECT * FROM email_verifications 
        WHERE user_id = ? 
        AND verification_code = ?
        AND expires_at > ?
        AND verified = 0
    `, [user_id, verification_code, now], (err, verification) => {
        if (err) {
            console.error('Verification error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!verification) {
            return res.status(400).json({ error: 'Invalid or expired verification code' });
        }
        
        // Update verification as used
        db.run("UPDATE email_verifications SET verified = 1 WHERE id = ?", [verification.id], function(err) {
            if (err) {
                console.error('Error updating verification:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            // Update user as verified
            db.run("UPDATE users SET verified = 1 WHERE id = ?", [user_id], function(err) {
                if (err) {
                    console.error('Error updating user:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                
                res.json({ 
                    success: true, 
                    message: 'Email verified successfully! You can now login.' 
                });
            });
        });
    });
});

// Resend verification code endpoint
app.post('/api/resend-verification', async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }
    
    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
        if (err) {
            console.error('Error finding user:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (user.verified) {
            return res.status(400).json({ error: 'Email already verified' });
        }
        
        const verificationCode = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        
        // Delete old verification codes
        db.run("DELETE FROM email_verifications WHERE user_id = ?", [user.id], function(err) {
            if (err) {
                console.error('Error clearing old verifications:', err);
            }
            
            // Store new verification code
            db.run("INSERT INTO email_verifications (user_id, verification_code, expires_at) VALUES (?, ?, ?)",
                [user.id, verificationCode, expiresAt.toISOString()],
                async function(err) {
                    if (err) {
                        console.error('Error storing verification code:', err);
                        return res.status(500).json({ error: 'Failed to create verification code' });
                    }
                    
                    // Send verification email
                    const emailSent = await sendVerificationEmail(email, verificationCode, user.name);
                    
                    if (emailSent) {
                        res.json({ 
                            success: true, 
                            message: 'Verification code resent successfully! Please check your email.' 
                        });
                    } else {
                        res.status(500).json({ 
                            error: 'Failed to send verification email. Please try again later.' 
                        });
                    }
                }
            );
        });
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
// Password Reset Endpoints

// Forgot password - send reset email
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }
    
    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
        if (err) {
            console.error('Error finding user:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Generate reset token (6-digit code)
        const resetToken = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour from now
        
        // Store reset token
        db.run("INSERT INTO password_resets (user_id, reset_token, expires_at) VALUES (?, ?, ?)",
            [user.id, resetToken, expiresAt.toISOString()],
            async function(err) {
                if (err) {
                    console.error('Error storing reset token:', err);
                    return res.status(500).json({ error: 'Failed to create reset token' });
                }
                
                // Send reset email
                try {
                    const mailOptions = {
                        from: process.env.EMAIL_USER || 'edutrip@example.com',
                        to: email,
                        subject: 'Reset Your EduTrip Password',
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <div style="background: #1f2937; padding: 20px; text-align: center;">
                                    <h1 style="color: #3b82f6; margin: 0;">EduTrip</h1>
                                    <p style="color: #9ca3af; margin: 5px 0;">Password Reset Request</p>
                                </div>
                                <div style="padding: 30px; background: #111827; color: #e5e7eb;">
                                    <h2 style="color: white; margin-top: 0;">Password Reset</h2>
                                    <p>Hello ${user.name},</p>
                                    <p>We received a request to reset your password. Use the code below to set a new password:</p>
                                    
                                    <div style="background: #1f2937; padding: 20px; margin: 30px 0; text-align: center; border-radius: 8px;">
                                        <div style="font-size: 32px; font-weight: bold; color: #3b82f6; letter-spacing: 10px;">
                                            ${resetToken}
                                        </div>
                                        <p style="color: #9ca3af; margin-top: 10px;">This code will expire in 1 hour</p>
                                    </div>
                                    
                                    <p style="color: #ef4444; font-weight: bold;">
                                        ⚠️ Important: After resetting your password, you will need to verify your email again.
                                    </p>
                                    
                                    <p>If you didn't request a password reset, please ignore this email.</p>
                                    <p>Best regards,<br>The EduTrip Team</p>
                                </div>
                                <div style="background: #030712; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                                    <p>© 2024 EduTrip. Educational platform for trips and events.</p>
                                    <p>This is an automated email, please do not reply.</p>
                                </div>
                            </div>
                        `,
                        text: `Hello ${user.name},\n\nWe received a request to reset your password. Use this code: ${resetToken}\n\nThis code will expire in 1 hour.\n\nImportant: After resetting your password, you will need to verify your email again.\n\nIf you didn't request a password reset, please ignore this email.\n\nBest regards,\nThe EduTrip Team`
                    };

                    await transporter.sendMail(mailOptions);
                    console.log(`✅ Password reset email sent to: ${email}`);
                    
                    res.json({ 
                        success: true, 
                        message: 'Password reset instructions sent to your email.',
                        email: email
                    });
                    
                } catch (error) {
                    console.error('❌ Error sending reset email:', error);
                    res.status(500).json({ error: 'Failed to send reset email' });
                }
            }
        );
    });
});

// Verify reset token
// Verify reset token - FLEXIBLE version (accepts either user_id or email)
app.post('/api/verify-reset-token', (req, res) => {
    const { email, user_id, reset_token } = req.body;
    
    if (!reset_token) {
        return res.status(400).json({ error: 'Reset token is required' });
    }
    
    if (!email && !user_id) {
        return res.status(400).json({ error: 'Either email or user ID is required' });
    }
    
    const now = new Date().toISOString();
    
    const verifyToken = (userId) => {
        db.get(`
            SELECT * FROM password_resets 
            WHERE user_id = ? 
            AND reset_token = ?
            AND expires_at > ?
            AND used = 0
        `, [userId, reset_token, now], (err, reset) => {
            if (err) {
                console.error('Token verification error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (!reset) {
                return res.status(400).json({ error: 'Invalid or expired reset token' });
            }
            
            res.json({ 
                success: true, 
                message: 'Reset token verified',
                user_id: userId
            });
        });
    };
    
    if (user_id) {
        // If user_id is provided directly
        verifyToken(user_id);
    } else if (email) {
        // If email is provided, find user first
        db.get("SELECT id FROM users WHERE email = ?", [email], (err, user) => {
            if (err) {
                console.error('Verify token error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            verifyToken(user.id);
        });
    }
});

// Reset password
app.post('/api/reset-password', (req, res) => {
    const { email, reset_token, new_password } = req.body;
    
    if (!email || !reset_token || !new_password) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (new_password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    const now = new Date().toISOString();
    
    // First find user by email
    db.get("SELECT id, name, verified FROM users WHERE email = ?", [email], (err, user) => {
        if (err) {
            console.error('Reset error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check reset token
        db.get(`
            SELECT * FROM password_resets 
            WHERE user_id = ? 
            AND reset_token = ?
            AND expires_at > ?
            AND used = 0
        `, [user.id, reset_token, now], (err, reset) => {
            if (err) {
                console.error('Token verification error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (!reset) {
                return res.status(400).json({ error: 'Invalid or expired reset token' });
            }
            
            const hashedPassword = bcrypt.hashSync(new_password, 10);
            
            // Update password ONLY (DO NOT change verified status)
            db.run("UPDATE users SET password = ? WHERE id = ?", 
                [hashedPassword, user.id], function(err) {
                    if (err) {
                        console.error('Error updating password:', err);
                        return res.status(500).json({ error: 'Database error' });
                    }
                    
                    // Mark reset token as used
                    db.run("UPDATE password_resets SET used = 1 WHERE id = ?", [reset.id], function(err) {
                        if (err) {
                            console.error('Error marking token as used:', err);
                        }
                        
                        // User can now login with new password
                        // Keep their verified status as is
                        res.json({ 
                            success: true, 
                            message: 'Password reset successfully! You can now login with your new password.',
                            user_id: user.id,
                            was_verified: user.verified === 1 // Track if user was already verified
                        });
                    });
                });
        });
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
// Verify route
app.get('/verify-email.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'main/verify-email.html'));
});
// With authentication checks
app.get('/admin', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin/adminpage.html'));
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
// Add these routes after the existing routes

// Bus Management API Endpoints

// Create new bus
app.post('/api/buses', (req, res) => {
    const { bus_number, capacity } = req.body;
    
    if (!bus_number || !capacity) {
        return res.status(400).json({ error: 'Bus number and capacity are required' });
    }
    
    if (capacity <= 0) {
        return res.status(400).json({ error: 'Capacity must be greater than 0' });
    }
    
    db.run("INSERT INTO buses (bus_number, capacity) VALUES (?, ?)", 
        [bus_number, capacity], 
        function(err) {
            if (err) {
                console.error('Error creating bus:', err);
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Bus number already exists' });
                }
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true, message: 'Bus created successfully', busId: this.lastID });
        });
});

// Get all buses
app.get('/api/buses', (req, res) => {
    db.all("SELECT * FROM buses ORDER BY bus_number", [], (err, buses) => {
        if (err) {
            console.error('Error fetching buses:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(buses);
    });
});

// Get bus by ID
app.get('/api/buses/:id', (req, res) => {
    const { id } = req.params;
    
    db.get("SELECT * FROM buses WHERE id = ?", [id], (err, bus) => {
        if (err) {
            console.error('Error fetching bus:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!bus) {
            return res.status(404).json({ error: 'Bus not found' });
        }
        res.json(bus);
    });
});

// Update bus
app.put('/api/buses/:id', (req, res) => {
    const { id } = req.params;
    const { bus_number, capacity } = req.body;
    
    if (!bus_number || !capacity) {
        return res.status(400).json({ error: 'Bus number and capacity are required' });
    }
    
    db.run("UPDATE buses SET bus_number = ?, capacity = ? WHERE id = ?", 
        [bus_number, capacity, id], 
        function(err) {
            if (err) {
                console.error('Error updating bus:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Bus not found' });
            }
            res.json({ success: true, message: 'Bus updated successfully' });
        });
});

// Delete bus (only if no assignments)
app.delete('/api/buses/:id', (req, res) => {
    const { id } = req.params;
    
    // Check if there are any assignments for this bus
    db.get("SELECT COUNT(*) as count FROM bus_assignments WHERE bus_id = ?", [id], (err, row) => {
        if (err) {
            console.error('Error checking bus assignments:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (row.count > 0) {
            return res.status(400).json({ error: 'Cannot delete bus with existing assignments' });
        }
        
        db.run("DELETE FROM buses WHERE id = ?", [id], function(err) {
            if (err) {
                console.error('Error deleting bus:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Bus not found' });
            }
            res.json({ success: true, message: 'Bus deleted successfully' });
        });
    });
});

// Assign participant to bus
// Assign participant to bus - UPDATED with better logging
app.post('/api/bus-assignments', (req, res) => {
    const { user_id, event_id, bus_id, notes } = req.body;
    
    console.log('\n=== 🚌 BUS ASSIGNMENT REQUEST ===');
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    console.log('📊 Types:', {
        user_id: typeof user_id,
        event_id: typeof event_id,
        bus_id: typeof bus_id
    });
    
    if (!user_id || !event_id || !bus_id) {
        console.log('❌ Missing required fields');
        return res.status(400).json({ 
            error: 'User ID, Event ID, and Bus ID are required',
            received: { user_id, event_id, bus_id }
        });
    }
    
    // Convert to numbers to ensure proper comparison
    const userId = parseInt(user_id);
    const eventId = parseInt(event_id);
    const busId = parseInt(bus_id);
    
    console.log(`🎯 Parsed IDs: user=${userId}, event=${eventId}, bus=${busId}`);
    
    const createAssignment = async () => {
        try {
            // 1. Check if bus exists
            console.log(`🔍 Checking bus ${busId}...`);
            const bus = await new Promise((resolve, reject) => {
                db.get("SELECT * FROM buses WHERE id = ?", [busId], (err, row) => {
                    if (err) {
                        console.error('❌ Error fetching bus:', err.message);
                        reject(err);
                    } else if (!row) {
                        console.log(`❌ Bus ${busId} not found`);
                        resolve(null);
                    } else {
                        console.log(`✅ Bus found: ${row.bus_number} (Capacity: ${row.capacity}, Current: ${row.current_passengers})`);
                        resolve(row);
                    }
                });
            });
            
            if (!bus) {
                return res.status(404).json({ error: `Bus ${busId} not found` });
            }
            
            // 2. Check if user already assigned to ANY bus for this event
            console.log(`🔍 Checking if user ${userId} already assigned to event ${eventId}...`);
            const existing = await new Promise((resolve, reject) => {
                db.get("SELECT * FROM bus_assignments WHERE user_id = ? AND event_id = ?", 
                    [userId, eventId], (err, row) => {
                    if (err) {
                        console.error('❌ Error checking existing assignment:', err.message);
                        reject(err);
                    } else if (row) {
                        console.log(`❌ User already assigned to bus ${row.bus_id}`);
                        resolve(row);
                    } else {
                        console.log('✅ User not yet assigned');
                        resolve(null);
                    }
                });
            });
            
            if (existing) {
                return res.status(400).json({ 
                    error: 'User is already assigned to a bus for this event',
                    existing_assignment: existing 
                });
            }
            
            // 3. Check bus capacity
            console.log(`🔍 Checking bus ${busId} capacity...`);
            const busCount = await new Promise((resolve, reject) => {
                db.get("SELECT COUNT(*) as count FROM bus_assignments WHERE bus_id = ?", 
                    [busId], (err, row) => {
                    if (err) {
                        console.error('❌ Error checking bus capacity:', err.message);
                        reject(err);
                    } else {
                        const count = row ? row.count : 0;
                        console.log(`📊 Bus ${busId} has ${count}/${bus.capacity} assignments`);
                        resolve(count);
                    }
                });
            });
            
            if (busCount >= bus.capacity) {
                console.log(`❌ Bus ${bus.bus_number} is FULL: ${busCount}/${bus.capacity}`);
                return res.status(400).json({ 
                    error: `Bus ${bus.bus_number} is at full capacity (${busCount}/${bus.capacity})` 
                });
            }
            
            // 4. Check if user has approved registration for this event
            console.log(`🔍 Checking if user ${userId} has approved registration for event ${eventId}...`);
            const approvedRegistration = await new Promise((resolve, reject) => {
                db.get(`
                    SELECT * FROM registration_requests 
                    WHERE user_id = ? AND event_id = ? AND status = 'approved'
                `, [userId, eventId], (err, row) => {
                    if (err) {
                        console.error('❌ Error checking registration:', err.message);
                        reject(err);
                    } else if (!row) {
                        console.log('❌ User does not have approved registration for this event');
                        resolve(null);
                    } else {
                        console.log('✅ User has approved registration');
                        resolve(row);
                    }
                });
            });
            
            if (!approvedRegistration) {
                return res.status(400).json({ 
                    error: 'User does not have an approved registration for this event' 
                });
            }
            
            // 5. Create the assignment
            console.log('📝 Creating bus assignment...');
            const result = await new Promise((resolve, reject) => {
                db.run("INSERT INTO bus_assignments (user_id, event_id, bus_id, notes) VALUES (?, ?, ?, ?)", 
                    [userId, eventId, busId, notes || ''], 
                    function(err) {
                        if (err) {
                            console.error('❌ Error creating assignment:', err.message);
                            console.error('Full error:', err);
                            reject(err);
                        } else {
                            console.log(`✅ Assignment created with ID: ${this.lastID}`);
                            resolve(this);
                        }
                    });
            });
            
            // 6. Update bus passenger count
            console.log(`🔄 Updating bus ${busId} passenger count...`);
            await new Promise((resolve, reject) => {
                db.run("UPDATE buses SET current_passengers = current_passengers + 1 WHERE id = ?", 
                    [busId], function(err) {
                        if (err) {
                            console.error('❌ Error updating bus passenger count:', err.message);
                            reject(err);
                        } else {
                            console.log(`✅ Bus ${busId} passenger count updated (changed: ${this.changes})`);
                            resolve(this);
                        }
                    });
            });
            
            console.log('🎉 BUS ASSIGNMENT SUCCESSFUL!');
            res.json({ 
                success: true, 
                message: 'Bus assignment created successfully',
                assignmentId: result.lastID,
                bus: {
                    id: busId,
                    number: bus.bus_number,
                    capacity: bus.capacity,
                    newPassengerCount: busCount + 1
                }
            });
            
        } catch (error) {
            console.error('\n❌❌❌ CRITICAL ERROR IN BUS ASSIGNMENT ❌❌❌');
            console.error('Error message:', error.message);
            console.error('Stack trace:', error.stack);
            
            res.status(500).json({ 
                error: 'Database error: ' + error.message,
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    };
    
    createAssignment();
});
// Debug bus assignment data
app.get('/api/debug/assignment/:user_id/:event_id', (req, res) => {
    const { user_id, event_id } = req.params;
    
    console.log(`Debugging user ${user_id} for event ${event_id}`);
    
    const userId = parseInt(user_id);
    const eventId = parseInt(event_id);
    
    // Check multiple things
    const checks = {};
    
    // 1. Check if user exists
    db.get("SELECT id, name, email FROM users WHERE id = ?", [userId], (err, user) => {
        checks.user = { exists: !!user, data: user, error: err };
        
        // 2. Check if event exists
        db.get("SELECT id, title FROM events WHERE id = ?", [eventId], (err, event) => {
            checks.event = { exists: !!event, data: event, error: err };
            
            // 3. Check if user has approved registration
            db.get(`
                SELECT * FROM registration_requests 
                WHERE user_id = ? AND event_id = ? AND status = 'approved'
            `, [userId, eventId], (err, registration) => {
                checks.registration = { 
                    approved: !!registration, 
                    data: registration, 
                    error: err 
                };
                
                // 4. Check if user already has bus assignment
                db.get(`
                    SELECT ba.*, b.bus_number 
                    FROM bus_assignments ba
                    JOIN buses b ON ba.bus_id = b.id
                    WHERE ba.user_id = ? AND ba.event_id = ?
                `, [userId, eventId], (err, assignment) => {
                    checks.assignment = { exists: !!assignment, data: assignment, error: err };
                    
                    res.json({
                        userId,
                        eventId,
                        checks,
                        summary: {
                            userExists: checks.user.exists,
                            eventExists: checks.event.exists,
                            hasApprovedRegistration: checks.registration.approved,
                            hasExistingAssignment: checks.assignment.exists,
                            canAssign: checks.user.exists && 
                                      checks.event.exists && 
                                      checks.registration.approved && 
                                      !checks.assignment.exists
                        }
                    });
                });
            });
        });
    });
});
// Debug endpoint to check bus data
app.get('/api/debug/bus/:bus_id', (req, res) => {
    const { bus_id } = req.params;
    
    console.log(`Debugging bus ${bus_id}`);
    
    // Get bus info
    db.get("SELECT * FROM buses WHERE id = ?", [bus_id], (err, bus) => {
        if (err) {
            console.error('Error fetching bus:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (!bus) {
            return res.status(404).json({ error: 'Bus not found' });
        }
        
        // Get assignments count
        db.get("SELECT COUNT(*) as assignment_count FROM bus_assignments WHERE bus_id = ?", 
            [bus_id], (err, countRow) => {
            if (err) {
                console.error('Error counting assignments:', err);
                return res.status(500).json({ error: err.message });
            }
            
            res.json({
                bus,
                assignment_count: countRow.assignment_count,
                current_passengers: bus.current_passengers,
                discrepancy: bus.current_passengers !== countRow.assignment_count
            });
        });
    });
});
// Test bus assignment endpoint
app.get('/api/test-bus-assignment', (req, res) => {
    // Create a test bus
    db.run("INSERT OR IGNORE INTO buses (bus_number, capacity) VALUES ('TEST-BUS', 50)", function(err) {
        if (err) {
            console.error('Error creating test bus:', err);
            return res.status(500).json({ error: err.message });
        }
        
        // Get a user
        db.get("SELECT id FROM users WHERE role = 'student' LIMIT 1", (err, user) => {
            if (err) {
                console.error('Error getting user:', err);
                return res.status(500).json({ error: err.message });
            }
            
            // Get an event
            db.get("SELECT id FROM events LIMIT 1", (err, event) => {
                if (err) {
                    console.error('Error getting event:', err);
                    return res.status(500).json({ error: err.message });
                }
                
                const testData = {
                    user_id: user.id,
                    event_id: event.id,
                    bus_id: this.lastID || 1,
                    notes: 'Test assignment'
                };
                
                console.log('Test data:', testData);
                res.json(testData);
            });
        });
    });
});
// Add this function to run database migrations
// Add this function to run database migrations
function runMigrations() {
    console.log('Checking database migrations...');
    
    // Check if buses table has current_passengers column
    db.all("PRAGMA table_info(buses)", [], (err, columns) => {  // Changed from db.get to db.all
        if (err) {
            console.error('Error checking table schema:', err);
            return;
        }
        
        console.log('Columns in buses table:', columns);
        
        if (!columns || columns.length === 0) {
            console.log('No columns found or table might not exist');
            return;
        }
        
        const hasCurrentPassengers = columns.some(col => col.name === 'current_passengers');
        console.log('Buses table has current_passengers column?', hasCurrentPassengers);
        
        if (!hasCurrentPassengers) {
            console.log('Adding current_passengers column to buses table...');
            db.run("ALTER TABLE buses ADD COLUMN current_passengers INTEGER DEFAULT 0", (err) => {
                if (err) {
                    console.error('Error adding column:', err);
                    // If column already exists, ignore the error
                    if (err.message.includes('duplicate column name')) {
                        console.log('Column already exists, ignoring...');
                    }
                } else {
                    console.log('✅ Added current_passengers column');
                    
                    // Update all buses to have correct current_passengers count
                    db.all("SELECT id FROM buses", [], (err, buses) => {
                        if (err) {
                            console.error('Error fetching buses:', err);
                            return;
                        }
                        
                        if (!buses || buses.length === 0) {
                            console.log('No buses found to update');
                            return;
                        }
                        
                        let completed = 0;
                        buses.forEach(bus => {
                            db.get("SELECT COUNT(*) as count FROM bus_assignments WHERE bus_id = ?", 
                                [bus.id], (err, row) => {
                                if (err) {
                                    console.error(`Error counting assignments for bus ${bus.id}:`, err);
                                } else {
                                    db.run("UPDATE buses SET current_passengers = ? WHERE id = ?", 
                                        [row.count, bus.id], (updateErr) => {
                                        if (updateErr) {
                                            console.error(`Error updating bus ${bus.id}:`, updateErr);
                                        } else {
                                            console.log(`✅ Updated bus ${bus.id} to ${row.count} passengers`);
                                        }
                                    });
                                }
                                
                                completed++;
                                if (completed === buses.length) {
                                    console.log('✅ All buses updated');
                                }
                            });
                        });
                    });
                }
            });
        } else {
            console.log('current_passengers column already exists');
            
            // Verify and fix passenger counts
            db.all("SELECT id FROM buses", [], (err, buses) => {
                if (err || !buses) {
                    console.error('Error fetching buses:', err);
                    return;
                }
                
                buses.forEach(bus => {
                    db.get("SELECT COUNT(*) as count FROM bus_assignments WHERE bus_id = ?", 
                        [bus.id], (err, row) => {
                        if (!err && row) {
                            db.get("SELECT current_passengers FROM buses WHERE id = ?", 
                                [bus.id], (err, busData) => {
                                if (!err && busData && busData.current_passengers !== row.count) {
                                    console.log(`⚠️ Fixing bus ${bus.id} passenger count: ${busData.current_passengers} → ${row.count}`);
                                    db.run("UPDATE buses SET current_passengers = ? WHERE id = ?", 
                                        [row.count, bus.id]);
                                }
                            });
                        }
                    });
                });
            });
        }
    });
}

// Call this after creating tables
runMigrations();
// Get bus assignments for an event
app.get('/api/events/:event_id/bus-assignments', (req, res) => {
    const { event_id } = req.params;
    
    const query = `
        SELECT ba.*, 
               u.name as user_name, u.student_number, u.email,
               b.bus_number, b.capacity,
               e.title as event_title
        FROM bus_assignments ba
        JOIN users u ON ba.user_id = u.id
        JOIN buses b ON ba.bus_id = b.id
        JOIN events e ON ba.event_id = e.id
        WHERE ba.event_id = ?
        ORDER BY b.bus_number, ba.assignment_date
    `;
    
    db.all(query, [event_id], (err, assignments) => {
        if (err) {
            console.error('Error fetching bus assignments:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(assignments);
    });
});

// Get bus assignments for a bus
app.get('/api/buses/:bus_id/assignments', (req, res) => {
    const { bus_id } = req.params;
    
    const query = `
        SELECT ba.*, 
               u.name as user_name, u.student_number, u.email,
               b.bus_number, b.capacity,
               e.title as event_title, e.date as event_date
        FROM bus_assignments ba
        JOIN users u ON ba.user_id = u.id
        JOIN buses b ON ba.bus_id = b.id
        JOIN events e ON ba.event_id = e.id
        WHERE ba.bus_id = ?
        ORDER BY ba.assignment_date
    `;
    
    db.all(query, [bus_id], (err, assignments) => {
        if (err) {
            console.error('Error fetching bus assignments:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(assignments);
    });
});

// Move participant to different bus
app.put('/api/bus-assignments/:assignment_id', (req, res) => {
    const { assignment_id } = req.params;
    const { new_bus_id, notes } = req.body;
    
    if (!new_bus_id) {
        return res.status(400).json({ error: 'New bus ID is required' });
    }
    
    // Use async/await pattern instead of nested callbacks
    const moveAssignment = async () => {
        try {
            // Get current assignment
            const assignment = await new Promise((resolve, reject) => {
                db.get("SELECT * FROM bus_assignments WHERE id = ?", [assignment_id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            
            if (!assignment) {
                return res.status(404).json({ error: 'Assignment not found' });
            }
            
            const old_bus_id = assignment.bus_id;
            
            // Check if new bus exists
            const newBus = await new Promise((resolve, reject) => {
                db.get("SELECT * FROM buses WHERE id = ?", [new_bus_id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            
            if (!newBus) {
                return res.status(404).json({ error: 'New bus not found' });
            }
            
            // Check new bus capacity
            const busCount = await new Promise((resolve, reject) => {
                db.get("SELECT COUNT(*) as count FROM bus_assignments WHERE bus_id = ?", 
                    [new_bus_id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                });
            });
            
            if (busCount >= newBus.capacity) {
                return res.status(400).json({ error: 'New bus is at full capacity' });
            }
            
            // Update assignment notes
            const updatedNotes = notes ? 
                `${assignment.notes || ''}\nMoved to bus ${newBus.bus_number} on ${new Date().toLocaleString()}: ${notes}`.trim() 
                : assignment.notes;
            
            // Update assignment
            await new Promise((resolve, reject) => {
                db.run("UPDATE bus_assignments SET bus_id = ?, notes = ? WHERE id = ?", 
                    [new_bus_id, updatedNotes, assignment_id], 
                    function(err) {
                        if (err) reject(err);
                        else resolve(this);
                    });
            });
            
            // Update old bus passenger count
            await new Promise((resolve, reject) => {
                db.run("UPDATE buses SET current_passengers = current_passengers - 1 WHERE id = ?", 
                    [old_bus_id], function(err) {
                        if (err) reject(err);
                        else resolve(this);
                    });
            });
            
            // Update new bus passenger count
            await new Promise((resolve, reject) => {
                db.run("UPDATE buses SET current_passengers = current_passengers + 1 WHERE id = ?", 
                    [new_bus_id], function(err) {
                        if (err) reject(err);
                        else resolve(this);
                    });
            });
            
            res.json({ success: true, message: 'Assignment moved successfully' });
            
        } catch (error) {
            console.error('Error moving bus assignment:', error);
            res.status(500).json({ error: 'Database error: ' + error.message });
        }
    };
    
    moveAssignment();
});

// Remove bus assignment
app.delete('/api/bus-assignments/:assignment_id', (req, res) => {
    const { assignment_id } = req.params;
    
    const removeAssignment = async () => {
        try {
            // Get assignment details
            const assignment = await new Promise((resolve, reject) => {
                db.get("SELECT * FROM bus_assignments WHERE id = ?", [assignment_id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            
            if (!assignment) {
                return res.status(404).json({ error: 'Assignment not found' });
            }
            
            const bus_id = assignment.bus_id;
            
            // Delete assignment
            const result = await new Promise((resolve, reject) => {
                db.run("DELETE FROM bus_assignments WHERE id = ?", [assignment_id], function(err) {
                    if (err) reject(err);
                    else resolve(this);
                });
            });
            
            if (result.changes === 0) {
                return res.status(404).json({ error: 'Assignment not found' });
            }
            
            // Update bus passenger count
            await new Promise((resolve, reject) => {
                db.run("UPDATE buses SET current_passengers = current_passengers - 1 WHERE id = ?", 
                    [bus_id], function(err) {
                        if (err) reject(err);
                        else resolve(this);
                    });
            });
            
            res.json({ success: true, message: 'Assignment removed successfully' });
            
        } catch (error) {
            console.error('Error removing bus assignment:', error);
            res.status(500).json({ error: 'Database error: ' + error.message });
        }
    };
    
    removeAssignment();
});

// Get participants eligible for bus assignment (approved registrations not yet assigned)
// Get participants eligible for bus assignment (approved registrations not yet assigned)
app.get('/api/events/:event_id/eligible-participants', (req, res) => {
    const { event_id } = req.params;
    
    console.log(`\n=== Fetching eligible participants for event ${event_id} ===`);
    
    // BETTER QUERY: Use NOT EXISTS instead of LEFT JOIN
    const query = `
        SELECT 
            u.id, 
            u.name, 
            u.student_number, 
            u.email,
            rr.status, 
            rr.created_at as registration_date,
            e.title as event_title
        FROM users u
        JOIN registration_requests rr ON u.id = rr.user_id
        JOIN events e ON rr.event_id = e.id
        WHERE e.id = ? 
          AND rr.status = 'approved'
          AND e.status != 'cancelled'
          AND NOT EXISTS (
              SELECT 1 
              FROM bus_assignments ba 
              WHERE ba.user_id = u.id 
                AND ba.event_id = e.id
          )
        ORDER BY u.name
    `;
    
    console.log('SQL Query:', query.replace(/\s+/g, ' '));
    
    db.all(query, [event_id], (err, participants) => {
        if (err) {
            console.error('❌ Error fetching eligible participants:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        
        console.log(`✅ Found ${participants.length} eligible participants`);
        
        // DEBUG: Also show who has assignments
        const debugQuery = `
            SELECT 
                u.id,
                u.name,
                ba.id as assignment_id,
                b.bus_number
            FROM users u
            JOIN registration_requests rr ON u.id = rr.user_id
            LEFT JOIN bus_assignments ba ON u.id = ba.user_id AND rr.event_id = ba.event_id
            LEFT JOIN buses b ON ba.bus_id = b.id
            WHERE rr.event_id = ? 
              AND rr.status = 'approved'
            ORDER BY u.name
        `;
        
        db.all(debugQuery, [event_id], (debugErr, allUsers) => {
            if (!debugErr && allUsers) {
                console.log('\n📊 ALL APPROVED USERS FOR THIS EVENT:');
                allUsers.forEach(user => {
                    const status = user.assignment_id 
                        ? `🚌 Assigned to Bus ${user.bus_number} (ID: ${user.assignment_id})` 
                        : '✅ Eligible (no assignment)';
                    console.log(`  - ${user.name} (ID: ${user.id}): ${status}`);
                });
            }
            
            console.log('\n📋 RETURNING ELIGIBLE PARTICIPANTS:');
            participants.forEach(p => {
                console.log(`  - ${p.name} (ID: ${p.id})`);
            });
            
            res.json(participants);
        });
    });
});
// Clean up inconsistent data
app.get('/api/fix-bus-data', (req, res) => {
    console.log('Fixing bus assignment data inconsistencies...');
    
    // Fix 1: Update bus passenger counts
    db.run(`
        UPDATE buses 
        SET current_passengers = (
            SELECT COUNT(*) 
            FROM bus_assignments 
            WHERE bus_id = buses.id
        )
    `, (err) => {
        if (err) {
            console.error('Error fixing passenger counts:', err);
            return res.status(500).json({ error: err.message });
        }
        
        console.log('✅ Bus passenger counts updated');
        
        // Fix 2: Find and log any users with multiple assignments (shouldn't happen)
        db.all(`
            SELECT user_id, event_id, COUNT(*) as assignment_count
            FROM bus_assignments
            GROUP BY user_id, event_id
            HAVING assignment_count > 1
        `, [], (err, duplicates) => {
            if (err) {
                console.error('Error checking duplicates:', err);
                return res.status(500).json({ error: err.message });
            }
            
            if (duplicates.length > 0) {
                console.log('⚠️ Found duplicate assignments:', duplicates);
            } else {
                console.log('✅ No duplicate assignments found');
            }
            
            res.json({ 
                success: true, 
                message: 'Data fixed',
                duplicates_found: duplicates.length
            });
        });
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