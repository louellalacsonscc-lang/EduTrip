const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// MySQL Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'edutrip',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.error('❌ Error connecting to MySQL:', err);
        process.exit(1);
    }
    console.log('✅ Connected to MySQL database');
    createTables();
});

// Function to create tables if they don't exist
function createTables() {
    const tables = [
        `CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            student_number VARCHAR(50),
            course VARCHAR(50),
            section VARCHAR(5),
            year VARCHAR(20),
            birthdate DATE,
            age INT,
            sex VARCHAR(10),
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'student',
            verified BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS email_verifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            verification_code VARCHAR(10) NOT NULL,
            expires_at DATETIME NOT NULL,
            verified BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,

        `CREATE TABLE IF NOT EXISTS password_resets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            reset_token VARCHAR(10) NOT NULL,
            expires_at DATETIME NOT NULL,
            used BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,

        `CREATE TABLE IF NOT EXISTS events (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            date DATE,
            location VARCHAR(255),
            course VARCHAR(50) DEFAULT 'ALL',
            image_url VARCHAR(255),
            max_participants INT,
            current_participants INT DEFAULT 0,
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS registration_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            event_id INT NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            registration_form VARCHAR(255),
            waiver_form VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
        )`,

        `CREATE TABLE IF NOT EXISTS buses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            bus_number VARCHAR(50) UNIQUE NOT NULL,
            capacity INT NOT NULL,
            current_passengers INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS bus_assignments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            event_id INT NOT NULL,
            bus_id INT NOT NULL,
            assignment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            notes TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
            FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE CASCADE,
            UNIQUE KEY unique_user_event (user_id, event_id)
        )`,

        `CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(50) DEFAULT 'info',
            is_read BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`
    ];

    tables.forEach((sql, index) => {
        db.query(sql, (err) => {
            if (err) {
                console.error(`Error creating table ${index + 1}:`, err);
            } else {
                console.log(`Table ${index + 1} ready`);
            }
        });
    });

    const tableUpdates = [
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS course VARCHAR(50)`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS section VARCHAR(5)`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS year VARCHAR(20)`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS birthdate DATE`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS age INT`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS sex VARCHAR(10)`
    ];

    tableUpdates.forEach((sql) => {
        db.query(sql, (err) => {
            if (err && err.code !== 'ER_DUP_FIELDNAME') {
                console.error('Error updating users table schema:', err);
            }
        });
    });

    db.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS course VARCHAR(50) DEFAULT 'ALL'`, (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME') {
            console.error('Error updating events table schema:', err);
        }
    });

    db.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url VARCHAR(255)`, (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME') {
            console.error('Error updating events table schema:', err);
        }
    });

    // Hash passwords and insert users
    const adminPassword = 'admin123';
    const studentPassword = 'student123';

    // Hash admin password
    bcrypt.hash(adminPassword, 10, (err, adminHash) => {
        if (err) {
            console.error('Error hashing admin password:', err);
            return;
        }

        // Insert admin
        db.query(`INSERT IGNORE INTO users (name, email, password, role, verified) VALUES (?, ?, ?, ?, 1)`,
            ['Admin', 'admin@edutrip.com', adminHash, 'admin'], (err) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        console.log('✅ Admin user already exists');
                    } else {
                        console.error('Error inserting admin:', err);
                    }
                } else {
                    console.log('✅ Admin user created with password: admin123');
                }
            });
    });

    // Hash student password
    bcrypt.hash(studentPassword, 10, (err, studentHash) => {
        if (err) {
            console.error('Error hashing student password:', err);
            return;
        }

        // Insert student
        db.query(`INSERT IGNORE INTO users (name, student_number, email, password, role, verified) VALUES (?, ?, ?, ?, ?, 1)`,
            ['John Student', 'S123456', 'student@edutrip.com', studentHash, 'student'], (err) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        console.log('✅ Student user already exists');
                    } else {
                        console.error('Error inserting student:', err);
                    }
                } else {
                    console.log('✅ Student user created with password: student123');
                }
            });
    });
}

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

const transporter = (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) ? nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
}) : null;

if (transporter) {
    transporter.verify(function (error, success) {
        if (error) {
            console.log('❌ Email configuration error:', error);
        } else {
            console.log('✅ Email server is ready to send messages');
        }
    });
} else {
    console.log('⚠️ Email credentials not set. Verification email delivery is disabled.');
}

