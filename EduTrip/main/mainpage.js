const loginToggle = document.getElementById('login-toggle');
const registerToggle = document.getElementById('register-toggle');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

// Toggle forms
loginToggle.addEventListener('click', () => {
    // Add blue underline to login, remove from register
    loginToggle.classList.add('border-blue-500', 'text-white');
    loginToggle.classList.remove('text-gray-400', 'border-transparent');
    registerToggle.classList.add('text-gray-400', 'border-transparent');
    registerToggle.classList.remove('border-blue-500', 'text-white');
    
    // Update icons
    loginToggle.querySelector('i').classList.remove('text-gray-500');
    loginToggle.querySelector('i').classList.add('text-blue-400');
    registerToggle.querySelector('i').classList.remove('text-blue-400');
    registerToggle.querySelector('i').classList.add('text-gray-500');
    
    // Show/hide forms
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
});

registerToggle.addEventListener('click', () => {
    // Add blue underline to register, remove from login
    registerToggle.classList.add('border-blue-500', 'text-white');
    registerToggle.classList.remove('text-gray-400', 'border-transparent');
    loginToggle.classList.add('text-gray-400', 'border-transparent');
    loginToggle.classList.remove('border-blue-500', 'text-white');
    
    // Update icons
    registerToggle.querySelector('i').classList.remove('text-gray-500');
    registerToggle.querySelector('i').classList.add('text-blue-400');
    loginToggle.querySelector('i').classList.remove('text-blue-400');
    loginToggle.querySelector('i').classList.add('text-gray-500');
    
    // Show/hide forms
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
document.getElementById('switch-to-login')?.addEventListener('click', function() {
    // Trigger a click on the login toggle button
    document.getElementById('login-toggle').click();
});