process.env.TZ = 'Asia/Manila';
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const nodemailer = require('nodemailer');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// MySQL Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'eduevent',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+08:00'
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.error('❌ Error connecting to MySQL:', err);
        process.exit(1);
    }
    console.log('✅ Connected to MySQL database');
    
    // Set session timezone to Philippines
    db.query("SET time_zone = '+08:00'", (err) => {
        if (err) {
            console.error('❌ Error setting timezone:', err);
        } else {
            console.log('✅ MySQL timezone set to Asia/Manila (GMT+8)');
        }
    });
    
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
            target_year VARCHAR(20) DEFAULT 'ALL',
            image_url VARCHAR(255),
            external_url VARCHAR(500),
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

        `CREATE TABLE IF NOT EXISTS announcements (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(50) DEFAULT 'info',
            target_type VARCHAR(50) DEFAULT 'all',
            target_course VARCHAR(50),
            target_event_id INT,
            created_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (target_event_id) REFERENCES events(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        )`,

        `CREATE TABLE IF NOT EXISTS announcement_reads (
            id INT AUTO_INCREMENT PRIMARY KEY,
            announcement_id INT NOT NULL,
            user_id INT NOT NULL,
            read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_announcement_user (announcement_id, user_id),
            FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,

                `CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(50) DEFAULT 'info',
            link VARCHAR(255),
            is_read BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,

        `CREATE TABLE IF NOT EXISTS certificates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            event_id INT NOT NULL,
            certificate_url VARCHAR(255),
            template_id INT,
            generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            sent BOOLEAN DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
        )`,

        `CREATE TABLE IF NOT EXISTS certificate_templates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            template_url VARCHAR(255) NOT NULL,
            is_default BOOLEAN DEFAULT 0,
            name_position TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS sex VARCHAR(10)`,
        `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link VARCHAR(255)`,
        `ALTER TABLE certificate_templates ADD COLUMN IF NOT EXISTS name_position TEXT`,
        `ALTER TABLE events ADD COLUMN IF NOT EXISTS external_url VARCHAR(500)`,
        `ALTER TABLE events ADD COLUMN IF NOT EXISTS target_year VARCHAR(20)`
    ];

    // Execute each ALTER statement
    tableUpdates.forEach((sql) => {
        db.query(sql, (err) => {
            if (err && err.code !== 'ER_DUP_FIELDNAME' && err.code !== 'ER_BAD_FIELD_ERROR') {
                console.error('Error updating table schema:', err);
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
            ['Admin', 'admin@eduevent.com', adminHash, 'admin'], (err) => {
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
            ['John Student', 'S123456', 'student@eduevent.com', studentHash, 'student'], (err) => {
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
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000
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
            subject: 'Verify Your EduEvent Account',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #1f2937; padding: 20px; text-align: center;">
                        <h1 style="color: #3b82f6; margin: 0;">EduEvent</h1>
                        <p style="color: #9ca3af; margin: 5px 0;">Educational Trips & Events Platform</p>
                    </div>
                    <div style="padding: 30px; background: #111827; color: #e5e7eb;">
                        <h2 style="color: white; margin-top: 0;">Email Verification Required</h2>
                        <p>Hello ${userName},</p>
                        <p>Thank you for registering with EduEvent! Please use the verification code below to complete your registration:</p>
                        
                        <div style="background: #1f2937; padding: 20px; margin: 30px 0; text-align: center; border-radius: 8px;">
                            <div style="font-size: 32px; font-weight: bold; color: #3b82f6; letter-spacing: 10px;">
                                ${verificationCode}
                            </div>
                            <p style="color: #9ca3af; margin-top: 10px;">This code will expire in 24 hours</p>
                        </div>
                        
                        <p>If you didn't create an account with EduEvent, please ignore this email.</p>
                        <p>Best regards,<br>The EduEvent Team</p>
                    </div>
                    <div style="background: #030712; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                        <p>© 2025 EduEvent. Educational Seminars & Tours Platform.</p>
                        <p>This is an automated email, please do not reply.</p>
                    </div>
                </div>
            `,
            text: `Hello ${userName},\n\nThank you for registering with EduEvent! Your verification code is: ${verificationCode}\n\nThis code will expire in 24 hours.\n\nBest regards,\nThe EduEvent Team`
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

// Get all events - filter by course and year
app.get('/api/events', (req, res) => {
    const course = req.query.course ? req.query.course.toString().toUpperCase() : null;
    const year = req.query.year ? req.query.year.toString() : null;
    const validCourses = ['BSCS', 'BSHM', 'BSTM', 'BAPOLSCI', 'BSED', 'BSBA', 'ALL'];
    const includeAll = req.query.all === 'true';

    let sql = "SELECT * FROM events WHERE 1=1";
    const params = [];

    if (!includeAll) {
        sql += " AND status = 'active'";
    }

    if (course && validCourses.includes(course)) {
        sql += " AND (course = ? OR course = 'ALL')";
        params.push(course);
    }
    
    // ADD YEAR FILTER
    if (year) {
        sql += " AND (target_year = ? OR target_year = 'ALL')";
        params.push(year);
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
                        from: process.env.EMAIL_USER || 'eduevent@example.com',
                        to: email,
                        subject: 'Reset Your EduEvent Password',
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <div style="background: #1f2937; padding: 20px; text-align: center;">
                                    <h1 style="color: #3b82f6; margin: 0;">EduEvent</h1>
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
                                    <p>Best regards,<br>The EduEvent Team</p>
                                </div>
                                <div style="background: #030712; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                                    <p>© 2025 EduEvent. Educational platform for trips and events.</p>
                                    <p>This is an automated email, please do not reply.</p>
                                </div>
                            </div>
                        `,
                        text: `Hello ${user.name},\n\nWe received a request to reset your password. Use this code: ${resetToken}\n\nThis code will expire in 1 hour.\n\nImportant: After resetting your password, you will need to verify your email again.\n\nIf you didn't request a password reset, please ignore this email.\n\nBest regards,\nThe EduEvent Team`
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

// Get all registration requests (admin) - UPDATED with file URLs and user details
app.get('/api/registration-requests', (req, res) => {
    console.log('Fetching registration requests...');

    const query = `
        SELECT rr.*, 
               u.name, u.email, u.student_number, 
               u.course, u.year, u.section, u.sex, u.age,
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

        // File URLs
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
    const { title, description, date, location, course, target_year, status, external_url } = req.body;
    const normalizedCourse = typeof course === 'string' ? course.toUpperCase() : 'ALL';
    const normalizedTargetYear = target_year || 'ALL';
    const validCourses = ['BSCS', 'BSHM', 'BSTM', 'BAPOLSCI', 'BSED', 'BSBA', 'ALL'];
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const eventStatus = status || 'hidden';
    
    console.log('📅 Creating event with date:', date);

    if (!title || !description || !date || !location || !normalizedCourse) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (!validCourses.includes(normalizedCourse)) {
        return res.status(400).json({ error: 'Invalid course selection' });
    }

    db.query(
        "INSERT INTO events (title, description, date, location, course, target_year, image_url, external_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [title, description, date, location, normalizedCourse, normalizedTargetYear, imageUrl, external_url || null, eventStatus], 
        (err, result) => {
            if (err) {
                console.error('Database error creating event:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            const eventId = result.insertId;
            
            // Only create announcement if event is active
            if (eventStatus === 'active' || eventStatus === 'upcoming') {
                const eventDateFormatted = new Date(date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
                
                let targetType = 'all';
                let targetCourse = null;
                
                if (normalizedCourse !== 'ALL') {
                    targetType = 'course';
                    targetCourse = normalizedCourse;
                }
                
                const announcementTitle = `📢 New Event: ${title}`;
                const announcementMessage = `A new event has been added!\n\n` +
                    `📌 Event: ${title}\n` +
                    `📝 Description: ${description}\n` +
                    `📅 Date: ${eventDateFormatted}\n` +
                    `📍 Location: ${location}\n` +
                    `🎓 Course: ${normalizedCourse}\n\n` +
                    `Register now to secure your spot!`;
                
                db.query(
                    `INSERT INTO announcements (title, message, type, target_type, target_course, target_event_id, created_by) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [announcementTitle, announcementMessage, 'info', targetType, targetCourse, eventId, null],
                    (err) => {
                        if (err) {
                            console.error('Error creating event announcement:', err);
                        } else {
                            console.log(`✅ Announcement created for new event: ${title}`);
                        }
                    }
                );
            }
            
            res.json({ success: true, message: 'Event created successfully', eventId: eventId });
        }
    );
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
// Auto-complete events that have passed their date by 3 days
async function autoCompleteEvents() {
    try {
        // Find events that are active/upcoming and ended more than 3 days ago
        const query = `
            UPDATE events 
            SET status = 'completed' 
            WHERE status IN ('active', 'upcoming') 
            AND DATE_ADD(date, INTERVAL 3 DAY) < CURDATE()
        `;
        
        const [result] = await db.promise().query(query);
        
        if (result.affectedRows > 0) {
            console.log(`✅ Auto-completed ${result.affectedRows} event(s)`);
        }
    } catch (error) {
        console.error('❌ Error auto-completing events:', error);
    }
}

// Run auto-complete on server start
setTimeout(() => {
    autoCompleteEvents();
}, 5000);

// Run auto-complete every day (24 hours)
setInterval(autoCompleteEvents, 24 * 60 * 60 * 1000);

// Update registration request status
app.put('/api/registration-requests/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    console.log(`Updating request ${id} to status: ${status}`);

    if (!['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        // Get the request details first
        const [requestResult] = await db.promise().query(
            "SELECT * FROM registration_requests WHERE id = ?", [id]
        );
        
        if (requestResult.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }
        
        const request = requestResult[0];
        
        // Update the status
        const [updateResult] = await db.promise().query(
            "UPDATE registration_requests SET status = ? WHERE id = ?",
            [status, id]
        );

        // If approved, try to auto-assign to a bus
        if (status === 'approved') {
            await autoAssignToBus(request.user_id, request.event_id);
            
            // Notify user of approval
            await createNotification(
                request.user_id,
                'Registration Approved',
                `Your registration for the event has been approved!`,
                'success',
                '/my-registrations'
            );
        }
        
        // When rejecting a request
        if (status === 'rejected') {
            await createNotification(
                request.user_id,
                'Registration Update',
                `Your registration request was not approved.`,
                'warning',
                '/my-registrations'
            );
        }

        res.json({ success: true, message: 'Request updated successfully' });
        
    } catch (error) {
        console.error('Error updating request:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Auto-assign function
async function autoAssignToBus(userId, eventId) {
    try {
        // Check if user already has a bus assignment for this event
        const [existing] = await db.promise().query(
            "SELECT * FROM bus_assignments WHERE user_id = ? AND event_id = ?",
            [userId, eventId]
        );
        
        if (existing.length > 0) {
            console.log(`User ${userId} already assigned to bus for event ${eventId}`);
            return;
        }

        // Find available buses with capacity
        const [buses] = await db.promise().query(
            `SELECT b.*, 
                    (SELECT COUNT(*) FROM bus_assignments WHERE bus_id = b.id) as assigned_count
             FROM buses b
             HAVING assigned_count < b.capacity
             ORDER BY b.bus_number
             LIMIT 1`
        );
        
        if (buses.length === 0) {
            console.log(`No available buses for event ${eventId}, user ${userId} pending assignment`);
            return;
        }
        
        const bus = buses[0];
        
        // Assign to the first available bus
        await db.promise().query(
            "INSERT INTO bus_assignments (user_id, event_id, bus_id, notes) VALUES (?, ?, ?, ?)",
            [userId, eventId, bus.id, 'Auto-assigned upon approval']
        );
        
        // Update bus passenger count
        await db.promise().query(
            "UPDATE buses SET current_passengers = current_passengers + 1 WHERE id = ?",
            [bus.id]
        );
        
        console.log(`✅ Auto-assigned user ${userId} to bus ${bus.bus_number} for event ${eventId}`);
        
    } catch (error) {
        console.error('Error auto-assigning to bus:', error);
    }
}

// Update event
app.put('/api/events/:id', (req, res) => {
    const { id } = req.params;
    const { title, description, date, location, status, course, target_year, external_url } = req.body;
    
    // First, get the current event status
    db.query("SELECT status, title, description, date, location, course FROM events WHERE id = ?", [id], (err, results) => {
        if (err) {
            console.log('Database error fetching event:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        const oldEvent = results[0];
        const wasHidden = oldEvent.status === 'hidden';
        const isNowVisible = status === 'active' || status === 'upcoming';
        
        // Build dynamic UPDATE query based on provided fields
        const updates = [];
        const params = [];
        
        if (title !== undefined) {
            updates.push('title = ?');
            params.push(title);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            params.push(description);
        }
        if (date !== undefined) {
            updates.push('date = ?');
            params.push(date);
        }
        if (location !== undefined) {
            updates.push('location = ?');
            params.push(location);
        }
        if (status !== undefined) {
            const validStatuses = ['active', 'hidden', 'cancelled', 'completed', 'upcoming'];
            if (validStatuses.includes(status)) {
                updates.push('status = ?');
                params.push(status);
            }
        }
        if (course !== undefined) {
            const normalizedCourse = typeof course === 'string' ? course.toUpperCase() : 'ALL';
            const validCourses = ['BSCS', 'BSHM', 'BSTM', 'BAPOLSCI', 'BSED', 'BSBA', 'ALL'];
            if (validCourses.includes(normalizedCourse)) {
                updates.push('course = ?');
                params.push(normalizedCourse);
            }
        }
        if (target_year !== undefined) {
        updates.push('target_year = ?');
        params.push(target_year || 'ALL');
        }
        if (external_url !== undefined) {
        updates.push('external_url = ?');
        params.push(external_url || null);
        }
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }
        
        params.push(id);
        
        const sql = `UPDATE events SET ${updates.join(', ')} WHERE id = ?`;
        
        db.query(sql, params, (err, result) => {
            if (err) {
                console.log('Database error updating event:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            // If event was hidden and is now visible
            if (wasHidden && isNowVisible) {
                const updatedTitle = title || oldEvent.title;
                const updatedDesc = description || oldEvent.description;
                const updatedDate = date || oldEvent.date;
                const updatedLocation = location || oldEvent.location;
                const updatedCourse = course ? course.toUpperCase() : oldEvent.course;
                
                const eventDateFormatted = new Date(updatedDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
                
                let targetType = 'all';
                let targetCourse = null;
                
                if (updatedCourse !== 'ALL') {
                    targetType = 'course';
                    targetCourse = updatedCourse;
                }
                
                const announcementTitle = `📢 New Event Available: ${updatedTitle}`;
                const announcementMessage = `A new event is now open for registration!\n\n` +
                    `📌 Event: ${updatedTitle}\n` +
                    `📝 Description: ${updatedDesc}\n` +
                    `📅 Date: ${eventDateFormatted}\n` +
                    `📍 Location: ${updatedLocation}\n` +
                    `🎓 Course: ${updatedCourse}\n\n` +
                    `Register now to secure your spot!`;
                
                db.query(
                    `INSERT INTO announcements (title, message, type, target_type, target_course, target_event_id, created_by) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [announcementTitle, announcementMessage, 'info', targetType, targetCourse, id, null],
                    (err) => {
                        if (err) {
                            console.error('Error creating visibility announcement:', err);
                        } else {
                            console.log(`✅ Announcement created for newly visible event: ${updatedTitle}`);
                        }
                    }
                );
            }
            
            //If event is cancelled
            const isNowCancelled = status === 'cancelled' && oldEvent.status !== 'cancelled';
            if (isNowCancelled) {
                const updatedTitle = title || oldEvent.title;
                const updatedCourse = course ? course.toUpperCase() : oldEvent.course;
                
                let targetType = 'all';
                let targetCourse = null;
                
                if (updatedCourse !== 'ALL') {
                    targetType = 'course';
                    targetCourse = updatedCourse;
                }
                
                const announcementTitle = `⚠️ Event Cancelled: ${updatedTitle}`;
                const announcementMessage = `The following event has been cancelled:\n\n` +
                    `📌 Event: ${updatedTitle}\n` +
                    `🎓 Course: ${updatedCourse}\n\n` +
                    `We apologize for any inconvenience. Please check other available events.`;
                
                db.query(
                    `INSERT INTO announcements (title, message, type, target_type, target_course, target_event_id, created_by) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [announcementTitle, announcementMessage, 'warning', targetType, targetCourse, id, null],
                    (err) => {
                        if (err) {
                            console.error('Error creating cancellation announcement:', err);
                        } else {
                            console.log(`✅ Announcement created for cancelled event: ${updatedTitle}`);
                        }
                    }
                );
            }
            
            res.json({ success: true, message: 'Event updated successfully' });
        });
    });
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
                    return res.status(400).json({ error: `Bus number "${bus_number}" already exists. Please use a different bus number.` });
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

            // 6. Update bus passenger count by recalculating
            console.log(`🔄 Recalculating bus ${busId} passenger count...`);
            await db.promise().query(
                `UPDATE buses b 
                SET b.current_passengers = (
                    SELECT COUNT(*) FROM bus_assignments WHERE bus_id = ?
                ) WHERE b.id = ?`,
                [busId, busId]
            );

            console.log(`✅ Bus ${busId} passenger count recalculated`);

            // 🔔 NOTIFY USER OF BUS ASSIGNMENT
            await createNotification(
                userId,
                'Bus Assignment',
                `You have been assigned to Bus ${busData.bus_number} for the event.`,
                'success',
                '/bus'
            );

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

// Move participant to different bus
app.put('/api/bus-assignments/:id', async (req, res) => {
    const { id } = req.params;
    const { new_bus_id, notes } = req.body;
    
    if (!new_bus_id) {
        return res.status(400).json({ error: 'New bus ID is required' });
    }
    
    try {
        // Get current assignment details
        const [assignmentResult] = await db.promise().query(
            `SELECT ba.*, b.bus_number as old_bus_number, b.id as old_bus_id
             FROM bus_assignments ba
             JOIN buses b ON ba.bus_id = b.id
             WHERE ba.id = ?`,
            [id]
        );
        
        if (assignmentResult.length === 0) {
            return res.status(404).json({ error: 'Assignment not found' });
        }
        
        const assignment = assignmentResult[0];
        
        // Get new bus details
        const [newBusResult] = await db.promise().query(
            "SELECT * FROM buses WHERE id = ?",
            [new_bus_id]
        );
        
        if (newBusResult.length === 0) {
            return res.status(404).json({ error: 'New bus not found' });
        }
        
        const newBus = newBusResult[0];
        
        // Check capacity
        const [countResult] = await db.promise().query(
            "SELECT COUNT(*) as count FROM bus_assignments WHERE bus_id = ?",
            [new_bus_id]
        );
        
        if (countResult[0].count >= newBus.capacity) {
            return res.status(400).json({ error: 'New bus is at full capacity' });
        }
        
        // Update assignment
        await db.promise().query(
            "UPDATE bus_assignments SET bus_id = ?, notes = ? WHERE id = ?",
            [new_bus_id, notes || 'Moved to different bus', id]
        );
        
        // Recalculate BOTH bus passenger counts from scratch
        // Update old bus count
        await db.promise().query(
            `UPDATE buses b 
             SET b.current_passengers = (
                 SELECT COUNT(*) FROM bus_assignments WHERE bus_id = ?
             ) WHERE b.id = ?`,
            [assignment.old_bus_id, assignment.old_bus_id]
        );
        
        // Update new bus count
        await db.promise().query(
            `UPDATE buses b 
             SET b.current_passengers = (
                 SELECT COUNT(*) FROM bus_assignments WHERE bus_id = ?
             ) WHERE b.id = ?`,
            [new_bus_id, new_bus_id]
        );
        
        // 🔔 NOTIFY USER OF BUS MOVE
        const [userResult] = await db.promise().query(
            "SELECT name FROM users WHERE id = ?", [assignment.user_id]
        );
        const userName = userResult[0]?.name || 'User';
        
        await createNotification(
            assignment.user_id,
            'Bus Assignment Updated',
            `Your bus assignment has been changed from Bus ${assignment.old_bus_number} to Bus ${newBus.bus_number}.`,
            'warning',
            '/bus'
        );
        
        res.json({ success: true, message: 'Participant moved successfully' });
        
    } catch (error) {
        console.error('Error moving bus assignment:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Remove bus assignment
app.delete('/api/bus-assignments/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        // Get assignment details before deleting
        const [assignmentResult] = await db.promise().query(
            `SELECT ba.*, b.bus_number, b.id as bus_id
             FROM bus_assignments ba
             JOIN buses b ON ba.bus_id = b.id
             WHERE ba.id = ?`,
            [id]
        );
        
        if (assignmentResult.length === 0) {
            return res.status(404).json({ error: 'Assignment not found' });
        }
        
        const assignment = assignmentResult[0];
        const busId = assignment.bus_id;
        
        // Delete the assignment
        await db.promise().query(
            "DELETE FROM bus_assignments WHERE id = ?",
            [id]
        );
        
        // 🔥 Recalculate bus passenger count from scratch
        await db.promise().query(
            `UPDATE buses b 
             SET b.current_passengers = (
                 SELECT COUNT(*) FROM bus_assignments WHERE bus_id = ?
             ) WHERE b.id = ?`,
            [busId, busId]
        );
        
        // Get user name for notification
        const [userResult] = await db.promise().query(
            "SELECT name FROM users WHERE id = ?", [assignment.user_id]
        );
        const userName = userResult[0]?.name || 'User';
        
        // 🔔 NOTIFY USER OF BUS REMOVAL
        await createNotification(
            assignment.user_id,
            'Bus Assignment Removed',
            `You have been removed from Bus ${assignment.bus_number}. Please contact admin for details.`,
            'warning',
            '/bus'
        );
        
        res.json({ success: true, message: 'Bus assignment removed successfully' });
        
    } catch (error) {
        console.error('Error removing bus assignment:', error);
        res.status(500).json({ error: 'Database error' });
    }
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

// Delete registration request
app.delete('/api/registration-requests/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        // Get the request details first
        const [requestResult] = await db.promise().query(
            "SELECT * FROM registration_requests WHERE id = ?", [id]
        );
        
        if (requestResult.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }
        
        const request = requestResult[0];
        
        // Check if there's a bus assignment
        const [assignmentResult] = await db.promise().query(
            "SELECT id FROM bus_assignments WHERE user_id = ? AND event_id = ?",
            [request.user_id, request.event_id]
        );
        
        // Delete bus assignment if exists
        if (assignmentResult.length > 0) {
            await db.promise().query(
                "DELETE FROM bus_assignments WHERE id = ?",
                [assignmentResult[0].id]
            );
            
            // Update bus passenger count
            await db.promise().query(
                `UPDATE buses b 
                 SET b.current_passengers = (
                     SELECT COUNT(*) FROM bus_assignments WHERE bus_id = b.id
                 )`
            );
        }
        
        // Delete the registration request
        await db.promise().query(
            "DELETE FROM registration_requests WHERE id = ?",
            [id]
        );
        
        // Notify user
        await createNotification(
            request.user_id,
            'Registration Removed',
            `Your registration for the event has been removed by an administrator.`,
            'warning',
            '/my-registrations'
        );
        
        res.json({ success: true, message: 'Registration request deleted successfully' });
        
    } catch (error) {
        console.error('Error deleting registration request:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Update bus
app.put('/api/buses/:id', (req, res) => {
    const { id } = req.params;
    const { bus_number, capacity } = req.body;

    if (!bus_number || !capacity) {
        return res.status(400).json({ error: 'Bus number and capacity are required' });
    }

    if (capacity <= 0) {
        return res.status(400).json({ error: 'Capacity must be greater than 0' });
    }

    // First check if bus exists and get current passengers
    db.query("SELECT * FROM buses WHERE id = ?", [id], (err, results) => {
        if (err) {
            console.error('Error checking bus:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Bus not found' });
        }

        const bus = results[0];

        // Check if new capacity is valid
        if (capacity < bus.current_passengers) {
            return res.status(400).json({ 
                error: `Cannot set capacity (${capacity}) lower than current passengers (${bus.current_passengers})` 
            });
        }

        // Update bus
        db.query(
            "UPDATE buses SET bus_number = ?, capacity = ? WHERE id = ?",
            [bus_number, capacity, id],
            (err, result) => {
                if (err) {
                    console.error('Error updating bus:', err);
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(400).json({ error: 'Bus number already exists' });
                    }
                    return res.status(500).json({ error: 'Database error' });
                }

                res.json({ success: true, message: 'Bus updated successfully' });
            }
        );
    });
});

// Delete bus
app.delete('/api/buses/:id', (req, res) => {
    const { id } = req.params;

    // Check if bus has assignments
    db.query("SELECT COUNT(*) as count FROM bus_assignments WHERE bus_id = ?", [id], (err, results) => {
        if (err) {
            console.error('Error checking bus assignments:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (results[0].count > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete bus with existing assignments. Remove all assignments first.' 
            });
        }

        // Delete the bus
        db.query("DELETE FROM buses WHERE id = ?", [id], (err, result) => {
            if (err) {
                console.error('Error deleting bus:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Bus not found' });
            }

            res.json({ success: true, message: 'Bus deleted successfully' });
        });
    });
});

// Get bus assignments (for View Details button)
app.get('/api/buses/:id/assignments', (req, res) => {
    const { id } = req.params;

    const query = `
        SELECT ba.*, 
               u.name as user_name, 
               u.student_number, 
               u.email,
               e.title as event_title, 
               e.date as event_date
        FROM bus_assignments ba
        JOIN users u ON ba.user_id = u.id
        JOIN events e ON ba.event_id = e.id
        WHERE ba.bus_id = ?
        ORDER BY e.date, u.name
    `;

    db.query(query, [id], (err, results) => {
        if (err) {
            console.error('Error fetching bus assignments:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

// ========== ANNOUNCEMENTS ==========

// Create announcement
app.post('/api/announcements', (req, res) => {
    const { title, message, type, target_type, target_course, target_event_id, created_by } = req.body;
    
    if (!title || !message) {
        return res.status(400).json({ error: 'Title and message are required' });
    }
    
    db.query(
        "INSERT INTO announcements (title, message, type, target_type, target_course, target_event_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [title, message, type || 'info', target_type || 'all', target_course || null, target_event_id || null, created_by || null],
        (err, result) => {
            if (err) {
                console.error('Error creating announcement:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true, announcementId: result.insertId });
        }
    );
});

// Update announcement
app.put('/api/announcements/:id', (req, res) => {
    const { id } = req.params;
    const { title, message, type, target_type, target_course, target_event_id } = req.body;
    
    if (!title || !message) {
        return res.status(400).json({ error: 'Title and message are required' });
    }
    
    db.query(
        `UPDATE announcements 
         SET title = ?, message = ?, type = ?, target_type = ?, target_course = ?, target_event_id = ?
         WHERE id = ?`,
        [title, message, type || 'info', target_type || 'all', target_course || null, target_event_id || null, id],
        (err, result) => {
            if (err) {
                console.error('Error updating announcement:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Announcement not found' });
            }
            
            res.json({ success: true, message: 'Announcement updated successfully' });
        }
    );
});

// Get announcements for a user (filtered by their course and events)
app.get('/api/announcements/user/:userId', (req, res) => {
    const { userId } = req.params;
    
    // First get user's course and registered events
    db.query("SELECT course FROM users WHERE id = ?", [userId], (err, userResult) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        const userCourse = userResult[0]?.course;
        
        // Get user's registered events
        db.query(
            "SELECT event_id FROM registration_requests WHERE user_id = ? AND status = 'approved'",
            [userId],
            (err, eventResult) => {
                if (err) {
                    console.error('Error fetching user events:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                
                const userEventIds = eventResult.map(e => e.event_id);
                
                // Build query to get announcements
                let query = `
                    SELECT a.*, 
                           CASE WHEN ar.id IS NOT NULL THEN 1 ELSE 0 END as is_read,
                           u.name as creator_name
                    FROM announcements a
                    LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id AND ar.user_id = ?
                    LEFT JOIN users u ON a.created_by = u.id
                    WHERE 
                `;
                
                const params = [userId];
                
                // Target conditions
                const conditions = [];
                
                // 1. Announcements for all users
                conditions.push("a.target_type = 'all'");
                
                // 2. Announcements for user's course
                if (userCourse) {
                    conditions.push("(a.target_type = 'course' AND a.target_course = ?)");
                    params.push(userCourse);
                }
                
                // 3. Announcements for user's events
                if (userEventIds.length > 0) {
                    conditions.push(`(a.target_type = 'event' AND a.target_event_id IN (${userEventIds.map(() => '?').join(',')}))`);
                    params.push(...userEventIds);
                }
                
                query += conditions.join(' OR ');
                query += " ORDER BY a.created_at DESC";
                
                db.query(query, params, (err, results) => {
                    if (err) {
                        console.error('Error fetching announcements:', err);
                        return res.status(500).json({ error: 'Database error' });
                    }
                    res.json(results);
                });
            }
        );
    });
});

// Get all announcements (admin)
app.get('/api/announcements', (req, res) => {
    db.query(
        `SELECT a.*, u.name as creator_name 
         FROM announcements a
         LEFT JOIN users u ON a.created_by = u.id
         ORDER BY a.created_at DESC`,
        (err, results) => {
            if (err) {
                console.error('Error fetching announcements:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json(results);
        }
    );
});

// Mark announcement as read
app.post('/api/announcements/:id/read', (req, res) => {
    const { id } = req.params;
    const { user_id } = req.body;
    
    if (!user_id) {
        return res.status(400).json({ error: 'User ID required' });
    }
    
    db.query(
        "INSERT IGNORE INTO announcement_reads (announcement_id, user_id) VALUES (?, ?)",
        [id, user_id],
        (err) => {
            if (err) {
                console.error('Error marking announcement as read:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true });
        }
    );
});

// Delete announcement (admin)
app.delete('/api/announcements/:id', (req, res) => {
    const { id } = req.params;
    
    db.query("DELETE FROM announcements WHERE id = ?", [id], (err) => {
        if (err) {
            console.error('Error deleting announcement:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true });
    });
});

// Get public announcements (for landing page)
app.get('/api/announcements/public', (req, res) => {
    const query = `
        SELECT a.*, u.name as creator_name
        FROM announcements a
        LEFT JOIN users u ON a.created_by = u.id
        WHERE a.target_type = 'all' 
           OR a.target_type IS NULL 
           OR a.target_type = ''
        ORDER BY a.created_at DESC
        LIMIT 20
    `;
    
    console.log('📢 Fetching public announcements...');
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching public announcements:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        console.log(`✅ Found ${results.length} public announcements`);
        res.json(results);
    });
});

// ========== NOTIFICATIONS ==========

// Create notification
function createNotification(userId, title, message, type = 'info', link = null) {
    return new Promise((resolve, reject) => {
        db.query(
            "INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)",
            [userId, title, message, type, link],
            (err, result) => {
                if (err) {
                    console.error('Error creating notification:', err);
                    reject(err);
                } else {
                    resolve(result.insertId);
                }
            }
        );
    });
}

// API: Create notification
app.post('/api/notifications', async (req, res) => {
    const { user_id, title, message, type, link } = req.body;
    
    if (!user_id || !title || !message) {
        return res.status(400).json({ error: 'User ID, title, and message are required' });
    }
    
    try {
        const notificationId = await createNotification(user_id, title, message, type, link);
        res.json({ success: true, notificationId });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Get user notifications
app.get('/api/notifications/user/:userId', (req, res) => {
    const { userId } = req.params;
    
    db.query(
        "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
        [userId],
        (err, results) => {
            if (err) {
                console.error('Error fetching notifications:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json(results);
        }
    );
});

// Get unread notification count
app.get('/api/notifications/unread/:userId', (req, res) => {
    const { userId } = req.params;
    
    db.query(
        "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0",
        [userId],
        (err, results) => {
            if (err) {
                console.error('Error fetching unread count:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ count: results[0].count });
        }
    );
});

// Mark notification as read
app.put('/api/notifications/:id/read', (req, res) => {
    const { id } = req.params;
    
    db.query(
        "UPDATE notifications SET is_read = 1 WHERE id = ?",
        [id],
        (err) => {
            if (err) {
                console.error('Error marking notification as read:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true });
        }
    );
});

// Mark all notifications as read
app.put('/api/notifications/read-all/:userId', (req, res) => {
    const { userId } = req.params;
    
    db.query(
        "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
        [userId],
        (err) => {
            if (err) {
                console.error('Error marking all notifications as read:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true });
        }
    );
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

app.get('/uploads/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'uploads', filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found');
    }

    res.sendFile(filePath);
});
// Upload certificate template
app.post('/api/certificates/template', upload.single('template'), (req, res) => {
    const { name, is_default } = req.body;
    const templateUrl = req.file ? `/uploads/${req.file.filename}` : null;
    
    if (!templateUrl) {
        return res.status(400).json({ error: 'Template file is required' });
    }
    
    const defaultFlag = is_default === 'true' ? 1 : 0;
    
    // If setting as default, unset others
    if (defaultFlag) {
        db.query("UPDATE certificate_templates SET is_default = 0", (err) => {
            if (err) console.error('Error unsetting defaults:', err);
        });
    }
    
    db.query(
        "INSERT INTO certificate_templates (name, template_url, is_default) VALUES (?, ?, ?)",
        [name || 'Default Template', templateUrl, defaultFlag],
        (err, result) => {
            if (err) {
                console.error('Error uploading template:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true, templateId: result.insertId });
        }
    );
});
// Update template positions
app.put('/api/certificates/templates/:id/positions', (req, res) => {
    const { id } = req.params;
    const { name_position, event_position, date_position } = req.body;
    
    console.log(`Updating template ${id} positions:`, { name_position });
    
    // Build dynamic update query based on what was sent
    const updates = [];
    const params = [];
    
    if (name_position !== undefined) {
        updates.push('name_position = ?');
        params.push(name_position);
    }
    if (event_position !== undefined) {
        updates.push('event_position = ?');
        params.push(event_position);
    }
    if (date_position !== undefined) {
        updates.push('date_position = ?');
        params.push(date_position);
    }
    
    if (updates.length === 0) {
        return res.status(400).json({ error: 'No position data provided' });
    }
    
    params.push(id);
    
    const sql = `UPDATE certificate_templates SET ${updates.join(', ')} WHERE id = ?`;
    
    db.query(sql, params, (err, result) => {
        if (err) {
            console.error('Error updating template positions:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }
        
        console.log(`✅ Template ${id} positions updated successfully`);
        res.json({ success: true });
    });
});

// Get single template
app.get('/api/certificates/templates/:id', (req, res) => {
    const { id } = req.params;
    
    db.query("SELECT * FROM certificate_templates WHERE id = ?", [id], (err, results) => {
        if (err) {
            console.error('Error fetching template:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }
        res.json(results[0]);
    });
});

// Get all templates
app.get('/api/certificates/templates', (req, res) => {
    db.query("SELECT * FROM certificate_templates ORDER BY is_default DESC, created_at DESC", (err, results) => {
        if (err) {
            console.error('Error fetching templates:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

// Generate certificates for event
app.post('/api/certificates/generate/:eventId', async (req, res) => {
    const { eventId } = req.params;
    const { templateId } = req.body;
    
    try {
        // Get event details
        const [eventResult] = await db.promise().query(
            "SELECT * FROM events WHERE id = ?", [eventId]
        );
        
        if (eventResult.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        const event = eventResult[0];
        
        // Get template with saved positions
        let templateQuery = "SELECT * FROM certificate_templates WHERE id = ?";
        let templateParams = [templateId];
        
        if (!templateId) {
            templateQuery = "SELECT * FROM certificate_templates WHERE is_default = 1 LIMIT 1";
            templateParams = [];
        }
        
        const [templateResult] = await db.promise().query(templateQuery, templateParams);
        
        if (templateResult.length === 0) {
            return res.status(400).json({ error: 'No certificate template found' });
        }
        
        const template = templateResult[0];
        const templatePath = path.join(__dirname, template.template_url);
        
        if (!fs.existsSync(templatePath)) {
            return res.status(404).json({ error: 'Template file not found' });
        }
        
        // Parse saved name position (if any)
        let namePosition = { x: 50, y: 50, size: 36, color: '#1a1a4d' };
        if (template.name_position) {
            try {
                const saved = JSON.parse(template.name_position);
                namePosition = { ...namePosition, ...saved };
                console.log('✅ Using saved position:', namePosition);
            } catch (e) {
                console.error('❌ Error parsing saved position:', e);
            }
        }
        
        // Get approved participants
        const [participants] = await db.promise().query(`
            SELECT u.id, u.name, u.student_number, u.email, u.course, u.section, u.year
            FROM users u
            JOIN registration_requests rr ON u.id = rr.user_id
            WHERE rr.event_id = ? AND rr.status = 'approved'
            ORDER BY u.name
        `, [eventId]);
        
        if (participants.length === 0) {
            return res.status(400).json({ error: 'No approved participants found' });
        }
        
        // Create output directory
        const outputDir = path.join(__dirname, 'uploads', 'certificates', `event_${eventId}`);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const generatedCertificates = [];
        
        // Load the template PDF once
        const templateBytes = fs.readFileSync(templatePath);
        
for (const participant of participants) {
    try {
        const pdfDoc = await PDFDocument.load(templateBytes);
        pdfDoc.registerFontkit(fontkit);
        
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        
        const { width, height } = firstPage.getSize();
        
        // Format participant name FIRST
        let displayName = participant.name;
        
        // Try to parse LASTNAME, FIRSTNAME format
        const nameParts = participant.name.split(',');
        if (nameParts.length === 2) {
            const lastName = nameParts[0].trim();
            const firstParts = nameParts[1].trim().split(' ');
            const firstName = firstParts[0] || '';
            const middleInitial = firstParts[1] ? firstParts[1].charAt(0) + '.' : '';
            displayName = `${lastName}, ${firstName} ${middleInitial}`.trim();
        }
        
        // NOW load the font (displayName is defined)
        let font;
        const fontFamily = namePosition.fontFamily || "'Playfair Display', serif";

        console.log(`🔤 Using font: ${fontFamily} for ${displayName}`);

        try {
            if (fontFamily.includes('Playfair') || fontFamily.includes('Georgia') || fontFamily.includes('Times')) {
                font = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
                console.log(`✅ Using TimesRomanBold`);
            } else if (fontFamily.includes('Cormorant') || fontFamily.includes('Garamond') || fontFamily.includes('Old Standard')) {
                font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
                console.log(`✅ Using TimesRoman`);
            } else if (fontFamily.includes('Great Vibes') || fontFamily.includes('cursive') || fontFamily.includes('Script')) {
                font = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
                console.log(`✅ Using TimesRomanItalic`);
            } else {
                font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
                console.log(`✅ Using HelveticaBold (default)`);
            }
        } catch (fontError) {
            console.error(`❌ Font error, using fallback:`, fontError.message);
            try {
                font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            } catch {
                font = await pdfDoc.embedFont(StandardFonts.Courier);
            }
        }
        
        // Calculate position using saved percentages
        const textX = (width * namePosition.x / 100);
        const textY = height - (height * namePosition.y / 100);
        
        // Convert hex color to RGB
        const hexColor = (namePosition.color || '#1a1a4d').replace('#', '');
        const r = parseInt(hexColor.substring(0, 2), 16) / 255;
        const g = parseInt(hexColor.substring(2, 4), 16) / 255;
        const b = parseInt(hexColor.substring(4, 6), 16) / 255;
        
        // Center the text at the X position
        const textWidth = font.widthOfTextAtSize(displayName, namePosition.size || 36);
        const centeredX = textX - (textWidth / 2);
        
        // Add participant name at saved position
        firstPage.drawText(displayName, {
            x: centeredX,
            y: textY,
            size: namePosition.size || 36,
            font: font,
            color: rgb(r, g, b)
        });
        
        // Save the PDF
        const pdfBytes = await pdfDoc.save();
        const filename = `certificate_${participant.id}_${eventId}.pdf`;
        const filePath = path.join(outputDir, filename);
        fs.writeFileSync(filePath, pdfBytes);
        
        const certificateUrl = `/uploads/certificates/event_${eventId}/${filename}`;
        
        // Save to database
        await db.promise().query(
            "INSERT INTO certificates (user_id, event_id, certificate_url, template_id) VALUES (?, ?, ?, ?)",
            [participant.id, eventId, certificateUrl, template.id]
        );
        
        generatedCertificates.push({
            userId: participant.id,
            name: displayName,
            url: certificateUrl
        });
        
    } catch (error) {
        console.error(`❌ Error generating certificate for ${participant.name}:`, error);
    }
}
        
        res.json({
            success: true,
            generated: generatedCertificates.length,
            total: participants.length,
            certificates: generatedCertificates
        });
        
    } catch (error) {
        console.error('Error generating certificates:', error);
        res.status(500).json({ error: 'Failed to generate certificates: ' + error.message });
    }
});

// Get certificates for an event
app.get('/api/certificates/event/:eventId', (req, res) => {
    const { eventId } = req.params;
    
    const query = `
        SELECT c.*, u.name, u.email, u.student_number
        FROM certificates c
        JOIN users u ON c.user_id = u.id
        WHERE c.event_id = ?
        ORDER BY u.name
    `;
    
    db.query(query, [eventId], (err, results) => {
        if (err) {
            console.error('Error fetching certificates:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

// Get user's certificates
app.get('/api/certificates/user/:userId', (req, res) => {
    const { userId } = req.params;
    
    const query = `
        SELECT c.*, e.title as event_title, e.date as event_date
        FROM certificates c
        JOIN events e ON c.event_id = e.id
        WHERE c.user_id = ?
        ORDER BY c.generated_at DESC
    `;
    
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching user certificates:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});
// Set default template
app.put('/api/certificates/templates/:id/default', (req, res) => {
    const { id } = req.params;
    
    // Unset all defaults
    db.query("UPDATE certificate_templates SET is_default = 0", (err) => {
        if (err) {
            console.error('Error unsetting defaults:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        // Set new default
        db.query("UPDATE certificate_templates SET is_default = 1 WHERE id = ?", [id], (err, result) => {
            if (err) {
                console.error('Error setting default:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true });
        });
    });
});

// Delete template
app.delete('/api/certificates/templates/:id', (req, res) => {
    const { id } = req.params;
    
    db.query("DELETE FROM certificate_templates WHERE id = ?", [id], (err, result) => {
        if (err) {
            console.error('Error deleting template:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true });
    });
});

// Send certificate email
app.post('/api/certificates/:id/send', async (req, res) => {
    const { id } = req.params;
    
    try {
        const [certResult] = await db.promise().query(`
            SELECT c.*, u.name, u.email, e.title as event_title
            FROM certificates c
            JOIN users u ON c.user_id = u.id
            JOIN events e ON c.event_id = e.id
            WHERE c.id = ?
        `, [id]);
        
        if (certResult.length === 0) {
            return res.status(404).json({ error: 'Certificate not found' });
        }
        
        const cert = certResult[0];
        
        if (transporter) {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: cert.email,
                subject: `Your Certificate for ${cert.event_title}`,
                html: `
                    <h2>Congratulations ${cert.name}!</h2>
                    <p>Your certificate for ${cert.event_title} is ready.</p>
                    <p>You can download it from your student portal.</p>
                `,
                attachments: [{
                    filename: 'certificate.pdf',
                    path: path.join(__dirname, cert.certificate_url)
                }]
            });
        }
        
        await db.promise().query("UPDATE certificates SET sent = 1 WHERE id = ?", [id]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error sending certificate:', error);
        res.status(500).json({ error: 'Failed to send certificate' });
    }
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
    console.log(`🚀 EduEvent server running on http://localhost:${PORT}`);
    console.log(`📊 Using MySQL database: ${process.env.DB_NAME || 'eduevent'}`);
    console.log(`🔑 Test credentials:`);
    console.log(`   Admin: admin@eduevent.com / admin123`);
    console.log(`   Student: student@eduevent.com / student123`);
    console.log(`🐛 Debug endpoint available: http://localhost:${PORT}/api/debug/db-state`);
});