function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, verificationCode, userName) {
    if (!transporter) {
        console.warn('⚠️ Email credentials are missing. Skipping SMTP send.');
        console.log(`Verification code for ${email}: ${verificationCode}`);
        return false;
    }

    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
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
                        <p>© 2025 EduTrip. Educational Seminars & Tours Platform.</p>
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

// Middleware - Serve static files
app.use(express.json());
app.use(express.static('.'));
app.use('/main', express.static('main'));
app.use('/student', express.static('student'));
app.use('/img', express.static('img'));
app.use('/uploads', express.static('uploads'));
app.use('/frontp', express.static('frontp'));

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

// Routes

// Login endpoint
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    console.log('🔐 Login attempt for:', email);

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
        if (err) {
            console.log('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (results.length === 0) {
            console.log('User not found:', email);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = results[0];
        console.log('✅ User found:', {
            email: user.email,
            role: user.role,
            verified: user.verified,
            id: user.id
        });

        const isVerified = user.verified === 1 || user.verified === true;

        if (!isVerified) {
            console.log('❌ User not verified. verified value:', user.verified);
            return res.status(403).json({
                error: 'Email not verified. Please check your email for verification code.',
                requires_verification: true,
                user_id: user.id
            });
        }

        if (bcrypt.compareSync(password, user.password)) {
            console.log('✅ Login successful for:', user.email);
            res.json({
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    student_number: user.student_number,
                    course: user.course,
                    section: user.section,
                    year: user.year,
                    birthdate: user.birthdate,
                    age: user.age,
                    sex: user.sex,
                    email: user.email,
                    role: user.role
                }
            });
        } else {
            console.log('❌ Invalid password for:', email);
            res.status(401).json({ error: 'Invalid email or password' });
        }
    });
});

