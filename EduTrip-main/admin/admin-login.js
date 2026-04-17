const adminLoginForm = document.getElementById('admin-login-form');

if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('admin-email').value.trim();
        const password = document.getElementById('admin-password').value.trim();

        if (!email || !password) {
            alert('Please enter both email and password.');
            return;
        }

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || 'Login failed. Please try again.');
                return;
            }

            if (data.success) {
                if (data.user.role === 'admin') {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    localStorage.setItem('token', 'logged-in');
                    window.location.href = '/admin';
                } else {
                    alert('This page is for admin users only. Please use the student login page.');
                }
            } else if (data.requires_verification) {
                alert('Email not verified. Please verify your account first.');
            } else {
                alert(data.error || 'Login failed. Please check your credentials.');
            }
        } catch (error) {
            console.error('Admin login error:', error);
            alert('Server error. Please try again later.');
        }
    });
}
