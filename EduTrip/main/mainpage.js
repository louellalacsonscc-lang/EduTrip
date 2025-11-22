const loginToggle = document.getElementById('login-toggle');
const registerToggle = document.getElementById('register-toggle');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

// Toggle forms
loginToggle.addEventListener('click', () => {
    loginToggle.classList.add('active');
    registerToggle.classList.remove('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
});

registerToggle.addEventListener('click', () => {
    registerToggle.classList.add('active');
    loginToggle.classList.remove('active');
    registerForm.style.display = 'block';
    loginForm.style.display = 'none';
});

// Login function
document.querySelector('#login-form form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = e.target.querySelector('input[type="email"]').value;
    const password = e.target.querySelector('input[type="password"]').value;
    
    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Login successful!');
            // Store user data in localStorage
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('token', 'logged-in'); // Simple token for demo
            
            console.log('User logged in:', data.user);
            
            // Redirect based on role
            if (data.user.role === 'admin') {
                window.location.href = '/admin';
            } else {
                window.location.href = '/student';
            }
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Server not running. Please start the server first.');
    }
});

// Register function
document.querySelector('#register-form form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = e.target.querySelector('input[type="text"]').value;
    const studentNumber = e.target.querySelectorAll('input[type="text"]')[1].value;
    const email = e.target.querySelector('input[type="email"]').value;
    const password = e.target.querySelectorAll('input[type="password"]')[0].value;
    const confirmPassword = e.target.querySelectorAll('input[type="password"]')[1].value;
    
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters long!');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, studentNumber, email, password }),
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Registration successful! Please login.');
            loginToggle.click(); // Switch to login form
            // Clear form
            e.target.reset();
        } else {
            alert(data.error || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Server not running. Please start the server first.');
    }
});

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', function() {
    const user = localStorage.getItem('user');
    if (user) {
        const userData = JSON.parse(user);
        if (userData.role === 'admin') {
            window.location.href = '/admin';
        } else if (userData.role === 'student') {
            window.location.href = '/student';
        }
    }
});