// Register endpoint
app.post('/api/register', async (req, res) => {
    const { name, studentNumber, course, section, year, birthdate, age, sex, email, password } = req.body;

    if (!name || !studentNumber || !course || !section || !year || !birthdate || !age || !sex || !email || !password) {
        return res.status(400).json({ error: 'All student profile fields are required' });
    }

    if (!['BSCS', 'BSHM', 'BSTM', 'BAPOLSCI', 'BSED', 'BSBA'].includes(course)) {
        return res.status(400).json({ error: 'Invalid course selection' });
    }

    if (!['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].includes(section)) {
        return res.status(400).json({ error: 'Invalid section selection' });
    }

    if (!['1st yr', '2nd yr', '3rd yr', '4th yr'].includes(year)) {
        return res.status(400).json({ error: 'Invalid year selection' });
    }

    if (!['female', 'male'].includes(sex.toLowerCase())) {
        return res.status(400).json({ error: 'Invalid sex selection' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
        if (err) {
            console.error('Registration error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.length > 0) {
            const existingUser = results[0];

            if (!existingUser.verified) {
                const verificationCode = generateVerificationCode();
                const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

                db.query("DELETE FROM email_verifications WHERE user_id = ?", [existingUser.id], (err) => {
                    if (err) {
                        console.error('Error clearing old verifications:', err);
                    }

                    db.query("INSERT INTO email_verifications (user_id, verification_code, expires_at) VALUES (?, ?, ?)",
                        [existingUser.id, verificationCode, expiresAt], async (err) => {
                            if (err) {
                                console.error('Error storing verification code:', err);
                                return res.status(500).json({ error: 'Failed to create verification code' });
                            }

                            const emailSent = await sendVerificationEmail(email, verificationCode, existingUser.name);

                            if (emailSent) {
                                res.json({
                                    success: true,
                                    message: 'Verification code resent! Please check your email.',
                                    requires_verification: true,
                                    user_id: existingUser.id
                                });
                            } else {
                                res.json({
                                    success: true,
                                    message: 'Verification code generated. Email delivery is disabled or failed.',
                                    requires_verification: true,
                                    user_id: existingUser.id,
                                    verification_code: verificationCode
                                });
                            }
                        }
                    );
                });
                return;
            }

            return res.status(400).json({ error: 'Email already exists and is verified. Please login instead.' });
        }

        const hashedPassword = bcrypt.hashSync(password, 10);

        db.query("INSERT INTO users (name, student_number, course, section, year, birthdate, age, sex, email, password, verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
            [name, studentNumber, course, section, year, birthdate, age, sex.toLowerCase(), email, hashedPassword], async (err, result) => {
                if (err) {
                    console.error('Registration error:', err);
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(400).json({ error: 'Email already exists' });
                    }
                    return res.status(500).json({ error: 'Registration failed' });
                }

                const userId = result.insertId;
                const verificationCode = generateVerificationCode();
                const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

                db.query("INSERT INTO email_verifications (user_id, verification_code, expires_at) VALUES (?, ?, ?)",
                    [userId, verificationCode, expiresAt], async (err) => {
                        if (err) {
                            console.error('Error storing verification code:', err);
                            return res.status(500).json({ error: 'Failed to create verification code' });
                        }

                        const emailSent = await sendVerificationEmail(email, verificationCode, name);

                        if (emailSent) {
                            res.json({
                                success: true,
                                message: 'Registration successful! Please check your email for verification code.',
                                requires_verification: true,
                                user_id: userId
                            });
                        } else {
                            res.json({
                                success: true,
                                message: 'Registration successful! Email delivery is disabled or failed. Use the verification code shown.',
                                requires_verification: true,
                                user_id: userId,
                                verification_code: verificationCode
                            });
                        }
                    }
                );
            });
    });
});

app.post('/api/user/update-profile', (req, res) => {
    const { user_id, course, section, year, birthdate, age, sex } = req.body;
    const numericUserId = Number(user_id);
    const normalizedSex = typeof sex === 'string' ? sex.toLowerCase() : '';

    if (!numericUserId || !course || !section || !year || !birthdate || !age || !normalizedSex) {
        return res.status(400).json({ error: 'All profile fields are required' });
    }

    if (!['BSCS', 'BSHM', 'BSTM', 'BAPOLSCI', 'BSED', 'BSBA'].includes(course)) {
        return res.status(400).json({ error: 'Invalid course selection' });
    }

    if (!['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].includes(section)) {
        return res.status(400).json({ error: 'Invalid section selection' });
    }

    if (!['1st yr', '2nd yr', '3rd yr', '4th yr'].includes(year)) {
        return res.status(400).json({ error: 'Invalid year selection' });
    }

    if (!['female', 'male'].includes(normalizedSex)) {
        return res.status(400).json({ error: 'Invalid sex selection' });
    }

    const sql = 'UPDATE users SET course = ?, section = ?, year = ?, birthdate = ?, age = ?, sex = ? WHERE id = ?';
    const params = [course, section, year, birthdate, Number(age), normalizedSex, numericUserId];

    db.query(sql, params, (err, result) => {
        if (err) {
            console.error('Profile update error:', err);
            return res.status(500).json({ error: 'Database error while updating profile' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ success: true, message: 'Profile updated successfully' });
    });
});

// Verify email endpoint
app.post('/api/verify-email', (req, res) => {
    const { user_id, verification_code } = req.body;

    if (!user_id || !verification_code) {
        return res.status(400).json({ error: 'User ID and verification code are required' });
    }

    const now = new Date();

    db.query(
        `SELECT * FROM email_verifications 
         WHERE user_id = ? 
         AND verification_code = ?
         AND expires_at > ?
         AND verified = 0`,
        [user_id, verification_code, now], (err, results) => {
            if (err) {
                console.error('Verification error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (results.length === 0) {
                return res.status(400).json({ error: 'Invalid or expired verification code' });
            }

            const verification = results[0];

            db.query("UPDATE email_verifications SET verified = 1 WHERE id = ?", [verification.id], (err) => {
                if (err) {
                    console.error('Error updating verification:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                db.query("UPDATE users SET verified = 1 WHERE id = ?", [user_id], (err) => {
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

app.post('/api/resend-verification', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    db.query('SELECT * FROM users WHERE email = ?', [email], (err, users) => {
        if (err) {
            console.error('Resend verification lookup error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];

        if (user.verified === 1 || user.verified === true) {
            return res.status(400).json({ error: 'Email is already verified' });
        }

        const verificationCode = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        db.query('DELETE FROM email_verifications WHERE user_id = ?', [user.id], (err) => {
            if (err) {
                console.error('Error clearing old verifications:', err);
            }

            db.query('INSERT INTO email_verifications (user_id, verification_code, expires_at) VALUES (?, ?, ?)',
                [user.id, verificationCode, expiresAt], async (err) => {
                    if (err) {
                        console.error('Error storing verification code:', err);
                        return res.status(500).json({ error: 'Failed to create verification code' });
                    }

                    const emailSent = await sendVerificationEmail(email, verificationCode, user.name);

                    if (emailSent) {
                        res.json({ success: true, message: 'Verification code resent! Please check your email.', requires_verification: true });
                    } else {
                        res.json({ success: true, message: 'Verification code generated. Email delivery is disabled or failed.', requires_verification: true, verification_code: verificationCode });
                    }
                }
            );
        });
    });
});

// Get events for front page
app.get('/api/frontpage-events', (req, res) => {
    db.query("SELECT * FROM events WHERE status = 'active' ORDER BY date DESC LIMIT 5", (err, results) => {
        if (err) {
            console.log('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

// Get all events
app.get('/api/events', (req, res) => {
    const course = req.query.course ? req.query.course.toString().toUpperCase() : null;
    const validCourses = ['BSCS', 'BSHM', 'BSTM', 'BAPOLSCI', 'BSED', 'BSBA', 'ALL'];

    let sql = "SELECT * FROM events WHERE status = 'active'";
    const params = [];

    if (course && validCourses.includes(course)) {
        sql += " AND (course = ? OR course = 'ALL')";
        params.push(course);
    }

    sql += " ORDER BY date";

    db.query(sql, params, (err, results) => {
        if (err) {
            console.log('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

// Get event by ID
app.get('/api/events/:id', (req, res) => {
    const { id } = req.params;

    db.query("SELECT * FROM events WHERE id = ?", [id], (err, results) => {
        if (err) {
            console.log('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        res.json(results[0]);
    });
});

// Get user's registration requests
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

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.log('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

// Forgot password
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
        if (err) {
            console.error('Error finding user:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = results[0];
        const resetToken = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000);

        db.query("INSERT INTO password_resets (user_id, reset_token, expires_at) VALUES (?, ?, ?)",
            [user.id, resetToken, expiresAt], async (err) => {
                if (err) {
                    console.error('Error storing reset token:', err);
                    return res.status(500).json({ error: 'Failed to create reset token' });
                }

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
app.post('/api/verify-reset-token', (req, res) => {
    const { email, user_id, reset_token } = req.body;

    if (!reset_token) {
        return res.status(400).json({ error: 'Reset token is required' });
    }

    if (!email && !user_id) {
        return res.status(400).json({ error: 'Either email or user ID is required' });
    }

    const now = new Date();

    const verifyToken = (userId) => {
        db.query(
            `SELECT * FROM password_resets 
             WHERE user_id = ? 
             AND reset_token = ?
             AND expires_at > ?
             AND used = 0`,
            [userId, reset_token, now], (err, results) => {
                if (err) {
                    console.error('Token verification error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                if (results.length === 0) {
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
        verifyToken(user_id);
    } else if (email) {
        db.query("SELECT id FROM users WHERE email = ?", [email], (err, results) => {
            if (err) {
                console.error('Verify token error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (results.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            verifyToken(results[0].id);
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

    const now = new Date();

    db.query("SELECT id, name, verified FROM users WHERE email = ?", [email], (err, userResults) => {
        if (err) {
            console.error('Reset error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (userResults.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResults[0];

        db.query(
            `SELECT * FROM password_resets 
             WHERE user_id = ? 
             AND reset_token = ?
             AND expires_at > ?
             AND used = 0`,
            [user.id, reset_token, now], (err, resetResults) => {
                if (err) {
                    console.error('Token verification error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                if (resetResults.length === 0) {
                    return res.status(400).json({ error: 'Invalid or expired reset token' });
                }

                const reset = resetResults[0];
                const hashedPassword = bcrypt.hashSync(new_password, 10);

                db.query("UPDATE users SET password = ? WHERE id = ?",
                    [hashedPassword, user.id], (err) => {
                        if (err) {
                            console.error('Error updating password:', err);
                            return res.status(500).json({ error: 'Database error' });
                        }

                        db.query("UPDATE password_resets SET used = 1 WHERE id = ?", [reset.id], (err) => {
                            if (err) {
                                console.error('Error marking token as used:', err);
                            }

                            res.json({
                                success: true,
                                message: 'Password reset successfully! You can now login with your new password.',
                                user_id: user.id,
                                was_verified: user.verified === 1
                            });
                        });
                    });
            });
    });
});

// Create registration request with file upload
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

    db.query("SELECT * FROM registration_requests WHERE user_id = ? AND event_id = ?",
        [user_id, event_id], (err, results) => {
            if (err) {
                console.error('Error checking existing request:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (results.length > 0) {
                return res.status(400).json({ error: 'Already registered for this event' });
            }

            db.query("INSERT INTO registration_requests (user_id, event_id, registration_form, waiver_form) VALUES (?, ?, ?, ?)",
                [user_id, event_id, registrationForm, waiverForm], (err, result) => {
                    if (err) {
                        console.log('Database error creating request:', err);
                        return res.status(500).json({ error: 'Database error' });
                    }
                    res.json({ success: true, message: 'Registration request submitted successfully' });
                });
        });
});

// Get all registration requests (admin) - UPDATED with file URLs
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

    db.query(query, (err, results) => {
        if (err) {
            console.log('Database error fetching requests:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }

        // Add full file URLs to each request
        const requestsWithFileUrls = results.map(request => {
            return {
                ...request,
                registration_form_url: request.registration_form ?
                    `/api/uploads/${request.registration_form}` : null,
                waiver_form_url: request.waiver_form ?
                    `/api/uploads/${request.waiver_form}` : null,
                registration_form_direct: request.registration_form ?
                    `/uploads/${request.registration_form}` : null,
                waiver_form_direct: request.waiver_form ?
                    `/uploads/${request.waiver_form}` : null
            };
        });

        console.log(`Found ${results.length} registration requests`);
        res.json(requestsWithFileUrls);
    });
});

// Create new event
app.post('/api/events', upload.single('image'), (req, res) => {
    const { title, description, date, location, course, status } = req.body;
    const normalizedCourse = typeof course === 'string' ? course.toUpperCase() : 'ALL';
    const validCourses = ['BSCS', 'BSHM', 'BSTM', 'BAPOLSCI', 'BSED', 'BSBA', 'ALL'];
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    
    // Default to 'hidden' if no status provided
    const eventStatus = status || 'hidden';

    if (!title || !description || !date || !location || !normalizedCourse) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (!validCourses.includes(normalizedCourse)) {
        return res.status(400).json({ error: 'Invalid course selection' });
    }

    db.query("INSERT INTO events (title, description, date, location, course, image_url, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [title, description, date, location, normalizedCourse, imageUrl, eventStatus], 
        (err, result) => {
            if (err) {
                console.log('Database error creating event:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true, message: 'Event created successfully', eventId: result.insertId });
        });
});

// Delete event
app.delete('/api/events/:id', (req, res) => {
    const { id } = req.params;

    db.query("SELECT COUNT(*) as count FROM registration_requests WHERE event_id = ?", [id], (err, results) => {
        if (err) {
            console.log('Database error checking registrations:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (results[0].count > 0) {
            return res.status(400).json({ error: 'Cannot delete event with existing registrations' });
        }

        db.query("DELETE FROM events WHERE id = ?", [id], (err, result) => {
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

    db.query("UPDATE registration_requests SET status = ? WHERE id = ?",
        [status, id], (err, result) => {
            if (err) {
                console.log('Database error updating request:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true, message: 'Request updated successfully' });
        });
});

// Update event
app.put('/api/events/:id', (req, res) => {
    const { id } = req.params;
    const { title, description, date, location, status, course } = req.body;
    const normalizedCourse = typeof course === 'string' ? course.toUpperCase() : 'ALL';
    const validCourses = ['BSCS', 'BSHM', 'BSTM', 'BAPOLSCI', 'BSED', 'BSBA', 'ALL'];

    if (!title || !description || !date || !location || !normalizedCourse) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (!validCourses.includes(normalizedCourse)) {
        return res.status(400).json({ error: 'Invalid course selection' });
    }

    const validStatuses = ['active', 'cancelled', 'completed', 'upcoming'];
    const eventStatus = status && validStatuses.includes(status) ? status : 'active';

    db.query(
        `UPDATE events 
         SET title = ?, description = ?, date = ?, location = ?, status = ?, course = ?
         WHERE id = ?`,
        [title, description, date, location, eventStatus, normalizedCourse, id],
        (err, result) => {
            if (err) {
                console.log('Database error updating event:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true, message: 'Event updated successfully' });
        }
    );
});

// Bus Management Endpoints

// Create new bus
app.post('/api/buses', (req, res) => {
    const { bus_number, capacity } = req.body;

    if (!bus_number || !capacity) {
        return res.status(400).json({ error: 'Bus number and capacity are required' });
    }

    if (capacity <= 0) {
        return res.status(400).json({ error: 'Capacity must be greater than 0' });
    }

    db.query("INSERT INTO buses (bus_number, capacity) VALUES (?, ?)",
        [bus_number, capacity], (err, result) => {
            if (err) {
                console.error('Error creating bus:', err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'Bus number already exists' });
                }
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true, message: 'Bus created successfully', busId: result.insertId });
        });
});

// Get all buses
app.get('/api/buses', (req, res) => {
    db.query("SELECT * FROM buses ORDER BY bus_number", (err, results) => {
        if (err) {
            console.error('Error fetching buses:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

// Get bus by ID
app.get('/api/buses/:id', (req, res) => {
    const { id } = req.params;

    db.query("SELECT * FROM buses WHERE id = ?", [id], (err, results) => {
        if (err) {
            console.error('Error fetching bus:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Bus not found' });
        }
        res.json(results[0]);
    });
});

// Assign participant to bus
app.post('/api/bus-assignments', (req, res) => {
    const { user_id, event_id, bus_id, notes } = req.body;

    console.log('\n=== 🚌 BUS ASSIGNMENT REQUEST ===');
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));

    if (!user_id || !event_id || !bus_id) {
        console.log('❌ Missing required fields');
        return res.status(400).json({
            error: 'User ID, Event ID, and Bus ID are required',
            received: { user_id, event_id, bus_id }
        });
    }

    const userId = parseInt(user_id);
    const eventId = parseInt(event_id);
    const busId = parseInt(bus_id);

    console.log(`🎯 Parsed IDs: user=${userId}, event=${eventId}, bus=${busId}`);

    const createAssignment = async () => {
        try {
            // 1. Check if bus exists
            console.log(`🔍 Checking bus ${busId}...`);
            const [bus] = await db.promise().query("SELECT * FROM buses WHERE id = ?", [busId]);

            if (bus.length === 0) {
                console.log(`❌ Bus ${busId} not found`);
                return res.status(404).json({ error: `Bus ${busId} not found` });
            }

            const busData = bus[0];
            console.log(`✅ Bus found: ${busData.bus_number} (Capacity: ${busData.capacity}, Current: ${busData.current_passengers})`);

            // 2. Check if user already assigned
            console.log(`🔍 Checking if user ${userId} already assigned to event ${eventId}...`);
            const [existing] = await db.promise().query(
                "SELECT * FROM bus_assignments WHERE user_id = ? AND event_id = ?",
                [userId, eventId]
            );

            if (existing.length > 0) {
                console.log(`❌ User already assigned to bus ${existing[0].bus_id}`);
                return res.status(400).json({
                    error: 'User is already assigned to a bus for this event',
                    existing_assignment: existing[0]
                });
            }

            // 3. Check bus capacity
            console.log(`🔍 Checking bus ${busId} capacity...`);
            const [busCount] = await db.promise().query(
                "SELECT COUNT(*) as count FROM bus_assignments WHERE bus_id = ?",
                [busId]
            );

            const count = busCount[0].count;
            console.log(`📊 Bus ${busId} has ${count}/${busData.capacity} assignments`);

            if (count >= busData.capacity) {
                console.log(`❌ Bus ${busData.bus_number} is FULL: ${count}/${busData.capacity}`);
                return res.status(400).json({
                    error: `Bus ${busData.bus_number} is at full capacity (${count}/${busData.capacity})`
                });
            }

            // 4. Check if user has approved registration
            console.log(`🔍 Checking if user ${userId} has approved registration for event ${eventId}...`);
            const [approvedRegistration] = await db.promise().query(
                `SELECT * FROM registration_requests 
                 WHERE user_id = ? AND event_id = ? AND status = 'approved'`,
                [userId, eventId]
            );

            if (approvedRegistration.length === 0) {
                console.log('❌ User does not have approved registration for this event');
                return res.status(400).json({
                    error: 'User does not have an approved registration for this event'
                });
            }

            console.log('✅ User has approved registration');

            // 5. Create the assignment
            console.log('📝 Creating bus assignment...');
            const [result] = await db.promise().query(
                "INSERT INTO bus_assignments (user_id, event_id, bus_id, notes) VALUES (?, ?, ?, ?)",
                [userId, eventId, busId, notes || '']
            );

            console.log(`✅ Assignment created with ID: ${result.insertId}`);

            // 6. Update bus passenger count
            console.log(`🔄 Updating bus ${busId} passenger count...`);
            const [updateResult] = await db.promise().query(
                "UPDATE buses SET current_passengers = current_passengers + 1 WHERE id = ?",
                [busId]
            );

            console.log(`✅ Bus ${busId} passenger count updated (changed: ${updateResult.affectedRows})`);

            console.log('🎉 BUS ASSIGNMENT SUCCESSFUL!');
            res.json({
                success: true,
                message: 'Bus assignment created successfully',
                assignmentId: result.insertId,
                bus: {
                    id: busId,
                    number: busData.bus_number,
                    capacity: busData.capacity,
                    newPassengerCount: count + 1
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

    db.query(query, [event_id], (err, results) => {
        if (err) {
            console.error('Error fetching bus assignments:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

// Get eligible participants for bus assignment
app.get('/api/events/:event_id/eligible-participants', (req, res) => {
    const { event_id } = req.params;

    console.log(`\n=== Fetching eligible participants for event ${event_id} ===`);

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

    db.query(query, [event_id], (err, results) => {
        if (err) {
            console.error('❌ Error fetching eligible participants:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }

        console.log(`✅ Found ${results.length} eligible participants`);
        res.json(results);
    });
});

// Notifications endpoints

// Create notification
app.post('/api/notifications', (req, res) => {
    const { user_id, title, message, type } = req.body;

    if (!user_id || !title || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    db.query("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
        [user_id, title, message, type || 'info'], (err, result) => {
            if (err) {
                console.error('Error creating notification:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true, notificationId: result.insertId });
        });
});

// Get user notifications
app.get('/api/notifications/user/:user_id', (req, res) => {
    const { user_id } = req.params;

    db.query("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC",
        [user_id], (err, results) => {
            if (err) {
                console.error('Error fetching user notifications:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json(results);
        });
});

// Mark notification as read
app.put('/api/notifications/:id/read', (req, res) => {
    const { id } = req.params;

    db.query("UPDATE notifications SET is_read = 1 WHERE id = ?", [id], (err, result) => {
        if (err) {
            console.error('Error marking notification as read:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true });
    });
});

// Serve uploaded files
app.get('/api/uploads/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'uploads', filename);

    console.log(`📁 File request: ${filename}`);
    console.log(`📁 File path: ${filePath}`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        console.log(`❌ File not found: ${filename}`);
        return res.status(404).json({ error: 'File not found: ' + filename });
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    console.log(`✅ File found: ${filename} (${stats.size} bytes)`);

    // Set appropriate headers
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';

    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.doc') contentType = 'application/msword';
    else if (ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (ext === '.txt') contentType = 'text/plain';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    // Create read stream
    const fileStream = fs.createReadStream(filePath);

    fileStream.on('error', (err) => {
        console.error('Error streaming file:', err);
        res.status(500).json({ error: 'Error reading file' });
    });

    fileStream.pipe(res);
});

// Also add a direct access route (just in case)
app.get('/uploads/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'uploads', filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found');
    }

    res.sendFile(filePath);
});
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Page routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontp/frontp.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'main/mainpage.html'));
});

app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin/admin-login.html'));
});

app.get('/verify-email.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'main/verify-email.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin/adminpage.html'));
});

app.get('/student', (req, res) => {
    res.sendFile(path.join(__dirname, 'student/studpage.html'));
});

// Logout route
app.post('/api/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
});

// Debug endpoint
app.get('/api/debug/db-state', (req, res) => {
    const tables = ['users', 'events', 'registration_requests', 'buses', 'bus_assignments'];
    const results = {};
    let completed = 0;

    tables.forEach(table => {
        db.query(`SELECT * FROM ${table}`, (err, rows) => {
            results[table] = { error: err, data: rows };
            completed++;

            if (completed === tables.length) {
                res.json(results);
            }
        });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 EduTrip server running on http://localhost:${PORT}`);
    console.log(`📊 Using MySQL database: ${process.env.DB_NAME || 'edutrip'}`);
    console.log(`🔑 Test credentials:`);
    console.log(`   Admin: admin@edutrip.com / admin123`);
    console.log(`   Student: student@edutrip.com / student123`);
    console.log(`🐛 Debug endpoint available: http://localhost:${PORT}/api/debug/db-state`);
});