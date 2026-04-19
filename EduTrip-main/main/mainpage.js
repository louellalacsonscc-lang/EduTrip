const loginToggle = document.getElementById('login-toggle');
const registerToggle = document.getElementById('register-toggle');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

// Toggle forms
loginToggle.addEventListener('click', () => {
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
        const response = await fetch('/api/login', {
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
            localStorage.setItem('token', 'logged-in');

            console.log('User logged in:', data.user);

            // Redirect based on role
            if (data.user.role === 'admin') {
                window.location.href = '/admin';
            } else {
                window.location.href = '/student';
            }
        } else if (data.requires_verification) {
            // Email not verified - redirect to verification page
            alert('⚠️ Email not verified. Please check your email for verification code.');
            localStorage.setItem('verification_user_id', data.user_id);
            localStorage.setItem('verification_email', email);
            window.location.href = '/verify-email.html?user_id=' + data.user_id;
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

    const name = e.target.querySelector('#register-name').value;
    const studentNumber = e.target.querySelector('#register-student-number').value;
    const course = e.target.querySelector('#register-course').value;
    const section = e.target.querySelector('#register-section').value;
    const year = e.target.querySelector('#register-year').value;
    const birthdate = e.target.querySelector('#register-birthdate').value;
    const age = e.target.querySelector('#register-age').value;
    const sex = e.target.querySelector('#register-sex').value;
    const email = e.target.querySelector('#register-email').value;
    const password = e.target.querySelectorAll('input[type="password"]')[0].value;
    const confirmPassword = e.target.querySelectorAll('input[type="password"]')[1].value;

    if (!course || !section || !year || !birthdate || !age || !sex) {
        alert('Please fill in all required student details.');
        return;
    }

    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters long!');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="bx bx-loader-circle bx-spin mr-2"></i> Creating Account...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                studentNumber,
                course,
                section,
                year,
                birthdate,
                age,
                sex,
                email,
                password
            }),
        });

        const data = await response.json();

        if (data.success) {
            if (data.requires_verification) {
                // Store user_id for verification page
                localStorage.setItem('verification_user_id', data.user_id);
                localStorage.setItem('verification_email', email);

                if (data.verification_code) {
                    alert(`✅ ${data.message}\nVerification code: ${data.verification_code}`);
                } else {
                    alert('✅ ' + data.message);
                }

                window.location.href = '/verify-email.html?user_id=' + data.user_id;
            } else {
                alert('✅ ' + (data.message || 'Registration successful! Please login.'));
                document.getElementById('login-toggle').click();
                e.target.reset();
            }
        } else {
            alert('❌ ' + (data.error || 'Registration failed'));
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('❌ Network error. Please check your connection and try again.');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});
// Resend Verification
document.getElementById('resend-verification')?.addEventListener('click', async () => {
    const email = prompt('Please enter your email address to resend verification code:');

    if (!email) return;

    if (!email.includes('@') || !email.includes('.')) {
        alert('Please enter a valid email address');
        return;
    }

    try {
        const response = await fetch('/api/resend-verification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (data.success) {
            if (data.verification_code) {
                alert(`✅ ${data.message}\nVerification code: ${data.verification_code}`);
            } else {
                alert('✅ Verification code sent! Please check your email.');
            }
        } else {
            alert('❌ ' + (data.error || 'Failed to resend verification code'));
        }
    } catch (error) {
        console.error('Resend error:', error);
        alert('❌ Network error. Please try again.');
    }
});
// Forgot Password
document.addEventListener('DOMContentLoaded', function () {
    const forgotPasswordLink = document.getElementById('forgot-password');
    const forgotPasswordModal = document.getElementById('forgot-password-modal');
    const closeForgotModal = document.getElementById('close-forgot-modal');

    // Step elements
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const step3 = document.getElementById('step-3');
    const step4 = document.getElementById('step-4');

    // Email variable to track
    let currentResetEmail = '';
    let currentResetToken = '';

    // Open modal
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            resetModalToStep1();
            forgotPasswordModal.classList.remove('hidden');
        });
    }

    // Reset modal to step 1
    function resetModalToStep1() {
        step1.classList.remove('hidden');
        step2.classList.add('hidden');
        step3.classList.add('hidden');
        step4.classList.add('hidden');
        document.getElementById('forgot-password-form').reset();
        document.getElementById('enter-code-form').reset();
        document.getElementById('new-password-form').reset();
        currentResetEmail = '';
        currentResetToken = '';
    }

    // Close modal
    function closeModal() {
        forgotPasswordModal.classList.add('hidden');
        resetModalToStep1();
    }

    if (closeForgotModal) closeForgotModal.addEventListener('click', closeModal);
    if (document.getElementById('cancel-forgot')) {
        document.getElementById('cancel-forgot').addEventListener('click', closeModal);
    }

    // Close when clicking outside
    forgotPasswordModal.addEventListener('click', (e) => {
        if (e.target === forgotPasswordModal) closeModal();
    });

    // Step 1: Send verification code
    document.getElementById('forgot-password-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('reset-email').value;
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        submitBtn.innerHTML = '<i class="bx bx-loader-circle bx-spin mr-2"></i> Sending...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (data.success) {
                currentResetEmail = email;
                document.getElementById('sent-to-email').textContent = email;
                document.getElementById('enter-code-email').value = email;

                // Move to step 2
                step1.classList.add('hidden');
                step2.classList.remove('hidden');

                // Auto-focus on code input
                setTimeout(() => {
                    document.getElementById('reset-code-input').focus();
                }, 100);
            } else {
                showModalAlert('error', data.error || 'Failed to send verification code');
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            showModalAlert('error', 'Network error. Please try again.');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    // Back to step 1
    document.getElementById('back-to-step1')?.addEventListener('click', () => {
        step2.classList.add('hidden');
        step1.classList.remove('hidden');
    });

    // Resend code
    document.getElementById('resend-code-btn')?.addEventListener('click', async () => {
        if (!currentResetEmail) return;

        const resendBtn = document.getElementById('resend-code-btn');
        const originalText = resendBtn.textContent;
        resendBtn.textContent = 'Sending...';
        resendBtn.disabled = true;

        try {
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: currentResetEmail })
            });

            const data = await response.json();

            if (data.success) {
                showModalAlert('success', 'New verification code sent!');
            } else {
                showModalAlert('error', data.error || 'Failed to resend code');
            }
        } catch (error) {
            console.error('Resend error:', error);
            showModalAlert('error', 'Network error. Please try again.');
        } finally {
            resendBtn.textContent = originalText;
            resendBtn.disabled = false;
        }
    });

    // Step 2: Verify code
    document.getElementById('enter-code-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('enter-code-email').value;
        const resetToken = document.getElementById('reset-code-input').value;

        if (!resetToken || resetToken.length !== 6) {
            showModalAlert('error', 'Please enter a valid 6-digit verification code');
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        submitBtn.innerHTML = '<i class="bx bx-loader-circle bx-spin mr-2"></i> Verifying...';
        submitBtn.disabled = true;

        try {
            // Verify the reset token - USING EMAIL
            const response = await fetch('/api/verify-reset-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    reset_token: resetToken
                })
            });

            const data = await response.json();

            if (data.success) {
                currentResetToken = resetToken;
                document.getElementById('newpass-email').value = email;
                document.getElementById('newpass-reset-token').value = resetToken;

                // Move to step 3
                step2.classList.add('hidden');
                step3.classList.remove('hidden');

                // Auto-focus on password input
                setTimeout(() => {
                    document.getElementById('new-pass').focus();
                }, 100);
            } else {
                showModalAlert('error', data.error || 'Invalid or expired verification code');
            }
        } catch (error) {
            console.error('Code verification error:', error);
            showModalAlert('error', 'Network error. Please try again.');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    // Back to step 2
    document.getElementById('back-to-step2')?.addEventListener('click', () => {
        step3.classList.add('hidden');
        step2.classList.remove('hidden');
    });

    // Step 3: Reset password
    document.getElementById('new-password-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('newpass-email').value;
        const resetToken = document.getElementById('newpass-reset-token').value;
        const newPassword = document.getElementById('new-pass').value;
        const confirmPassword = document.getElementById('confirm-new-pass').value;

        // Validation
        const passwordError = document.getElementById('password-error');
        passwordError.classList.add('hidden');

        if (newPassword !== confirmPassword) {
            passwordError.textContent = 'Passwords do not match!';
            passwordError.classList.remove('hidden');
            return;
        }

        if (newPassword.length < 6) {
            passwordError.textContent = 'Password must be at least 6 characters long!';
            passwordError.classList.remove('hidden');
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        submitBtn.innerHTML = '<i class="bx bx-loader-circle bx-spin mr-2"></i> Resetting...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    reset_token: resetToken,
                    new_password: newPassword
                })
            });

            const data = await response.json();

            if (data.success) {
                // Move to step 4 (success)
                step3.classList.add('hidden');
                step4.classList.remove('hidden');

                // Auto-fill the email in login form
                const loginEmailInput = document.querySelector('#login-form input[type="email"]');
                if (loginEmailInput) {
                    loginEmailInput.value = email;
                }
            } else {
                showModalAlert('error', data.error || 'Failed to reset password');
            }
        } catch (error) {
            console.error('Reset password error:', error);
            showModalAlert('error', 'Network error. Please try again.');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    // Step 4: Success actions
    document.getElementById('go-to-login')?.addEventListener('click', () => {
        closeModal();
        // Switch to login tab
        document.getElementById('login-toggle').click();
    });

    document.getElementById('close-success')?.addEventListener('click', closeModal);

    // Helper function to show alerts in modal
    function showModalAlert(type, message) {
        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = `mb-4 p-4 rounded-lg ${type === 'success' ? 'bg-green-900/30 text-green-400 border border-green-800' :
            'bg-red-900/30 text-red-400 border border-red-800'
            }`;
        alertDiv.innerHTML = `
            <div class="flex items-center">
                <i class='bx ${type === 'success' ? 'bx-check-circle' : 'bx-error-circle'} mr-2'></i>
                <span>${message}</span>
            </div>
        `;

        // Insert at top of current step
        const currentStep = document.querySelector('#forgot-password-modal div:not(.hidden)');
        currentStep.insertBefore(alertDiv, currentStep.firstChild);

        // Remove after 5 seconds
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
});
// Debug functions
async function checkUserVerification() {
    const email = document.querySelector('#login-form input[type="email"]').value;
    if (!email) {
        alert('Please enter your email first');
        return;
    }

    try {
        const response = await fetch(`/api/debug/user-verification/${encodeURIComponent(email)}`);
        const data = await response.json();

        console.log('Verification debug:', data);
        alert(`User: ${email}\nVerified in DB: ${data.user.verified}\nVerified (bool): ${data.user.verified_bool}\nHas verification record: ${data.latest_verification ? 'Yes' : 'No'}`);
    } catch (error) {
        console.error('Debug error:', error);
        alert('Debug failed: ' + error.message);
    }
}

async function fixVerification() {
    const email = document.querySelector('#login-form input[type="email"]').value;
    if (!email) {
        alert('Please enter your email first');
        return;
    }

    // First get user ID
    try {
        const userResponse = await fetch(`/api/debug/user-verification/${encodeURIComponent(email)}`);
        const userData = await userResponse.json();

        if (!userData.user) {
            alert('User not found');
            return;
        }

        if (confirm(`Force verify ${email}? This will set verified = 1 in database.`)) {
            const fixResponse = await fetch(`/api/fix-verification/${userData.user.id}`, {
                method: 'POST'
            });
            const fixData = await fixResponse.json();

            if (fixData.success) {
                alert('✅ Verification fixed! Try logging in again.');
            } else {
                alert('❌ Failed to fix: ' + (fixData.error || 'Unknown error'));
            }
        }
    } catch (error) {
        console.error('Fix error:', error);
        alert('Fix failed: ' + error.message);
    }
}
// Check if user is already logged in
document.addEventListener('DOMContentLoaded', function () {
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
document.getElementById('switch-to-login')?.addEventListener('click', function () {
    document.getElementById('login-toggle').click();
});